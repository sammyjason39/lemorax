# OpenClaw Discovery Results

**Date:** 2026-06-09  
**OpenClaw version:** 2026.6.1  
**Config:** `~/.openclaw/openclaw.json`

## Integration mode (recommended)

**Primary:** WebSocket Gateway at `ws://127.0.0.1:18789`  
**Fallback:** CLI `openclaw agent -m "..." --json --session-id <id>`

Lemorax adapter: `lib/agents/openclaw-client.ts` → Gateway WS protocol v4.

## Key WS methods (from gateway protocol docs)

| Method | Use |
|--------|-----|
| `sessions.create` | New chat session |
| `sessions.send` | Send user message |
| `chat.send` | Alternative chat entry |
| `agent.wait` | Wait for run completion |
| `sessions.list` | Session index |

Auth: `connect` handshake with `gateway.auth.token`.

## CLI smoke tests

```bash
openclaw gateway run --force          # start gateway
openclaw gateway health               # should return OK
openclaw agent -m "Hello" --json      # one agent turn
openclaw models auth login --provider openai   # ChatGPT subscription
```

## Local config snapshot

- Gateway port: **18789**
- Auth: **token** (set `OPENCLAW_GATEWAY_TOKEN` in Lemorax `.env.local`)
- `plugins.allow`: includes **`openai`** (enabled 2026-06-09)
- Default agent: `main` (ollama) — switch to `openai/gpt-5.5` after OAuth

## Blockers found

1. **Gateway not running** during initial check — must start before Lemorax integration.
2. **Disk space** — machine at ~100% capacity; may block builds and logs.
3. **Stale plugin** `openclaw-web-search` in config — warnings only, remove when convenient.

## Lemorax env vars

```env
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=<from ~/.openclaw/openclaw.json gateway.auth.token>
OPENCLAW_INTEGRATION_MODE=ws
OPENCLAW_DEFAULT_AGENT=main
```

Do not commit tokens.

## References

- https://docs.openclaw.ai/
- https://docs.openclaw.ai/gateway/protocol
- https://docs.openclaw.ai/providers/openai
