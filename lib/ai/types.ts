export type AiProviderMode = "local_only" | "local_cloud" | "cloud_only";

export const AI_PROVIDER_MODES: AiProviderMode[] = [
  "local_only",
  "local_cloud",
  "cloud_only",
];

export function isAiProviderMode(value: string): value is AiProviderMode {
  return AI_PROVIDER_MODES.includes(value as AiProviderMode);
}

export type AiSettings = {
  providerMode: AiProviderMode;
  ollamaBaseUrl: string;
  ollamaModel: string | null;
  fallbackApiBaseUrl: string | null;
  fallbackApiKey: string | null;
  fallbackModel: string | null;
  updatedAt: string | null;
};

export type AiSettingsPublic = {
  providerMode: AiProviderMode;
  ollamaBaseUrl: string;
  ollamaModel: string | null;
  fallbackApiBaseUrl: string | null;
  fallbackModel: string | null;
  hasFallbackApiKey: boolean;
  fallbackApiKeyMasked: string | null;
  updatedAt: string | null;
};

export type AiSettingsUpdate = {
  providerMode?: AiProviderMode;
  ollamaBaseUrl?: string;
  ollamaModel?: string | null;
  fallbackApiBaseUrl?: string | null;
  fallbackModel?: string | null;
  /** Omit or empty to keep existing key */
  fallbackApiKey?: string | null;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};
