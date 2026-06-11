import type { StaffAgent, StaffMessage } from "@/lib/staff-agents/types";
import { buildTeamRoster, EXECUTIVE_ASSISTANT_ID, getDisplayName, parseMentions, resolveAgentId, PRINCIPAL_NAME } from "@/lib/staff-agents/names";
import { retrieveVaultRAG } from "@/lib/vault/rag";

function getQwenApiUrl(): string {
  const base = process.env.QWEN_API_BASE_URL?.replace(/\/$/, "");
  if (!base) throw new Error("QWEN_API_BASE_URL not configured");
  return `${base}/chat/completions`;
}

function getQwenApiKey(): string {
  const key = process.env.QWEN_API_KEY;
  if (!key) throw new Error("QWEN_API_KEY not configured");
  return key;
}

const MODEL = process.env.QWEN_MODEL || "qwen3.7-plus";

export type DelegationPlan = {
  agentId: string;
  task: string;
};

export type OrchestrationPlan = {
  ea_opening: string;
  delegations: DelegationPlan[];
  ea_closing_hint: string;
  enable_cross_talk: boolean;
};

export async function planOrchestration(
  userMessage: string,
  agents: StaffAgent[],
  history: StaffMessage[],
  mode: "dm" | "group"
): Promise<OrchestrationPlan> {
  const specialists = agents.filter((a) => !a.isOrchestrator && a.id !== EXECUTIVE_ASSISTANT_ID);
  const roster = buildTeamRoster(agents);
  const historyText = history
    .slice(-10)
    .map((m) => {
      if (m.senderType === "user") return `${PRINCIPAL_NAME}: ${m.content}`;
      const a = agents.find((x) => x.id === m.senderAgentId);
      return `${a ? getDisplayName(a) : "Agent"}: ${m.content.slice(0, 300)}`;
    })
    .join("\n");

  const userMentions = parseMentions(userMessage, agents);
  const mentionHint =
    userMentions.length > 0
      ? `\n${PRINCIPAL_NAME} explicitly mentioned agent ids: ${userMentions.join(", ")} — include them in delegations.`
      : "";

  const vault = await retrieveVaultRAG(userMessage).catch(() => ({
    context: "",
    noteCount: 0,
    chunkCount: 0,
    titles: [] as string[],
  }));

  const response = await fetch(getQwenApiUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getQwenApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `Kamu adalah Executive Assistant (Chief of Staff) PT Lemorax. Rencanakan delegasi ke spesialis.

Panggil user **${PRINCIPAL_NAME}** — jangan sebut "owner".

Tim (gunakan @tag saat menyebut di ea_opening):
${roster}

Mode: ${mode === "group" ? `GROUP — ${PRINCIPAL_NAME} melihat semua agent saling @mention` : `DM — ${PRINCIPAL_NAME} hanya chat dengan EA, tapi handoff ke spesialis tetap terlihat`}

Return HANYA JSON valid:
{
  "ea_opening": "Respons EA ke ${PRINCIPAL_NAME}. Sebut siapa yang akan dikerjakan dengan @Tag (contoh @Fania).",
  "delegations": [{"agentId": "finance-guardian", "task": "instruksi spesifik"}],
  "ea_closing_hint": "petunjuk singkat untuk EA menutup setelah spesialis jawab",
  "enable_cross_talk": true
}

Rules:
- Pilih 0-3 delegations paling relevan
- agentId harus dari roster
- Jika pertanyaan general/sapa, delegations boleh []
- enable_cross_talk true di group, false di dm kecuali multi-domain
- Jika Company Vault relevan, arahkan delegasi ke agent yang paling cocok dan sertakan konteks vault di task`,
        },
        {
          role: "user",
          content: `Riwayat:\n${historyText || "(kosong)"}\n\n${vault.context ? `${vault.context}\n\n` : ""}Pesan ${PRINCIPAL_NAME}: ${userMessage}${mentionHint}`,
        },
      ],
      max_tokens: 800,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`Planner error: ${await response.text()}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return fallbackPlan(userMessage, specialists, userMentions, mode);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as OrchestrationPlan;
    const validIds = new Set(specialists.map((a) => a.id));

    parsed.delegations = (parsed.delegations ?? [])
      .map((d) => {
        const resolved = resolveAgentId(d.agentId, agents) ?? resolveAgentId(String(d.agentId), specialists);
        return resolved ? { agentId: resolved, task: d.task || userMessage } : null;
      })
      .filter((d): d is DelegationPlan => d !== null && validIds.has(d.agentId));

    parsed.delegations = enrichDelegations(parsed.delegations, userMessage, parsed.ea_opening ?? "", agents);

    if (mode === "group") parsed.enable_cross_talk = true;

    return parsed;
  } catch {
    return fallbackPlan(userMessage, specialists, userMentions, mode);
  }
}

function enrichDelegations(
  delegations: DelegationPlan[],
  userMessage: string,
  eaOpening: string,
  agents: StaffAgent[]
): DelegationPlan[] {
  const out = [...delegations];
  const seen = new Set(out.map((d) => d.agentId));

  for (const id of parseMentions(`${userMessage}\n${eaOpening}`, agents)) {
    if (id === EXECUTIVE_ASSISTANT_ID || seen.has(id)) continue;
    seen.add(id);
    out.push({ agentId: id, task: userMessage });
  }

  if (out.length === 0) {
    for (const id of inferKeywordDelegations(userMessage, agents)) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ agentId: id, task: userMessage });
    }
  }

  return out;
}

function inferKeywordDelegations(userMessage: string, agents: StaffAgent[]): string[] {
  const t = userMessage.toLowerCase();
  const rules: [RegExp, string][] = [
    [/\b(revenue|kpi|data|sql|analisa|penjualan|omzet)\b/, "aries-analyst"],
    [/\b(finance|keuangan|cashflow|pengeluaran|pemasukan|margin|budget)\b/, "finance-guardian"],
    [/\b(marketing|campaign|roas|iklan|promo|ads)\b/, "marketing-pulse"],
    [/\b(hr|karyawan|absensi|headcount|staff|pegawai|tim)\b/, "hr-companion"],
  ];

  const ids: string[] = [];
  for (const [re, agentId] of rules) {
    if (re.test(t) && agents.some((a) => a.id === agentId)) ids.push(agentId);
  }
  return ids;
}

function fallbackPlan(
  userMessage: string,
  specialists: StaffAgent[],
  userMentions: string[],
  mode: "dm" | "group"
): OrchestrationPlan {
  let delegations: DelegationPlan[] = userMentions
    .filter((id) => id !== EXECUTIVE_ASSISTANT_ID)
    .map((id) => ({ agentId: id, task: userMessage }));

  delegations = enrichDelegations(delegations, userMessage, "", specialists);

  if (delegations.length === 0 && specialists.length > 0 && mode === "group") {
    delegations = specialists.slice(0, 2).map((a) => ({ agentId: a.id, task: userMessage }));
  } else if (delegations.length === 0 && specialists.length > 0) {
    delegations.push({ agentId: specialists[0].id, task: userMessage });
  }

  return {
    ea_opening: `Baik ${PRINCIPAL_NAME}, saya koordinasikan tim untuk: "${userMessage.slice(0, 120)}"`,
    delegations,
    ea_closing_hint: `Ringkas jawaban tim untuk ${PRINCIPAL_NAME}.`,
    enable_cross_talk: mode === "group",
  };
}
