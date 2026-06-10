import type { StaffAgent, StaffMessage } from "@/lib/staff-agents/types";
import {
  buildComposioAgentInstructions,
  isComposioConfigured,
} from "@/lib/composio/config";
import {
  executeComposioToolCall,
  getComposioOpenAiTools,
} from "@/lib/composio/client";
import { buildStaffAgentSystemPrompt, formatConversationHistory } from "@/lib/staff-agents/prompt";
import { getDisplayName } from "@/lib/staff-agents/names";
import { PRINCIPAL_NAME } from "@/lib/brand";
import type { StaffStreamChunk } from "@/lib/staff-agents/stream";

const MODEL = process.env.QWEN_MODEL || "qwen3.7-plus";
const MAX_TOOL_ROUNDS = 8;

type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content?: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

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

async function qwenChat(params: {
  messages: ChatMessage[];
  tools?: unknown[];
  stream?: boolean;
}) {
  const res = await fetch(getQwenApiUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getQwenApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: params.messages,
      tools: params.tools,
      tool_choice: params.tools?.length ? "auto" : undefined,
      max_tokens: 2000,
      temperature: 0.35,
      stream: params.stream ?? false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Qwen error: ${err}`);
  }

  return res;
}

export async function* streamComposioStaffReply(
  agent: StaffAgent,
  userMessage: string,
  history: StaffMessage[],
  team?: StaffAgent[]
): AsyncGenerator<StaffStreamChunk> {
  if (!isComposioConfigured()) {
    throw new Error("Composio belum dikonfigurasi (COMPOSIO_API_KEY)");
  }

  const tools = await getComposioOpenAiTools();
  const displayName = getDisplayName(agent);
  const historyText = formatConversationHistory(history, agent.id, team);
  const persona = buildStaffAgentSystemPrompt(agent, team);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `${persona}\n\n${buildComposioAgentInstructions(displayName, agent.role)}\n\nKamu punya akses ke Composio tools untuk platform eksternal. Panggil tool jika perlu aksi nyata.`,
    },
    {
      role: "user",
      content: [
        historyText ? `Riwayat chat:\n${historyText}` : null,
        `Pesan ${PRINCIPAL_NAME} sekarang: ${userMessage}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];

  // Agentic tool loop (non-streaming rounds)
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const res = await qwenChat({ messages, tools, stream: false });
    const data = (await res.json()) as {
      choices?: Array<{ message?: ChatMessage & { tool_calls?: ToolCall[] } }>;
    };

    const choice = data.choices?.[0]?.message;
    if (!choice) throw new Error("Qwen tidak mengembalikan respons");

    const toolCalls = choice.tool_calls ?? [];
    if (toolCalls.length === 0) {
      if (choice.content) {
        yield { kind: "text", content: choice.content };
      }
      return;
    }

    yield { kind: "processing" };

    messages.push({
      role: "assistant",
      content: choice.content ?? null,
      tool_calls: toolCalls,
    });

    for (const tc of toolCalls) {
      const toolMsg = await executeComposioToolCall(tc);
      messages.push(toolMsg);
    }
  }

  // Final answer after max tool rounds — stream it
  const streamRes = await qwenChat({ messages, tools, stream: true });
  const reader = streamRes.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6);
      if (payload === "[DONE]") return;
      try {
        const parsed = JSON.parse(payload);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield { kind: "text", content };
      } catch {
        // skip
      }
    }
  }
}

export async function collectComposioStaffReply(
  agent: StaffAgent,
  userMessage: string,
  history: StaffMessage[],
  team?: StaffAgent[]
): Promise<string> {
  let full = "";
  for await (const chunk of streamComposioStaffReply(agent, userMessage, history, team)) {
    if (chunk.kind === "text") full += chunk.content;
  }
  return full;
}
