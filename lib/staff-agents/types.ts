export type StaffAgentSkill = {
  id: string;
  name: string;
  description: string;
  tags: string[];
};

export type StaffAgentSchedule = {
  enabled: boolean;
  /** Cron-like label for UI, e.g. "Setiap Senin 08:00" */
  label: string;
  /** ISO weekday 0-6 (0=Min) or * for daily */
  weekday: number | "*";
  time: string;
  action: string;
  /** ISO timestamp — last successful schedule run */
  lastRunAt?: string;
};

export type StaffAgentMemory = {
  id: string;
  content: string;
  createdAt: string;
  source: "conversation" | "manual" | "schedule";
};

export type StaffAgent = {
  id: string;
  name: string;
  /** Nickname for @mentions, e.g. Fania, Marta */
  displayName?: string;
  role: string;
  description: string;
  avatarColor: string;
  emoji: string;
  soulMd: string;
  skills: StaffAgentSkill[];
  schedule: StaffAgentSchedule;
  memory: StaffAgentMemory[];
  status: "online" | "offline" | "busy";
  /** Chief orchestrator — Executive Assistant */
  isOrchestrator?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ConversationType = "dm" | "group";

export type StaffConversation = {
  id: string;
  type: ConversationType;
  name: string;
  agentIds: string[];
  lastMessage?: string;
  lastMessageAt?: string;
  /** EA orchestrates handoffs & cross-talk */
  orchestrated?: boolean;
  isMainGroup?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StaffMessageKind = "normal" | "handoff" | "crosstalk" | "orchestration" | "schedule";

export type StaffMessage = {
  id: string;
  conversationId: string;
  senderType: "user" | "agent";
  senderAgentId?: string;
  content: string;
  createdAt: string;
  scheduleRun?: boolean;
  handoffFrom?: string;
  mentions?: string[];
  messageKind?: StaffMessageKind;
};

export type StaffStore = {
  agents: StaffAgent[];
  conversations: StaffConversation[];
  messages: StaffMessage[];
};

export type StaffAgentUpdate = Partial<
  Pick<
    StaffAgent,
    | "name"
    | "displayName"
    | "role"
    | "description"
    | "avatarColor"
    | "emoji"
    | "soulMd"
    | "skills"
    | "schedule"
    | "status"
  >
> & { memoryAppend?: StaffAgentMemory };
