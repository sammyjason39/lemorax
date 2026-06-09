import type { StaffAgent, StaffConversation, StaffMessage } from "@/lib/staff-agents/types";

export type AgentRow = {
  id: string;
  name: string;
  display_name: string | null;
  role: string;
  description: string | null;
  avatar_color: string | null;
  emoji: string | null;
  soul_md: string;
  skills: unknown;
  schedule: unknown;
  memory: unknown;
  status: string | null;
  is_orchestrator: boolean | null;
  created_at: string;
  updated_at: string;
};

export type ConversationRow = {
  id: string;
  type: string;
  name: string;
  agent_ids: string[];
  last_message: string | null;
  last_message_at: string | null;
  orchestrated: boolean | null;
  is_main_group: boolean | null;
  created_at: string;
  updated_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_agent_id: string | null;
  content: string;
  schedule_run: boolean | null;
  handoff_from: string | null;
  mentions: string[] | null;
  message_kind: string | null;
  created_at: string;
};

export function agentFromRow(row: AgentRow): StaffAgent {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name ?? undefined,
    role: row.role,
    description: row.description ?? "",
    avatarColor: row.avatar_color ?? "#1652F0",
    emoji: row.emoji ?? "🤖",
    soulMd: row.soul_md,
    skills: (row.skills as StaffAgent["skills"]) ?? [],
    schedule: (row.schedule as StaffAgent["schedule"]) ?? {
      enabled: false,
      label: "",
      weekday: "*",
      time: "09:00",
      action: "",
    },
    memory: (row.memory as StaffAgent["memory"]) ?? [],
    status: (row.status as StaffAgent["status"]) ?? "online",
    isOrchestrator: row.is_orchestrator ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function agentToRow(agent: StaffAgent): AgentRow {
  return {
    id: agent.id,
    name: agent.name,
    display_name: agent.displayName ?? null,
    role: agent.role,
    description: agent.description,
    avatar_color: agent.avatarColor,
    emoji: agent.emoji,
    soul_md: agent.soulMd,
    skills: agent.skills,
    schedule: agent.schedule,
    memory: agent.memory,
    status: agent.status,
    is_orchestrator: agent.isOrchestrator ?? false,
    created_at: agent.createdAt,
    updated_at: agent.updatedAt,
  };
}

export function conversationFromRow(row: ConversationRow): StaffConversation {
  return {
    id: row.id,
    type: row.type as StaffConversation["type"],
    name: row.name,
    agentIds: row.agent_ids ?? [],
    lastMessage: row.last_message ?? undefined,
    lastMessageAt: row.last_message_at ?? undefined,
    orchestrated: row.orchestrated ?? false,
    isMainGroup: row.is_main_group ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function conversationToRow(conv: StaffConversation): ConversationRow {
  return {
    id: conv.id,
    type: conv.type,
    name: conv.name,
    agent_ids: conv.agentIds,
    last_message: conv.lastMessage ?? null,
    last_message_at: conv.lastMessageAt ?? null,
    orchestrated: conv.orchestrated ?? false,
    is_main_group: conv.isMainGroup ?? false,
    created_at: conv.createdAt,
    updated_at: conv.updatedAt,
  };
}

export function messageFromRow(row: MessageRow): StaffMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderType: row.sender_type as StaffMessage["senderType"],
    senderAgentId: row.sender_agent_id ?? undefined,
    content: row.content,
    createdAt: row.created_at,
    scheduleRun: row.schedule_run ?? false,
    handoffFrom: row.handoff_from ?? undefined,
    mentions: row.mentions ?? undefined,
    messageKind: (row.message_kind as StaffMessage["messageKind"]) ?? undefined,
  };
}

export function messageToRow(msg: StaffMessage): MessageRow {
  return {
    id: msg.id,
    conversation_id: msg.conversationId,
    sender_type: msg.senderType,
    sender_agent_id: msg.senderAgentId ?? null,
    content: msg.content,
    schedule_run: msg.scheduleRun ?? false,
    handoff_from: msg.handoffFrom ?? null,
    mentions: msg.mentions ?? [],
    message_kind: msg.messageKind ?? null,
    created_at: msg.createdAt,
  };
}
