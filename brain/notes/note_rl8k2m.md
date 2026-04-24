---
confidence: 0.9
created_at: '2026-04-24T03:09:30.878249Z'
freshness_score: 1.0
id: note_rl8k2m
last_verified_at: '2026-04-24T03:09:30.878249Z'
related_notes:
- note_auth002
source_modality: text
tags:
- rate-limiting
- redis
- api-keys
title: Rate limiting — 60 req/min per API key via Redis token bucket
topics:
- topic_auth
type: decision
updated_at: '2026-04-24T03:09:30.878249Z'
---

## TL;DR
60 req/min per API key via Redis token bucket, burst 10, 429 + Retry-After on limit.

## Context
Rate limiting strategy for the public API — chose per-key over per-IP to avoid punishing users sharing NAT egress.

## Content
- Algorithm: Redis token bucket, 60 requests/minute steady state.
- Burst allowance: 10 additional tokens absorbed above steady rate.
- Keyed by API key, not client IP — shared-NAT users (corporate, mobile carriers) aren't collectively throttled.
- On exhaustion: HTTP 429 with `Retry-After` header indicating seconds until next token.
- Pairs with middleware ordering (see note_auth002): rate limiter runs before JWT validation so invalid/expired tokens still count against the limit.
