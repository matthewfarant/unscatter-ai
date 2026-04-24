---
id: note_emb003
title: Embedding batch size limit — 2048 tokens per item
created_at: 2026-04-15T11:00:00Z
updated_at: 2026-04-15T11:00:00Z
last_verified_at: 2026-04-15T11:00:00Z
source_modality: voice
type: gotcha
topics:
- topic_embeddings
related_notes:
- note_emb001
tags:
- batch-size
- tokenizer
- truncation
freshness_score: 0.9
confidence: 0.92
---

## TL;DR
text-embedding-3-small silently truncates inputs over 8191 tokens — chunk documents before embedding, not after.

## Context
Discovered when long legal PDFs were returning identical embeddings. Took 2 days to debug.

## Content
- Max input: 8191 tokens (not characters)
- Silent truncation — no error, just wrong embedding
- Our chunking strategy: 512-token chunks with 50-token overlap
- Use tiktoken `cl100k_base` encoder to count tokens before sending

## Watch out for
Do NOT use character count as a proxy for token count. A 3000-char legal sentence can be 900+ tokens.
