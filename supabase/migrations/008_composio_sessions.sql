-- Composio Tool Router session (single-tenant for Pak Anjas)

CREATE TABLE IF NOT EXISTS composio_sessions (
  id TEXT PRIMARY KEY DEFAULT 'default',
  composio_user_id TEXT NOT NULL,
  composio_session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
