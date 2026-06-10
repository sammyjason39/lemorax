"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { SocialAnalyticsTab } from "@/components/social-media/SocialAnalyticsTab";
import { ContentPlanBoard } from "@/components/content-plan/ContentPlanBoard";
import { CHART_PRIMARY, CHART_MUTED } from "@/lib/brand";

type Tab = "analytics" | "content-plan";

export default function SocialMediaPage() {
  const [tab, setTab] = useState<Tab>("analytics");

  return (
    <div className="page-enter">
      <TopBar
        title="Social Media"
        subtitle="Analytics real time & Content Plan Kanban — powered by @Soca"
      />
      <div className="px-6 pt-4">
        <div className="inline-flex rounded-lg p-1 gap-1" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
          <button
            type="button"
            onClick={() => setTab("analytics")}
            className="rounded-md px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: tab === "analytics" ? CHART_PRIMARY : "transparent",
              color: tab === "analytics" ? "#fff" : CHART_MUTED,
            }}
          >
            Analytics
          </button>
          <button
            type="button"
            onClick={() => setTab("content-plan")}
            className="rounded-md px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: tab === "content-plan" ? CHART_PRIMARY : "transparent",
              color: tab === "content-plan" ? "#fff" : CHART_MUTED,
            }}
          >
            Content Plan
          </button>
        </div>
      </div>
      <div className="p-6">
        {tab === "analytics" ? <SocialAnalyticsTab /> : <ContentPlanBoard />}
      </div>
    </div>
  );
}
