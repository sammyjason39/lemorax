-- Social media profiles & posts for Soca agent + dashboard

CREATE TABLE IF NOT EXISTS social_media_profiles (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL DEFAULT 'instagram',
  username TEXT NOT NULL,
  display_name TEXT,
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  engagement_rate NUMERIC(8, 3) DEFAULT 0,
  conversion_rate NUMERIC(8, 3) DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  link_clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  bio TEXT,
  profile_pic_url TEXT,
  synced_at TIMESTAMPTZ,
  source TEXT DEFAULT 'seed',
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (platform, username)
);

CREATE TABLE IF NOT EXISTS social_media_posts (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES social_media_profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'instagram',
  external_id TEXT,
  post_url TEXT,
  caption TEXT,
  media_type TEXT,
  published_at TIMESTAMPTZ,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  engagement_rate NUMERIC(8, 3) DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_profile ON social_media_posts(profile_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_published ON social_media_posts(published_at DESC);
