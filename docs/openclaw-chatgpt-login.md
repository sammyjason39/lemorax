# OpenClaw — ChatGPT Subscription Login

## Problem

```
ChatGPT Login plugin is disabled (blocked by allowlist).
```

## Root cause

`plugins.allow` did not include the bundled **`openai`** provider plugin. Only `ollama`, `memory-core`, and a stale `openclaw-web-search` entry were allowed.

## Fix applied (2026-06-09)

```bash
openclaw plugins enable openai
```

Verify:

```bash
openclaw config get plugins.allow
# Must include: "openai"
```

Restart gateway after any plugin change:

```bash
openclaw gateway run --force
# or: openclaw dashboard
```

## Interactive login (you must run this)

```bash
openclaw models auth login --provider openai
```

Choose **ChatGPT Login** (subscription OAuth), complete browser sign-in.

Optional: set default agent model:

```bash
openclaw config set agents.defaults.model.primary 'openai/gpt-5.5'
```

Docs: https://docs.openclaw.ai/providers/openai

## Cleanup (recommended)

Remove stale `openclaw-web-search` from allowlist if warnings persist:

```bash
openclaw plugins disable openclaw-web-search
openclaw doctor --fix
```

## Notes

- Subscription auth uses provider id `openai`, not a separate API key.
- Lemorax Qwen (`QWEN_*` in `.env.local`) is independent — used by `/api/ai-chat` until OpenClaw migration completes.
