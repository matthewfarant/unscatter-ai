---
id: note_emb004
title: Embedding reindex strategy — nightly incremental, full weekly
created_at: 2026-04-14T10:00:00Z
updated_at: 2026-04-14T10:00:00Z
last_verified_at: 2026-04-14T10:00:00Z
source_modality: text
type: convention
topics:
- topic_embeddings
related_notes:
- note_emb001
- note_emb002
tags:
- embedding
- reindex
- cron
freshness_score: 0.85
confidence: 0.88
---

## TL;DR
We run nightly incremental reindexing (changed docs only) and a full reindex every Sunday 3am UTC to catch drift.

## Context
Came up when we noticed stale embeddings after bulk content updates. Incremental alone missed ~2% of changed docs.

## Content
- Nightly (2am UTC): query `updated_at > last_indexed_at` → re-embed → upsert to pgvector
- Weekly full (Sunday 3am): truncate + rebuild entire index — catches any incremental misses
- Worker: Celery beat task, ~45 min for 480k vectors on 4 workers
- Cost: ~$0.50/week for full reindex at current corpus size
- Monitoring: alert if nightly job processes 0 documents (likely a bug, not a quiet day)
