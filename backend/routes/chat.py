from fastapi import APIRouter
from backend.models import ChatRequest, CorrectionRequest
from backend.services.brain_io import load_index, load_note, format_note_for_prompt, save_note
from backend.services.claude_client import call_claude, parse_claude_json
from backend.prompts.chat_router import CHAT_ROUTER_PROMPT
from backend.prompts.chat_answer import CHAT_ANSWER_PROMPT
from backend.prompts.edit import EDIT_PROMPT
import json
import re
from datetime import datetime, timezone

router = APIRouter()

def _fmt_history(history):
    if not history:
        return "(none)"
    return "\n".join(
        f"User: {t.get('user', '')}\nAssistant: {t.get('assistant', '')}"
        for t in history[-5:]
    )

@router.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    index = load_index()
    history_str = _fmt_history(req.history)
    router_result = parse_claude_json(call_claude(
        CHAT_ROUTER_PROMPT.format(
            index_json=json.dumps(index, indent=2),
            question=req.question,
            history=history_str
        )
    ))
    note_ids = router_result.get("relevant_note_ids", [])
    notes_content = "\n\n---\n\n".join(
        format_note_for_prompt(load_note(nid))
        for nid in note_ids
        if index["notes"].get(nid)
    )
    answer = call_claude(CHAT_ANSWER_PROMPT.format(
        question=req.question,
        full_note_contents=notes_content or "(none)",
        history=history_str
    ))
    # Parse FOLLOW_UPS out before returning the answer
    follow_ups = []
    follow_up_match = re.search(r'FOLLOW_UPS:\s*(\[.*?\])', answer, re.DOTALL)
    if follow_up_match:
        try:
            follow_ups = json.loads(follow_up_match.group(1))
            answer = answer[:follow_up_match.start()].strip()
        except Exception:
            pass

    cited = [c.strip("[]") for c in re.findall(r'\[note_\w+\]', answer)]
    suggests_edit = "Should I update" in answer
    edit_target = None
    if suggests_edit:
        m = re.search(r'Should I update \[(note_\w+)\]', answer)
        if m:
            edit_target = m.group(1)
    return {
        "answer": answer,
        "cited_note_ids": cited,
        "suggests_edit": suggests_edit,
        "edit_target_note_id": edit_target,
        "follow_up_questions": follow_ups,
    }

@router.post("/api/chat/apply_correction")
async def apply_correction(req: CorrectionRequest):
    note = load_note(req.note_id)
    result = parse_claude_json(call_claude(
        EDIT_PROMPT.format(
            note_full_content=format_note_for_prompt(note),
            correction_text=req.correction
        )
    ))
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    fm = note["frontmatter"]
    fm["updated_at"] = now
    fm["freshness_score"] = result.get("freshness_score", 1.0)
    save_note(req.note_id, fm, result["updated_body"])
    return {"updated_note_id": req.note_id, "change_summary": result.get("change_summary", "")}
