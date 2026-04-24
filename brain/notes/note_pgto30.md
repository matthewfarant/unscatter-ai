---
confidence: 0.9
created_at: '2026-04-24T04:21:36.182115Z'
freshness_score: 1.0
id: note_pgto30
last_verified_at: '2026-04-24T04:21:36.182115Z'
related_notes:
- note_db002
- note_db003
- note_hnsw42
source_modality: voice
tags:
- postgres
- timeout
- performance
- replica
title: Postgres statement_timeout — 30s primary, 5m replica for reports
topics:
- topic_database
type: convention
updated_at: '2026-04-24T04:21:36.182115Z'
---

## TL;DR
Primary Postgres enforces a 30s statement_timeout; long-running reports run on a separate replica with a 5-minute timeout.

## Context
Caps runaway queries and missing-index regressions on the hot path without blocking legitimate analytical workloads.

## Content
- Global `statement_timeout = 30s` on the primary. Anything exceeding this is treated as a bug: runaway query or missing index, not a legitimate operation.
- Reporting/analytics traffic is routed to a dedicated read replica with `statement_timeout = 5min`.
- Keep transactional endpoints on the primary; anything heavier belongs on the replica.

## Watch out for
- Don't raise the primary timeout to paper over a slow query — fix the index (see HNSW gotcha) or move the workload to the replica.
- Background jobs hitting the primary inherit the 30s cap; chunk long writes or point them at the replica-safe path.
