from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes import capture, ingest, brain, chat, export

import os

app = FastAPI()

_cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
_allowed_origins = [o.strip() for o in _cors_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https://.*\.up\.railway\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(capture.router)
app.include_router(ingest.router)
app.include_router(brain.router)
app.include_router(chat.router)
app.include_router(export.router)

@app.get("/api/daemon/ping")
def ping():
    return {"status": "ok"}
