import { createServerSupabaseClient } from "@/lib/supabase";
import { ALLOWED_TABLES, MAX_ROW_LIMIT, PII_COLUMNS } from "@/lib/agents/sql-policy";
import { errorResult, jsonToolResult, runBusinessQuery, type McpToolResult } from "./shared";
import {
  businessOverviewInput,
  createContentIdeaInput,
  describeSchemaInput,
  listContentItemsInput,
  moveContentStatusInput,
  queryBusinessDataInput,
} from "./schemas";

export type McpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: unknown) => Promise<McpToolResult>;
};

const EMPTY_ARGS = {};

export const mcpTools: McpTool[] = [
  {
    name: "describe_business_schema",
    description:
      "List Lemorax business tables, their columns, and query constraints. Call this first before writing SQL.",
    inputSchema: { type: "object", properties: {}, additionalProperties: true },
    handler: async () => describeBusinessSchema(),
  },
  {
    name: "query_business_data",
    description:
      "Execute a validated read-only SELECT query against Lemorax business data (sales, finance, HR, KPI, CRM, marketing, social media). SQL is policy-checked; PII is redacted.",
    inputSchema: {
      type: "object",
      properties: {
        sql_query: { type: "string", description: "Read-only SELECT query" },
        explanation: { type: "string", description: "Why this query is being run" },
      },
      required: ["sql_query"],
    },
    handler: async (args) => {
      const parsed = queryBusinessDataInput.safeParse(args ?? EMPTY_ARGS);
      if (!parsed.success) return errorResult(parsed.error.message);
      const result = await runBusinessQuery(parsed.data.sql_query, parsed.data.explanation ? "mcp-airin" : "mcp");
      return jsonToolResult(result, !result.ok);
    },
  },
  {
    name: "get_business_overview",
    description:
      "Get a summary of Lemorax business performance: revenue, expenses, net profit, KPI achievement, active deals, top sales, pipeline distribution, and alerts for a period.",
    inputSchema: {
      type: "object",
      properties: {
        periode_start: { type: "string", pattern: "^\\d{4}-\\d{2}$", description: "Start month YYYY-MM" },
        periode_end: { type: "string", pattern: "^\\d{4}-\\d{2}$", description: "End month YYYY-MM" },
        cabang: { type: "array", items: { type: "string" }, description: "Branch filter" },
      },
    },
    handler: async (args) => {
      const parsed = businessOverviewInput.safeParse(args ?? EMPTY_ARGS);
      if (!parsed.success) return errorResult(parsed.error.message);
      return getBusinessOverview(parsed.data);
    },
  },
  {
    name: "list_content_plan_items",
    description:
      "List Instagram content plan Kanban cards (social media pipeline) with optional status filter.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["backlog", "scripting", "review", "scheduled", "published"],
        },
        limit: { type: "number", minimum: 1, maximum: 100 },
      },
    },
    handler: async (args) => {
      const parsed = listContentItemsInput.safeParse(args ?? EMPTY_ARGS);
      if (!parsed.success) return errorResult(parsed.error.message);
      return listContentPlanItems(parsed.data);
    },
  },
  {
    name: "create_content_idea",
    description:
      "Create a new content idea card in the Backlog column of the social media Content Plan Kanban.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short card title" },
        format: { type: "string", enum: ["reel", "carousel", "image", "story"] },
        notes: { type: "string", description: "Idea notes / angle" },
        hook: { type: "string", description: "Opening hook" },
        hashtags: { type: "array", items: { type: "string" } },
        source_agent: { type: "string", description: "Agent name creating this idea" },
      },
      required: ["title", "format"],
    },
    handler: async (args) => {
      const parsed = createContentIdeaInput.safeParse(args ?? EMPTY_ARGS);
      if (!parsed.success) return errorResult(parsed.error.message);
      return createContentIdea(parsed.data);
    },
  },
  {
    name: "move_content_status",
    description:
      "Move a content plan card to a new Kanban status. Allowed: backlog, scripting, review, scheduled. Publishing is user-only and rejected for agents.",
    inputSchema: {
      type: "object",
      properties: {
        item_id: { type: "string", description: "Content plan item ID" },
        new_status: {
          type: "string",
          enum: ["backlog", "scripting", "review", "scheduled"],
        },
        scheduled_at: { type: "string", description: "ISO timestamp (required for scheduled)" },
      },
      required: ["item_id", "new_status"],
    },
    handler: async (args) => {
      const parsed = moveContentStatusInput.safeParse(args ?? EMPTY_ARGS);
      if (!parsed.success) return errorResult(parsed.error.message);
      return moveContentStatus(parsed.data);
    },
  },
];

async function describeBusinessSchema(): Promise<McpToolResult> {
  const sb = createServerSupabaseClient();
  const tables: Record<string, unknown> = {};

  for (const table of ALLOWED_TABLES) {
    const { data, error } = await sb.from(table).select("*").limit(1);
    if (error) {
      tables[table] = { error: error.message };
      continue;
    }
    const columns = data?.[0] ? Object.keys(data[0]) : [];
    tables[table] = {
      columns: columns.map((c) => ({ name: c, pii: PII_COLUMNS.has(c) })),
      row_sample_count: data?.length ?? 0,
    };
  }

  return jsonToolResult({
    tables,
    policy: {
      read_only: true,
      max_rows: MAX_ROW_LIMIT,
      pii_redacted_columns: Array.from(PII_COLUMNS),
      cte_allowed: false,
    },
  });
}

