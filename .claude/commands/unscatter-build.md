---
name: unscatter-build
description: Use this skill when working on files in the Unscatter project — an AI-native company brain app that ingests voice/text/file dumps and auto-organizes them into a queryable knowledge base. Load this skill when you see files like menubar_app.py, brain_io.py, core/ingest.py, prompts/*.py, or any FastAPI/React code in a repo with a PRD_unscatter.md or brain/ directory. Also load when the user mentions "Unscatter", "company brain", "knowledge capture", "brain dump", or references the PRD.
---

# Unscatter Build Skill

You are building a 5-hour hackathon project called Unscatter — an AI-native company brain app. Speed and correctness matter equally. Follow the hour-by-hour build order strictly. Use `TodoWrite` to track tasks at the start of each hour and mark them completed immediately.

---

## 0. Session Start — Read This First

Before writing any code:

```bash
# 1. Create project structure
mkdir -p unscatter/{backend/{routes,services,prompts,brain/notes},frontend,menubar}
cd unscatter

# 2. Python venv + backend deps
python3 -m venv venv && source venv/bin/activate
pip install fastapi uvicorn[standard] python-multipart groq anthropic pypdf python-dotenv pyyaml

# 3. .env
cat > .env << 'EOF'
ANTHROPIC_API_KEY=
GROQ_API_KEY=
BRAIN_PATH=./brain
CLAUDE_MODEL=claude-opus-4-7
EOF

# 4. React frontend with shadcn Luma (dark, minimalist, YC/startup vibe)
cd frontend
npm create vite@latest . -- --template react
npm install
npm install axios react-markdown react-force-graph-2d react-dropzone

# Init shadcn — when prompted: style=Luma, color=Zinc, dark mode=yes
npx shadcn@latest init

# Add all components needed for the full app in one shot
npx shadcn@latest add button card dialog tabs badge input textarea scroll-area separator tooltip

cd ..
```

**shadcn component → UI element mapping:**
| Component | Used for |
|---|---|
| `<Card>` | Wiki topic tiles, note tiles |
| `<Dialog>` | CaptureModal, ExportModal, TutorialModal |
| `<Tabs>` | Voice/Text/File capture switcher |
| `<Badge>` | Citation pills, freshness dots, live ingest ops |
| `<Input>` / `<Textarea>` | Chat input, text dump |
| `<ScrollArea>` | Chat panel, note list |
| `<Button variant="ghost/outline/default">` | All buttons |
| `<Tooltip>` | Graph node hover info |

**Accent color:** Add to `globals.css` after shadcn init:
```css
:root {
  --accent: 262 83% 58%;        /* electric purple #8B5CF6 */
  --accent-foreground: 0 0% 100%;
}
```

**Animations:** shadcn ships `tailwindcss-animate` — use `animate-in fade-in slide-in-from-bottom-4` on modals and toasts.

**Then populate `brain/` with seed data (Section 11) BEFORE running the first gate.**

---

## 1. Product in One Paragraph

Unscatter is a macOS companion app + web UI that lets engineers dump tacit knowledge (voice / text / file) into a living company brain. Claude auto-organizes every dump into structured markdown notes with tags, topic clusters, cross-links, and freshness scores. Users browse a wiki, query via chatbot with citations, explore a knowledge graph, and export topic clusters as Claude Skills.

---

## 2. Architecture (Non-Negotiable)

| Decision | Choice | Why |
|---|---|---|
| Storage | Local markdown + `brain/index.json` | No DB setup, git-friendly, Claude-native |
| AI | One Claude call per task | Simpler, faster, easier to debug in 5h |
| Retrieval | AI-as-router (index → note IDs → load notes) | Replaces vector search entirely |
| Capture | macOS menu bar (rumps) | No accessibility permissions, demo-reliable |
| Backend | FastAPI localhost:8000 | No auth needed |
| Frontend | React + Vite + Tailwind | Fast scaffold |

**Do not deviate from these.**

---

## 3. Brain Data Model

### Note file: `brain/notes/note_<id>.md`

```yaml
---
id: note_abc123
title: "Embedding batch size gotcha"
created_at: 2026-04-23T10:30:00Z
updated_at: 2026-04-23T10:30:00Z
last_verified_at: 2026-04-23T10:30:00Z
source_modality: voice        # voice | text | file | screen
type: gotcha                  # decision | learning | gotcha | convention | reference
topics: [topic_embeddings, topic_performance]
related_notes: [note_def456]
tags: [batch-size, tokenizer]
freshness_score: 1.0          # 1.0 = fresh, 0.0 = stale
confidence: 0.9
---

