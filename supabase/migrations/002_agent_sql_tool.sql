-- Safe read-only query executor + audit log for ARIES / OpenClaw SQL tool

CREATE TABLE IF NOT EXISTS agent_query_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sql_query TEXT NOT NULL,
  explanation TEXT,
  source TEXT NOT NULL DEFAULT 'unknown',
  row_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ok',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_query_log_created_at ON agent_query_log(created_at DESC);

CREATE OR REPLACE FUNCTION execute_ai_query(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized TEXT;
  result JSONB;
BEGIN
  normalized := trim(both FROM query_text);

  IF normalized = '' THEN
    RAISE EXCEPTION 'Empty query';
  END IF;

  IF lower(normalized) NOT LIKE 'select%' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  IF normalized ~* '\m(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|execute|call|merge|replace|into)\M' THEN
    RAISE EXCEPTION 'Forbidden SQL keyword';
  END IF;

  IF normalized ~* '\mwith\M' THEN
    RAISE EXCEPTION 'CTE queries are not allowed';
  END IF;

  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t',
    normalized
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION execute_ai_query(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION execute_ai_query(TEXT) TO service_role;
