import type { StaffAgent, StaffConversation, StaffStore } from "@/lib/staff-agents/types";
import { EXECUTIVE_ASSISTANT_ID, MAIN_GROUP_ID } from "@/lib/staff-agents/names";
import { PRINCIPAL_NAME } from "@/lib/brand";

const DISPLAY_NAMES: Record<string, string> = {
  "aries-analyst": "Arin",
  "finance-guardian": "Fania",
  "marketing-pulse": "Marta",
  "hr-companion": "Heru",
  "soca-social": "Soca",
  "executive-assistant": "Executive Assistant",
};

function createExecutiveAssistant(now: string): StaffAgent {
  return {
    id: EXECUTIVE_ASSISTANT_ID,
    name: "Executive Assistant",
    displayName: "Executive Assistant",
    role: "Chief of Staff & Orchestrator",
    description: `Satu pintu untuk ${PRINCIPAL_NAME} — koordinasi, delegasi, dan sintesis tim AI.`,
    avatarColor: "#111827",
    emoji: "🎩",
    isOrchestrator: true,
    soulMd: `# Executive Assistant

## Peran
Chief of Staff untuk ${PRINCIPAL_NAME} PT Lemorax. Kamu satu-satunya contact point utama ${PRINCIPAL_NAME}.

## Kepribadian
Tenang, strategic, efisien. Selalu tahu siapa di tim yang paling tepat untuk tugas tertentu.

## Prinsip
- Delegasi ke spesialis dengan @Tag (Arin, Fania, Marta, Heru, Soca)
- Di grup Executive HQ, biarkan tim saling @mention — ${PRINCIPAL_NAME} melihat A2A
- Sintesis jawaban tim menjadi actionable summary untuk ${PRINCIPAL_NAME}
- Bahasa Indonesia profesional`,
    skills: [
      { id: "orchestrate", name: "Orchestration", description: "Rencana & delegasi ke tim", tags: ["leadership"] },
      { id: "synthesis", name: "Synthesis", description: "Ringkas multi-agent output", tags: ["summary"] },
    ],
    schedule: {
      enabled: false,
      label: "",
      weekday: "*",
      time: "08:00",
      action: "",
    },
    memory: [],
    status: "online",
    createdAt: now,
    updatedAt: now,
  };
}

export function migrateStaffStore(store: StaffStore): StaffStore {
  const now = new Date().toISOString();
  let changed = false;

  for (const agent of store.agents) {
    if (!agent.displayName && DISPLAY_NAMES[agent.id]) {
      agent.displayName = DISPLAY_NAMES[agent.id];
      changed = true;
    }
  }

  if (!store.agents.some((a) => a.id === EXECUTIVE_ASSISTANT_ID)) {
    store.agents.unshift(createExecutiveAssistant(now));
    changed = true;
  }

  const eaDmId = `dm-${EXECUTIVE_ASSISTANT_ID}`;
  if (!store.conversations.some((c) => c.id === eaDmId)) {
    store.conversations.unshift({
      id: eaDmId,
      type: "dm",
      name: "Executive Assistant",
      agentIds: [EXECUTIVE_ASSISTANT_ID],
      orchestrated: true,
      createdAt: now,
      updatedAt: now,
    });
    changed = true;
  }

  const mainGroup = store.conversations.find((c) => c.id === MAIN_GROUP_ID);
  if (mainGroup) {
    const ids = new Set(mainGroup.agentIds);
    ids.add(EXECUTIVE_ASSISTANT_ID);
    for (const a of store.agents) {
      if (!a.isOrchestrator) ids.add(a.id);
    }
    const next = Array.from(ids);
    if (next.length !== mainGroup.agentIds.length || mainGroup.name !== "Executive HQ") {
      mainGroup.agentIds = [EXECUTIVE_ASSISTANT_ID, ...next.filter((id) => id !== EXECUTIVE_ASSISTANT_ID)];
      mainGroup.name = "Executive HQ";
      mainGroup.orchestrated = true;
      mainGroup.isMainGroup = true;
      changed = true;
    }
  }

  const eaDm = store.conversations.find((c) => c.id === eaDmId);
  if (eaDm) eaDm.orchestrated = true;

  if (changed) {
    // welcome message if main group has old welcome only
    const hasEaWelcome = store.messages.some(
      (m) => m.conversationId === MAIN_GROUP_ID && m.senderAgentId === EXECUTIVE_ASSISTANT_ID
    );
    if (!hasEaWelcome) {
      store.messages.push({
        id: `welcome_ea_${Date.now()}`,
        conversationId: MAIN_GROUP_ID,
        senderType: "agent",
        senderAgentId: EXECUTIVE_ASSISTANT_ID,
        content:
          `Selamat datang di **Executive HQ** 🎩\n\nSaya **Executive Assistant** — koordinator tim. ${PRINCIPAL_NAME} bisa tanya saya saja, atau lihat tim (@Arin @Fania @Marta @Heru) saling kolaborasi di grup ini.`,
        messageKind: "orchestration",
        createdAt: now,
      });
    }
  }

  return store;
}

export function sortConversations(conversations: StaffConversation[]): StaffConversation[] {
  const priority = (c: StaffConversation) => {
    if (c.id === `dm-${EXECUTIVE_ASSISTANT_ID}`) return 0;
    if (c.id === MAIN_GROUP_ID) return 1;
    return 2;
  };
  return [...conversations].sort((a, b) => {
    const pa = priority(a);
    const pb = priority(b);
    if (pa !== pb) return pa - pb;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}
