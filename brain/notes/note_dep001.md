---
confidence: 0.9
created_at: 2026-04-08 09:00:00+00:00
freshness_score: 1.0
id: note_dep001
last_verified_at: 2026-04-08 09:00:00+00:00
related_notes: []
source_modality: text
tags:
- fly.io
- deployment
- cli
title: Deploy to Railway — Dockerfile + railway up
topics:
- topic_deployment
type: decision
updated_at: '2026-04-24T04:53:26.279995Z'
---

## TL;DR
Deployment target is Fly.io; ship with `fly deploy`.

## Context
Migrated off Railway after their per-project billing change would have tripled monorepo cost. Fly.io is now the canonical deploy target.

## Content
- Platform: Fly.io
- Deploy command: `fly deploy`
- Dockerfile-based builds
- Prior note title referenced Railway + `railway up`; that path is deprecated and should not be used.
