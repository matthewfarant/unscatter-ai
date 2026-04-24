---
id: note_db002
title: Postgres connection pooling — PgBouncer in transaction mode
created_at: 2026-04-05T14:00:00Z
updated_at: 2026-04-05T14:00:00Z
last_verified_at: 2026-04-05T14:00:00Z
source_modality: text
type: convention
topics:
- topic_database
related_notes:
- note_db001
tags:
- postgres
- pgbouncer
- connection-pooling
freshness_score: 0.25
confidence: 0.93
---

## TL;DR
PgBouncer in transaction mode caps our Postgres connections at 20 regardless of API pod count — prevents connection exhaustion under load.

## Context
Hit connection exhaustion (500 conns) during a traffic spike in Feb 2026. RDS max_connections = 500 on r6g.large.

## Content
- PgBouncer pool_mode = transaction (not session — incompatible with prepared statements)
- max_client_conn = 1000, default_pool_size = 20
- Each API pod connects to PgBouncer, not Postgres directly
- SQLAlchemy pool_size=5, max_overflow=10 per pod — PgBouncer multiplexes to 20 Postgres connections
- Prepared statements: disabled (use `DISCARD ALL` workaround not needed in transaction mode)

## Watch out for
SET statements and advisory locks do NOT work in transaction mode — they require session mode. We don't use either, but be aware.
