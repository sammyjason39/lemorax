import type { AgentChatHistoryMessage, AgentLastQuery } from "@/lib/agents/types";

export type AgentToolName = "query_business_data" | "direct_answer" | "continue_data_answer";

export type AgentPlan = {
  tools: AgentToolName[];
  reason: string;
};

const DATA_QUERY_PATTERNS = [
  /\b(cabang|sales|penjualan|revenue|omset|kpi|profit|laba|crm|deal|marketing|campaign|karyawan|absensi|gaji|performa|ranking|total|berapa|rata|tertinggi|terendah|banding|bandingkan|trend|grafik|data|laporan|finance|pemasukan|pengeluaran|budget|roas|conversion)\b/i,
  /\b(jakarta|bandung|surabaya|medan|bali|semarang|yogyakarta|makassar|palembang|tangerang|bekasi)\b/i,
  /\b(b2b|b2c|produk|transaksi|closed won|pipeline)\b/i,
];

const GREETING_ONLY =
  /^(halo|hai|hi|hello|selamat\s+(pagi|siang|sore|malam)|thanks|terima kasih|oke|ok|thanks)[\s!.?]*$/i;

const CONTINUE_PATTERNS =
  /^(lanjut|lanjutkan|continue|terus|teruskan|sambung|sambungkan|go on|keep going)[\s!.?]*$/i;

const FOLLOWUP_PATTERNS =
  /\b(lanjut|lanjutkan|yang tadi|sebelumnya|di atas|tadi|tersebut|itu|jelaskan lebih|lebih detail|maksudnya|kenapa begitu|nomor \d|poin \d|selanjutnya|bagaimana dengan|what about|dibanding tadi)\b/i;

/**
 * Lightweight router — picks which tools to run.
 * Replace with LLM planner when adding more tools.
 */
export function planAgentRun(
  message: string,
  opts?: { history?: AgentChatHistoryMessage[]; lastQuery?: AgentLastQuery }
): AgentPlan {
  const trimmed = message.trim();
  const hasHistory = Boolean(opts?.history?.length);

  if (trimmed.length < 2) {
    return { tools: ["direct_answer"], reason: "empty or too short" };
  }

  if (GREETING_ONLY.test(trimmed)) {
    return { tools: ["direct_answer"], reason: "greeting or small talk" };
  }

  if (opts?.lastQuery && CONTINUE_PATTERNS.test(trimmed)) {
    return { tools: ["continue_data_answer"], reason: "continue prior data analysis" };
  }

  if (hasHistory && FOLLOWUP_PATTERNS.test(trimmed) && !DATA_QUERY_PATTERNS.some((p) => p.test(trimmed))) {
    return { tools: ["direct_answer"], reason: "follow-up on prior conversation" };
  }

  if (hasHistory && FOLLOWUP_PATTERNS.test(trimmed) && opts?.lastQuery) {
    return { tools: ["continue_data_answer"], reason: "follow-up with prior query context" };
  }

  if (DATA_QUERY_PATTERNS.some((p) => p.test(trimmed))) {
    return { tools: ["query_business_data"], reason: "business data question" };
  }

  // Default: try SQL first for analyst context; direct answer if clearly conceptual
  const isConceptual =
    /\b(apakah|bagaimana cara|jelaskan|what is|siapa aries|kamu siapa|help|bantuan)\b/i.test(trimmed) &&
    !DATA_QUERY_PATTERNS.some((p) => p.test(trimmed));

  if (isConceptual) {
    return { tools: ["direct_answer"], reason: "conceptual or help question" };
  }

  return { tools: ["query_business_data"], reason: "default analyst mode" };
}
