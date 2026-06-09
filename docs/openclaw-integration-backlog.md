# OpenClaw × ARIES Integration Backlog

**Last updated:** 2026-06-09  
**Plan source:** `lemorax/.hermes/plans/2026-06-01_0126-openclaw-agent-runtime-integration.md`

## Architecture

```
ARIES UI → /api/agents/* → lib/agents/openclaw-client.ts → OpenClaw Gateway (ws://127.0.0.1:18789)
         → Agents (ceo-copilot, …) → Lemorax tools (query_business_data) → Supabase
```

**Principle:** Browser never talks to OpenClaw directly.

## Parallel tracks

| Track | Owner scope |
|-------|-------------|
| `infra` | OpenClaw gateway, plugins, Telegram, env |
| `api` | Next.js routes, openclaw-client, SQL tool |
| `db` | Supabase migrations, agent tables |
| `ui` | Dashboard agents pages, chat migration |

---

## Phase 0 — Discovery

**Status:** `in_progress` | **Track:** infra + api

- [x] Confirm OpenClaw installed (2026.6.1)
- [x] Identify ChatGPT Login allowlist fix → `openclaw plugins enable openai`
- [ ] Gateway running (`openclaw gateway health`)
- [ ] WS methods documented (`sessions.send`, `chat.send`)
- [ ] CLI smoke test (`openclaw agent -m "ping" --json`)
- [x] Discovery doc → `docs/openclaw-discovery-results.md`

**Acceptance:** Gateway healthy; one successful agent turn via CLI or WS.

**Depends on:** Disk space, gateway restart.

---

## Phase 1 — OpenClaw-backed chat MVP

**Status:** `not_started` | **Track:** api + ui

- [ ] `lib/agents/types.ts`
- [ ] `lib/agents/openclaw-client.ts` (WS adapter)
- [ ] `app/api/agents/chat/route.ts` (SSE)
- [ ] Wire `ai-analyst` + `OpenclawChatModal` to new route
- [ ] Keep `/api/ai-chat` as fallback
- [ ] `.env.example` OPENCLAW_* vars

**Acceptance:** Business question streams answer via OpenClaw; failures visible.

**Depends on:** Phase 0

---

## Phase 2 — Safe SQL tool

**Status:** `not_started` | **Track:** api + db

- [ ] `lib/agents/sql-policy.ts`
- [ ] `app/api/agents/tools/query-business-data/route.ts`
- [ ] Register tool with OpenClaw agent config
- [ ] PII redaction + table allowlists

**Acceptance:** SELECT works; INSERT/DROP blocked; queries logged.

**Depends on:** Phase 1

---

## Phase 3 — Sessions & runs persistence

**Status:** `not_started` | **Track:** db + api

- [ ] Migration: `agent_definitions`, `agent_sessions`, `agent_messages`, `agent_runs`, `agent_tool_calls`
- [ ] Seed `ceo-copilot` definition
- [ ] Chat route persists messages/runs

**Acceptance:** Session survives refresh; runs in DB.

**Depends on:** Phase 1

---

## Phase 4 — Agent dashboard UI

**Status:** `not_started` | **Track:** ui

- [ ] `/dashboard/agents` hub
- [ ] Agent selector, tool-call panel, run timeline
- [ ] Sidebar nav link

**Depends on:** Phase 3

---

## Phase 5 — Scheduled tasks

**Status:** `not_started` | **Track:** api + db + infra

- [ ] `agent_schedules` table + API
- [ ] Cron route `schedules/run-due`
- [ ] Schedule UI

**Depends on:** Phase 3

---

## Phase 6 — Sub-agent templates

**Status:** `not_started` | **Track:** api + infra

- [ ] Templates: finance, sales, HR, marketing analysts
- [ ] `openclaw agents add` integration
- [ ] Per-agent table permissions

**Depends on:** Phase 2, 4

---

## Phase 7 — Approval & audit

**Status:** `not_started` | **Track:** api + ui

- [ ] `agent_approvals` table
- [ ] Approval UI for risky tool calls

**Depends on:** Phase 6

---

## Suggested parallel execution

| Now | Next batch |
|-----|------------|
| infra: ChatGPT login + gateway | api: Phase 1 scaffold |
| api: openclaw-client WS spike | db: draft migration SQL |
| ui: (wait) | ui: agent selector mock |
