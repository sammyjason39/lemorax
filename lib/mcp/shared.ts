import { timingSafeEqual } from "crypto";
import { createServerSupabaseClient } from "@/lib/supabase";
import { ALLOWED_TABLES, MAX_ROW_LIMIT, PII_COLUMNS, redactPiiRows, validateReadOnlySql } from "@/lib/agents/sql-policy";

export type McpToolResult = { content: [{ type: "text"; text: string }]; isError?: boolean };

export function jsonToolResult(payload: unknown, isError = false): McpToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    ...(isError ? { isError: true } : {}),
  };
}

export function errorResult(message: string): McpToolResult {
  return jsonToolResult({ ok: false, error: message }, true);
}

/** Shared Bearer-token auth for MCP + tool endpoints. */
export function isMcpAuthorized(req: Request): boolean {
  const secret = process.env.AIRIN_MCP_TOKEN || process.env.AIRIN_TOOL_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Reuse the existing read-only SQL policy used by the AIRIN agent. */
export async function runBusinessQuery(sql: string, source: string) {
  const validation = validateReadOnlySql(sql);
  if (!validation.ok) {
    return { ok: false as const, error: validation.error };
  }

  const sb = createServerSupabaseClient();
  const { data, error } = await sb.rpc("execute_ai_query", {
    query_text: validation.normalizedSql,
  });

  if (error) {
    await logQuery({
      sql_query: validation.normalizedSql,
      source,
      row_count: 0,
      status: "error",
      error_message: error.message,
    });
    return { ok: false as const, error: error.message };
  }

  const rows = normalizeRows(data);
  const redactedRows = redactPiiRows(rows);
  const redacted = rows.some((row) => Object.keys(row).some((key) => PII_COLUMNS.has(key)));

  await logQuery({
    sql_query: validation.normalizedSql,
    source,
    row_count: redactedRows.length,
    status: "ok",
  });

  return {
    ok: true as const,
    sql_query: validation.normalizedSql,
    row_count: redactedRows.length,
    rows: redactedRows,
    redacted,
  };
}

function normalizeRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter((row): row is Record<string, unknown> => !!row && typeof row === "object");
  }
  if (data && typeof data === "object") {
    return [data as Record<string, unknown>];
  }
  return [];
}

async function logQuery(entry: {
  sql_query: string;
  source: string;
  row_count: number;
  status: "ok" | "error";
  error_message?: string;
}) {
  try {
    const sb = createServerSupabaseClient();
    await sb.from("agent_query_log").insert({
      sql_query: entry.sql_query,
      explanation: null,
      source: entry.source,
      row_count: entry.row_count,
      status: entry.status,
      error_message: entry.error_message ?? null,
    });
  } catch {
    // Audit log is best-effort until migration is applied.
  }
}

export const MCP_SCHEMA_HINT = {
  allowed_tables: ALLOWED_TABLES,
  max_row_limit: MAX_ROW_LIMIT,
  notes: [
    "All queries are validated against a read-only SQL policy before execution.",
    "PII columns (no_telepon, email, gaji_pokok, ...) are redacted automatically.",
    "Use describe_business_schema first if unsure of column names.",
  ],
};