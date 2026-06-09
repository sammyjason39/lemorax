"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { brand } from "@/lib/brand";
import { ExternalLink, Link2, Loader2, Plug, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { WorkspaceIntegrationGroup } from "@/lib/composio/integrations";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ComposioStatus = {
  configured: boolean;
  sessionId: string | null;
  groups: WorkspaceIntegrationGroup[];
  connectedAccounts: { id: string; toolkit: string; status: string }[];
};

type Props = {
  /** OAuth callback path after Composio connect, e.g. /dashboard/workspace?composio=connected */
  returnPath?: string;
  /** Compact layout for sidebar */
  compact?: boolean;
  /** Show only first N integrations per group (sidebar) */
  maxPerGroup?: number;
};

export function PlatformConnectionsGrid({
  returnPath = "/dashboard/workspace?composio=connected",
  compact = false,
  maxPerGroup,
}: Props) {
  const { language: lang } = useLanguage();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const { data, mutate, isLoading } = useSWR<ComposioStatus>("/api/composio/status", fetcher);

  const handleConnect = useCallback(
    async (toolkit: string) => {
      setConnecting(toolkit);
      setConnectError(null);
      try {
        const res = await fetch("/api/composio/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolkit, returnPath }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Connect failed");
        window.open(body.redirectUrl, "_blank", "noopener,noreferrer");
      } catch (err) {
        setConnectError(err instanceof Error ? err.message : "Gagal menghubungkan");
      } finally {
        setConnecting(null);
        void mutate();
      }
    },
    [mutate, returnPath]
  );

  const connectedSlugs = new Set(
    (data?.connectedAccounts ?? [])
      .filter((a) => {
        const s = a.status?.toUpperCase?.() ?? a.status;
        return s === "ACTIVE" || s === "CONNECTED";
      })
      .map((a) => a.toolkit.toLowerCase())
  );

  const connectedCount = connectedSlugs.size;
  const totalCount =
    data?.groups?.reduce((n, g) => n + g.integrations.length, 0) ?? 0;

  const gridCols = compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";

  return (
    <div className={compact ? "" : "space-y-6"}>
      <div className={`flex items-center justify-between gap-2 ${compact ? "mb-3" : "mb-1"}`}>
        <div className="flex items-center gap-2">
          <Plug size={compact ? 16 : 20} style={{ color: brand.blue }} />
          <div>
            <span
              className={`font-semibold ${compact ? "text-xs" : "text-sm"}`}
              style={{ color: "var(--text-primary)" }}
            >
              {lang === "id" ? "Koneksi Platform" : "Platform Connections"}
            </span>
            {data?.configured && !compact && (
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {connectedCount}/{totalCount}{" "}
                {lang === "id" ? "terhubung" : "connected"}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void mutate()}
          className="p-1.5 rounded-lg border opacity-70 hover:opacity-100"
          style={{ borderColor: "var(--border)" }}
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {!data?.configured ? (
        <p className={compact ? "text-[11px]" : "text-sm"} style={{ color: "var(--text-muted)" }}>
          {lang === "id"
            ? "Set COMPOSIO_API_KEY di .env.local untuk menghubungkan Google Workspace, GitHub, Meta, dll."
            : "Set COMPOSIO_API_KEY in .env.local to connect Google Workspace, GitHub, Meta, etc."}
        </p>
      ) : isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 size={22} className="animate-spin" style={{ color: brand.blue }} />
        </div>
      ) : (
        <>
          {!compact && (
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              {lang === "id"
                ? "Hubungkan akun Pak Anjas ke platform eksternal. AI Agents Staff akan bisa akses setelah terhubung."
                : "Connect Pak Anjas accounts to external platforms. AI Agents Staff can access them once connected."}
            </p>
          )}

          {(data.groups ?? []).map((group) => {
            const items = maxPerGroup
              ? group.integrations.slice(0, maxPerGroup)
              : group.integrations;
            if (items.length === 0) return null;

            return (
              <div key={group.id} className={compact ? "mb-3" : "mb-5"}>
                {!compact && (
                  <h3
                    className="text-[11px] font-semibold uppercase tracking-wide mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {lang === "id" ? group.titleId : group.titleEn}
                  </h3>
                )}
                <div className={`grid ${gridCols} gap-2`}>
                  {items.map((tk) => {
                    const isConnected = connectedSlugs.has(tk.slug);
                    return (
                      <button
                        key={tk.slug}
                        type="button"
                        disabled={!!connecting}
                        onClick={() => void handleConnect(tk.slug)}
                        className={`flex items-center gap-2 rounded-xl text-left border transition-all disabled:opacity-50 hover:shadow-sm ${
                          compact ? "px-2.5 py-2 text-[11px]" : "px-3 py-3 text-xs"
                        }`}
                        style={{
                          borderColor: isConnected ? `${brand.blue}55` : "var(--border)",
                          background: isConnected ? brand.blueSoft : "var(--bg-secondary)",
                          color: "var(--text-primary)",
                        }}
                      >
                        <span className={compact ? "text-base" : "text-lg"}>{tk.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{tk.name}</div>
                          {!compact && tk.description && (
                            <div
                              className="text-[10px] truncate mt-0.5 opacity-70"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {tk.description}
                            </div>
                          )}
                        </div>
                        {connecting === tk.slug ? (
                          <Loader2 size={12} className="animate-spin shrink-0" />
                        ) : isConnected ? (
                          <span
                            className="text-[9px] font-bold uppercase shrink-0 px-1.5 py-0.5 rounded-md"
                            style={{ background: brand.blue, color: "white" }}
                          >
                            OK
                          </span>
                        ) : (
                          <Link2 size={12} className="shrink-0 opacity-40" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {connectError && (
            <p className={`${compact ? "text-[11px]" : "text-xs"} mt-2`} style={{ color: "#ef4444" }}>
              {connectError}
            </p>
          )}

          {!compact && (
            <a
              href="https://docs.composio.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs opacity-60 hover:opacity-100 mt-2"
              style={{ color: brand.blue }}
            >
              Powered by Composio <ExternalLink size={11} />
            </a>
          )}
        </>
      )}
    </div>
  );
}
