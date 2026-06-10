import type { ContentPlanToolName } from "@/lib/content-plan/tools";
import { executeContentPlanTool } from "@/lib/content-plan/tools";
import { getContentPlanContextForAgent } from "@/lib/content-plan/store";
import { getSocialContextForAgent } from "@/lib/social-media/store";

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

const TOOLS_PROMPT = `Kamu adalah Soca, social media strategist. Eksekusi tool content plan jika diminta.

Tools (JSON array di field "tools"):
1. create_content_idea — { "title": string, "brand_scope": "personal"|"company", "format"?: "reel"|"carousel"|"image"|"story", "script_md"?: string, "notes"?: string }
   - personal = personal branding Pak Anjas (@anjas_maradita)
   - company = PT Lemorax (@lemorax_official)
2. update_content_script — { "item_id": string, "script_md"?: string, "title"?: string, "notes"?: string }
3. move_content_status — { "item_id": string, "status": "backlog"|"scripting"|"review"|"scheduled" } — JANGAN "published"

Return HANYA JSON valid:
{
  "tools": [{ "name": "create_content_idea", "args": { ... } }],
  "reply_hint": "satu kalimat ringkas untuk user setelah tool jalan"
}

Jika tidak perlu tool, return { "tools": [], "reply_hint": "" }`;

type ToolPlan = {
  tools: Array<{ name: ContentPlanToolName; args: Record<string, unknown> }>;
  reply_hint: string;
};

export async function runSocaContentPlanTools(userMessage: string): Promise<{
  toolResults: string[];
  replyHint: string;
}> {
  const [boardContext, socialContext] = await Promise.all([
    getContentPlanContextForAgent(),
    getSocialContextForAgent(8),
  ]);

  const response = await fetch(getQwenApiUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getQwenApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: TOOLS_PROMPT },
        {
          role: "user",
          content: `${boardContext}\n\n${socialContext}\n\nPesan user: ${userMessage}`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    return { toolResults: [], replyHint: "" };
  }

  const payload = await response.json();
  const raw = payload.choices?.[0]?.message?.content ?? "{}";
  let plan: ToolPlan = { tools: [], reply_hint: "" };
  try {
    plan = JSON.parse(raw) as ToolPlan;
  } catch {
    return { toolResults: [], replyHint: "" };
  }

  const toolResults: string[] = [];
  for (const t of plan.tools || []) {
    const result = await executeContentPlanTool(t.name, t.args || {});
    toolResults.push(result.ok ? `✓ ${result.message}` : `✗ ${result.message}`);
  }

  return { toolResults, replyHint: plan.reply_hint || "" };
}

export const CONTENT_PLAN_KEYWORDS =
  /\b(content plan|kanban|ide konten|script konten|scripting|backlog|jadwal konten|publish demo|kartu konten|buat ide|buatkan ide|reels script|caption|content plan)\b/i;
