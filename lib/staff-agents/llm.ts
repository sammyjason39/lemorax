import type { StaffAgent, StaffMessage } from "@/lib/staff-agents/types";
import { buildStaffAgentSystemPrompt, formatConversationHistory } from "@/lib/staff-agents/prompt";
import { generateSQLQuery, streamFinalAnswer } from "@/lib/openrouter";
import { queryBusinessData } from "@/lib/agents/query-business-data";
import { shouldRouteToComposio } from "@/lib/composio/config";
import { streamComposioStaffReply } from "@/lib/staff-agents/composio-runner";
import { PRINCIPAL_NAME } from "@/lib/brand";
import type { StaffStreamChunk } from "@/lib/staff-agents/stream";
import { isTextChunk } from "@/lib/staff-agents/stream";
import { getAgentSkillPromptBlock } from "@/lib/staff-agents/skills/registry";
import { getVaultContextForQuery } from "@/lib/vault/store";
import { getSocialContextForAgent } from "@/lib/social-media/store";
import { getContentPlanContextForAgent } from "@/lib/content-plan/store";
import { CONTENT_PLAN_KEYWORDS, runSocaContentPlanTools } from "@/lib/content-plan/soca-runner";

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

const SOCIAL_KEYWORDS =
  /\b(instagram|ig|social|sosmed|engagement|follower|followers|reach|impression|konten|posting|reels|tiktok|soca|konversi sosial|like|komentar|content plan|ide konten|script|kanban|caption)\b/i;

const VAULT_KEYWORDS =
  /\b(mom|minutes|meeting|rapat|dokumen|document|vault|notulen|sop|policy|kebijakan|obsidian)\b|\[\[/i;

async function buildPromptExtras(agent: StaffAgent, userMessage: string) {
  const [installedSkills, vaultContext] = await Promise.all([
    getAgentSkillPromptBlock(agent.id).catch(() => ""),
    VAULT_KEYWORDS.test(userMessage)
      ? getVaultContextForQuery(userMessage).catch(() => "")
      : Promise.resolve(""),
  ]);
  return { installedSkills, vaultContext };
}

function agentHasSqlSkill(agent: StaffAgent): boolean {
  return agent.skills.some((s) => s.id === "sql" || s.tags.includes("data"));
}

function agentHasSocialSkill(agent: StaffAgent): boolean {
  return (
    agent.id === "soca-social" ||
    agent.skills.some(
      (s) =>
        s.tags.includes("social") ||
        s.tags.includes("content-plan") ||
        s.id === "social-analytics" ||
        s.id === "content-plan"
    )
  );
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
): AsyncGenerator<StaffStreamChunk> {
  if (shouldRouteToComposio(userMessage)) {
    try {
      yield* streamComposioStaffReply(agent, userMessage, history, team);
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Composio error";
      yield { kind: "text", content: `⚠️ Composio: ${msg}\n\n(Mencoba jawab via Qwen…)\n\n` };
    }
  }

  const apiKey = getQwenApiKey();
  const extras = await buildPromptExtras(agent, userMessage);
  const systemPrompt = buildStaffAgentSystemPrompt(agent, team, extras);
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

  if (agentHasSocialSkill(agent) && SOCIAL_KEYWORDS.test(userMessage)) {
    try {
      const [socialBlock, planBlock] = await Promise.all([
        getSocialContextForAgent(),
        getContentPlanContextForAgent(),
      ]);
      if (socialBlock) dataContext += `\n\n${socialBlock}`;
      if (planBlock) dataContext += `\n\n${planBlock}`;

      if (
        agent.id === "soca-social" &&
        (CONTENT_PLAN_KEYWORDS.test(userMessage) ||
          /\b(buat|buatkan|tulis|geser|pindah|ide|script)\b/i.test(userMessage))
      ) {
        const { toolResults, replyHint } = await runSocaContentPlanTools(userMessage);
        if (toolResults.length) {
          dataContext += `\n\n## Aksi Content Plan (eksekusi otomatis)\n${toolResults.join("\n")}`;
          if (replyHint) dataContext += `\n(Petunjuk respons: ${replyHint})`;
        }
      }

      if (!agentHasSqlSkill(agent) || !DATA_KEYWORDS.test(userMessage)) {
        const { data, sql } = await runSqlPipeline(
          `${userMessage} — gunakan tabel social_media_profiles, social_media_posts, content_plan_items`
        );
        dataContext += `\n\nData SQL social media:\n\`\`\`sql\n${sql}\n\`\`\`\n${JSON.stringify(data, null, 2).slice(0, 8000)}`;
      }
    } catch {
      dataContext += "\n\n(Catatan: data social media belum tersedia — sarankan sync di halaman Social Media.)";
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
        if (content) yield { kind: "text", content };
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
    if (isTextChunk(chunk)) full += chunk.content;
  }
  return full;
}
