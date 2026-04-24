---
id: note_meta003
title: How to query and export knowledge from Unscatter
created_at: 2026-04-24T09:00:00Z
updated_at: 2026-04-24T09:00:00Z
last_verified_at: 2026-04-24T09:00:00Z
source_modality: text
type: reference
topics:
- topic_meta
related_notes:
- note_meta001
- note_meta002
tags:
- chat
- wiki
- graph
- export
- claude-skills
- how-to
freshness_score: 1.0
confidence: 1.0
---

## TL;DR
Browse the wiki, ask the chatbot (it cites sources), explore the graph with 4 overlays, or export topics as Claude Skills that plug into Claude Code.

## Context
Capture is only half the value. Unscatter gives you three retrieval modes and one export path, each serving a different use case.

## Content
- **Wiki view:** Browse auto-organized topic clusters. Click into a topic to see all notes. Each note shows a freshness indicator, type badge (decision/gotcha/learning/convention), and related notes.
- **Chat (right panel):** Ask anything in natural language. Claude answers using only your notes and cites every fact with a clickable note ID. If an answer is wrong, type a correction and Claude updates the source note.
- **Graph view:** Force-directed graph of all notes and topics with 4 overlays: Coverage (which topics are thin), Freshness (which notes are stale), Connections (hidden cross-topic links), Onboarding (AI-suggested reading order for new hires).
- **Export to Claude Skills:** Click Export → pick topics → download SKILL.md files. Drop them into `.claude/skills/` in any repo. Claude Code and PR bots instantly gain your team's full tacit knowledge context.
