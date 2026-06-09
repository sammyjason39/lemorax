import { NextResponse } from "next/server";
import { getAgent } from "@/lib/staff-agents/store";
import { getStaffA2AHandler } from "@/lib/staff-agents/a2a";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

/** A2A Agent Card — /.well-known/agent-card.json equivalent */
export async function GET(_req: Request, { params }: Ctx) {
  const agent = await getAgent(params.id);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const handler = getStaffA2AHandler(agent);
  const card = await handler.getAgentCard();
  return NextResponse.json(card);
}
