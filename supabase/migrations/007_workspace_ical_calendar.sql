-- Workspace calendar via iCal secret URL (no OAuth app required)

CREATE TABLE IF NOT EXISTS workspace_ical_calendar (
  id TEXT PRIMARY KEY DEFAULT 'default',
  ical_url TEXT NOT NULL,
  label TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
