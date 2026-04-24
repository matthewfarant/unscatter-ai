---
id: note_db003
title: Database migration strategy — Alembic with zero-downtime column adds
created_at: 2026-04-01T09:00:00Z
updated_at: 2026-04-01T09:00:00Z
last_verified_at: 2026-04-01T09:00:00Z
source_modality: text
type: convention
topics:
- topic_database
related_notes:
- note_db002
tags:
- alembic
- migrations
- zero-downtime
- postgres
freshness_score: 0.6
confidence: 0.9
---

## TL;DR
Always add nullable columns first, backfill in a separate migration, then add NOT NULL constraint — never add NOT NULL columns directly on large tables.

## Context
Previous team added a NOT NULL column to a 12M-row table and caused a 45-minute table lock in production.

## Content
- Step 1: `ALTER TABLE ADD COLUMN new_col TYPE DEFAULT NULL` — instant, no lock
- Step 2: batch backfill: `UPDATE ... WHERE id BETWEEN x AND y` in chunks of 10k rows
- Step 3: `ALTER TABLE ALTER COLUMN new_col SET NOT NULL` — fast once all rows have values
- Alembic: use `op.execute()` for raw SQL in batch steps
- Test migrations on staging with production-size data copy before applying to prod

## Watch out for
`ALTER TABLE ... ADD COLUMN ... DEFAULT <value> NOT NULL` in Postgres < 11 rewrites the entire table. We run PG 15 so this is safe, but older migrations may assume the old behavior.
