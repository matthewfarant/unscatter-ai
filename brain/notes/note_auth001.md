---
id: note_auth001
title: JWT token expiry — 15 min access, 7 day refresh
created_at: 2026-04-10T10:00:00Z
updated_at: 2026-04-10T10:00:00Z
last_verified_at: 2026-04-10T10:00:00Z
source_modality: text
type: decision
topics:
- topic_auth
related_notes:
- note_auth002
tags:
- jwt
- auth
- security
- session
freshness_score: 1.0
confidence: 0.98
---

## TL;DR
Access tokens expire in 15 minutes; refresh tokens expire in 7 days — matched to legal's session compliance requirement.

## Context
Legal flagged our original 24h access tokens in Q4 2025 compliance review. Negotiated 15 min as the max.

## Content
- Access token TTL: 15 min (legally mandated)
- Refresh token TTL: 7 days (stored in httpOnly cookie)
- Rotation: refresh token is single-use — issue a new one on every refresh
- Storage: access token in memory only (never localStorage), refresh in httpOnly cookie
- Signing: RS256 (asymmetric) — public key shared with partner services
