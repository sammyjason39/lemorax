import { getAgent, appendMessage, updateAgent, listMessages } from "@/lib/staff-agents/store";
import { getConversation } from "@/lib/staff-agents/store";
import { streamStaffAgentReply } from "@/lib/staff-agents/llm";
import { isOrchestratedConversation, runOrchestratedConversationChat } from "@/lib/staff-agents/orchestrator";
import { getChatLabel } from "@/lib/staff-agents/names";
import { PRINCIPAL_NAME } from "@/lib/brand";
import type { StaffMessage } from "@/lib/staff-agents/types";

export type StaffChatSSEEvent =
  | { type: "user_message"; message: StaffMessage }
  | { type: "agent_start"; agentId: string; agentName: string }
  | { type: "agent_chunk"; agentId: string; content: string }
  | { type: "agent_message"; message: StaffMessage }
  | { type: "a2a_handoff"; fromAgentId: string; toAgentId: string; task: string }
  | { type: "error"; message: string }
  | { type: "done" };

export async function* runStaffConversationChat(
  conversationId: string,
  userText: string
): AsyncGenerator<StaffChatSSEEvent> {
  if (isOrchestratedConversation(conversationId)) {
    yield* runOrchestratedConversationChat(conversationId, userText);
    return;
  }

  const conversation = await getConversation(conversationId);
  if (!conversation) {
    yield { type: "error", message: "Conversation not found" };
    return;
  }

  const userMsg = await appendMessage({
    conversationId,
    senderType: "user",
    content: userText,
  });
  yield { type: "user_message", message: userMsg };

  const history = await listMessages(conversationId);

  for (const agentId of conversation.agentIds) {
    const agent = await getAgent(agentId);
    if (!agent) continue;

    yield { type: "agent_start", agentId: agent.id, agentName: getChatLabel(agent) };

    let full = "";
    try {
      for await (const chunk of streamStaffAgentReply(agent, userText, history)) {
        full += chunk;
        yield { type: "agent_chunk", agentId: agent.id, content: chunk };
      }
    } catch (err) {
      full = `⚠️ ${err instanceof Error ? err.message : "Agent error"}`;
      yield { type: "agent_chunk", agentId: agent.id, content: full };
    }

    const agentMsg = await appendMessage({
      conversationId,
      senderType: "agent",
      senderAgentId: agent.id,
      content: full,
    });
    yield { type: "agent_message", message: agentMsg };

    await updateAgent(agent.id, {
      memoryAppend: {
        id: `mem_${Date.now()}`,
        content: `${PRINCIPAL_NAME}: ${userText.slice(0, 200)} → ${full.slice(0, 300)}`,
        createdAt: new Date().toISOString(),
        source: "conversation",
      },
    });

    history.push(agentMsg);
  }

  yield { type: "done" };
}
