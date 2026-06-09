"use client";

import { PlatformConnectionsGrid } from "@/components/integrations/PlatformConnectionsGrid";

/** Compact Composio panel in AI Agents Staff sidebar */
export function ComposioConnectPanel() {
  return (
    <div
      className="rounded-2xl border p-4 mx-3 mb-3"
      style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
    >
      <PlatformConnectionsGrid
        compact
        maxPerGroup={4}
        returnPath="/dashboard/ai-agents-staff?composio=connected"
      />
    </div>
  );
}
