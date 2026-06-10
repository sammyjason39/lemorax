-- Pisah content plan: personal branding vs perusahaan

ALTER TABLE content_plan_items
  ADD COLUMN IF NOT EXISTS brand_scope TEXT NOT NULL DEFAULT 'company'
    CHECK (brand_scope IN ('personal', 'company'));

CREATE INDEX IF NOT EXISTS idx_content_plan_scope ON content_plan_items(brand_scope, status, position);
