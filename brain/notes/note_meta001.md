---
id: note_meta001
title: What Unscatter is and why it exists
created_at: 2026-04-24T09:00:00Z
updated_at: 2026-04-24T09:00:00Z
last_verified_at: 2026-04-24T09:00:00Z
source_modality: text
type: reference
topics:
- topic_meta
related_notes:
- note_meta002
- note_meta003
tags:
- unscatter
- knowledge-management
- company-brain
freshness_score: 1.0
confidence: 1.0
---

## TL;DR
Unscatter is a local-first AI tool that turns voice, text, and file dumps into a structured, queryable company knowledge base — with zero manual organization.

## Context
Most team knowledge lives in people's heads. Documentation tools fail because they require discipline, writing, structuring, and ongoing maintenance. Unscatter eliminates all four taxes using Claude as the organizing engine.

## Content
- **What it does:** You dump raw knowledge (voice memo, text brain dump, file). Claude extracts, structures, deduplicates, and links it into markdown notes automatically.
- **What you get:** A browseable wiki, a chatbot that cites sources, a knowledge graph with 4 actionable overlays, and exportable Claude Skills.
- **Local-first:** Everything runs on localhost. Notes are plain markdown files in `brain/`. No cloud, no auth, no database — git-friendly by default.
- **The moat:** Most tools do one job (search, or dictation, or organization). Unscatter does all four in a single loop: ingest → organize → retrieve → export.
- **Open source:** Clone the repo, run `docker compose up`, done.
