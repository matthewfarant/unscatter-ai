---
confidence: 0.95
created_at: 2026-04-18 14:00:00+00:00
freshness_score: 1.0
id: note_emb002
last_verified_at: 2026-04-18 14:00:00+00:00
related_notes:
- note_emb001
- note_db001
- note_hnsw42
source_modality: text
tags:
- pgvector
- hnsw
- tuning
title: pgvector HNSW index tuning baseline
topics:
- topic_embeddings
- topic_database
type: reference
updated_at: '2026-04-24T04:03:27.537313Z'
---

## TL;DR
pgvector HNSW runs m=16, ef_construction=128, ef_search=100; recall@10 improved 0.91→0.96 with no measurable write-latency hit at current scale.

## Context
Baseline tuning parameters for our pgvector HNSW indexes across embedding tables.

## Content
- Build params: `m=16`, `ef_construction=128`.
- Query param: `ef_search=100` (raised from default after the incident in note_hnsw42).
- Operator class: `vector_cosine_ops`.
- Recall@10: 0.91 → 0.96 vs. prior config.
- No measurable write-latency regression at current corpus size (<500k vectors).

## Watch out for
- These numbers are validated at sub-500k vectors; revisit if corpus grows significantly.
- `ef_search` is runtime, not index-time — must be set per session or globally.
