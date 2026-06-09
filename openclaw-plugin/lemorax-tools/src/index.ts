import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

const configSchema = Type.Object({
  baseUrl: Type.String({
    description: "ARIES dashboard base URL, e.g. http://127.0.0.1:3000",
  }),
  toolSecret: Type.String({
    description: "Bearer token for /api/agents/tools/query-business-data",
  }),
});

export default defineToolPlugin({
  id: "lemorax-tools",
  name: "Lemorax Business Data",
  description: "Read-only SQL access to PT Lemorax Supabase business tables.",
  configSchema,
  tools: (tool) => [
    tool({
      name: "query_business_data",
      label: "Query Business Data",
      description:
        "Run a read-only PostgreSQL SELECT against Lemorax business tables (employees, kpi, absensi, sales_report, crm, finance, marketing). Use for revenue, sales, KPI, HR, CRM, and marketing questions. No INSERT/UPDATE/DELETE. No CTE/WITH.",
      parameters: Type.Object({
        sql_query: Type.String({
          description: "Valid PostgreSQL SELECT query. Must start with SELECT. Max 1000 rows.",
        }),
        explanation: Type.Optional(
          Type.String({ description: "Short explanation of what this query answers." })
        ),
      }),
      async execute({ sql_query, explanation }, config, context) {
        context.signal?.throwIfAborted();
        const baseUrl = config.baseUrl.replace(/\/$/, "");
        const res = await fetch(`${baseUrl}/api/agents/tools/query-business-data`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.toolSecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sql_query,
            explanation,
            source: "openclaw-plugin",
          }),
          signal: context.signal,
        });

        const payload = await res.json();
        if (!res.ok) {
          return {
            ok: false,
            error: payload?.error ?? `HTTP ${res.status}`,
          };
        }

        return payload;
      },
    }),
  ],
});