## TL;DR
One sentence, max 25 words. Shown on wiki tiles.

## Context
Why this came up. 1-2 sentences.

## Content
The actual knowledge. Dense bullets or short paragraphs. Max 200 words.

## Watch out for
Optional. Only if there's a real gotcha. Omit header entirely if not needed.
```

**Rules:**
- Note IDs: `note_<6 lowercase alphanumeric>` — e.g. `note_emb001`
- Topic IDs: `topic_<lowercase_with_underscores>` — e.g. `topic_embeddings` (**always include the `topic_` prefix**)
- Every note MUST have `## TL;DR`, `## Context`, `## Content`. `## Watch out for` is optional.
- TL;DR: hard max 25 words.
- Always update `updated_at` and `freshness_score` on any note write.
- Write files atomically: write to `.tmp` then `os.rename()`.

### Index file: `brain/index.json`

```json
{
  "version": 1,
  "updated_at": "2026-04-23T10:30:00Z",
  "notes": {
    "note_abc123": {
      "title": "Embedding batch size gotcha",
      "topics": ["topic_embeddings"],
      "type": "gotcha",
      "freshness_score": 1.0,
      "related_notes": ["note_def456"],
      "preview": "First ~200 chars of body after TL;DR header"
    }
  },
  "topics": {
    "topic_embeddings": {
      "title": "Embeddings",
      "description": "Embedding pipelines, models, performance",
      "note_ids": ["note_abc123"],
      "coverage_score": 0.7,
      "subtopics": ["batch-sizing"]
    }
  },
  "edges": [
    {"from": "note_abc123", "to": "note_def456", "type": "related", "strength": 0.8},
    {"from": "note_abc123", "to": "topic:topic_embeddings", "type": "belongs_to"}
  ],
  "onboarding_path": ["note_abc123"]
}
```

---

## 4. The 4 Claude Prompts (Copy These Exactly)

### 4.1 INGEST Prompt — `backend/prompts/ingest.py`

```python
INGEST_PROMPT = """You are the intelligence layer of a "company brain" — an AI-organized knowledge base for a software team. Your job is to take messy unstructured input and intelligently merge it into the existing brain.

GUIDING PRINCIPLES:
- Avoid duplication. If the input matches an existing note, UPDATE it, don't create.
- Surface contradictions explicitly with flag_contradiction operations.
- Keep notes atomic (one concept per note). Split if input contains multiple.
- Auto-link related notes. Look at the index to find connections.
- Notes must be useful for BOTH human reading AND machine retrieval.
- Default to dense, low-noise prose. No filler. No AI-voice.

CURRENT INDEX:
{index_json}

NEW INPUT (from {modality} capture):
{input_content}

OPTIONAL TEXT NOTE FROM USER:
{user_note}

YOUR TASK:
Return a JSON object with this exact schema:

{{
  "operations": [
    {{
      "type": "create_note",
      "note_id": "note_<6 random alphanumeric>",
      "frontmatter": {{
        "id": "note_<same id>",
        "title": "Short descriptive title",
        "source_modality": "{modality}",
        "type": "decision | learning | gotcha | convention | reference",
        "topics": ["topic_id_1"],
        "related_notes": ["note_abc123"],
        "tags": ["tag1", "tag2"],
        "freshness_score": 1.0,
        "confidence": 0.9
      }},
      "body": "## TL;DR\\n...\\n\\n## Context\\n...\\n\\n## Content\\n...\\n\\n## Watch out for\\n..."
    }}
  ],
  "summary_for_user": "One-sentence human summary of what changed",
  "confidence": 0.0
}}

Operation types allowed:
- "create_note": new atomic note
- "update_note": patch existing note (include note_id + full body)
- "create_topic": new topic cluster (include topic_id, title, description)
- "update_topic": patch existing topic (include topic_id)
- "add_edge": link two notes or note to topic (include from, to, edge_type, strength)
- "flag_contradiction": (include note_id, conflicting_note_id, description)

NOTE BODY FORMAT:
## TL;DR
[ONE sentence. Maximum 25 words.]

## Context
[Why this came up. 1-2 sentences.]

## Content
[Dense bullets or short paragraphs. Max 200 words.]

## Watch out for
[Only if there's a real gotcha. Omit section entirely if not.]

HARD RULES:
- If input is too sparse, return: {{"operations": [], "summary_for_user": "Input too sparse to extract knowledge.", "confidence": 0.0}}
- Note IDs: note_<6 random alphanumeric lowercase>
- Topic IDs MUST use format: topic_<lowercase_with_underscores> — always include the topic_ prefix
- If input relates to an existing topic, use that topic's ID — do not create duplicates
- Prefer 1 well-organized note over 5 fragmented ones.

Return ONLY valid JSON. No preamble, no markdown fences."""
```

