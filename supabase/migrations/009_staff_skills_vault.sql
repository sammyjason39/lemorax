-- Skill registry (install from GitHub) + per-agent assignments + company vault

CREATE TABLE IF NOT EXISTS staff_skill_registry (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  source_url TEXT NOT NULL,
  source_ref TEXT,
  content_md TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  installed_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_agent_installed_skills (
  agent_id TEXT NOT NULL REFERENCES staff_agents(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES staff_skill_registry(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  installed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (agent_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_agent_skills_agent ON staff_agent_installed_skills(agent_id);

CREATE TABLE IF NOT EXISTS vault_notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  note_type TEXT NOT NULL DEFAULT 'note',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vault_links (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES vault_notes(id) ON DELETE CASCADE,
  target_slug TEXT NOT NULL,
  target_id TEXT REFERENCES vault_notes(id) ON DELETE SET NULL,
  link_type TEXT NOT NULL DEFAULT 'wikilink',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vault_notes_slug ON vault_notes(slug);
CREATE INDEX IF NOT EXISTS idx_vault_links_source ON vault_links(source_id);
CREATE INDEX IF NOT EXISTS idx_vault_links_target_slug ON vault_links(target_slug);
