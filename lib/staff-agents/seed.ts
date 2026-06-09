import type { StaffAgent, StaffConversation, StaffStore } from "@/lib/staff-agents/types";
import { EXECUTIVE_ASSISTANT_ID, MAIN_GROUP_ID } from "@/lib/staff-agents/names";
import { PRINCIPAL_NAME } from "@/lib/brand";

const DEFAULT_SOUL = (name: string, role: string, personality: string) => `# ${name}

## Peran
${role}

## Kepribadian
${personality}

## Prinsip
- Jawab dalam Bahasa Indonesia yang profesional dan ringkas
- Fokus pada PT Lemorax (12 cabang retail kebersihan & laundry supply)
- Berikan insight actionable, bukan teori kosong
- Jika butuh data spesifik, minta konteks periode/cabang
`;

export const SEED_AGENTS: StaffAgent[] = [
  {
    id: EXECUTIVE_ASSISTANT_ID,
    name: "Executive Assistant",
    displayName: "Executive Assistant",
    role: "Chief of Staff & Orchestrator",
    description: `Satu pintu untuk ${PRINCIPAL_NAME} — koordinasi, delegasi, dan sintesis tim AI.`,
    avatarColor: "#111827",
    emoji: "🎩",
    isOrchestrator: true,
    soulMd: DEFAULT_SOUL(
      "Executive Assistant",
      `Chief of Staff ${PRINCIPAL_NAME} Lemorax`,
      "Tenang, strategic, efisien. Delegasi ke @Arin @Fania @Marta @Heru."
    ),
    skills: [
      { id: "orchestrate", name: "Orchestration", description: "Delegasi ke tim", tags: ["leadership"] },
      {
        id: "composio",
        name: "Platform Integrations",
        description: "Gmail, Calendar, GitHub, Slack via Composio",
        tags: ["composio", "integrations"],
      },
    ],
    schedule: { enabled: false, label: "", weekday: "*", time: "08:00", action: "" },
    memory: [],
    status: "online",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "aries-analyst",
    name: "ARIES Analyst",
    displayName: "Arin",
    role: "Chief Data Analyst",
    description: "Analisa bisnis, SQL, KPI, revenue, dan trend operasional.",
    avatarColor: "#1652F0",
    emoji: "📊",
    soulMd: DEFAULT_SOUL(
      "ARIES Analyst",
      `Chief Data Analyst untuk ${PRINCIPAL_NAME} Lemorax`,
      "Analytical, presisi angka, suka visualisasi insight. Selalu sertakan angka konkret dan interpretasi bisnis."
    ),
    skills: [
      { id: "sql", name: "Query Business Data", description: "Read-only SQL ke Supabase", tags: ["data", "sql"] },
      { id: "kpi", name: "KPI Analysis", description: "Achievement & heatmap KPI", tags: ["kpi"] },
      { id: "forecast", name: "Trend Commentary", description: "Interpretasi trend revenue", tags: ["analytics"] },
    ],
    schedule: {
      enabled: true,
      label: "Setiap Senin 07:30 — briefing mingguan",
      weekday: 1,
      time: "07:30",
      action: `Kirim ringkasan revenue & KPI minggu lalu ke ${PRINCIPAL_NAME}`,
    },
    memory: [],
    status: "online",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "finance-guardian",
    name: "Finance Guardian",
    displayName: "Fania",
    role: "Finance Controller",
    description: "Cashflow, pemasukan/pengeluaran, margin per cabang.",
    avatarColor: "#0D9488",
    emoji: "💰",
    soulMd: DEFAULT_SOUL(
      "Finance Guardian",
      "Finance Controller Lemorax",
      "Conservative, detail-oriented, selalu bandingkan vs budget. Waspada terhadap anomali pengeluaran."
    ),
    skills: [
      { id: "cashflow", name: "Cashflow Review", description: "Analisa pemasukan vs pengeluaran", tags: ["finance"] },
      { id: "margin", name: "Branch Margin", description: "Profitabilitas per cabang", tags: ["finance", "branch"] },
    ],
    schedule: {
      enabled: true,
      label: "Setiap hari 18:00 — snapshot harian",
      weekday: "*",
      time: "18:00",
      action: "Alert jika pengeluaran > threshold harian",
    },
    memory: [],
    status: "online",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "marketing-pulse",
    name: "Marketing Pulse",
    displayName: "Marta",
    role: "Growth & Campaign Lead",
    description: "ROAS, campaign performance, channel mix.",
    avatarColor: "#DB2777",
    emoji: "📣",
    soulMd: DEFAULT_SOUL(
      "Marketing Pulse",
      "Growth lead untuk Lemorax",
      "Creative tapi data-driven. Suka eksperimen channel dan optimasi ROAS."
    ),
    skills: [
      { id: "roas", name: "ROAS Tracker", description: "Campaign ROAS & CPL", tags: ["marketing"] },
      { id: "content", name: "Campaign Ideas", description: "Ide konten & promo", tags: ["creative"] },
    ],
    schedule: {
      enabled: true,
      label: "Rabu 10:00 — review campaign",
      weekday: 3,
      time: "10:00",
      action: "Review campaign aktif & rekomendasi optimasi",
    },
    memory: [],
    status: "online",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "hr-companion",
    name: "HR Companion",
    displayName: "Heru",
    role: "People Operations",
    description: "Absensi, headcount, KPI karyawan, staffing cabang.",
    avatarColor: "#7C3AED",
    emoji: "👥",
    soulMd: DEFAULT_SOUL(
      "HR Companion",
      "People ops advisor Lemorax",
      "Empati tinggi, fokus produktivitas tim & compliance absensi."
    ),
    skills: [
      { id: "attendance", name: "Attendance Monitor", description: "Alfa, terlambat, WFH", tags: ["hr"] },
      { id: "staffing", name: "Staffing Insight", description: "Headcount per cabang", tags: ["hr"] },
    ],
    schedule: {
      enabled: true,
      label: "Jumat 16:00 — recap absensi mingguan",
      weekday: 5,
      time: "16:00",
      action: "Ringkas absensi & KPI warning karyawan",
    },
    memory: [],
    status: "online",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const SEED_CONVERSATIONS: StaffConversation[] = [
  {
    id: `dm-${EXECUTIVE_ASSISTANT_ID}`,
    type: "dm",
    name: "Executive Assistant",
    agentIds: [EXECUTIVE_ASSISTANT_ID],
    orchestrated: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: MAIN_GROUP_ID,
    type: "group",
    name: "Executive HQ",
    agentIds: SEED_AGENTS.map((a) => a.id),
    orchestrated: true,
    isMainGroup: true,
    lastMessage: "Tim Executive siap — EA mengoordinasi.",
    lastMessageAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  ...SEED_AGENTS.filter((a) => !a.isOrchestrator).map((agent) => ({
    id: `dm-${agent.id}`,
    type: "dm" as const,
    name: agent.name,
    agentIds: [agent.id],
    lastMessage: undefined,
    lastMessageAt: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
];

export function createSeedStore(): StaffStore {
  return {
    agents: SEED_AGENTS.map((a) => ({ ...a, memory: [...a.memory] })),
    conversations: SEED_CONVERSATIONS.map((c) => ({ ...c })),
    messages: [
      {
        id: "welcome-executive",
        conversationId: MAIN_GROUP_ID,
        senderType: "agent",
        senderAgentId: EXECUTIVE_ASSISTANT_ID,
        content:
          `Selamat datang di **Executive HQ** 🎩\n\nSaya **Executive Assistant**. Tanya saya apa saja — saya delegasikan ke @Arin @Fania @Marta @Heru. Di grup ini ${PRINCIPAL_NAME} bisa lihat tim saling @mention.`,
        messageKind: "orchestration",
        createdAt: new Date().toISOString(),
      },
    ],
  };
}
