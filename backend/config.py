import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
BRAIN_PATH = Path(os.environ.get("BRAIN_PATH", "./brain"))
NOTES_DIR = BRAIN_PATH / "notes"
INDEX_PATH = BRAIN_PATH / "index.json"
NOTES_DIR.mkdir(parents=True, exist_ok=True)
