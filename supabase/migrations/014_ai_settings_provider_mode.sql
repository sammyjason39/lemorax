-- Provider routing mode: local_only | local_cloud | cloud_only

ALTER TABLE ai_settings
  ADD COLUMN IF NOT EXISTS provider_mode TEXT NOT NULL DEFAULT 'local_cloud';

UPDATE ai_settings
SET provider_mode = 'local_cloud'
WHERE provider_mode IS NULL OR provider_mode = '';
