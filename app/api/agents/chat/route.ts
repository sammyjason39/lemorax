import { NextRequest } from "next/server";
import { runAriesAgent } from "@/lib/agents/aries-agent";
import { agentEventsToResponse } from "@/lib/agents/sse";
import type { AgentChatHistoryMessage, AgentLastQuery } from "@/lib/agents/types";

export const runtime = "nodejs";

type ChatRequestBody = {
  message?: string;
  sessionId?: string;
  agentId?: string;
  history?: AgentChatHistoryMessage[];
  lastQuery?: AgentLastQuery;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const message = body.message?.trim();
    if (!message) {
      return Response.json({ error: "Message required" }, { status: 400 });
    }

    return agentEventsToResponse(
      runAriesAgent({
        message,
        sessionId: body.sessionId ?? "default",
        agentId: body.agentId,
        history: body.history,
        lastQuery: body.lastQuery,
      })
    );
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
