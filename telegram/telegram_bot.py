import os
import sys
import tempfile
import requests
import asyncio
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from telegram import Update
from telegram.ext import Application, MessageHandler, CommandHandler, filters, ContextTypes

BACKEND = "http://127.0.0.1:8000"
BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
ALLOWED_IDS = set(
    int(x.strip()) for x in os.environ.get("TELEGRAM_ALLOWED_USER_IDS", "").split(",") if x.strip()
)


def is_allowed(update: Update) -> bool:
    if not ALLOWED_IDS:
        return True
    return update.effective_user.id in ALLOWED_IDS


async def handle_text(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not is_allowed(update):
        return
    text = update.message.text
    await update.message.reply_text("🧠 Processing...")
    try:
        r = requests.post(f"{BACKEND}/api/ingest", json={
            "modality": "text",
            "raw_text": text,
            "user_note": f"Captured via Telegram by @{update.effective_user.username or 'unknown'}"
        }, timeout=60)
        summary = r.json().get("summary_for_user", "Captured.")
        await update.message.reply_text(f"✅ {summary}")
    except Exception as e:
        await update.message.reply_text(f"❌ Failed: {e}")


async def handle_voice(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not is_allowed(update):
        return
    await update.message.reply_text("🎙️ Transcribing...")
    try:
        file = await ctx.bot.get_file(update.message.voice.file_id)
        with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as tmp:
            await file.download_to_drive(tmp.name)
            tmp_path = tmp.name
        with open(tmp_path, "rb") as f:
            r = requests.post(f"{BACKEND}/api/capture/voice", files={"file": f}, timeout=30)
        os.unlink(tmp_path)
        transcript = r.json().get("raw_text", "")
        if not transcript.strip():
            await update.message.reply_text("⚠️ Couldn't transcribe — try speaking more clearly.")
            return
        await update.message.reply_text(
            f"📝 Transcript: _{transcript}_\n\n🧠 Ingesting...",
            parse_mode="Markdown"
        )
        r = requests.post(f"{BACKEND}/api/ingest", json={
            "modality": "voice",
            "raw_text": transcript,
            "user_note": f"Captured via Telegram by @{update.effective_user.username or 'unknown'}"
        }, timeout=60)
        summary = r.json().get("summary_for_user", "Captured.")
        await update.message.reply_text(f"✅ {summary}")
    except Exception as e:
        await update.message.reply_text(f"❌ Failed: {e}")


async def handle_ask(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not is_allowed(update):
        return
    question = " ".join(ctx.args) if ctx.args else ""
    if not question:
        await update.message.reply_text("Usage: /ask why are we using pgvector?")
        return
    await update.message.reply_text("🔍 Searching brain...")
    try:
        r = requests.post(f"{BACKEND}/api/chat", json={
            "question": question,
            "history": []
        }, timeout=60)
        answer = r.json().get("answer", "No answer.")
        await update.message.reply_text(answer)
    except Exception as e:
        await update.message.reply_text(f"❌ Failed: {e}")


async def handle_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not is_allowed(update):
        return
    await update.message.reply_text(
        "🧠 *Unscatter Brain*\n\n"
        "Send me any text or voice note — I'll add it to your company brain.\n\n"
        "Commands:\n"
        "/ask <question> — query the brain\n"
        "/start — show this help",
        parse_mode="Markdown"
    )


def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", handle_start))
    app.add_handler(CommandHandler("ask", handle_ask))
    app.add_handler(MessageHandler(filters.VOICE, handle_voice))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    print("Unscatter Telegram bot running...")
    app.run_polling()


if __name__ == "__main__":
    main()
