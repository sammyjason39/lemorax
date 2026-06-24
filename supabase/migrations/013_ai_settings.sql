-- AI provider settings (Ollama local + cloud fallback)

CREATE TABLE IF NOT EXISTS ai_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  ollama_base_url TEXT NOT NULL DEFAULT 'http://127.0.0.1:11434',
  ollama_model TEXT,
  fallback_api_base_url TEXT,
  fallback_api_key TEXT,
  fallback_model TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO ai_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;
