-- Content Plan Kanban for Soca / Social Media

CREATE TABLE IF NOT EXISTS content_plan_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  brand_scope TEXT NOT NULL DEFAULT 'company'
    CHECK (brand_scope IN ('personal', 'company')),
  status TEXT NOT NULL DEFAULT 'backlog'
    CHECK (status IN ('backlog', 'scripting', 'review', 'scheduled', 'published')),
  format TEXT NOT NULL DEFAULT 'reel'
    CHECK (format IN ('reel', 'carousel', 'image', 'story')),
  script_md TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  publish_mode TEXT CHECK (publish_mode IS NULL OR publish_mode = 'demo'),
  assigned_agent TEXT,
  created_by TEXT NOT NULL DEFAULT 'user',
  last_touched_by TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_plan_status ON content_plan_items(status, position);
CREATE INDEX IF NOT EXISTS idx_content_plan_updated ON content_plan_items(updated_at DESC);
