-- AI Agents Staff — persistent storage (optional; app falls back to data/staff-store.json)

CREATE TABLE IF NOT EXISTS staff_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT DEFAULT '',
  avatar_color TEXT DEFAULT '#1652F0',
  emoji TEXT DEFAULT '🤖',
  soul_md TEXT NOT NULL,
  skills JSONB DEFAULT '[]'::jsonb,
  schedule JSONB DEFAULT '{}'::jsonb,
  memory JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'online',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_conversations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('dm', 'group')),
  name TEXT NOT NULL,
  agent_ids TEXT[] NOT NULL DEFAULT '{}',
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES staff_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'agent')),
  sender_agent_id TEXT REFERENCES staff_agents(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_messages_conversation ON staff_messages(conversation_id, created_at);
