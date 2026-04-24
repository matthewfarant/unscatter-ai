import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from mcp.server.fastmcp import FastMCP
from backend.services.brain_io import load_index, load_note, format_note_for_prompt, apply_operations
from backend.services.claude_client import call_claude, parse_claude_json
from backend.prompts.chat_router import CHAT_ROUTER_PROMPT
from backend.prompts.chat_answer import CHAT_ANSWER_PROMPT
from backend.prompts.ingest import INGEST_PROMPT
import json

mcp = FastMCP("unscatter")


@mcp.tool()
def query_brain(question: str) -> str:
    """Ask a question and get an answer sourced from the company brain. Returns answer with cited note IDs."""
    index = load_index()
    router_result = parse_claude_json(call_claude(
        CHAT_ROUTER_PROMPT.format(
            index_json=json.dumps(index, indent=2),
            question=question,
            history="(none)"
        )
    ))
    note_ids = router_result.get("relevant_note_ids", [])
    notes_content = "\n\n---\n\n".join(
        format_note_for_prompt(load_note(nid))
        for nid in note_ids
        if index["notes"].get(nid)
    )
    answer = call_claude(CHAT_ANSWER_PROMPT.format(
        question=question,
        full_note_contents=notes_content or "(none)",
        history="(none)"
    ))
    cited = [nid for nid in note_ids if f"[{nid}]" in answer]
    return json.dumps({"answer": answer, "cited_note_ids": cited})


@mcp.tool()
def get_note(note_id: str) -> str:
    """Retrieve the full content of a specific note by ID (e.g. note_abc123)."""
    note = load_note(note_id)
    return format_note_for_prompt(note)


@mcp.tool()
def list_topics() -> str:
    """List all knowledge topics in the brain with their note counts and descriptions."""
    index = load_index()
    lines = [
        f"- {tid}: {t['title']} ({len(t.get('note_ids', []))} notes) — {t.get('description', '')}"
        for tid, t in index["topics"].items()
    ]
    return "\n".join(lines) if lines else "No topics found."


@mcp.tool()
def capture(content: str, modality: str = "text") -> str:
    """Add new knowledge to the company brain. Claude will structure and link it automatically."""
    index = load_index()
    prompt = INGEST_PROMPT.format(
        index_json=json.dumps(index, indent=2),
        input_content=content,
        modality=modality,
        user_note="(captured via MCP)"
    )
    result = parse_claude_json(call_claude(prompt))
    if result.get("operations"):
        apply_operations(result["operations"])
    return result.get("summary_for_user", "Captured.")


if __name__ == "__main__":
    mcp.run()
