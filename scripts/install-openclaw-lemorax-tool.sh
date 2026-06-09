#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLUGIN_DIR="$ROOT/openclaw-plugin/lemorax-tools"
BASE_URL="${ARIES_BASE_URL:-http://127.0.0.1:3000}"
ENV_FILE="$ROOT/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

TOKEN="$(grep '^OPENCLAW_GATEWAY_TOKEN=' "$ENV_FILE" | cut -d= -f2- || true)"
if [[ -z "$TOKEN" ]]; then
  TOKEN="$(grep '^ARIES_TOOL_SECRET=' "$ENV_FILE" | cut -d= -f2- || true)"
fi
if [[ -z "$TOKEN" ]]; then
  echo "Set OPENCLAW_GATEWAY_TOKEN or ARIES_TOOL_SECRET in .env.local"
  exit 1
fi

echo "Building Lemorax OpenClaw plugin..."
cd "$PLUGIN_DIR"
npm install
npm run build
openclaw plugins build --entry ./dist/index.js
openclaw plugins validate --entry ./dist/index.js
openclaw plugins install "$PLUGIN_DIR"

mkdir -p "$HOME/.openclaw/workspace/skills"
cp -R "$ROOT/openclaw/workspace-skills/lemorax-analyst" "$HOME/.openclaw/workspace/skills/"

PATCH_FILE="$(mktemp)"
cat > "$PATCH_FILE" <<EOF
{
  "plugins": {
    "allow": ["ollama", "memory-core", "openai", "lemorax-tools"],
    "entries": {
      "lemorax-tools": {
        "enabled": true,
        "config": {
          "baseUrl": "$BASE_URL",
          "toolSecret": "$TOKEN"
        }
      }
    }
  },
  "tools": {
    "alsoAllow": ["query_business_data"]
  },
  "agents": {
    "list": [
      {
        "id": "main",
        "model": "openai/gpt-5.5"
      }
    ]
  }
}
EOF

openclaw config patch --file "$PATCH_FILE"
rm -f "$PATCH_FILE"

echo "Restarting gateway..."
openclaw gateway restart

echo "Done."
echo "Tool endpoint: $BASE_URL/api/agents/tools/query-business-data"
echo "Apply Supabase migration: supabase/migrations/002_agent_sql_tool.sql"
