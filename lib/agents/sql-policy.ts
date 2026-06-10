export const ALLOWED_TABLES = [
  "employees",
  "kpi",
  "absensi",
  "sales_report",
  "crm",
  "finance",
  "marketing",
  "social_media_profiles",
  "social_media_posts",
  "content_plan_items",
] as const;

export type AllowedTable = (typeof ALLOWED_TABLES)[number];

export const PII_COLUMNS = new Set([
  "no_telepon",
  "email",
  "no_hp_owner",
  "email_owner",
  "tanggal_lahir_owner",
  "gaji_pokok",
]);

export const MAX_ROW_LIMIT = 1000;

export type SqlPolicyResult =
  | { ok: true; normalizedSql: string }
  | { ok: false; error: string };

const FORBIDDEN_KEYWORDS =
  /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|execute|call|merge|replace|into)\b/i;

const FORBIDDEN_PATTERNS = [
  /;\s*\S/,
  /--/,
  /\/\*/,
  /\bpg_catalog\b/i,
  /\binformation_schema\b/i,
  /\bauth\./i,
  /\bstorage\./i,
  /\bagent_query_log\b/i,
];

export function validateReadOnlySql(sql: string): SqlPolicyResult {
  const trimmed = sql.trim();
  if (!trimmed) return { ok: false, error: "SQL query is empty" };

  const normalized = trimmed.replace(/\s+/g, " ");
  const lower = normalized.toLowerCase();

  if (!lower.startsWith("select")) {
    return { ok: false, error: "Only SELECT queries are allowed" };
  }

  if (/\bwith\b/i.test(normalized)) {
    return { ok: false, error: "CTE (WITH) queries are not allowed" };
  }

  if (FORBIDDEN_KEYWORDS.test(normalized)) {
    return { ok: false, error: "Query contains forbidden keywords" };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(normalized)) {
      return { ok: false, error: "Query contains forbidden pattern" };
    }
  }

  const referencedTables = extractReferencedTables(normalized);
  if (referencedTables.length === 0) {
    return { ok: false, error: "Query must reference at least one business table" };
  }

  for (const table of referencedTables) {
    if (!ALLOWED_TABLES.includes(table as AllowedTable)) {
      return { ok: false, error: `Table not allowed: ${table}` };
    }
  }

  const withLimit = ensureRowLimit(normalized);
  return { ok: true, normalizedSql: withLimit };
}

function extractReferencedTables(sql: string): string[] {
  const found = new Set<string>();
  const pattern = /\b(?:from|join)\s+([a-z_][a-z0-9_]*)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    found.add(match[1].toLowerCase());
  }
  return Array.from(found);
}

function ensureRowLimit(sql: string): string {
  if (/\blimit\s+\d+/i.test(sql)) return sql;
  return `${sql.replace(/;\s*$/, "")} LIMIT ${MAX_ROW_LIMIT}`;
}

export function redactPiiRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const next: Record<string, unknown> = { ...row };
    for (const key of Object.keys(next)) {
      if (PII_COLUMNS.has(key)) next[key] = "[REDACTED]";
    }
    return next;
  });
}
