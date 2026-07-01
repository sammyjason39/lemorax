import { getAiSettings } from "@/lib/ai/settings-store";
import type { AiProviderMode, AiSettings, ChatMessage } from "@/lib/ai/types";
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

function assertFallbackConfigured(settings: AiSettings): {
  baseUrl: string;
  apiKey: string;
  model: string;
} {
  if (!settings.fallbackApiBaseUrl || !settings.fallbackApiKey || !settings.fallbackModel) {
    throw new Error("API cloud belum lengkap di Settings (endpoint, key, model).");
  }
  return {
    baseUrl: settings.fallbackApiBaseUrl,
    apiKey: settings.fallbackApiKey,
    model: settings.fallbackModel,
  };
}

function assertOllamaConfigured(settings: AiSettings): { baseUrl: string; model: string } {
  if (!settings.ollamaModel) {
    throw new Error("Pilih model Ollama di Settings.");
  }
  return { baseUrl: settings.ollamaBaseUrl, model: settings.ollamaModel };
}

function shouldTryOllama(settings: AiSettings): boolean {
  return settings.providerMode !== "cloud_only" && Boolean(settings.ollamaModel);
}

function allowsFallback(settings: AiSettings): boolean {
  return settings.providerMode !== "local_only";
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

  if (shouldTryOllama(settings)) {
    const ollama = assertOllamaConfigured(settings);
    try {
      params.onMeta?.({ provider: "ollama", model: ollama.model });
      yield* streamOllamaChat({
        baseUrl: ollama.baseUrl,
        model: ollama.model,
        messages: params.messages,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
      });
      return;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      if (!allowsFallback(settings)) {
        throw new Error(`Ollama gagal (mode Local only): ${reason}`);
      }
      const cloud = assertFallbackConfigured(settings);
      params.onMeta?.({
        provider: "fallback",
        model: cloud.model,
        usedFallback: true,
        fallbackReason: reason,
      });
      yield* streamFallbackChat({
        baseUrl: cloud.baseUrl,
        apiKey: cloud.apiKey,
        model: cloud.model,
        messages: params.messages,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
      });
      return;
    }
  }

  if (settings.providerMode === "local_only") {
    assertOllamaConfigured(settings);
    throw new Error("Mode Local only membutuhkan model Ollama yang dipilih.");
  }

  const cloud = assertFallbackConfigured(settings);
  params.onMeta?.({ provider: "fallback", model: cloud.model });
  yield* streamFallbackChat({
    baseUrl: cloud.baseUrl,
    apiKey: cloud.apiKey,
    model: cloud.model,
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

  if (shouldTryOllama(settings)) {
    const ollama = assertOllamaConfigured(settings);
    try {
      const content = await completeOllamaChat({
        baseUrl: ollama.baseUrl,
        model: ollama.model,
        messages: params.messages,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
      });
      return { content, meta: { provider: "ollama", model: ollama.model } };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      if (!allowsFallback(settings)) {
        throw new Error(`Ollama gagal (mode Local only): ${reason}`);
      }
      const cloud = assertFallbackConfigured(settings);
      const content = await completeFallbackChat({
        baseUrl: cloud.baseUrl,
        apiKey: cloud.apiKey,
        model: cloud.model,
        messages: params.messages,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
      });
      return {
        content,
        meta: {
          provider: "fallback",
          model: cloud.model,
          usedFallback: true,
          fallbackReason: reason,
        },
      };
    }
  }

  if (settings.providerMode === "local_only") {
    assertOllamaConfigured(settings);
    throw new Error("Mode Local only membutuhkan model Ollama yang dipilih.");
  }

  const cloud = assertFallbackConfigured(settings);
  const content = await completeFallbackChat({
    baseUrl: cloud.baseUrl,
    apiKey: cloud.apiKey,
    model: cloud.model,
    messages: params.messages,
    maxTokens: params.maxTokens,
    temperature: params.temperature,
  });
  return { content, meta: { provider: "fallback", model: cloud.model } };
}

/** Cloud credentials for tool-calling paths (e.g. Composio). */
export async function getCloudChatCredentials(): Promise<{
  baseUrl: string;
  apiKey: string;
  model: string;
  providerMode: AiProviderMode;
}> {
  const settings = await getAiSettings();
  if (settings.providerMode === "local_only") {
    throw new Error(
      "Mode Local only aktif — Composio/tool cloud membutuhkan mode Local + Cloud atau Cloud only."
    );
  }
  const cloud = assertFallbackConfigured(settings);
  return { ...cloud, providerMode: settings.providerMode };
}
