import { NextRequest, NextResponse } from "next/server";
import { getAgent } from "@/lib/staff-agents/store";
import { getStaffA2AHandler } from "@/lib/staff-agents/a2a";
import type { MessageSendParams } from "@a2a-js/sdk";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

/**
 * A2A JSON-RPC endpoint (message/send and related methods).
 * Compatible with @a2a-js/sdk ClientFactory.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const agent = await getAgent(params.id);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const handler = getStaffA2AHandler(agent);

  try {
    if (body?.jsonrpc === "2.0" && body.method) {
      const id = body.id ?? null;

      if (body.method === "message/send") {
        const result = await handler.sendMessage(body.params as MessageSendParams);
        return NextResponse.json({ jsonrpc: "2.0", id, result });
      }

      if (body.method === "agent/getCard") {
        const result = await handler.getAgentCard();
        return NextResponse.json({ jsonrpc: "2.0", id, result });
      }

      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: ${body.method}` },
      });
    }

    const result = await handler.sendMessage(body as MessageSendParams);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "A2A handler error";
    if (body?.jsonrpc === "2.0") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id ?? null,
        error: { code: -32000, message },
      });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
