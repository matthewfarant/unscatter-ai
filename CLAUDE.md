# Unscatter — Claude Code Instructions

## Project
5-hour hackathon build. Stack: FastAPI + React + shadcn/Luma + Anthropic API + Groq Whisper.

## Critical files — read these before writing any code
- `PRD_unscatter.md` — full product spec and build order
- `UNSCATTER_SKILL.md` — implementation guide with all prompts, complete code patterns, gate commands, and hour-by-hour build order. This is your primary reference. Copy code from it directly — do not rewrite from scratch.

## Time management
You are operating under a 5-hour hard constraint. At the end of every hour, stop and report:
- What was completed this hour
- Whether the gate was met (yes/no)
- What is at risk in the next hour
- Your recommended next action

If any single task is taking longer than 20 minutes and blocking the gate, flag it immediately — do not keep pushing silently.

## Build rules
- Follow the hour-by-hour order in UNSCATTER_SKILL.md Section 9 strictly. Do not jump ahead.
- Meet the gate before advancing to the next hour.
- If behind schedule: cut from PRD Section 15 (cut list), bottom-up. Never cut the menu bar app.
- Use TodoWrite at the start of each hour to list that hour's tasks. Mark items completed immediately as you finish them.
- Populate `brain/` with seed data (UNSCATTER_SKILL.md Section 11) during Hour 1, before the gate. The demo must never show an empty brain.

## Code rules
- Copy `brain_io.py`, `claude_client.py`, all 4 prompts, and all route skeletons from UNSCATTER_SKILL.md — do not rewrite them.
- Always use `parse_claude_json()` — never raw `json.loads()` on a Claude API response.
- Always write files atomically: write to `.tmp` then `os.rename()`.
- Never block the menu bar UI thread — background thread with `daemon=True` for all ingest work.
- macOS notifications: use `osascript`, not `rumps.notification()`.

## Dependency hygiene (security)
Before installing any new package (npm, pip, brew, etc.), check its recent changelog / release notes / GitHub for anything suspicious — supply chain attacks are real. Be especially cautious with: new-to-you packages, recent maintainer changes, abrupt version jumps, typo-squat-prone names. Pin versions (no floating `latest`) and surface anything odd before proceeding.

## Stack
- Backend: FastAPI on `localhost:8000`. CORS open for `localhost:5173`.
- Frontend: React + Vite + shadcn Luma (dark mode, Zinc palette, accent `#8B5CF6`) on `localhost:5173`.
- Python venv at `./venv` — always use `venv/bin/python` and `venv/bin/uvicorn`.
- Brain storage: `./brain/` (markdown notes + `index.json`). Never a database.

## Deployment model (decided, do not change)
Unscatter is a **local-first open source tool** — not a SaaS, not a cloud service.
- No auth, no multi-tenancy. Single user, localhost only.
- The menu bar app records from the local mic and talks to localhost — inherently local.
- Ship as an open source repo. Add `docker-compose.yml` as a convenience wrapper (backend + frontend) so users can `git clone && docker compose up`. Docker is for onboarding ease, not production hosting.
- Do NOT add auth, cloud storage, or multi-tenancy — that is out of scope and a rewrite.

## Port gotcha
Docker for Mac may proxy IPv6 on port 8000. Always use `http://127.0.0.1:8000` (explicit IPv4) in curl commands, frontend axios config, and any internal references — never `http://localhost:8000`.
