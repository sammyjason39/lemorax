import { NextRequest, NextResponse } from "next/server";
import { deleteItem, getItem, updateItem } from "@/lib/content-plan/store";
import type { BrandScope, ContentFormat, ContentStatus } from "@/lib/content-plan/types";
import { BRAND_SCOPES, CONTENT_FORMATS, CONTENT_STATUSES } from "@/lib/content-plan/types";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const item = await getItem(params.id);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const body = await req.json();
    const patch: Parameters<typeof updateItem>[1] = {
      last_touched_by: "user",
    };

    if (body.title !== undefined) patch.title = String(body.title);
    if (body.script_md !== undefined) patch.script_md = String(body.script_md);
    if (body.notes !== undefined) patch.notes = String(body.notes);
    if (body.scheduled_at !== undefined) patch.scheduled_at = body.scheduled_at;
    if (body.position !== undefined) patch.position = Number(body.position);

    if (body.format !== undefined && CONTENT_FORMATS.includes(body.format)) {
      patch.format = body.format as ContentFormat;
    }

    if (body.brand_scope !== undefined && BRAND_SCOPES.includes(body.brand_scope)) {
      patch.brand_scope = body.brand_scope as BrandScope;
    }

    if (body.status !== undefined) {
      if (!CONTENT_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      if (body.status === "published") {
        return NextResponse.json({ error: "Use publish-demo endpoint" }, { status: 400 });
      }
      patch.status = body.status as ContentStatus;
    }

    const item = await updateItem(params.id, patch);
    return NextResponse.json({ item });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await deleteItem(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
