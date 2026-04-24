---
confidence: 0.9
created_at: '2026-04-24T04:03:27.537313Z'
freshness_score: 1.0
id: note_hnsw42
last_verified_at: '2026-04-24T04:03:27.537313Z'
related_notes:
- note_emb002
- note_db001
source_modality: voice
tags:
- pgvector
- hnsw
- performance
- indexing
title: Missing HNSW index caused 400ms vector queries — always use vector_cosine_ops
topics:
- topic_embeddings
- topic_database
type: gotcha
updated_at: '2026-04-24T04:03:27.537313Z'
---

## TL;DR
Vector similarity queries ran at 400ms because the embedding column had only a btree index; adding an HNSW index dropped latency to 8ms.

## Context
Debugging slow nearest-neighbor search revealed the embedding column was never given a vector index — btree does nothing for cosine similarity.

## Content
- Symptom: ~400ms per simple nearest-neighbor query on embeddings table.
- Root cause: only a btree index existed on the embedding column; pgvector fell back to sequential scan.
- Fix: `CREATE INDEX CONCURRENTLY ... USING hnsw (embedding vector_cosine_ops)` — latency dropped to ~8ms (~50x).
- Also bumped `ef_search` from the default (too low) to 100 for better recall at query time.
- Baseline HNSW build params (see note_emb002): m=16, ef_construction=128. This note adds the runtime `ef_search=100` setting.

## Watch out for
- Btree on a vector column is silently useless — Postgres won't warn you.
- Always use `CREATE INDEX CONCURRENTLY` in production to avoid table locks.
- `ef_search` is a session/runtime GUC; set it per-connection or globally, not at index build time.
