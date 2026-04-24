---
confidence: 0.85
created_at: '2026-04-24T05:13:46.244348Z'
freshness_score: 1.0
id: note_cma003
last_verified_at: '2026-04-24T05:13:46.244348Z'
related_notes:
- note_cma001
- note_cma002
source_modality: text
tags:
- lock-in
- risk
- agents
- anthropic
title: Managed Agents lock-in risk — Claude-only, key features gated
topics:
- topic_agents
type: gotcha
updated_at: '2026-04-24T05:13:46.244348Z'
---

## TL;DR
Managed Agents runs Claude only; the most compelling features (multi-agent, self-eval) are gated research previews — real vendor lock-in risk.

## Context
Evaluating adoption tradeoffs at launch.

## Content
- **Model lock-in:** no GPT/Gemini/open-source support. Switching providers later means rebuilding the agent layer.
- **Feature gating:** multi-agent coordination (sub-agents) and self-evaluation (+up to 10pt task success in internal tests) are research preview only, require separate access request.
- **Ecosystem signal:** Anthropic ended Claude Pro/Max access for third-party tools around the same time, pushing devs toward API pricing.
- **Open-source alternatives** if portability matters: Multica (closest analog — lifecycle, multi-agent, multi-model), CrewAI, Cabinet.

## Watch out for
Don't build core product flows on multi-agent / self-eval until they exit research preview — SLAs and pricing are undefined.
