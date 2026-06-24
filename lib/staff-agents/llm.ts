import type { StaffAgent, StaffMessage } from "@/lib/staff-agents/types";
import { buildStaffAgentSystemPrompt, formatConversationHistory } from "@/lib/staff-agents/prompt";
import { generateSQLQuery, streamFinalAnswer } from "@/lib/openrouter";
import { queryBusinessData } from "@/lib/agents/query-business-data";
import { shouldRouteToComposio } from "@/lib/composio/config";
import { streamComposioStaffReply } from "@/lib/staff-agents/composio-runner";
import { PRINCIPAL_NAME } from "@/lib/brand";
import type { StaffStreamChunk } from "@/lib/staff-agents/stream";
import { isTextChunk } from "@/lib/staff-agents/stream";
import { buildAgentPromptExtras } from "@/lib/staff-agents/agent-context";
import { getSocialContextForAgent } from "@/lib/social-media/store";
import { getContentPlanContextForAgent } from "@/lib/content-plan/store";
import { CONTENT_PLAN_KEYWORDS, runSocaContentPlanTools } from "@/lib/content-plan/soca-runner";
import { streamChatCompletion } from "@/lib/ai/chat-provider";

const DATA_KEYWORDS =
  /\b(cabang|sales|revenue|omset|kpi|profit|crm|deal|marketing|finance|absensi|karyawan|transaksi|berapa|total|data|laporan)\b/i;

const SOCIAL_KEYWORDS =
  /\b(instagram|ig|social|sosmed|engagement|follower|followers|reach|impression|konten|posting|reels|tiktok|soca|konversi sosial|like|komentar|content plan|ide konten|script|kanban|caption)\b/i;

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
      yield { kind: "text", content: `⚠️ Composio: ${msg}\n\n(Mencoba jawab via model AI…)\n\n` };
    }
  }

  const extras = await buildAgentPromptExtras(agent, userMessage);
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

  for await (const content of streamChatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Riwayat chat:\n${historyText || "(kosong)"}\n\nPesan ${PRINCIPAL_NAME} sekarang: ${userMessage}${dataContext}`,
      },
    ],
    maxTokens: 2000,
    temperature: 0.35,
  })) {
    yield { kind: "text", content };
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
