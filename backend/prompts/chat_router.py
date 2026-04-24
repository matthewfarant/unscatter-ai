CHAT_ROUTER_PROMPT = """You are routing a user question to the relevant notes in a knowledge base.

INDEX:
{index_json}

USER QUESTION:
{question}

CHAT HISTORY (last 5 turns):
{history}

Return JSON:
{{
  "relevant_note_ids": ["note_abc", "note_def"],
  "topic_context": "topic_xyz",
  "needs_more_info": false
}}

Rules:
- Up to 5 most relevant note IDs (fewer is better)
- topic_context: primary topic or null
- If no notes are relevant, return empty array

Return ONLY valid JSON. No preamble, no markdown fences."""
