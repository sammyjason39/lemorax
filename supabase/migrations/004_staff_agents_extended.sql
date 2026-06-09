-- Extend staff agents schema for orchestration, display names, message metadata

ALTER TABLE staff_agents ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE staff_agents ADD COLUMN IF NOT EXISTS is_orchestrator BOOLEAN DEFAULT false;

ALTER TABLE staff_conversations ADD COLUMN IF NOT EXISTS orchestrated BOOLEAN DEFAULT false;
ALTER TABLE staff_conversations ADD COLUMN IF NOT EXISTS is_main_group BOOLEAN DEFAULT false;

ALTER TABLE staff_messages ADD COLUMN IF NOT EXISTS schedule_run BOOLEAN DEFAULT false;
ALTER TABLE staff_messages ADD COLUMN IF NOT EXISTS handoff_from TEXT REFERENCES staff_agents(id);
ALTER TABLE staff_messages ADD COLUMN IF NOT EXISTS mentions TEXT[] DEFAULT '{}';
ALTER TABLE staff_messages ADD COLUMN IF NOT EXISTS message_kind TEXT;

CREATE INDEX IF NOT EXISTS idx_staff_conversations_updated ON staff_conversations(updated_at DESC);
