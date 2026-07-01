import type { AgentChatHistoryMessage } from "@/lib/agents/types";

const MAX_HISTORY_MESSAGES = 12;
const MAX_CHARS_PER_MESSAGE = 3500;

/** Trim history so local models keep room for system prompt + answer. */
export function normalizeChatHistory(
  history: AgentChatHistoryMessage[] | undefined
): AgentChatHistoryMessage[] {
  if (!history?.length) return [];

  return history
    .filter((m) => m.content?.trim() && (m.role === "user" || m.role === "assistant"))
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({
      role: m.role,
      content:
        m.content.length > MAX_CHARS_PER_MESSAGE
          ? `${m.content.slice(0, MAX_CHARS_PER_MESSAGE)}\n… [dipotong]`
          : m.content,
    }));
}

export function buildMessagesWithHistory(
  systemContent: string,
  history: AgentChatHistoryMessage[] | undefined,
  userContent: string
): { role: "system" | "user" | "assistant"; content: string }[] {
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemContent },
  ];

  for (const turn of normalizeChatHistory(history)) {
    messages.push({ role: turn.role, content: turn.content });
  }

  messages.push({ role: "user", content: userContent });
  return messages;
}
