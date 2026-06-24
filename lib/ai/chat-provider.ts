import { getAiSettings } from "@/lib/ai/settings-store";
import type { ChatMessage } from "@/lib/ai/types";
import { completeOllamaChat, streamOllamaChat } from "@/lib/ai/ollama";

export type ChatProviderMeta = {
  provider: "ollama" | "fallback";
  model: string;
  usedFallback?: boolean;
  fallbackReason?: string;
};

function fallbackChatUrl(base: string): string {
  const trimmed = base.replace(/\/$/, "");
  return trimmed.endsWith("/chat/completions") ? trimmed : `${trimmed}/chat/completions`;
}

async function* readOpenAiStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
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
        const parsed = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // skip
      }
    }
  }
}

async function* streamFallbackChat(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): AsyncGenerator<string> {
  const res = await fetch(fallbackChatUrl(params.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      max_tokens: params.maxTokens ?? 2000,
      temperature: params.temperature ?? 0.3,
      stream: true,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || `Fallback API error (${res.status})`);
  }

  if (!res.body) throw new Error("Fallback API tidak mengembalikan stream");
  yield* readOpenAiStream(res.body);
}

async function completeFallbackChat(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const res = await fetch(fallbackChatUrl(params.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      max_tokens: params.maxTokens ?? 2000,
      temperature: params.temperature ?? 0.1,
      stream: false,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || `Fallback API error (${res.status})`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Fallback API mengembalikan respons kosong");
  return content;
}

export async function* streamChatCompletion(params: {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  onMeta?: (meta: ChatProviderMeta) => void;
}): AsyncGenerator<string> {
  const settings = await getAiSettings();

  if (settings.ollamaModel) {
    try {
      params.onMeta?.({
        provider: "ollama",
        model: settings.ollamaModel,
      });
      yield* streamOllamaChat({
        baseUrl: settings.ollamaBaseUrl,
        model: settings.ollamaModel,
        messages: params.messages,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
      });
      return;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      if (!settings.fallbackApiBaseUrl || !settings.fallbackApiKey || !settings.fallbackModel) {
        throw new Error(`Ollama gagal dan fallback belum dikonfigurasi: ${reason}`);
      }
      params.onMeta?.({
        provider: "fallback",
        model: settings.fallbackModel,
        usedFallback: true,
        fallbackReason: reason,
      });
      yield* streamFallbackChat({
        baseUrl: settings.fallbackApiBaseUrl,
        apiKey: settings.fallbackApiKey,
        model: settings.fallbackModel,
        messages: params.messages,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
      });
      return;
    }
  }

  if (!settings.fallbackApiBaseUrl || !settings.fallbackApiKey || !settings.fallbackModel) {
    throw new Error("Model Ollama belum dipilih dan fallback API belum lengkap di Settings.");
  }

  params.onMeta?.({
    provider: "fallback",
    model: settings.fallbackModel,
  });
  yield* streamFallbackChat({
    baseUrl: settings.fallbackApiBaseUrl,
    apiKey: settings.fallbackApiKey,
    model: settings.fallbackModel,
    messages: params.messages,
    maxTokens: params.maxTokens,
    temperature: params.temperature,
  });
}

export async function completeChatCompletion(params: {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<{ content: string; meta: ChatProviderMeta }> {
  const settings = await getAiSettings();

  if (settings.ollamaModel) {
    try {
      const content = await completeOllamaChat({
        baseUrl: settings.ollamaBaseUrl,
        model: settings.ollamaModel,
        messages: params.messages,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
      });
      return { content, meta: { provider: "ollama", model: settings.ollamaModel } };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      if (!settings.fallbackApiBaseUrl || !settings.fallbackApiKey || !settings.fallbackModel) {
        throw new Error(`Ollama gagal dan fallback belum dikonfigurasi: ${reason}`);
      }
      const content = await completeFallbackChat({
        baseUrl: settings.fallbackApiBaseUrl,
        apiKey: settings.fallbackApiKey,
        model: settings.fallbackModel,
        messages: params.messages,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
      });
      return {
        content,
        meta: {
          provider: "fallback",
          model: settings.fallbackModel,
          usedFallback: true,
          fallbackReason: reason,
        },
      };
    }
  }

  if (!settings.fallbackApiBaseUrl || !settings.fallbackApiKey || !settings.fallbackModel) {
    throw new Error("Model Ollama belum dipilih dan fallback API belum lengkap di Settings.");
  }

  const content = await completeFallbackChat({
    baseUrl: settings.fallbackApiBaseUrl,
    apiKey: settings.fallbackApiKey,
    model: settings.fallbackModel,
    messages: params.messages,
    maxTokens: params.maxTokens,
    temperature: params.temperature,
  });
  return { content, meta: { provider: "fallback", model: settings.fallbackModel } };
}