---

### 4.2 CHAT_ROUTER Prompt — `backend/prompts/chat_router.py`

```python
CHAT_ROUTER_PROMPT = """You are routing a user question to the relevant notes in a knowledge base.

INDEX:
{index_json}

USER QUESTION:
{question}

CHAT HISTORY (last 5 turns):
{history}

Return JSON:
{{
  "relevant_note_ids": ["note_abc", "note_def"],
  "topic_context": "topic_xyz",
  "needs_more_info": false
}}

Rules:
- Up to 5 most relevant note IDs (fewer is better)
- topic_context: primary topic or null
- If no notes are relevant, return empty array

Return ONLY valid JSON. No preamble, no markdown fences."""
```

---

### 4.3 CHAT_ANSWER Prompt — `backend/prompts/chat_answer.py`

```python
CHAT_ANSWER_PROMPT = """You are the company brain's chatbot. Answer the user's question using ONLY the provided notes. Cite each fact by note_id.

USER QUESTION:
{question}

RELEVANT NOTES:
{full_note_contents}

CHAT HISTORY:
{history}

RULES:
- Cite sources inline using square brackets: "We use batch size 400 [note_emb001]."
- If the notes don't contain the answer: "I don't have a note covering that."
- Tone: terse, senior engineer. No "Great question!". No filler.
- Maximum 150 words.
- If the user is correcting information, end with: "Should I update [note_id]?"

Answer:"""
```

---

### 4.4 EDIT Prompt — `backend/prompts/edit.py`

```python
EDIT_PROMPT = """The user is correcting a note in the company brain. Update the note to reflect the truth.

ORIGINAL NOTE:
{note_full_content}

USER CORRECTION:
{correction_text}

Return JSON:
{{
  "updated_body": "<full new note body using the exact 4-section format>",
  "change_summary": "One sentence describing what changed.",
  "freshness_score": 1.0
}}

The updated_body must use: ## TL;DR / ## Context / ## Content / ## Watch out for (optional).
Preserve all accurate information. Update only what the correction addresses.
Terse, senior-engineer voice. freshness_score always 1.0 after a user correction.

Return ONLY valid JSON. No preamble, no markdown fences."""
```

---

### 4.5 EXPORT Prompt — `backend/prompts/export.py`

```python
EXPORT_PROMPT = """You are generating a Claude Skill from a topic cluster in the company brain.

TOPIC: {topic_name}
TOPIC DESCRIPTION: {topic_description}

ALL NOTES IN THIS TOPIC:
{notes_full_content}

Generate a SKILL.md:

---
name: {topic_slug}
description: <one paragraph: when to load this skill — specific file paths, keywords, task types>
---

# {{topic_name}}

## When to use this skill
<Explicit triggers>

## Key conventions
<Bulleted rules — every rule must be "Always X" or "Never Y">

## Gotchas
<Only include if notes contain type=gotcha. Otherwise omit section.>

## Reference
<Dense, scannable content by sub-topic>

Return raw markdown only. No preamble. Keep under 800 lines."""
```

---

## 5. JSON Parsing (Critical — Use Everywhere)

```python
# backend/services/claude_client.py
import re, json
from anthropic import Anthropic
import os

client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

def call_claude(prompt: str, images: list = None, max_tokens: int = 4096) -> str:
    content = [{"type": "text", "text": prompt}]
    if images:
        for img_b64 in images:
            content.insert(0, {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": img_b64}})
    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": content}]
    )
    return response.content[0].text

def parse_claude_json(response: str) -> dict:
    """Always use this — Claude sometimes wraps JSON in markdown fences."""
    cleaned = response.strip()
    cleaned = re.sub(r'^```(?:json)?\n?', '', cleaned)
    cleaned = re.sub(r'\n?```$', '', cleaned)
    return json.loads(cleaned.strip())
```

**Rules:**
- Never call `json.loads()` directly on a Claude response. Always go through `parse_claude_json`.
- Always validate `result.get("operations")` is a list before calling `apply_operations`.
- Apply operations in order — `create_topic` before `add_edge` referencing it.

---

## 6. Complete Code: `brain_io.py`

```python
# backend/services/brain_io.py
import json, os, warnings
from datetime import datetime, timezone
from pathlib import Path
import yaml
from backend.config import INDEX_PATH, NOTES_DIR

