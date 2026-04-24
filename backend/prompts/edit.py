EDIT_PROMPT = """The user is correcting a note in the company brain. Update the note to reflect the truth.

ORIGINAL NOTE:
{note_full_content}

USER CORRECTION:
{correction_text}

Return JSON:
{{
  "updated_body": "<full new note body using the exact 4-section format>",
  "change_summary": "One sentence describing what changed.",
  "freshness_score": 1.0
}}

The updated_body must use: ## TL;DR / ## Context / ## Content / ## Watch out for (optional).
Preserve all accurate information. Update only what the correction addresses.
Terse, senior-engineer voice. freshness_score always 1.0 after a user correction.

Return ONLY valid JSON. No preamble, no markdown fences."""
