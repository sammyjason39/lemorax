import type { StaffAgent, StaffMessage } from "@/lib/staff-agents/types";
import {
  buildTeamRoster,
  EXECUTIVE_ASSISTANT_ID,
  getChatLabel,
  getDisplayName,
  getMentionTag,
  isOrchestratedConversation,
  MAIN_GROUP_ID,
  parseMentions,
  PRINCIPAL_NAME,
} from "@/lib/staff-agents/names";
import { planOrchestration } from "@/lib/staff-agents/executive-planner";
import {
  appendMessage,
  getAgent,
  getConversation,
  listAgents,
  listMessages,
  updateAgent,
} from "@/lib/staff-agents/store";
import { streamStaffAgentReply, collectStaffAgentReply } from "@/lib/staff-agents/llm";
import type { StaffChatSSEEvent } from "@/lib/staff-agents/chat";

const MAX_CROSS_TALK_ROUNDS = 3;

function buildHandoffPrompt(
  agent: StaffAgent,
  task: string,
  fromAgent: StaffAgent | undefined,
  mode: "group" | "dm",
  team: StaffAgent[]
): string {
  const roster =
    mode === "group" ? `\n\nTim di grup (boleh @mention kolega):\n${buildTeamRoster(team)}` : "";
  const fromLine = fromAgent
    ? `${getDisplayName(fromAgent)} mendelegasikan / mentransfer ke kamu.`
    : `${PRINCIPAL_NAME} meminta bantuan kamu.`;

  return `${fromLine}

Tugas: ${task}

Instruksi:
- Jawab sebagai ${getDisplayName(agent)} (${agent.role})
- Gunakan @Tag (contoh ${getMentionTag(agent)}) saat menyebut kolega di grup
- Data Lemorax: gunakan query jika perlu angka
- Ringkas, actionable, Bahasa Indonesia${roster}`;
}

async function* streamAndSaveAgentReply(params: {
  conversationId: string;
  agent: StaffAgent;
  prompt: string;
  history: StaffMessage[];
  team: StaffAgent[];
  handoffFrom?: string;
  messageKind?: StaffMessage["messageKind"];
}): AsyncGenerator<StaffChatSSEEvent, StaffMessage | undefined> {
  const { conversationId, agent, prompt, history, team, handoffFrom, messageKind } = params;

  yield { type: "agent_start", agentId: agent.id, agentName: getChatLabel(agent) };

  if (handoffFrom) {
    yield { type: "a2a_handoff", fromAgentId: handoffFrom, toAgentId: agent.id, task: prompt.slice(0, 200) };
  }

  let full = "";
  try {
    for await (const chunk of streamStaffAgentReply(agent, prompt, history, team)) {
      full += chunk;
      yield { type: "agent_chunk", agentId: agent.id, content: chunk };
    }
  } catch (err) {
    full = `⚠️ ${err instanceof Error ? err.message : "Error"}`;
    yield { type: "agent_chunk", agentId: agent.id, content: full };
  }

  const mentions = parseMentions(full, team);

  const message = await appendMessage({
    conversationId,
    senderType: "agent",
    senderAgentId: agent.id,
    content: full,
    handoffFrom,
    mentions,
    messageKind: messageKind ?? (handoffFrom ? "handoff" : "normal"),
  });

  yield { type: "agent_message", message };

  await updateAgent(agent.id, {
    memoryAppend: {
      id: `mem_${Date.now()}`,
      content: `[${messageKind ?? "chat"}] ${prompt.slice(0, 80)} → ${full.slice(0, 220)}`,
      createdAt: new Date().toISOString(),
      source: "conversation",
    },
  });

  return message;
}