def _normalize_topic_id(topic_id: str) -> str:
    tid = topic_id.strip()
    return tid if tid.startswith("topic_") else f"topic_{tid}"

def load_index() -> dict:
    with open(INDEX_PATH) as f:
        return json.load(f)

def save_index(index: dict):
    tmp = str(INDEX_PATH) + ".tmp"
    with open(tmp, "w") as f:
        json.dump(index, f, indent=2)
    os.rename(tmp, INDEX_PATH)

def load_note(note_id: str) -> dict:
    path = NOTES_DIR / f"{note_id}.md"
    content = path.read_text()
    if not content.startswith("---"):
        return {"frontmatter": {}, "body": content}
    parts = content.split("---", 2)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        fm = yaml.safe_load(parts[1]) or {}
    return {"frontmatter": fm, "body": parts[2].strip()}

def save_note(note_id: str, frontmatter: dict, body: str):
    path = NOTES_DIR / f"{note_id}.md"
    tmp = str(path) + ".tmp"
    fm_str = yaml.dump(frontmatter, default_flow_style=False, allow_unicode=True).strip()
    with open(tmp, "w") as f:
        f.write(f"---\n{fm_str}\n---\n\n{body}\n")
    os.rename(tmp, str(path))

def format_note_for_prompt(note: dict) -> str:
    fm = note["frontmatter"]
    return "\n".join([
        f"NOTE ID: {fm.get('id', 'unknown')}",
        f"Title: {fm.get('title', '')}",
        f"Type: {fm.get('type', '')}",
        f"Topics: {', '.join(fm.get('topics', []))}",
        f"Tags: {', '.join(fm.get('tags', []))}",
        "",
        note["body"]
    ])

def apply_operations(ops: list):
    index = load_index()
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    for op in ops:
        op_type = op.get("type")
        if not op_type:
            continue

        if op_type == "create_note":
            note_id = op["note_id"]
            fm = op.get("frontmatter", {})
            fm.setdefault("id", note_id)
            fm.setdefault("created_at", now)
            fm.setdefault("updated_at", now)
            fm.setdefault("last_verified_at", now)
            fm.setdefault("freshness_score", 1.0)
            fm.setdefault("confidence", 0.8)
            fm["topics"] = [_normalize_topic_id(t) for t in fm.get("topics", [])]
            body = op.get("body", "")
            save_note(note_id, fm, body)
            index["notes"][note_id] = {
                "title": fm.get("title", ""),
                "topics": fm["topics"],
                "type": fm.get("type", "learning"),
                "freshness_score": fm.get("freshness_score", 1.0),
                "related_notes": fm.get("related_notes", []),
                "preview": (body.split("\n")[1] if "\n" in body else body)[:200]
            }
            for topic_id in fm["topics"]:
                edge = {"from": note_id, "to": f"topic:{topic_id}", "type": "belongs_to"}
                if edge not in index["edges"]:
                    index["edges"].append(edge)
                if topic_id in index["topics"] and note_id not in index["topics"][topic_id].get("note_ids", []):
                    index["topics"][topic_id].setdefault("note_ids", []).append(note_id)

        elif op_type == "update_note":
            note_id = op["note_id"]
            if note_id not in index["notes"]:
                continue
            existing = load_note(note_id)
            fm = existing["frontmatter"]
            fm["updated_at"] = now
            op_fm = op.get("frontmatter", {})
            if op_fm:
                for field in ("type", "tags", "related_notes", "confidence"):
                    if field in op_fm:
                        fm[field] = op_fm[field]
                if "topics" in op_fm:
                    new_topics = [_normalize_topic_id(t) for t in op_fm["topics"]]
                    fm["topics"] = new_topics
                    index["notes"][note_id]["topics"] = new_topics
                    for topic_id in new_topics:
                        edge = {"from": note_id, "to": f"topic:{topic_id}", "type": "belongs_to"}
                        if edge not in index["edges"]:
                            index["edges"].append(edge)
                        if topic_id in index["topics"] and note_id not in index["topics"][topic_id].get("note_ids", []):
                            index["topics"][topic_id].setdefault("note_ids", []).append(note_id)
            if "freshness_score" in op:
                fm["freshness_score"] = op["freshness_score"]
            elif "freshness_score" in op_fm:
                fm["freshness_score"] = op_fm["freshness_score"]
            body = op.get("body", existing["body"])
            save_note(note_id, fm, body)
            index["notes"][note_id].update({
                "freshness_score": fm.get("freshness_score", 1.0),
                "type": fm.get("type", index["notes"][note_id].get("type")),
                "related_notes": fm.get("related_notes", index["notes"][note_id].get("related_notes", [])),
                "topics": fm.get("topics", index["notes"][note_id].get("topics", [])),
                "preview": next((l for l in body.split("\n") if l.strip() and not l.startswith("#")), "")[:200]
            })

        elif op_type == "create_topic":
            topic_id = _normalize_topic_id(op["topic_id"])
            index["topics"][topic_id] = {
                "title": op.get("title", topic_id),
                "description": op.get("description", ""),
                "note_ids": op.get("note_ids", []),
                "coverage_score": 0.5,
                "subtopics": op.get("subtopics", [])
            }

        elif op_type == "update_topic":
            topic_id = _normalize_topic_id(op["topic_id"])
            if topic_id in index["topics"]:
                index["topics"][topic_id].update({k: v for k, v in op.items() if k not in ("type", "topic_id")})

        elif op_type == "add_edge":
            to_val = op["to"]
            if to_val.startswith("topic:"):
                to_val = f"topic:{_normalize_topic_id(to_val[len('topic:'):])}"
            edge = {"from": op["from"], "to": to_val, "type": op.get("edge_type", "related"), "strength": op.get("strength", 0.5)}
            if edge not in index["edges"]:
                index["edges"].append(edge)

        elif op_type == "flag_contradiction":
            note_id = op.get("note_id", "")
            print(f"[CONTRADICTION] {note_id}: {op.get('description', '')}")
            edge = {"from": op.get("conflicting_note_id", ""), "to": note_id, "type": "contradicts", "strength": 1.0}
            if op.get("conflicting_note_id") and edge not in index["edges"]:
                index["edges"].append(edge)

    index["updated_at"] = now
    save_index(index)
