import json
import os
import warnings
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
            edge = {
                "from": op["from"],
                "to": to_val,
                "type": op.get("edge_type", "related"),
                "strength": op.get("strength", 0.5)
            }
            if edge not in index["edges"]:
                index["edges"].append(edge)

        elif op_type == "flag_contradiction":
            note_id = op.get("note_id", "")
            print(f"[CONTRADICTION] {note_id}: {op.get('description', '')}")
            edge = {
                "from": op.get("conflicting_note_id", ""),
                "to": note_id,
                "type": "contradicts",
                "strength": 1.0
            }
            if op.get("conflicting_note_id") and edge not in index["edges"]:
                index["edges"].append(edge)

    index["updated_at"] = now
    save_index(index)
