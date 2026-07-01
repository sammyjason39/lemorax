import type { ChatMessage } from "@/lib/ai/types";

/** Ollama defaults num_ctx to 2048 — too small for ARIES system prompt + SQL data + answer. */
export const OLLAMA_NUM_CTX = 16_384;
export const OLLAMA_DEFAULT_NUM_PREDICT = 4096;

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

type OllamaStreamChunk = {
  message?: { content?: string };
  done?: boolean;
  done_reason?: string;
};

function* parseOllamaNdjsonLines(lines: string[]): Generator<string> {
  let truncated = false;
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as OllamaStreamChunk;
      const content = parsed.message?.content;
      if (content) yield content;
      if (parsed.done && parsed.done_reason === "length") truncated = true;
    } catch {
      // skip malformed ndjson
    }
  }
  if (truncated) {
    yield "\n\n_(Respons terpotong — context/output limit model. Coba model lebih besar atau aktifkan cloud fallback di Settings.)_";
  }
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

    yield* parseOllamaNdjsonLines(lines);
  }

  if (buffer.trim()) {
    yield* parseOllamaNdjsonLines([buffer]);
  }
}

function ollamaOptions(params: { maxTokens?: number; temperature?: number }) {
  return {
    num_ctx: OLLAMA_NUM_CTX,
    num_predict: params.maxTokens ?? OLLAMA_DEFAULT_NUM_PREDICT,
    temperature: params.temperature ?? 0.3,
  };
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
      options: ollamaOptions(params),
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
      options: ollamaOptions({ ...params, temperature: params.temperature ?? 0.1 }),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || `Ollama chat error (${res.status})`);
  }

  const data = (await res.json()) as {
    message?: { content?: string };
    done_reason?: string;
  };
  const content = data.message?.content?.trim();
  if (!content) throw new Error("Ollama mengembalikan respons kosong");
  if (data.done_reason === "length") {
    return `${content}\n\n_(Respons terpotong — context/output limit model. Coba model lebih besar atau aktifkan cloud fallback di Settings.)_`;
  }
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