```

---

## 7. Complete Code: FastAPI Backend

### `backend/config.py`
```python
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
GROQ_API_KEY = os.environ["GROQ_API_KEY"]
BRAIN_PATH = Path(os.environ.get("BRAIN_PATH", "./brain"))
NOTES_DIR = BRAIN_PATH / "notes"
INDEX_PATH = BRAIN_PATH / "index.json"
NOTES_DIR.mkdir(parents=True, exist_ok=True)
```

### `backend/main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes import capture, ingest, brain, chat, export

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])

app.include_router(capture.router)
app.include_router(ingest.router)
app.include_router(brain.router)
app.include_router(chat.router)
app.include_router(export.router)

@app.get("/api/daemon/ping")
def ping():
    return {"status": "ok"}
```

### `backend/models.py`
```python
from pydantic import BaseModel
from typing import Optional, List

class IngestRequest(BaseModel):
    modality: str  # "voice" | "text" | "file"
    raw_text: str
    user_note: str = ""

class ChatRequest(BaseModel):
    question: str
    history: List[dict] = []

class CorrectionRequest(BaseModel):
    note_id: str
    correction: str

class ExportRequest(BaseModel):
    topic_ids: List[str]
```

### `backend/routes/ingest.py`
```python
from fastapi import APIRouter
from backend.models import IngestRequest
from backend.services.brain_io import load_index, apply_operations
from backend.services.claude_client import call_claude, parse_claude_json
from backend.prompts.ingest import INGEST_PROMPT
import json

router = APIRouter()

@router.post("/api/ingest")
async def ingest_endpoint(req: IngestRequest):
    index = load_index()
    prompt = INGEST_PROMPT.format(
        index_json=json.dumps(index, indent=2),
        input_content=req.raw_text,
        modality=req.modality,
        user_note=req.user_note or "(none)"
    )
    result = parse_claude_json(call_claude(prompt))
    if result.get("operations"):
        apply_operations(result["operations"])
    return result
```

### `backend/routes/capture.py`
```python
from fastapi import APIRouter, UploadFile, File
import tempfile, os
from groq import Groq

router = APIRouter()
groq_client = Groq(api_key=os.environ["GROQ_API_KEY"])

@router.post("/api/capture/voice")
async def capture_voice(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        with open(tmp_path, "rb") as f:
            result = groq_client.audio.transcriptions.create(
                file=(tmp_path, f.read()),
                model="whisper-large-v3-turbo",
                response_format="text"
            )
        transcript = result if isinstance(result, str) else result.text
        return {"raw_text": transcript}
    finally:
        os.unlink(tmp_path)

@router.post("/api/capture/file")
async def capture_file(file: UploadFile = File(...)):
    from pypdf import PdfReader
    import io
    content = await file.read()
    if file.filename.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(content))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
    else:
        text = content.decode("utf-8", errors="ignore")
    return {"raw_text": text, "filename": file.filename}
