---
confidence: 0.9
created_at: '2026-04-24T05:13:46.244348Z'
freshness_score: 1.0
id: note_cma002
last_verified_at: '2026-04-24T05:13:46.244348Z'
related_notes:
- note_cma001
source_modality: text
tags:
- pricing
- anthropic
- agents
title: Claude Managed Agents pricing — $0.08/session-hour + tokens
topics:
- topic_agents
type: reference
updated_at: '2026-04-24T05:13:46.244348Z'
---

## TL;DR
Standard Claude token rates plus $0.08 per active session-hour; a 24/7 agent runs ~$58/month in runtime before tokens.

## Context
Cost modeling for potentially adopting Managed Agents vs self-hosted agent loop.

## Content
- Tokens billed at standard API rates: Sonnet 4.6 $3/$15 per MTok in/out; Opus 4.6 $5/$25.
- Runtime surcharge: **$0.08 per session-hour** of active agent time.
- Web search tool: $10 per 1,000 calls.
- No flat monthly fee; scales with usage.
- Priority Tier (higher rate limits) via sales.
- 24/7 single agent ≈ $58/mo runtime alone (720h × $0.08).

## Watch out for
Beta pricing is not a permanent commitment — model the downside of a 2–3x session-hour hike before committing workflows.
