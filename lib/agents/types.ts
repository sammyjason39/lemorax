export type AgentChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

/** Last successful SQL query in session — used for "lanjutkan" without re-query. */
export type AgentLastQuery = {
  userQuestion: string;
  sqlQuery: string;
  queryResult: unknown;
};

/** Custom ARIES agent — chat input */
export type AgentChatInput = {
  message: string;
  sessionId?: string;
  agentId?: string;
  /** Prior turns in this chat (exclude the current user message). */
  history?: AgentChatHistoryMessage[];
  /** Most recent query result in session, if any. */
  lastQuery?: AgentLastQuery;
};

/** SSE events streamed to the browser */
export type AgentChatEvent =
  | { type: "message_start"; runId?: string; sessionId?: string }
  | { type: "chunk"; content: string }
  | { type: "tool_call"; toolName: string; input?: unknown }
  | { type: "tool_result"; toolName: string; output?: unknown }
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
  | { type: "error"; message: string }
  | { type: "done"; output?: unknown };

/** @deprecated OpenClaw types — kept for legacy imports */
export type OpenClawChatInput = AgentChatInput & { context?: Record<string, unknown> };
export type OpenClawChatEvent = AgentChatEvent;

export interface OpenClawClient {
  chat(input: OpenClawChatInput): AsyncGenerator<AgentChatEvent>;
}