```

### `backend/routes/chat.py`
```python
from fastapi import APIRouter
from backend.models import ChatRequest, CorrectionRequest
from backend.services.brain_io import load_index, load_note, format_note_for_prompt, save_note
from backend.services.claude_client import call_claude, parse_claude_json
from backend.prompts.chat_router import CHAT_ROUTER_PROMPT
from backend.prompts.chat_answer import CHAT_ANSWER_PROMPT
from backend.prompts.edit import EDIT_PROMPT
import json, re
from datetime import datetime, timezone

router = APIRouter()

def _fmt_history(history):
    if not history:
        return "(none)"
    return "\n".join(f"User: {t.get('user','')}\nAssistant: {t.get('assistant','')}" for t in history[-5:])

@router.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    index = load_index()
    history_str = _fmt_history(req.history)
    router_result = parse_claude_json(call_claude(
        CHAT_ROUTER_PROMPT.format(index_json=json.dumps(index, indent=2), question=req.question, history=history_str)
    ))
    note_ids = router_result.get("relevant_note_ids", [])
    notes_content = "\n\n---\n\n".join(format_note_for_prompt(load_note(nid)) for nid in note_ids if (index["notes"].get(nid)))
    answer = call_claude(CHAT_ANSWER_PROMPT.format(question=req.question, full_note_contents=notes_content or "(none)", history=history_str))
    cited = [c.strip("[]") for c in re.findall(r'\[note_\w+\]', answer)]
    suggests_edit = "Should I update" in answer
    edit_target = None
    if suggests_edit:
        m = re.search(r'Should I update \[(note_\w+)\]', answer)
        if m:
            edit_target = m.group(1)
    return {"answer": answer, "cited_note_ids": cited, "suggests_edit": suggests_edit, "edit_target_note_id": edit_target}

@router.post("/api/chat/apply_correction")
async def apply_correction(req: CorrectionRequest):
    note = load_note(req.note_id)
    result = parse_claude_json(call_claude(
        EDIT_PROMPT.format(note_full_content=format_note_for_prompt(note), correction_text=req.correction)
    ))
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    fm = note["frontmatter"]
    fm["updated_at"] = now
    fm["freshness_score"] = result.get("freshness_score", 1.0)
    save_note(req.note_id, fm, result["updated_body"])
    return {"updated_note_id": req.note_id, "change_summary": result.get("change_summary", "")}
```

### `backend/routes/brain.py`
```python
from fastapi import APIRouter
from backend.services.brain_io import load_index, load_note

router = APIRouter()

@router.get("/api/brain/index")
async def get_index():
    return load_index()

@router.get("/api/brain/notes/{note_id}")
async def get_note(note_id: str):
    note = load_note(note_id)
    return {"id": note_id, **note["frontmatter"], "body": note["body"]}

@router.get("/api/brain/graph")
async def get_graph(overlay: str = "coverage"):
    index = load_index()
    nodes = []
    for nid, data in index["notes"].items():
        nodes.append({"id": nid, "label": data["title"], "type": data["type"],
                       "freshness": data["freshness_score"], "group": "note"})
    for tid, data in index["topics"].items():
        nodes.append({"id": tid, "label": data["title"], "coverage": data.get("coverage_score", 0.5),
                       "note_count": len(data.get("note_ids", [])), "group": "topic"})
    return {"nodes": nodes, "edges": index["edges"], "overlay": overlay}
```

### `backend/routes/export.py`
```python
from fastapi import APIRouter
from backend.models import ExportRequest
from backend.services.brain_io import load_index, load_note, format_note_for_prompt
from backend.services.claude_client import call_claude
from backend.prompts.export import EXPORT_PROMPT

router = APIRouter()

@router.get("/api/export/topics")
async def list_topics():
    index = load_index()
    return {"topics": [{"id": tid, "title": d["title"], "note_count": len(d.get("note_ids", []))}
                        for tid, d in index["topics"].items()]}

