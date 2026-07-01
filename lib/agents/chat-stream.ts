"use client";

import type { AgentChatHistoryMessage, AgentLastQuery } from "@/lib/agents/types";

const DEFAULT_SESSION_ID = "default";

export function getAgentSessionId(): string {
  return DEFAULT_SESSION_ID;
}

/** @deprecated use getAgentSessionId */
export function getOrCreateOpenClawSessionId(): string {
  return getAgentSessionId();
}

export type AgentChatStreamEvent =
  | {
      type: "meta";
      source?: string;
      sql_query?: string;
      explanation?: string;
      initial_analysis?: string;
      queryResult?: unknown;
      note?: string;
      tools?: string[];
    }
  | { type: "chunk"; content: string }
  | { type: "tool_call"; toolName: string; input?: unknown }
  | { type: "tool_result"; toolName: string; output?: unknown }
  | { type: "error"; message: string };

export async function streamAgentChat(params: {
  message: string;
  sessionId?: string;
  history?: AgentChatHistoryMessage[];
  lastQuery?: AgentLastQuery;
  onEvent: (event: AgentChatStreamEvent) => void;
}): Promise<void> {
  const res = await fetch("/api/agents/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: params.message,
      sessionId: params.sessionId ?? getAgentSessionId(),
      history: params.history,
      lastQuery: params.lastQuery,
    }),
  });

  if (!res.ok) throw new Error("Gagal terhubung ke ARIES agent");
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6);
      if (raw === "[DONE]") return;

      try {
        params.onEvent(JSON.parse(raw) as AgentChatStreamEvent);
      } catch {
        // ignore malformed frames
      }
    }
  }
}
