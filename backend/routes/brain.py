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
        nodes.append({
            "id": nid,
            "label": data["title"],
            "type": data["type"],
            "freshness": data["freshness_score"],
            "group": "note"
        })
    for tid, data in index["topics"].items():
        nodes.append({
            "id": tid,
            "label": data["title"],
            "coverage": data.get("coverage_score", 0.5),
            "note_count": len(data.get("note_ids", [])),
            "group": "topic"
        })
    return {
        "nodes": nodes,
        "edges": index["edges"],
        "overlay": overlay,
        "onboarding_path": index.get("onboarding_path", []),
    }
