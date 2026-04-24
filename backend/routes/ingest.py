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
    ops = result.get("operations", [])
    if ops:
        apply_operations(ops)
    return result
