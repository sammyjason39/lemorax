-- Workspace + Google Calendar connection (single-tenant for Pak Anjas)

CREATE TABLE IF NOT EXISTS workspace_google_calendar (
  id TEXT PRIMARY KEY DEFAULT 'default',
  google_email TEXT,
  access_token TEXT,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  purpose TEXT NOT NULL DEFAULT 'google_calendar',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);
