---
id: note_meta002
title: How to capture knowledge in Unscatter
created_at: 2026-04-24T09:00:00Z
updated_at: 2026-04-24T09:00:00Z
last_verified_at: 2026-04-24T09:00:00Z
source_modality: text
type: reference
topics:
- topic_meta
related_notes:
- note_meta001
- note_meta003
tags:
- capture
- voice
- menu-bar
- how-to
freshness_score: 1.0
confidence: 1.0
---

## TL;DR
Three ways to capture: menu bar voice (ambient, no browser needed), web UI capture modal (voice/text/file), or direct text dump.

## Context
The whole point of Unscatter is that capture is effortless. You should never have to think about organization — just dump.

## Content
- **Menu bar app (recommended):** Click the 🧠 icon in the macOS menu bar → Start Voice Capture → speak → Stop & Ingest. A native notification confirms what was added. You never open the browser.
- **Web UI — Voice:** Click "Capture" in the top bar → Voice tab → record → stop. Claude processes and shows which notes were created or updated.
- **Web UI — Text:** Click "Capture" → Text tab → paste or type anything raw. Works for meeting notes, Slack threads, code comments, anything.
- **Web UI — File:** Click "Capture" → File tab → drop a PDF, .md, or .txt. Text is extracted and ingested.
- **What Claude does with your dump:** Deduplicates against existing notes, links related concepts, splits multi-concept dumps into atomic notes, flags contradictions with existing knowledge.
