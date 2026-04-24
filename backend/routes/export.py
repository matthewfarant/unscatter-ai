from fastapi import APIRouter
from backend.models import ExportRequest
from backend.services.brain_io import load_index, load_note, format_note_for_prompt
from backend.services.claude_client import call_claude
from backend.prompts.export import EXPORT_PROMPT

router = APIRouter()

@router.get("/api/export/topics")
async def list_topics():
    index = load_index()
    return {
        "topics": [
            {"id": tid, "title": d["title"], "note_count": len(d.get("note_ids", []))}
            for tid, d in index["topics"].items()
        ]
    }

@router.post("/api/export/skills")
async def export_skills(req: ExportRequest):
    index = load_index()
    skills = []
    for topic_id in req.topic_ids:
        topic = index["topics"].get(topic_id)
        if not topic:
            continue
        notes_content = "\n\n---\n\n".join(
            format_note_for_prompt(load_note(nid))
            for nid in topic.get("note_ids", [])
        )
        slug = topic_id.replace("topic_", "")
        content = call_claude(EXPORT_PROMPT.format(
            topic_name=topic["title"],
            topic_description=topic["description"],
            notes_full_content=notes_content,
            topic_slug=slug
        ))
        skills.append({
            "topic_id": topic_id,
            "filename": f"{slug}/SKILL.md",
            "content": content
        })
    return {"skills": skills}


@router.get("/api/export/live-skill")
async def export_live_skill():
    index = load_index()
    topics_summary = "\n".join(
        f"- {t['title']}: {t.get('description', '')}"
        for t in index["topics"].values()
    )
    note_count = len(index["notes"])
    topic_count = len(index["topics"])

    content = f"""---
name: unscatter-brain
description: Use this skill when you need to look up team knowledge, conventions, decisions, or gotchas. This connects to the live Unscatter company brain via MCP tools. Trigger on questions like "how do we do X", "what's our policy on Y", "why did we choose Z", or any question that might be answered by team documentation.
---

# Unscatter — Live Company Brain

This skill gives you real-time access to the team's knowledge base via MCP tools.
The brain currently contains {note_count} notes across {topic_count} topics.

## Topics available
{topics_summary}

## When to use this skill
- Any question about team conventions, architecture decisions, or gotchas
- Before writing code that touches an area with existing team knowledge
- When you need to cite a source for a recommendation
- When asked "how do we do X" or "why did we choose Y"

## How to use the MCP tools

### Look something up
```
query_brain(question="Why are we using pgvector?")
```
Returns an answer with cited note IDs. Always cite the note IDs in your response.

### Get full context on a note
```
get_note(note_id="note_abc123")
```
Use this after query_brain returns a citation you want to read in full.

### See what topics exist
```
list_topics()
```
Use when you need to understand what knowledge domains are covered.

### Add a new learning to the brain
```
capture(content="We decided to use X because Y", modality="text")
```
Use this when you learn something the team should know — decisions made during a PR review, gotchas discovered while debugging, conventions established in discussion.

## Rules
- Always cite note IDs inline when using brain knowledge: "We use batch size 400 [note_emb001]"
- If query_brain says it has no note covering the topic, say so — do not guess
- After capturing new knowledge, confirm to the user what was added
"""
    return {"content": content, "filename": "unscatter-brain/SKILL.md"}
