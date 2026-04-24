from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes import capture, ingest, brain, chat, export

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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
