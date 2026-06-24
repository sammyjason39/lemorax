import type { ChatMessage } from "@/lib/ai/types";

export function normalizeOllamaBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export async function listOllamaModels(baseUrl: string): Promise<string[]> {
  const root = normalizeOllamaBaseUrl(baseUrl);
  const res = await fetch(`${root}/api/tags`, {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Ollama tidak merespons (${res.status})`);
  }

  const data = (await res.json()) as { models?: { name?: string }[] };
  const names = (data.models ?? [])
    .map((m) => m.name?.trim())
    .filter((n): n is string => Boolean(n));

  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}

async function* readOllamaStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line) as { message?: { content?: string } };
        const content = parsed.message?.content;
        if (content) yield content;
      } catch {
        // skip malformed ndjson
      }
    }
  }
}

export async function* streamOllamaChat(params: {
  baseUrl: string;
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): AsyncGenerator<string> {
  const root = normalizeOllamaBaseUrl(params.baseUrl);
  const res = await fetch(`${root}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      stream: true,
      options: {
        num_predict: params.maxTokens ?? 2000,
        temperature: params.temperature ?? 0.3,
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || `Ollama chat error (${res.status})`);
  }

  if (!res.body) throw new Error("Ollama tidak mengembalikan stream");

  yield* readOllamaStream(res.body);
}

export async function completeOllamaChat(params: {
  baseUrl: string;
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const root = normalizeOllamaBaseUrl(params.baseUrl);
  const res = await fetch(`${root}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      stream: false,
      options: {
        num_predict: params.maxTokens ?? 2000,
        temperature: params.temperature ?? 0.1,
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || `Ollama chat error (${res.status})`);
  }

  const data = (await res.json()) as { message?: { content?: string } };
  const content = data.message?.content?.trim();
  if (!content) throw new Error("Ollama mengembalikan respons kosong");
  return content;
}

export async function pingOllama(baseUrl: string): Promise<boolean> {
  try {
    await listOllamaModels(baseUrl);
    return true;
  } catch {
    return false;
  }
}