async function getBusinessOverview(args: {
  periode_start?: string;
  periode_end?: string;
  cabang?: string[];
}): Promise<McpToolResult> {
  const sb = createServerSupabaseClient();

  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const periodeStart = args.periode_start || current;
  const periodeEnd = args.periode_end || current;
  const cabang = args.cabang?.length ? args.cabang : null;

  try {
    const [finSummary, kpiData, dealsData, topSales] = await Promise.all([
      sb.rpc("get_finance_summary", { p_start: periodeStart, p_end: periodeEnd, p_cabang: cabang }),
      sb
        .from("kpi")
        .select("achievement_pct")
        .gte("periode", periodeStart)
        .lte("periode", periodeEnd)
        .limit(10000),
      sb.from("crm").select("status, nilai_deal").in("status", [
        "Negotiation",
        "Proposal",
        "Prospecting",
        "Closed Won",
        "Closed Lost",
      ]),
      sb.rpc("get_top_sales", { p_start: periodeStart, p_end: periodeEnd, p_cabang: cabang, p_limit: 5 }),
    ]);

    const revenue = Number(finSummary.data?.[0]?.total_income || 0);
    const expense = Number(finSummary.data?.[0]?.total_expense || 0);
    const kpiAchievement = kpiData.data?.length
      ? kpiData.data.reduce((s, r) => s + (r.achievement_pct || 0), 0) / kpiData.data.length
      : 0;

    const pipeline: Record<string, { count: number; value: number }> = {};
    (dealsData.data || []).forEach((d) => {
      if (!pipeline[d.status]) pipeline[d.status] = { count: 0, value: 0 };
      pipeline[d.status].count++;
      pipeline[d.status].value += d.nilai_deal || 0;
    });

    return jsonToolResult({
      ok: true,
      periode: { start: periodeStart, end: periodeEnd },
      cabang: cabang || "all",
      revenue,
      expense,
      net_profit: revenue - expense,
      kpi_achievement_pct: Math.round(kpiAchievement * 10) / 10,
      active_deals: (dealsData.data || []).filter((d) =>
        ["Negotiation", "Proposal", "Prospecting"].includes(d.status)
      ).length,
      pipeline_distribution: pipeline,
      top_sales: ((topSales.data || []) as Record<string, unknown>[]).map((r) => ({
        employee_id: r.employee_id,
        sales_name: r.sales_name,
        cabang: r.cabang,
        total: Number(r.total),
      })),
    });
  } catch (e) {
    return errorResult(e instanceof Error ? e.message : "Overview query failed");
  }
}

async function listContentPlanItems(args: {
  status?: string;
  limit?: number;
}): Promise<McpToolResult> {
  const sb = createServerSupabaseClient();
  let query = sb
    .from("content_plan_items")
    .select("id, title, status, format, notes, scheduled_at, published_at, assigned_agent, created_by, updated_at")
    .order("updated_at", { ascending: false })
    .limit(args.limit ?? 25);

  if (args.status) query = query.eq("status", args.status);

  const { data, error } = await query;
  if (error) return errorResult(error.message);

  return jsonToolResult({ ok: true, count: data?.length ?? 0, items: data ?? [] });
}

async function createContentIdea(args: {
  title: string;
  format: string;
  notes?: string;
  hook?: string;
  hashtags?: string[];
  source_agent?: string;
}): Promise<McpToolResult> {
  const sb = createServerSupabaseClient();
  const agent = args.source_agent || "external-agent";

  const scriptLines: string[] = [];
  if (args.hook) scriptLines.push(`## Hook\n${args.hook}`);
  if (args.notes) scriptLines.push(`## Notes\n${args.notes}`);
  if (args.hashtags?.length) scriptLines.push(`## Hashtags\n${args.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}`);

  const { data, error } = await sb
    .from("content_plan_items")
    .insert({
      id: `cp_mcp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      title: args.title,
      status: "backlog",
      format: args.format,
      notes: args.notes ?? null,
      script_md: scriptLines.length ? scriptLines.join("\n\n") : "",
      assigned_agent: agent,
      created_by: agent,
last_touched_by: agent,
    })
    .select("id, title, status, format")
    .single();

  if (error) return errorResult(error.message);
  return jsonToolResult({ ok: true, item: data });
}

async function moveContentStatus(args: {
  item_id: string;
  new_status: string;
  scheduled_at?: string;
}): Promise<McpToolResult> {
  const ALLOWED_STATUSES = new Set(["backlog", "scripting", "review", "scheduled"]);
  if (!ALLOWED_STATUSES.has(args.new_status)) {
    return errorResult(
      `Invalid status: '${args.new_status}'. Allowed: backlog, scripting, review, scheduled. ` +
        "Agents are not allowed to move items to 'published' — publishing is a human decision in the dashboard."
    );
  }

  if (args.new_status === "scheduled" && !args.scheduled_at) {
    return errorResult("'scheduled_at' (ISO timestamp) is required when moving to 'scheduled'");
  }

  const sb = createServerSupabaseClient();
  const { data: existing, error: fetchError } = await sb
    .from("content_plan_items")
    .select("id, title, status")
    .eq("id", args.item_id)
    .single();

  if (fetchError || !existing) return errorResult(`Item not found: ${args.item_id}`);

  const update: Record<string, unknown> = {
    status: args.new_status,
    updated_at: new Date().toISOString(),
    last_touched_by: "external-agent",
  };
  if (args.scheduled_at) update.scheduled_at = args.scheduled_at;

  const { data, error } = await sb
    .from("content_plan_items")
    .update(update)
    .eq("id", args.item_id)
    .select("id, title, status, scheduled_at")
    .single();

  if (error) return errorResult(error.message);
  return jsonToolResult({
    ok: true,
    item: data,
    previous_status: existing.status,
  });
}