import { createServerSupabaseClient } from "@/lib/supabase";
import type { AiSettings, AiSettingsPublic, AiSettingsUpdate } from "@/lib/ai/types";

const ROW_ID = "default";

type SettingsRow = {
  id: string;
  ollama_base_url: string;
  ollama_model: string | null;
  fallback_api_base_url: string | null;
  fallback_api_key: string | null;
  fallback_model: string | null;
  updated_at: string | null;
};

function fromEnvDefaults(): AiSettings {
  return {
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434",
    ollamaModel: process.env.OLLAMA_MODEL?.trim() || null,
    fallbackApiBaseUrl: process.env.QWEN_API_BASE_URL?.trim() || null,
    fallbackApiKey: process.env.QWEN_API_KEY?.trim() || null,
    fallbackModel: process.env.QWEN_MODEL?.trim() || "qwen3.7-plus",
    updatedAt: null,
  };
}

function fromRow(row: SettingsRow): AiSettings {
  const env = fromEnvDefaults();
  return {
    ollamaBaseUrl: row.ollama_base_url?.trim() || env.ollamaBaseUrl,
    ollamaModel: row.ollama_model?.trim() || env.ollamaModel,
    fallbackApiBaseUrl: row.fallback_api_base_url?.trim() || env.fallbackApiBaseUrl,
    fallbackApiKey: row.fallback_api_key?.trim() || env.fallbackApiKey,
    fallbackModel: row.fallback_model?.trim() || env.fallbackModel,
    updatedAt: row.updated_at,
  };
}

function maskApiKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export function toPublicSettings(settings: AiSettings): AiSettingsPublic {
  return {
    ollamaBaseUrl: settings.ollamaBaseUrl,
    ollamaModel: settings.ollamaModel,
    fallbackApiBaseUrl: settings.fallbackApiBaseUrl,
    fallbackModel: settings.fallbackModel,
    hasFallbackApiKey: Boolean(settings.fallbackApiKey),
    fallbackApiKeyMasked: maskApiKey(settings.fallbackApiKey),
    updatedAt: settings.updatedAt,
  };
}

export async function getAiSettings(): Promise<AiSettings> {
  const sb = createServerSupabaseClient();
  const { data, error } = await sb.from("ai_settings").select("*").eq("id", ROW_ID).maybeSingle();

  if (error) {
    if (error.message.includes("Could not find the table")) return fromEnvDefaults();
    throw new Error(error.message);
  }

  if (!data) return fromEnvDefaults();
  return fromRow(data as SettingsRow);
}

export async function updateAiSettings(patch: AiSettingsUpdate): Promise<AiSettings> {
  const current = await getAiSettings();
  const sb = createServerSupabaseClient();
  const now = new Date().toISOString();

  const row = {
    id: ROW_ID,
    ollama_base_url: patch.ollamaBaseUrl?.trim() || current.ollamaBaseUrl,
    ollama_model:
      patch.ollamaModel === undefined ? current.ollamaModel : patch.ollamaModel?.trim() || null,
    fallback_api_base_url:
      patch.fallbackApiBaseUrl === undefined
        ? current.fallbackApiBaseUrl
        : patch.fallbackApiBaseUrl?.trim() || null,
    fallback_model:
      patch.fallbackModel === undefined ? current.fallbackModel : patch.fallbackModel?.trim() || null,
    fallback_api_key:
      patch.fallbackApiKey === undefined || patch.fallbackApiKey === ""
        ? current.fallbackApiKey
        : patch.fallbackApiKey?.trim() || null,
    updated_at: now,
  };

  const { data, error } = await sb
    .from("ai_settings")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return fromRow(data as SettingsRow);
}
