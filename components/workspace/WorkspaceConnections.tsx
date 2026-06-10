"use client";

import { PlatformConnectionsGrid } from "@/components/integrations/PlatformConnectionsGrid";
import { brand } from "@/lib/brand";
import { useLanguage } from "@/contexts/LanguageContext";
import { Layers } from "lucide-react";

export function WorkspaceConnections() {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl border p-5"
        style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: brand.blueSoft, color: brand.blue }}
          >
            <Layers size={22} />
          </div>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              {t("workspace.connections_title")}
            </h2>
            <p className="text-xs mt-1 max-w-2xl" style={{ color: "var(--text-muted)" }}>
              {t("workspace.connections_subtitle")}
            </p>
          </div>
        </div>
      </div>

      <div
        className="rounded-2xl border p-5"
        style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
      >
        <PlatformConnectionsGrid returnPath="/dashboard/workspace?composio=connected" />
      </div>
    </div>
  );
}
