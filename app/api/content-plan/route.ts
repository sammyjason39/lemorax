import { NextRequest, NextResponse } from "next/server";
import { createItem, getBoard } from "@/lib/content-plan/store";
import type { BrandScope, ContentFormat } from "@/lib/content-plan/types";
import { BRAND_SCOPES, CONTENT_FORMATS } from "@/lib/content-plan/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const scopeParam = new URL(req.url).searchParams.get("scope");
    const scope = BRAND_SCOPES.includes(scopeParam as BrandScope)
      ? (scopeParam as BrandScope)
      : undefined;
    const board = await getBoard(scope);
    const total = Object.values(board).reduce((s, col) => s + col.length, 0);
    return NextResponse.json(
      { board, total, scope: scope ?? "all" },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

    const format = CONTENT_FORMATS.includes(body.format) ? (body.format as ContentFormat) : "reel";
    const brand_scope = BRAND_SCOPES.includes(body.brand_scope) ? body.brand_scope : "company";

    const item = await createItem({
      title,
      brand_scope,
      format,
      script_md: body.script_md,
      notes: body.notes,
      created_by: "user",
      last_touched_by: "user",
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
