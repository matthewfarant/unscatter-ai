---
confidence: 0.9
created_at: '2026-04-24T03:15:30.934054Z'
freshness_score: 1.0
id: note_bil001
last_verified_at: '2026-04-24T03:15:30.934054Z'
related_notes: []
source_modality: text
tags:
- stripe
- billing
- compliance
- pci
- soc2
title: Stripe chosen for billing — SOC 2 / PCI offload
topics:
- topic_billing
type: decision
updated_at: '2026-04-24T03:15:30.934054Z'
---

## TL;DR
Stripe handles billing: chosen to inherit SOC 2/PCI compliance instead of spending ~6 months building our own payment infra.

## Context
Needed metered billing with compliant card handling on a tight timeline; building PCI-compliant infrastructure in-house was not feasible.

## Content
- Provider: Stripe.
- Primary driver: SOC 2 / PCI compliance already covered — avoids ~6 months of in-house PCI buildout.
- Pricing model: metered usage via Stripe's metering API.
- Invoicing: auto-sent on the 1st of each month.

## Watch out for
Metering API usage records must be reported before invoice close on the 1st or they roll into the next cycle.
