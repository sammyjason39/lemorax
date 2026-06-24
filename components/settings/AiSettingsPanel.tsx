"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { brand } from "@/lib/brand";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle2, Cloud, Cpu, Loader2, RefreshCw, Save, Server } from "lucide-react";
import type { AiSettingsPublic } from "@/lib/ai/types";

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json());

type OllamaModelsResponse = {
  baseUrl: string;
  reachable: boolean;
  models: string[];
  error?: string;
};

export function AiSettingsPanel() {
  const { t } = useLanguage();
  const { data, mutate, isLoading } = useSWR<AiSettingsPublic>("/api/settings/ai", fetcher);

  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("");
  const [ollamaModel, setOllamaModel] = useState("");
  const [fallbackApiBaseUrl, setFallbackApiBaseUrl] = useState("");
  const [fallbackModel, setFallbackModel] = useState("");
  const [fallbackApiKey, setFallbackApiKey] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [ollamaReachable, setOllamaReachable] = useState<boolean | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setOllamaBaseUrl(data.ollamaBaseUrl || "http://127.0.0.1:11434");
    setOllamaModel(data.ollamaModel || "");
    setFallbackApiBaseUrl(data.fallbackApiBaseUrl || "");
    setFallbackModel(data.fallbackModel || "qwen3.7-plus");
    setFallbackApiKey("");
  }, [data]);

  const loadModels = useCallback(async (baseUrl?: string) => {
    const url = baseUrl || ollamaBaseUrl || "http://127.0.0.1:11434";
    setLoadingModels(true);
    setSaveError(null);
    try {
      const res = await fetch(
        `/api/settings/ai/ollama/models?baseUrl=${encodeURIComponent(url)}`,
        { cache: "no-store" }
      );
      const json = (await res.json()) as OllamaModelsResponse;
      setOllamaReachable(json.reachable);
      setModels(json.models ?? []);
      if (json.error) setSaveError(json.error);
    } catch (err) {
      setOllamaReachable(false);
      setModels([]);
      setSaveError(err instanceof Error ? err.message : t("settings.ai.load_models_error"));
    } finally {
      setLoadingModels(false);
    }
  }, [ollamaBaseUrl, t]);

  useEffect(() => {
    if (data && ollamaBaseUrl) void loadModels(ollamaBaseUrl);
  }, [data, ollamaBaseUrl, loadModels]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const body: Record<string, string | null> = {
        ollamaBaseUrl,
        ollamaModel: ollamaModel || null,
        fallbackApiBaseUrl: fallbackApiBaseUrl || null,
        fallbackModel: fallbackModel || null,
      };
      if (fallbackApiKey.trim()) body.fallbackApiKey = fallbackApiKey.trim();

      const res = await fetch("/api/settings/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("settings.ai.save_error"));

      await mutate();
      setFallbackApiKey("");
      setSaveMessage(t("settings.ai.saved"));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("settings.ai.save_error"));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
        <Loader2 size={16} className="animate-spin" />
        {t("settings.ai.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          {t("settings.ai.title")}
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {t("settings.ai.subtitle")}
        </p>
      </div>

      {/* Ollama */}
      <section
        className="rounded-2xl p-5 border space-y-4"
        style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <Cpu size={18} style={{ color: brand.blue }} />
          <h3 className="font-medium" style={{ color: "var(--text-primary)" }}>
            {t("settings.ai.ollama_title")}
          </h3>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {t("settings.ai.ollama_hint")}
        </p>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            {t("settings.ai.ollama_endpoint")}
          </span>
          <input
            type="url"
            value={ollamaBaseUrl}
            onChange={(e) => setOllamaBaseUrl(e.target.value)}
            placeholder="http://127.0.0.1:11434"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </label>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[200px] space-y-1.5">
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              {t("settings.ai.ollama_model")}
            </span>
            <select
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                background: "var(--bg-secondary)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <option value="">{t("settings.ai.no_model")}</option>
              {ollamaModel && !models.includes(ollamaModel) && (
                <option value={ollamaModel}>{ollamaModel}</option>
              )}
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => void loadModels()}
            disabled={loadingModels}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
          >
            {loadingModels ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            {t("settings.ai.refresh_models")}
          </button>
        </div>

        {ollamaReachable !== null && (
          <p
            className="text-xs inline-flex items-center gap-1"
            style={{ color: ollamaReachable ? "#16a34a" : "#dc2626" }}
          >
            {ollamaReachable ? <CheckCircle2 size={14} /> : <Server size={14} />}
            {ollamaReachable
              ? `${t("settings.ai.ollama_online")} — ${models.length} model`
              : t("settings.ai.ollama_offline")}
          </p>
        )}
      </section>

      {/* Fallback */}
      <section
        className="rounded-2xl p-5 border space-y-4"
        style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <Cloud size={18} style={{ color: brand.blue }} />
          <h3 className="font-medium" style={{ color: "var(--text-primary)" }}>
            {t("settings.ai.fallback_title")}
          </h3>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {t("settings.ai.fallback_hint")}
        </p>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            {t("settings.ai.fallback_endpoint")}
          </span>
          <input
            type="url"
            value={fallbackApiBaseUrl}
            onChange={(e) => setFallbackApiBaseUrl(e.target.value)}
            placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            {t("settings.ai.fallback_api_key")}
            {data?.hasFallbackApiKey && data.fallbackApiKeyMasked && (
              <span className="ml-2 font-normal opacity-70">
                ({t("settings.ai.current_key")}: {data.fallbackApiKeyMasked})
              </span>
            )}
          </span>
          <input
            type="password"
            value={fallbackApiKey}
            onChange={(e) => setFallbackApiKey(e.target.value)}
            placeholder={data?.hasFallbackApiKey ? "••••••••" : "sk-..."}
            autoComplete="off"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            {t("settings.ai.fallback_model")}
          </span>
          <input
            type="text"
            value={fallbackModel}
            onChange={(e) => setFallbackModel(e.target.value)}
            placeholder="qwen3.7-plus"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </label>
      </section>

      {saveError && (
        <p className="text-sm" style={{ color: "#dc2626" }}>
          {saveError}
        </p>
      )}
      {saveMessage && (
        <p className="text-sm inline-flex items-center gap-1" style={{ color: "#16a34a" }}>
          <CheckCircle2 size={14} />
          {saveMessage}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
        style={{ background: brand.blue }}
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {t("settings.ai.save")}
      </button>
    </div>
  );
}
