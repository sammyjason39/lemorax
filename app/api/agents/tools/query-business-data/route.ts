import { NextRequest } from "next/server";
import { queryBusinessData } from "@/lib/agents/query-business-data";

export const runtime = "nodejs";

function getToolSecret(): string | undefined {
  return process.env.ARIES_TOOL_SECRET || process.env.OPENCLAW_GATEWAY_TOKEN;
}

function isAuthorized(req: NextRequest): boolean {
  const secret = getToolSecret();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice(7) === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const sql_query = typeof body.sql_query === "string" ? body.sql_query.trim() : "";
    const explanation = typeof body.explanation === "string" ? body.explanation : undefined;
    const source = typeof body.source === "string" ? body.source : "openclaw-tool";

    if (!sql_query) {
      return Response.json({ ok: false, error: "sql_query is required" }, { status: 400 });
    }

    const result = await queryBusinessData({ sql_query, explanation, source });
    if (!result.ok) {
      return Response.json(result, { status: 400 });
    }

    return Response.json(result);
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
