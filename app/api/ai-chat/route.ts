import { NextRequest, NextResponse } from "next/server";
import { runAriesAgent } from "@/lib/agents/aries-agent";
import { agentEventsToResponse } from "@/lib/agents/sse";

/** Legacy route — delegates to the same ARIES agent as /api/agents/chat */
export async function POST(req: NextRequest) {
  try {
    const { message, sessionId } = await req.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    return agentEventsToResponse(
      runAriesAgent({
        message: message.trim(),
        sessionId: sessionId ?? "default",
      })
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