export async function* runOrchestratedConversationChat(
  conversationId: string,
  userText: string
): AsyncGenerator<StaffChatSSEEvent> {
  const conversation = await getConversation(conversationId);
  if (!conversation) {
    yield { type: "error", message: "Conversation not found" };
    return;
  }

  const allAgents = await listAgents();
  const ea = allAgents.find((a) => a.id === EXECUTIVE_ASSISTANT_ID);
  if (!ea) {
    yield { type: "error", message: "Executive Assistant not configured" };
    return;
  }

  const mode = conversationId === MAIN_GROUP_ID ? "group" : "dm";

  const userMsg = await appendMessage({
    conversationId,
    senderType: "user",
    content: userText,
  });
  yield { type: "user_message", message: userMsg };

  let history = await listMessages(conversationId);

  let plan;
  try {
    plan = await planOrchestration(userText, allAgents, history, mode);
  } catch (err) {
    yield { type: "error", message: err instanceof Error ? err.message : "Planning failed" };
    return;
  }

  if (mode === "group") plan.enable_cross_talk = true;

  // EA opening
  yield { type: "agent_start", agentId: ea.id, agentName: getChatLabel(ea) };
  let eaOpening = plan.ea_opening;
  for (const chunk of [eaOpening]) {
    yield { type: "agent_chunk", agentId: ea.id, content: chunk };
  }

  const eaOpenMsg = await appendMessage({
    conversationId,
    senderType: "agent",
    senderAgentId: ea.id,
    content: eaOpening,
    messageKind: "orchestration",
    mentions: parseMentions(eaOpening, allAgents),
  });
  yield { type: "agent_message", message: eaOpenMsg };
  history = [...history, eaOpenMsg];

  // Re-enrich delegations from EA opening @mentions
  const openingMentions = parseMentions(`${userText}\n${eaOpening}`, allAgents);
  for (const id of openingMentions) {
    if (id === EXECUTIVE_ASSISTANT_ID) continue;
    if (!plan.delegations.some((d) => d.agentId === id)) {
      plan.delegations.push({ agentId: id, task: userText });
    }
  }

  const delegated = new Set<string>();
  const queue: { agentId: string; task: string; fromId: string }[] = [];
  for (const d of plan.delegations) {
    if (delegated.has(d.agentId) || d.agentId === EXECUTIVE_ASSISTANT_ID) continue;
    delegated.add(d.agentId);
    queue.push({ agentId: d.agentId, task: d.task, fromId: ea.id });
  }

  let crossTalkRounds = 0;
  let specialistReplyCount = 0;

  while (queue.length > 0) {
    const item = queue.shift()!;

    const agent = await getAgent(item.agentId);
    if (!agent || agent.isOrchestrator) continue;

    const fromAgent = allAgents.find((a) => a.id === item.fromId);
    const prompt = buildHandoffPrompt(agent, item.task, fromAgent, mode, allAgents);

    const gen = streamAndSaveAgentReply({
      conversationId,
      agent,
      prompt,
      history,
      team: allAgents,
      handoffFrom: item.fromId,
      messageKind: item.fromId === ea.id ? "handoff" : "crosstalk",
    });

    let agentMsg: StaffMessage | undefined;
    for await (const ev of gen) {
      yield ev;
      if (ev.type === "agent_message") agentMsg = ev.message;
    }

    if (agentMsg) {
      history.push(agentMsg);
      specialistReplyCount++;

      if (plan.enable_cross_talk && mode === "group" && crossTalkRounds < MAX_CROSS_TALK_ROUNDS) {
        const mentioned = parseMentions(agentMsg.content, allAgents).filter((id) => id !== agent.id);
        for (const mid of mentioned) {
          if (queue.some((q) => q.agentId === mid)) continue;
          queue.push({
            agentId: mid,
            task: `${getDisplayName(agent)} menyebut kamu: "${agentMsg.content.slice(0, 180)}..." — respon singkat dan relevan.`,
            fromId: agent.id,
          });
        }
        if (mentioned.length > 0) crossTalkRounds++;
      }
    }
  }

  // EA closing synthesis
  if (specialistReplyCount > 0 || mode === "dm") {
    yield { type: "agent_start", agentId: ea.id, agentName: getChatLabel(ea) };

    const closingPrompt = `[SYNTHESIS — Executive Assistant]

${PRINCIPAL_NAME} bertanya: ${userText}

${plan.ea_closing_hint}

Ringkas jawaban tim untuk ${PRINCIPAL_NAME}. Sebut kontributor dengan @Tag. Max 3 paragraf.`;

    let closing = "";
    try {
      closing = await collectStaffAgentReply(ea, closingPrompt, history, allAgents);
    } catch (err) {
      closing = `Tim sudah merespons di atas. ${err instanceof Error ? err.message : ""}`;
    }

    yield { type: "agent_chunk", agentId: ea.id, content: closing };

    const closeMsg = await appendMessage({
      conversationId,
      senderType: "agent",
      senderAgentId: ea.id,
      content: closing,
      messageKind: "orchestration",
      mentions: parseMentions(closing, allAgents),
    });
    yield { type: "agent_message", message: closeMsg };
  }

  yield { type: "done" };
}

export { isOrchestratedConversation };
