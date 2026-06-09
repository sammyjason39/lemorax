import { createServerSupabaseClient } from "@/lib/supabase";
import { PII_COLUMNS, redactPiiRows, validateReadOnlySql } from "@/lib/agents/sql-policy";

export type QueryBusinessDataInput = {
  sql_query: string;
  explanation?: string;
  source?: string;
};

export type QueryBusinessDataResult = {
  ok: true;
  sql_query: string;
  explanation?: string;
  row_count: number;
  rows: Record<string, unknown>[];
  redacted: boolean;
};

export type QueryBusinessDataError = {
  ok: false;
  error: string;
};

export async function queryBusinessData(
  input: QueryBusinessDataInput
): Promise<QueryBusinessDataResult | QueryBusinessDataError> {
  const validation = validateReadOnlySql(input.sql_query);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const sb = createServerSupabaseClient();
  const { data, error } = await sb.rpc("execute_ai_query", {
    query_text: validation.normalizedSql,
  });

  if (error) {
    await logQuery({
      sql_query: validation.normalizedSql,
      explanation: input.explanation,
      source: input.source ?? "unknown",
      row_count: 0,
      status: "error",
      error_message: error.message,
    });
    return { ok: false, error: error.message };
  }

  const rows = normalizeRows(data);
  const redactedRows = redactPiiRows(rows);
  const redacted = rows.some((row) => Object.keys(row).some((key) => PII_COLUMNS.has(key)));

  await logQuery({
    sql_query: validation.normalizedSql,
    explanation: input.explanation,
    source: input.source ?? "unknown",
    row_count: redactedRows.length,
    status: "ok",
  });

  return {
    ok: true,
    sql_query: validation.normalizedSql,
    explanation: input.explanation,
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
  explanation?: string;
  source: string;
  row_count: number;
  status: "ok" | "error";
  error_message?: string;
}) {
  try {
    const sb = createServerSupabaseClient();
    await sb.from("agent_query_log").insert({
      sql_query: entry.sql_query,
      explanation: entry.explanation ?? null,
      source: entry.source,
      row_count: entry.row_count,
      status: entry.status,
      error_message: entry.error_message ?? null,
    });
  } catch {
    // Audit log is best-effort until migration is applied.
  }
}
