import { NextRequest, NextResponse } from "next/server";
import { createConversation, listConversations } from "@/lib/staff-agents/store";

export const runtime = "nodejs";

export async function GET() {
  const conversations = await listConversations();
  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name?.trim() || !Array.isArray(body.agentIds) || body.agentIds.length === 0) {
      return NextResponse.json({ error: "name and agentIds required" }, { status: 400 });
    }

    const conversation = await createConversation({
      type: body.type === "group" ? "group" : "dm",
      name: body.name.trim(),
      agentIds: body.agentIds,
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create conversation" },
      { status: 500 }
    );
  }
}
