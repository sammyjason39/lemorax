export type AgentToolName = "query_business_data" | "direct_answer";

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

/**
 * Lightweight router — picks which tools to run.
 * Replace with LLM planner when adding more tools.
 */
export function planAgentRun(message: string): AgentPlan {
  const trimmed = message.trim();

  if (trimmed.length < 2) {
    return { tools: ["direct_answer"], reason: "empty or too short" };
  }

  if (GREETING_ONLY.test(trimmed)) {
    return { tools: ["direct_answer"], reason: "greeting or small talk" };
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
