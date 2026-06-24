export type AiSettings = {
  ollamaBaseUrl: string;
  ollamaModel: string | null;
  fallbackApiBaseUrl: string | null;
  fallbackApiKey: string | null;
  fallbackModel: string | null;
  updatedAt: string | null;
};

export type AiSettingsPublic = {
  ollamaBaseUrl: string;
  ollamaModel: string | null;
  fallbackApiBaseUrl: string | null;
  fallbackModel: string | null;
  hasFallbackApiKey: boolean;
  fallbackApiKeyMasked: string | null;
  updatedAt: string | null;
};

export type AiSettingsUpdate = {
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
