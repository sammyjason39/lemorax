import { NextRequest, NextResponse } from "next/server";
import { createVaultNote, listVaultNotes, searchVaultNotes } from "@/lib/vault/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const q = new URL(req.url).searchParams.get("q");
    if (q?.trim()) {
      const notes = await searchVaultNotes(q);
      return NextResponse.json({ notes });
    }
    const notes = await listVaultNotes();
    return NextResponse.json({ notes });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list vault notes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }
    const note = await createVaultNote({
      title: body.title,
      content: body.content ?? "",
      tags: body.tags ?? [],
      noteType: body.noteType ?? "note",
    });
    return NextResponse.json({ note }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create note" },
      { status: 500 }
    );
  }
}
