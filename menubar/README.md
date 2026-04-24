# Unscatter Menu Bar App

macOS companion app that lets you capture knowledge from any app without opening the browser.

## Setup

```bash
# From the project root, using the same venv as the backend:
pip install -r menubar/requirements.txt

# Or create a separate env:
python3 -m venv menubar/venv
source menubar/venv/bin/activate
pip install -r menubar/requirements.txt
```

## Run

Start the backend first, then:

```bash
python menubar/menubar_app.py
```

A 🧠 icon appears in your macOS menu bar.

## Usage

1. Click 🧠 → **Start Voice Capture** — icon turns 🔴
2. Speak freely for as long as you want
3. Click 🔴 → **Stop & Ingest**
4. A native macOS notification appears with a summary of what was added to your brain
5. Open the web app to browse the new note

## Permissions

First run: macOS will ask for **Microphone** access. Grant it.  
No Accessibility permission needed. No Karabiner. No keyboard remapping.
