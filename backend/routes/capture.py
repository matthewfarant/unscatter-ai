from fastapi import APIRouter, UploadFile, File, HTTPException
import tempfile
import os
import io

router = APIRouter()

@router.post("/api/capture/voice")
async def capture_voice(file: UploadFile = File(...)):
    from groq import Groq, AuthenticationError, APIError
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY is not set on the backend.")
    groq_client = Groq(api_key=api_key)
    audio_suffix = os.path.splitext(file.filename or "capture.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=audio_suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        with open(tmp_path, "rb") as f:
            result = groq_client.audio.transcriptions.create(
                file=(os.path.basename(tmp_path), f.read()),
                model="whisper-large-v3-turbo",
                response_format="text",
            )
        transcript = result if isinstance(result, str) else result.text
        return {"raw_text": transcript}
    except AuthenticationError:
        raise HTTPException(
            status_code=401,
            detail="Groq rejected the API key. Get a fresh one at console.groq.com and update GROQ_API_KEY in .env.",
        )
    except APIError as e:
        raise HTTPException(status_code=502, detail=f"Groq API error: {getattr(e, 'message', str(e))}")
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

@router.post("/api/capture/file")
async def capture_file(file: UploadFile = File(...)):
    from pypdf import PdfReader
    content = await file.read()
    if file.filename and file.filename.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(content))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
    else:
        text = content.decode("utf-8", errors="ignore")
    return {"raw_text": text, "filename": file.filename}
