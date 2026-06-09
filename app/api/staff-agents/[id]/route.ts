import { NextRequest, NextResponse } from "next/server";
import { getAgent, updateAgent } from "@/lib/staff-agents/store";
import { invalidateStaffA2AHandler } from "@/lib/staff-agents/a2a";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const agent = await getAgent(params.id);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ agent });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const body = await req.json();
    const agent = await updateAgent(params.id, body);
    if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
    invalidateStaffA2AHandler(params.id);
    return NextResponse.json({ agent });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 }
    );
  }
}
