# Chris Vega — Portfolio Backup (Open-sourced from VPS)

Built by Chris Vega (Merritt Island, FL) during 2025-2026, served by Socrates,
co-foreman of the OpenClaw AI Dojo. 

All four businesses are now shut down. This repo is the surviving codebase —
preserved for reference, portfolio, and potential future revival.

## Apps (`apps/`)

| App | Lines | What it does | Tech |
|---|---|---|---|
| `command-center/` | 1,163 | ISS-themed CRM: lead tracking, cadence, pipeline | Flask + SQLite + vanilla JS SPA |
| `leadgen/` | 2,811 | Lead scraping → scoring → enrichment → outreach v3 | Flask + SQLite + Apollo API + SendGrid |
| `photo-estimate/` | 1,326 | Photo-to-estimate tool (8 trades) + health check v1 | Flask + Ollama vision + SQLite |
| `health-check/` | 436 | Local business SEO health check (standalone) | Flask + Google Places/PageSpeed APIs |

**Total:** ~5,700 lines of Python (core), plus frontend HTML/JS SPAs.

## OpenClaw Dojo Dashboard (`openclaw-dashboard/`)

- `dashboard.html` (138KB) — the main dojo UI, went through ~5 design versions
  (Naruto Pagoda, Pokémon redesign, tactical HUD, space command)
- `dojo_server.py` (438 lines) — HTTP server with HMAC task intake for 8 sub-agents
- `agent_status.json/js` — 8-agent status engine: Musashi, Kage, Kiri, Mugen,
  Karasu, Oni, Amaterasu, Tengu + Socrates
- 12 backup files showing design iterations
- `regen_status.js` — status regeneration script

## Space Command Deliverables (`space-command-deliverables/`)

19 HTML documents — the full agency playbook:
SEO audit engine, CRO guide, outreach engine, backlink engine,
discovery call scripts, objection handling, onboarding SOP,
offer frameworks, Hormozi frameworks, n8n orchestration,
company battle cards, and more.

## Deploy Configs (`deploy-configs/`)

- nginx reverse proxy configs for all 4 apps
- systemd service files
- `openclaw.json` — the full dojo agent configuration
  (8 agents, model providers, subagent chains, routing)

## Security

- NO `.env` files, no API keys, no `.db` databases (removed before export).
  Secrets stored separately in a private migration bundle.
- The PIN hardcode in `command-center/app.py` (hardcoded fallback value) has been
  replaced with `os.environ["DOJO_PIN"]` — env-only, no default.
- All lead data excluded (73 real contacts = PII).

## Restore

These apps originally ran on a DigitalOcean VPS (Ubuntu, Flask on Python 3.11,
nginx reverse proxy, SQLite databases, SendGrid relay). To revive:

1. Create Python 3.11+ venv, `pip install flask`
2. Create a SQLite database (schema in each `app.py`)
3. Set env vars: `DOJO_PIN`, `DOJO_PIN_HASH`, `TASK_AUTH_TOKEN`, `GOOGLE_API_KEY`, `OPENROUTER_API_KEY`, etc.
   (list in each app's original `.env` on the private migration bundle)
4. `python app.py` — binds to 127.0.0.1:<port>
5. nginx reverse proxy from a domain to the local port

## Migration reference

This code was part of a larger agent migration (VPS → Mac Mini M4 Pro / Qwen 3.8 27B).
The agent identity, memory, skills, and session history moved via a separate
`hermes-agent-migration` skill. This repo is the *code* half; the *agent* half
lives in `~/.hermes/` on the Mac.

