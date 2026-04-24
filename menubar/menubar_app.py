import os
import re
import subprocess
import tempfile
import threading

import numpy as np
import rumps
import sounddevice as sd
import soundfile as sf
import requests

BACKEND = "http://127.0.0.1:8000"
SAMPLE_RATE = 16000


def _find_screen_device_index() -> str:
    """Return the avfoundation index for the first screen capture device."""
    result = subprocess.run(
        ["ffmpeg", "-f", "avfoundation", "-list_devices", "true", "-i", ""],
        capture_output=True,
        text=True,
    )
    matches = re.findall(r"\[(\d+)\] Capture screen", result.stderr)
    return matches[0] if matches else "1"


class UnscatterApp(rumps.App):
    def __init__(self):
        super().__init__("🧠", quit_button=None)
        self.recording = False
        self.audio_frames = []
        self.stream = None
        self.screen_recording = False
        self.screen_process = None
        self.screen_file = None
        self.menu = [
            rumps.MenuItem("Start Voice Capture", callback=self.toggle_voice),
            rumps.MenuItem("Start Screen Recording", callback=self.toggle_screen),
            None,
            rumps.MenuItem("Open Unscatter", callback=self.open_web),
            None,
            rumps.MenuItem("Quit", callback=rumps.quit_application),
        ]

    # ── Voice capture ──────────────────────────────────────────────────────────

    def toggle_voice(self, sender):
        if self.screen_recording:
            self._notify("Unscatter", "Stop screen recording first.")
            return
        if not self.recording:
            self.start_recording()
            sender.title = "⏺ Stop & Ingest Voice"
            self.title = "🔴"
        else:
            self.stop_and_ingest(sender)
            sender.title = "Start Voice Capture"
            self.title = "🧠"

    def start_recording(self):
        self.recording = True
        self.audio_frames = []

        def callback(indata, frames, time, status):
            self.audio_frames.append(indata.copy())

        self.stream = sd.InputStream(
            samplerate=SAMPLE_RATE, channels=1, callback=callback
        )
        self.stream.start()

    def stop_and_ingest(self, sender):
        self.recording = False
        self.stream.stop()
        self.stream.close()

        if not self.audio_frames:
            self._notify("Unscatter", "No audio recorded.")
            return

        path = tempfile.mktemp(suffix=".wav")
        sf.write(path, np.concatenate(self.audio_frames, axis=0), SAMPLE_RATE)
        threading.Thread(
            target=self._send_to_backend, args=(path,), daemon=True
        ).start()

    def _send_to_backend(self, wav_path: str):
        try:
            with open(wav_path, "rb") as f:
                r = requests.post(
                    f"{BACKEND}/api/capture/voice", files={"file": f}, timeout=30
                )
            r.raise_for_status()
            transcript = r.json()["raw_text"]

            r = requests.post(
                f"{BACKEND}/api/ingest",
                json={"modality": "voice", "raw_text": transcript, "user_note": ""},
                timeout=60,
            )
            r.raise_for_status()
            summary = r.json().get("summary_for_user", "Captured.")
            self._notify("Unscatter", summary)
        except requests.exceptions.ConnectionError:
            self._notify("Unscatter", "Backend not running — start uvicorn first.")
        except Exception as e:
            self._notify("Unscatter", f"Capture failed: {e}")
        finally:
            try:
                os.unlink(wav_path)
            except OSError:
                pass

    # ── Screen recording ───────────────────────────────────────────────────────

    def toggle_screen(self, sender):
        if self.recording:
            self._notify("Unscatter", "Stop voice capture first.")
            return
        if not self.screen_recording:
            self._start_screen_recording(sender)
        else:
            self._stop_screen_recording(sender)

    def _start_screen_recording(self, sender):
        if subprocess.run(["which", "ffmpeg"], capture_output=True).returncode != 0:
            self._notify("Unscatter", "ffmpeg not found — run: brew install ffmpeg")
            return
        screen_idx = _find_screen_device_index()
        self.screen_file = tempfile.mktemp(suffix=".mp4")
        cmd = [
            "ffmpeg",
            "-f", "avfoundation",
            "-capture_cursor", "1",
            "-i", f"{screen_idx}:0",
            "-r", "15",
            "-vcodec", "libx264",
            "-preset", "ultrafast",
            "-acodec", "aac",
            "-y",
            self.screen_file,
        ]
        try:
            self.screen_process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except FileNotFoundError:
            self._notify("Unscatter", "ffmpeg not found — run: brew install ffmpeg")
            return
        self.screen_recording = True
        sender.title = "⏺ Stop Screen Recording"
        self.title = "📹"

    def _stop_screen_recording(self, sender):
        self.screen_recording = False
        sender.title = "Start Screen Recording"
        self.title = "🧠"
        process = self.screen_process
        mp4_path = self.screen_file
        self.screen_process = None
        self.screen_file = None
        threading.Thread(
            target=self._process_screen_recording,
            args=(process, mp4_path),
            daemon=True,
        ).start()

    def _process_screen_recording(self, process, mp4_path: str):
        wav_path = None
        try:
            # Stop ffmpeg cleanly so the container is finalized
            try:
                process.stdin.write(b"q\n")
                process.stdin.flush()
                process.wait(timeout=15)
            except Exception:
                process.kill()
                process.wait()

            # Ask for context before the transcription round-trip
            context = self._ask_context()
            if context is None:
                self._notify("Unscatter", "Screen recording cancelled.")
                return

            # Extract audio track from the video (best-effort — silent/missing audio is fine)
            transcript = ""
            wav_path = tempfile.mktemp(suffix=".wav")
            extract = subprocess.run(
                [
                    "ffmpeg", "-i", mp4_path,
                    "-vn", "-acodec", "pcm_s16le",
                    "-ar", "16000", "-ac", "1",
                    "-y", wav_path,
                ],
                capture_output=True,
            )
            if extract.returncode == 0:
                try:
                    with open(wav_path, "rb") as f:
                        r = requests.post(
                            f"{BACKEND}/api/capture/voice", files={"file": f}, timeout=30
                        )
                    r.raise_for_status()
                    transcript = r.json().get("raw_text", "").strip()
                except Exception:
                    pass  # transcription failure is non-fatal

            raw_text = transcript or "(no speech — context only)"
            r = requests.post(
                f"{BACKEND}/api/ingest",
                json={"modality": "screen", "raw_text": raw_text, "user_note": context},
                timeout=60,
            )
            r.raise_for_status()
            summary = r.json().get("summary_for_user", "Captured.")
            self._notify("Unscatter", summary)

        except requests.exceptions.ConnectionError:
            self._notify("Unscatter", "Backend not running — start uvicorn first.")
        except Exception as e:
            self._notify("Unscatter", f"Screen capture failed: {e}")
        finally:
            for path in filter(None, [mp4_path, wav_path]):
                try:
                    os.unlink(path)
                except OSError:
                    pass

    def _ask_context(self) -> str | None:
        """Show a blocking osascript dialog. Returns the text, or None if cancelled."""
        result = subprocess.run(
            [
                "osascript", "-e",
                'display dialog "WHAT IS THE CONTEXT OF THIS SCREEN RECORDING?" '
                'default answer "" with title "Unscatter" '
                'buttons {"Cancel", "Save to Brain"} default button "Save to Brain"',
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            return None  # user clicked Cancel or pressed Escape
        output = result.stdout.strip()
        if "text returned:" in output:
            return output.split("text returned:")[-1].strip()
        return ""

    # ── Shared helpers ─────────────────────────────────────────────────────────

    def _notify(self, title: str, message: str):
        safe_msg = message.replace('"', "'").replace("\\", "")
        safe_title = title.replace('"', "'")
        subprocess.run(
            [
                "osascript", "-e",
                f'display notification "{safe_msg}" with title "{safe_title}" sound name "Glass"',
            ],
            capture_output=True,
        )

    def open_web(self, _):
        subprocess.run(["open", "http://localhost:5173"])


if __name__ == "__main__":
    UnscatterApp().run()
