---
confidence: 0.95
created_at: 2026-03-15 10:00:00+00:00
freshness_score: 1.0
id: note_db001
last_verified_at: 2026-03-15 10:00:00+00:00
related_notes:
- note_emb002
- note_db002
source_modality: text
tags:
- pgvector
- pinecone
- cost
- vector-db
title: Switched from Pinecone to pgvector — cost + operational simplicity
topics:
- topic_database
- topic_embeddings
type: decision
updated_at: '2026-04-24T02:46:21.653048Z'
---

## TL;DR
Replaced Pinecone with pgvector: saves $340/month and fits our sub-500k vector corpus without managed scaling.

## Context
Revisiting the March 2026 migration decision — corpus size justifies self-hosted pgvector over a managed vector DB.

## Content
- Cost: ~$340/month saved by dropping Pinecone.
- Scale: corpus is under 500k vectors, well within pgvector's comfortable range on our existing Postgres.
- Operational: eliminates a managed service dependency; vectors colocate with relational data.
- Recall: parity with Pinecone at our scale (see note_emb002 for HNSW tuning baseline).

## Watch out for
Reassess if the corpus approaches multi-million vectors or if pgvector recall drops below 85% — managed scaling may become worth the cost again.
