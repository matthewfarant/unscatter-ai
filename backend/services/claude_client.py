import re
import json
import os
from anthropic import Anthropic

client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

def call_claude(prompt: str, images: list = None, max_tokens: int = 4096) -> str:
    content = [{"type": "text", "text": prompt}]
    if images:
        for img_b64 in images:
            content.insert(0, {
                "type": "image",
                "source": {"type": "base64", "media_type": "image/png", "data": img_b64}
            })
    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": content}]
    )
    return response.content[0].text

def parse_claude_json(response: str) -> dict:
    """Always use this — Claude sometimes wraps JSON in markdown fences."""
    cleaned = response.strip()
    cleaned = re.sub(r'^```(?:json)?\n?', '', cleaned)
    cleaned = re.sub(r'\n?```$', '', cleaned)
    return json.loads(cleaned.strip())
