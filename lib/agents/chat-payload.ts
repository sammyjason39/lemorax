import type { AgentChatHistoryMessage, AgentLastQuery } from "@/lib/agents/types";

export type ClientChatMessage = {
  role: "user" | "assistant";
  content: string;
  isThinking?: boolean;
  sqlQuery?: string;
  queryResult?: unknown;
};

/** Build API payload from in-memory chat state (before appending the new user turn). */
export function buildAgentChatPayload(
  messages: ClientChatMessage[],
  newMessage: string
): {
  message: string;
  history: AgentChatHistoryMessage[];
  lastQuery?: AgentLastQuery;
} {
  const history: AgentChatHistoryMessage[] = messages
    .filter((m) => !m.isThinking && m.content?.trim())
    .map((m) => ({ role: m.role, content: m.content }));

  let lastQuery: AgentLastQuery | undefined;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "assistant" && m.sqlQuery && m.queryResult != null) {
      let userQuestion = "";
      for (let j = i - 1; j >= 0; j--) {
        if (messages[j].role === "user" && messages[j].content?.trim()) {
          userQuestion = messages[j].content;
          break;
        }
      }
      lastQuery = {
        userQuestion,
        sqlQuery: m.sqlQuery,
        queryResult: m.queryResult,
      };
      break;
    }
  }

  return { message: newMessage, history, lastQuery };
}
