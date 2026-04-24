---
id: note_emb001
title: text-embedding-3-small chosen over ada-002
created_at: 2026-04-20T09:00:00Z
updated_at: 2026-04-20T09:00:00Z
last_verified_at: 2026-04-20T09:00:00Z
source_modality: text
type: decision
topics:
- topic_embeddings
related_notes:
- note_emb002
- note_emb003
tags:
- embedding-model
- cost
- openai
freshness_score: 1.0
confidence: 0.95
---

## TL;DR
We use text-embedding-3-small: 5x cheaper than ada-002 with 2% better recall on our QA benchmark.

## Context
Came up during infra cost review Q1 2026. ada-002 was costing ~$400/month at our query volume.

## Content
- text-embedding-3-small: $0.02/1M tokens vs ada-002 $0.10/1M tokens
- Internal QA benchmark: 87.3% recall vs 85.1% for ada-002
- Dimension: 1536 (same as ada-002 — no index rebuild needed)
- Switched cold — no gradual rollout needed at our scale (<500k vectors)