@router.post("/api/export/skills")
async def export_skills(req: ExportRequest):
    index = load_index()
    skills = []
    for topic_id in req.topic_ids:
        topic = index["topics"].get(topic_id)
        if not topic:
            continue
        notes_content = "\n\n---\n\n".join(
            format_note_for_prompt(load_note(nid)) for nid in topic.get("note_ids", [])
        )
        slug = topic_id.replace("topic_", "")
        content = call_claude(EXPORT_PROMPT.format(
            topic_name=topic["title"], topic_description=topic["description"],
            notes_full_content=notes_content, topic_slug=slug
        ))
        skills.append({"topic_id": topic_id, "filename": f"{slug}/SKILL.md", "content": content})
    return {"skills": skills}
```

---

## 8. Menu Bar App (Full Working Code)

```python
# menubar/menubar_app.py
import os, subprocess, sys, tempfile, threading
import numpy as np
import rumps
import sounddevice as sd
import soundfile as sf
import requests

BACKEND = "http://localhost:8000"
SAMPLE_RATE = 16000

class UnscatterApp(rumps.App):
    def __init__(self):
        super().__init__("🧠", quit_button=None)
        self.recording = False
        self.audio_frames = []
        self.stream = None
        self.menu = [
            rumps.MenuItem("Start Voice Capture", callback=self.toggle_voice),
            None,
            rumps.MenuItem("Open Unscatter", callback=self.open_web),
            None,
            rumps.MenuItem("Quit", callback=rumps.quit_application),
        ]

    def toggle_voice(self, sender):
        if not self.recording:
            self.start_recording()
            sender.title = "⏺ Stop & Ingest"
            self.title = "🔴"
        else:
            self.stop_and_ingest(sender)
            sender.title = "Start Voice Capture"
            self.title = "🧠"

    def start_recording(self):
        self.recording = True
        self.audio_frames = []
        def callback(indata, frames, time, status):
            self.audio_frames.append(indata.copy())
        self.stream = sd.InputStream(samplerate=SAMPLE_RATE, channels=1, callback=callback)
        self.stream.start()

    def stop_and_ingest(self, sender):
        self.recording = False
        self.stream.stop()
        self.stream.close()
        path = tempfile.mktemp(suffix=".wav")
        sf.write(path, np.concatenate(self.audio_frames, axis=0), SAMPLE_RATE)
        threading.Thread(target=self._send_to_backend, args=(path,), daemon=True).start()

    def _send_to_backend(self, wav_path: str):
        try:
            with open(wav_path, "rb") as f:
                r = requests.post(f"{BACKEND}/api/capture/voice", files={"file": f})
            transcript = r.json()["raw_text"]
            r = requests.post(f"{BACKEND}/api/ingest", json={"modality": "voice", "raw_text": transcript, "user_note": ""})
            summary = r.json().get("summary_for_user", "Captured.")
            self._notify("Unscatter", summary)
        except Exception as e:
            self._notify("Unscatter", f"Capture failed: {e}")
        finally:
            try:
                os.unlink(wav_path)
            except OSError:
                pass

    def _notify(self, title: str, message: str):
        subprocess.run(["osascript", "-e",
            f'display notification "{message}" with title "{title}" sound name "Glass"'],
            capture_output=True)

    def open_web(self, _):
        subprocess.run(["open", "http://localhost:5173"])

if __name__ == "__main__":
    UnscatterApp().run()
```

**Run:** `pip install rumps sounddevice soundfile numpy requests && python menubar/menubar_app.py`

**Test BEFORE the demo** — first run triggers macOS mic permission prompt. Grant it then, not during the pitch.

---

## 9. Build Order (Hour-by-Hour with Exact Gates)

### Hour 1 — Backend + INGEST end-to-end
```bash
uvicorn backend.main:app --reload --port 8000

# Gate command:
curl -s -X POST http://localhost:8000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"modality":"text","raw_text":"We switched from Pinecone to pgvector to save $120/month. Our corpus is under 500k vectors so we do not need managed scaling."}' \
  | python3 -m json.tool
```
**Expected:** `operations` array with at least 1 entry, new file in `brain/notes/`.

### Hour 2 — Voice + file + frontend scaffold
```bash
curl -s -X POST http://localhost:8000/api/capture/voice \
  -F "file=@/path/to/test.wav" | python3 -m json.tool

cd frontend && npm run dev  # runs on localhost:5173
```

**Frontend build order:**
1. `App.jsx` — dark bg layout shell: `<div className="min-h-screen bg-zinc-950 text-zinc-100 flex">`
2. `TopBar.jsx` — logo + `<Button>` for Capture + Export
3. `Sidebar.jsx` — topic list using `<ScrollArea>` + clickable items
4. `CaptureModal.jsx` — `<Dialog>` containing `<Tabs value="voice|text|file">`, voice tab uses MediaRecorder API
5. Wire capture → POST `/api/capture/voice` → POST `/api/ingest` → show result as `<Badge>` list with `animate-in`

### Hour 3 — Wiki + Chat
```bash
curl -s -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"Why did we switch to pgvector?"}' \
  | python3 -m json.tool
