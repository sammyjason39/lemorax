"use client";

import useSWR from "swr";
import { useState } from "react";
import { MetricCard } from "@/components/cards/MetricCard";
import { DataTable } from "@/components/tables/DataTable";
import { formatPct } from "@/lib/formatters";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { CHART_PRIMARY, CHART_AXIS, CHART_GRID, CHART_MUTED, getCategoricalColor } from "@/lib/brand";
import { RefreshCw } from "lucide-react";

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error("Gagal memuat data social media");
    return r.json();
  });

export function SocialAnalyticsTab() {
  const { data, isLoading, mutate } = useSWR("/api/social-media", fetcher, { refreshInterval: 120000 });
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/social-media/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: ["anjas_maradita"], includeAboutSection: false }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sync gagal");
      const synced = (json.results || []) as Array<{ username?: string; followers?: number }>;
      const detail = synced
        .map((r) => `@${r.username}: ${(r.followers || 0).toLocaleString("id-ID")} followers`)
        .join(" · ");
      setSyncMsg(`✓ Sync berhasil — ${detail || `${json.synced} profil`}`);
      await mutate(undefined, { revalidate: true });
    } catch (e: unknown) {
      setSyncMsg(`⚠ ${e instanceof Error ? e.message : "Sync gagal"}`);
    } finally {
      setSyncing(false);
    }
  }

  const primaryProfile =
    data?.profiles?.find((p: { source?: string }) => p.source === "apify") ?? data?.profiles?.[0];

  const metrics = [
    {
      title: primaryProfile ? `Followers @${primaryProfile.username}` : "Total Followers",
      value: primaryProfile
        ? primaryProfile.followers?.toLocaleString("id-ID")
        : data
          ? data.summary?.totalFollowers?.toLocaleString("id-ID")
          : "—",
    },
    { title: "Avg Engagement Rate", value: data ? formatPct(data.summary?.avgEngagementRate) : "—" },
    { title: "Avg Post Engagement", value: data ? formatPct(data.summary?.postAvgEngagement) : "—" },
    { title: "Link Clicks", value: data ? data.summary?.totalLinkClicks?.toLocaleString("id-ID") : "—" },
    { title: "Conversions", value: data ? data.summary?.totalConversions?.toLocaleString("id-ID") : "—" },
    { title: "Conversion Rate", value: data ? formatPct(data.summary?.avgConversionRate) : "—" },
  ];

  const postColumns = [
    {
      key: "published_at",
      label: "Tanggal",
      render: (r: any) =>
        r.published_at ? new Date(r.published_at).toLocaleDateString("id-ID") : "—",
    },
    {
      key: "caption",
      label: "Konten",
      render: (r: any) => <span className="line-clamp-2 max-w-xs">{r.caption || "—"}</span>,
    },
    { key: "likes", label: "Likes", align: "right" as const, sortable: true },
    { key: "comments", label: "Komentar", align: "right" as const, sortable: true },
    {
      key: "reach",
      label: "Reach",
      align: "right" as const,
      sortable: true,
      render: (r: any) => (r.reach || 0).toLocaleString("id-ID"),
    },
    {
      key: "engagement_rate",
      label: "ER%",
      align: "right" as const,
      sortable: true,
      render: (r: any) => formatPct(r.engagement_rate),
    },
    { key: "clicks", label: "Clicks", align: "right" as const, sortable: true },
    { key: "conversions", label: "Conv.", align: "right" as const, sortable: true },
  ];

  const chartData = data?.engagementByPost?.slice(0, 8) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
          style={{ background: CHART_PRIMARY, color: "#fff" }}
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Memuat real time…" : "Sync Real time"}
        </button>
        {syncMsg && (
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {syncMsg}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((m, i) => (
          <MetricCard key={i} {...m} loading={isLoading} />
        ))}
      </div>

      {data?.profiles?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.profiles.map(
            (p: {
              id: string;
              username: string;
              platform: string;
              source?: string;
              display_name?: string;
              followers: number;
              engagement_rate: number;
              conversion_rate: number;
              bio?: string;
            }) => (
              <div key={p.id} className="card-base p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide" style={{ color: CHART_MUTED }}>
                      {p.platform}
                      {p.source === "apify" && (
                        <span
                          className="ml-2 rounded px-1.5 py-0.5 text-[10px]"
                          style={{ background: "rgba(22,82,240,0.15)", color: CHART_PRIMARY }}
                        >
                          Real time data
                        </span>
                      )}
                    </p>
                    <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                      @{p.username}
                    </h3>
                    {p.display_name && (
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {p.display_name}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold" style={{ color: CHART_PRIMARY }}>
                      {p.followers.toLocaleString("id-ID")}
                    </p>
                    <p style={{ color: CHART_MUTED }}>followers</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span>ER {formatPct(p.engagement_rate)}</span>
                  <span>Conv {formatPct(p.conversion_rate)}</span>
                </div>
                {p.bio && (
                  <p className="mt-2 text-xs line-clamp-2" style={{ color: "var(--text-muted)" }}>
                    {p.bio}
                  </p>
                )}
              </div>
            )
          )}
        </div>
      )}

      <div className="card-base p-5">
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Engagement per Konten
        </h3>
        {isLoading ? (
          <div className="skeleton h-48 rounded-xl" />
        ) : chartData.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Belum ada konten. Jalankan seed atau Sync Real time.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
              <XAxis
                dataKey="caption"
                tick={{ fill: CHART_AXIS, fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fill: CHART_AXIS, fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}
                formatter={(v: number) => [v, "ER%"]}
              />
              <Bar dataKey="engagement_rate" name="ER%" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {chartData.map((_: unknown, i: number) => (
                  <Cell key={i} fill={getCategoricalColor(i, chartData.length)} fillOpacity={0.9} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card-base p-5">
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Riwayat Konten
        </h3>
        <DataTable columns={postColumns} data={data?.posts || []} loading={isLoading} />
      </div>
    </div>
  );
}
