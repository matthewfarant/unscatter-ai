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
