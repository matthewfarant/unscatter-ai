---
confidence: 0.9
created_at: '2026-04-24T05:13:46.244348Z'
freshness_score: 1.0
id: note_cma001
last_verified_at: '2026-04-24T05:13:46.244348Z'
related_notes: []
source_modality: text
tags:
- anthropic
- claude
- agents
- managed-infra
title: Claude Managed Agents — what it is and core primitives
topics:
- topic_agents
type: reference
updated_at: '2026-04-24T05:13:46.244348Z'
---

## TL;DR
Anthropic's Claude Managed Agents (public beta, Apr 8 2026) offers hosted infra for running Claude as an autonomous agent — no DIY agent loop.

## Context
Captured at launch as a potential alternative to building our own agent loop/sandboxing/state layer.

## Content
Three primitives:
- **Agent** — model + system prompt + tools + MCP servers + skills. Created once, referenced by ID.
- **Environment** — cloud container config: pre-installed runtimes (Python/Node/Go), network rules, mounted files.
- **Session** — live run binding an agent to an environment; provisions container, streams events, idles on completion.

Managed for you: sandboxed code exec, checkpointing (resume long tasks after failure), credentials/state, tool orchestration via `agent_toolset_20260401` (bash, file ops, web search), error recovery, prompt caching, context compaction, tracing.

SDKs: Python, TS, Go, Ruby, PHP, C#, cURL. Requires beta header `managed-agents-2026-04-01` (SDK auto-sets). Claude Code ships a `claude-api` Skill for onboarding.

Early customers: Notion, Asana (AI Teammates), Rakuten, Sentry (bug→PR), Vibecode, Atlassian.

Docs: https://platform.claude.com/docs/en/managed-agents/overview