```
**Expected:** `answer` with `[note_xxx]` citations, `cited_note_ids` array populated.

### Hour 4 — Graph + Export
```bash
curl -s -X POST http://localhost:8000/api/export/skills \
  -H "Content-Type: application/json" \
  -d '{"topic_ids":["topic_embeddings"]}' \
  | python3 -m json.tool
```
**Expected:** `skills` array with `filename` and `content` containing valid SKILL.md.

### Hour 5 — Menu Bar + Polish
```bash
pip install rumps sounddevice soundfile numpy requests
python menubar/menubar_app.py
```

**Polish checklist (shadcn-specific):**
- Consistent `variant="outline"` on secondary buttons, `variant="default"` (purple) on primary CTAs
- `<Badge variant="secondary">` for type labels (decision/gotcha/convention)
- `<Badge className="bg-green-500/20 text-green-400">` / yellow / red for freshness dots
- Graph canvas: `<Card className="p-0 overflow-hidden">` wrapper
- All modals: add `animate-in fade-in slide-in-from-bottom-4 duration-200` to `<DialogContent>`

---

## 10. Rules & Gotchas

- **Always use `parse_claude_json()`** — never raw `json.loads()` on Claude output.
- **Always load full `index.json` before any INGEST call** — Claude needs current state to deduplicate.
- **Topic IDs always include `topic_` prefix** — `_normalize_topic_id()` handles Claude slipping up on this.
- **Apply operations in order** — `create_topic` before `add_edge` referencing that topic.
- **Never send >20KB of index to Claude** — if brain grows large, send a topic-relevant slice.
- **Atomic file writes** — write `.tmp` then `os.rename()`. Never write directly.
- **Menu bar UI thread must never block** — background thread for all ingest work (`daemon=True`).
- **macOS notifications: use `osascript`** — `rumps.notification()` is unreliable from background threads.
- **Validate each op has a `type` field** — skip malformed ops silently with a log line.
- **INSUFFICIENT_CONTEXT is correct behavior** — short/vague voice captures correctly produce zero operations.

---

## 11. Demo Seed Data

Populate `brain/` before Hour 1 ends. 8-10 notes, 4 topics.

**Topics:**
- `topic_embeddings` (3 notes) — well-covered, for showing a dense topic cluster
- `topic_auth` (2 notes) — medium
- `topic_deployment` (1 note) — sparse, for showing the coverage gap overlay
- `topic_database` (2 notes) — one with `freshness_score: 0.3` for freshness overlay demo

**Note content examples:**
- "We use text-embedding-3-small — 5x cheaper than ada-002, 2% better recall on our QA set"
- "pgvector HNSW index: m=16, ef_construction=64 — good starting point, tune if recall regresses"
- "JWT access tokens expire in 15 min, refresh tokens in 7 days — matched to legal's session requirement"
- "Deploy to Railway — Dockerfile + `railway up`. No ECS/K8s overhead for hackathon scale"

---

## 12. What NOT to Do

- Do NOT add a vector database. AI-as-router is intentional and sufficient.
- Do NOT use global hotkeys. Menu bar is the choice.
- Do NOT call `json.loads()` directly on Claude responses. Use `parse_claude_json()`.
- Do NOT build auth. Single user, localhost.
- Do NOT gold-plate the graph. It's a feature, not the product.
- Do NOT block the menu bar UI thread.
- Do NOT skip seed data setup — empty brain kills the demo.

---

## 13. Demo Hero Moment

> *"I'm working in my terminal. I just learned something important. Watch this."*
> [click 🧠 in menu bar → "Start Voice Capture"] [speak for 15 seconds] [click "Stop & Ingest"]
> [native macOS notification with Glass sound: "Unscatter: Created 1 note about pgvector migration"]
> *"I never opened the web app. The brain just grew."*

**Pre-demo checklist:**
- [ ] Test mic permission with one capture before the pitch
- [ ] Brain has 8-10 seed notes visible in wiki and graph
- [ ] Voice capture → notification → note appears in wiki flow rehearsed 3x
- [ ] Backup demo video recorded
- [ ] Both `uvicorn` backend and `menubar_app.py` running before presenting
