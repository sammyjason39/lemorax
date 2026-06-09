-- Complete staff agents schema (run once in Supabase SQL Editor if 003/004 not applied)

CREATE TABLE IF NOT EXISTS staff_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL,
  description TEXT DEFAULT '',
  avatar_color TEXT DEFAULT '#1652F0',
  emoji TEXT DEFAULT '🤖',
  soul_md TEXT NOT NULL,
  skills JSONB DEFAULT '[]'::jsonb,
  schedule JSONB DEFAULT '{}'::jsonb,
  memory JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'online',
  is_orchestrator BOOLEAN DEFAULT false,
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
  orchestrated BOOLEAN DEFAULT false,
  is_main_group BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES staff_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'agent')),
  sender_agent_id TEXT REFERENCES staff_agents(id),
  content TEXT NOT NULL,
  schedule_run BOOLEAN DEFAULT false,
  handoff_from TEXT REFERENCES staff_agents(id),
  mentions TEXT[] DEFAULT '{}',
  message_kind TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_messages_conversation ON staff_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_staff_conversations_updated ON staff_conversations(updated_at DESC);

-- Patch older installs that ran 003 only
ALTER TABLE staff_agents ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE staff_agents ADD COLUMN IF NOT EXISTS is_orchestrator BOOLEAN DEFAULT false;
ALTER TABLE staff_conversations ADD COLUMN IF NOT EXISTS orchestrated BOOLEAN DEFAULT false;
ALTER TABLE staff_conversations ADD COLUMN IF NOT EXISTS is_main_group BOOLEAN DEFAULT false;
ALTER TABLE staff_messages ADD COLUMN IF NOT EXISTS schedule_run BOOLEAN DEFAULT false;
ALTER TABLE staff_messages ADD COLUMN IF NOT EXISTS handoff_from TEXT REFERENCES staff_agents(id);
ALTER TABLE staff_messages ADD COLUMN IF NOT EXISTS mentions TEXT[] DEFAULT '{}';
ALTER TABLE staff_messages ADD COLUMN IF NOT EXISTS message_kind TEXT;
