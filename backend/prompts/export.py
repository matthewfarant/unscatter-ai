EXPORT_PROMPT = """You are generating a Claude Skill from a topic cluster in the company brain.

TOPIC: {topic_name}
TOPIC DESCRIPTION: {topic_description}

ALL NOTES IN THIS TOPIC:
{notes_full_content}

Generate a SKILL.md:

---
name: {topic_slug}
description: <one paragraph: when to load this skill — specific file paths, keywords, task types>
---

# {{topic_name}}

## When to use this skill
<Explicit triggers>

## Key conventions
<Bulleted rules — every rule must be "Always X" or "Never Y">

## Gotchas
<Only include if notes contain type=gotcha. Otherwise omit section.>

## Reference
<Dense, scannable content by sub-topic>

Return raw markdown only. No preamble. Keep under 800 lines."""
