---
id: note_auth002
title: Auth middleware order — rate limiter must run before JWT validation
created_at: 2026-04-12T16:00:00Z
updated_at: 2026-04-12T16:00:00Z
last_verified_at: 2026-04-12T16:00:00Z
source_modality: text
type: convention
topics:
- topic_auth
related_notes:
- note_auth001
tags:
- middleware
- rate-limiting
- fastapi
freshness_score: 1.0
confidence: 0.95
---

## TL;DR
Rate limiter middleware must be registered before JWT validation — otherwise invalid tokens bypass rate limiting and can flood the validator.

## Context
Discovered during a pen test Q1 2026. Unauthenticated requests were hitting JWT decode at full speed.

## Content
- Correct middleware order (FastAPI): rate_limiter → cors → jwt_validator → route handler
- Rate limit: 100 req/min per IP for unauthenticated, 1000 req/min per user for authenticated
- Use `slowapi` library with Redis backend for distributed rate limiting
- JWT validation happens inside a FastAPI dependency, not middleware — order is enforced via `app.add_middleware()` call order

## Watch out for
FastAPI middleware runs in LIFO order — the last `add_middleware()` call runs first. Add rate limiter last in code to run it first.
