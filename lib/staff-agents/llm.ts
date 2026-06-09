import type { StaffAgent, StaffMessage } from "@/lib/staff-agents/types";
import { buildStaffAgentSystemPrompt, formatConversationHistory } from "@/lib/staff-agents/prompt";
import { generateSQLQuery, streamFinalAnswer } from "@/lib/openrouter";
import { queryBusinessData } from "@/lib/agents/query-business-data";
import { PRINCIPAL_NAME } from "@/lib/brand";

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

const DATA_KEYWORDS =
  /\b(cabang|sales|revenue|omset|kpi|profit|crm|deal|marketing|finance|absensi|karyawan|transaksi|berapa|total|data|laporan)\b/i;

function agentHasSqlSkill(agent: StaffAgent): boolean {
  return agent.skills.some((s) => s.id === "sql" || s.tags.includes("data"));
}

async function runSqlPipeline(userMessage: string): Promise<{ data: unknown; sql: string }> {
  const { sql_query, explanation } = await generateSQLQuery(userMessage);
  const result = await queryBusinessData({
    sql_query,
    explanation,
    source: `staff-agent`,
  });
  const data = result.ok ? result.rows : { error: result.error, sql_query };
  return { data, sql: result.ok ? result.sql_query : sql_query };
}

export async function* streamStaffAgentReply(
  agent: StaffAgent,
  userMessage: string,
  history: StaffMessage[],
  team?: StaffAgent[]
): AsyncGenerator<string> {
  const apiKey = getQwenApiKey();
  const systemPrompt = buildStaffAgentSystemPrompt(agent, team);
  const historyText = formatConversationHistory(history, agent.id, team);

  let dataContext = "";
  if (agentHasSqlSkill(agent) && DATA_KEYWORDS.test(userMessage)) {
    try {
      const { data, sql } = await runSqlPipeline(userMessage);
      dataContext = `\n\nData hasil query:\n\`\`\`sql\n${sql}\n\`\`\`\n${JSON.stringify(data, null, 2).slice(0, 12000)}`;
    } catch {
      dataContext = "\n\n(Catatan: query data gagal — jawab berdasarkan pengetahuan umum bisnis.)";
    }
  }

  const response = await fetch(getQwenApiUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Riwayat chat:\n${historyText || "(kosong)"}\n\nPesan ${PRINCIPAL_NAME} sekarang: ${userMessage}${dataContext}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.35,
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Qwen error: ${err}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // skip
      }
    }
  }
}

export async function collectStaffAgentReply(
  agent: StaffAgent,
  userMessage: string,
  history: StaffMessage[],
  team?: StaffAgent[]
): Promise<string> {
  let full = "";
  for await (const chunk of streamStaffAgentReply(agent, userMessage, history, team)) {
    full += chunk;
  }
  return full;
}
