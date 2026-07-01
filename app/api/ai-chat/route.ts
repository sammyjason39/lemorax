import { NextRequest, NextResponse } from "next/server";
import { runAriesAgent } from "@/lib/agents/aries-agent";
import { agentEventsToResponse } from "@/lib/agents/sse";

/** Legacy route — delegates to the same ARIES agent as /api/agents/chat */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      message?: string;
      sessionId?: string;
      history?: import("@/lib/agents/types").AgentChatHistoryMessage[];
      lastQuery?: import("@/lib/agents/types").AgentLastQuery;
    };
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    return agentEventsToResponse(
      runAriesAgent({
        message,
        sessionId: body.sessionId ?? "default",
        history: body.history,
        lastQuery: body.lastQuery,
      })
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
