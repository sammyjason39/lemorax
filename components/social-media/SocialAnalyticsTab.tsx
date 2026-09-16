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
import { brand, domain, CHART_PRIMARY, CHART_AXIS, CHART_GRID, CHART_MUTED, getCategoricalColor } from "@/lib/brand";
import { RefreshCw, ExternalLink, Play, Image as ImageIcon, Clock } from "lucide-react";
import { PostDetailModal, type ModalPost } from "@/components/social-media/PostDetailModal";

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error("Gagal memuat data social media");
    return r.json();
  });

type SocialPost = {
  id: string;
  caption: null | string;
  media_type: null | string;
  post_url: null | string;
  thumbnail_url: null | string;
  raw: null | { proxiedVideoUrl?: null | string };
  published_at: null | string;
  likes: number;
  comments: number;
  reach: number;
  engagement_rate: number;
};

function PostCard({ post, onOpen }: { post: SocialPost; onOpen: (p: ModalPost) => void }) {
  const isVideo = /video|reel|igtv|clip/i.test(post.media_type || "");

  return (
    <div
      className="card-hover rounded-xl overflow-hidden group cursor-pointer"
      style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
      onClick={() => onOpen(post as ModalPost)}
    >
      <div className="relative" style={{ background: "var(--bg-tertiary)", aspectRatio: "1 / 1" }}>
        {post.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.thumbnail_url}
            alt={(post.caption || "Konten").slice(0, 80)}
            className="w-full h-full object-cover transition-transform group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={22} color={CHART_MUTED} />
          </div>
        )}
        {isVideo && (
          <span
            className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform group-hover:scale-[1.04]"
          >
            <span
              className="flex items-center justify-center rounded-full"
              style={{ width: 46, height: 46, background: "rgba(15,23,42,0.72)" }}
            >
              <Play size={20} color="#fff" />
            </span>
          </span>
        )}
        <span
          className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{
            background: isVideo ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.9)",
            color: isVideo ? "#fff" : "var(--text-primary)",
          }}
        >
          {isVideo ? <Play size={9} /> : <ImageIcon size={9} />}
          {isVideo ? "Video" : "Image"}
        </span>
        <span
          className="absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={{ background: "rgba(15,23,42,0.72)", color: "#fff" }}
        >
          ER {formatPct(post.engagement_rate)}
        </span>
      </div>
      <div className="p-3">
        <p className="text-[11px] line-clamp-2 leading-snug" style={{ color: "var(--text-primary)", minHeight: 28 }}>
          {post.caption || "—"}
        </p>
        <div className="mt-2 flex items-center justify-between text-[10px]" style={{ color: "var(--text-muted)" }}>
          <span>
            {post.published_at ? new Date(post.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "—"}
          </span>
          <span style={{ color: brand.danger }}>♥ {(post.likes || 0).toLocaleString("id-ID")}</span>
          <span>💬 {(post.comments || 0).toLocaleString("id-ID")}</span>
          {post.post_url && <ExternalLink size={10} />}
        </div>
      </div>
    </div>
  );
}

const MAX_POSTS = 48;
const PAGE_SIZE = 12;

export function SocialAnalyticsTab() {
  const [postsLimit, setPostsLimit] = useState(PAGE_SIZE);
  const { data, isLoading, mutate } = useSWR(`/api/social-media?postsLimit=${postsLimit}`, fetcher, {
    refreshInterval: 120000,
  });
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<ModalPost | null>(null);

  const posts: SocialPost[] = (data?.posts || []) as SocialPost[];
  const isVideo = (p: SocialPost) => /video|reel|igtv|clip/i.test(p.media_type || "");

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const isDeep = postsLimit > PAGE_SIZE;
      const res = await fetch("/api/social-media/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernames: ["anjas_maradita"],
          includeAboutSection: false,
          ...(isDeep ? { deep: true, limit: postsLimit } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sync gagal");
      const synced = (json.results || []) as Array<{ username?: string; postsUpserted?: number; followers?: number }>;
      const detail = synced
        .map((r) => `@${r.username}: ${r.postsUpserted ?? 0} konten, ${(r.followers || 0).toLocaleString("id-ID")} followers`)
        .join(" · ");
      setSyncMsg(`✓ ${detail || `${json.synced} profil`}`);
      await mutate(undefined, { revalidate: true });
    } catch (e: unknown) {
      setSyncMsg(`⚠ ${e instanceof Error ? e.message : "Sync gagal"}`);
    } finally {
      setSyncing(false);
    }
  }

  const primaryProfile = data?.profiles?.find((p: { source?: string }) => p.source === "apify") ?? data?.profiles?.[0];

  const totalLikes = posts.reduce((s, p) => s + (p.likes || 0), 0);
  const totalComments = posts.reduce((s, p) => s + (p.comments || 0), 0);
  const totalReach = posts.reduce((s, p) => s + (p.reach || 0), 0);
  const videoPosts = posts.filter((p) => isVideo(p));
  const videoShare = posts.length ? Math.round((videoPosts.length / posts.length) * 100) : 0;

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
    { title: "Total Likes (12 konten)", value: totalLikes ? totalLikes.toLocaleString("id-ID") : "—" },
    { title: "Total Komentar", value: totalComments ? totalComments.toLocaleString("id-ID") : "—" },
    { title: "Total Reach", value: totalReach ? totalReach.toLocaleString("id-ID") : "—" },
  ];

  const postColumns = [
    {
      key: "published_at",
      label: "Tanggal",
      render: (r: any) =>
        r.published_at ? new Date(r.published_at).toLocaleDateString("id-ID") : "—",
    },
    {
      key: "media_type",
      label: "Tipe",
      render: (r: any) => (
        <span className="badge" style={{ background: /video|reel|igtv|clip/i.test(r.media_type || "") ? brand.violetSoft : brand.tealSoft, color: /video|reel|igtv|clip/i.test(r.media_type || "") ? brand.violet : brand.teal, borderColor: "transparent" }}>
          {r.media_type || "Image"}
        </span>
      ),
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
                          style={{ background: brand.blueSoft, color: brand.blue }}
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Konten Terbaru
          </h3>
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {posts.length} dari maks {MAX_POSTS} konten
          </span>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-44 rounded-xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Belum ada konten. Jalankan Sync Real time untuk tarik data terbaru dari Instagram.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {posts.map((p: SocialPost) => (
                <PostCard key={p.id} post={p} onOpen={setSelected} />
              ))}
            </div>
            {postsLimit < MAX_POSTS && (
              <div className="flex items-center justify-center mt-5">
                <button
                  type="button"
                  onClick={() => setPostsLimit((n) => Math.min(n + PAGE_SIZE, MAX_POSTS))}
                  className="rounded-lg px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-85"
                  style={{ background: brand.blueSoft, color: brand.blue, border: `1px solid ${brand.blue}33` }}
                >
                  Load more (+{PAGE_SIZE})
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card-base p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Engagement per Konten (ER%)
          </h3>
          {isLoading ? (
            <div className="skeleton h-48 rounded-xl" />
          ) : chartData.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Belum ada konten. Jalankan Sync Real time.
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
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            Insight Konten
          </h3>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            {videoPosts.length} video dari {posts.length} konten terakhir ({videoShare}% video)
          </p>
          {isLoading ? (
            <div className="skeleton h-48 rounded-xl" />
          ) : posts.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Belum ada data untuk dianalisa.
            </p>
          ) : (
            <div className="space-y-2.5 text-xs">
              {(() => {
                const byER = [...posts].sort((a, b) => (b.engagement_rate || 0) - (a.engagement_rate || 0));
                const best = byER[0];
                const worst = byER[byER.length - 1];
                const byLikes = [...posts].sort((a, b) => (b.likes || 0) - (a.likes || 0));
                const topVideo = videoPosts.sort((a, b) => (b.likes || 0) - (a.likes || 0))[0];
                const hours = posts
                  .filter((p) => p.published_at)
                  .map((p) => new Date(p.published_at as string).getHours());
                const avgHour = hours.length ? Math.round(hours.reduce((s, h) => s + h, 0) / hours.length) : null;
                const rows: Array<[string, string, string]> = [
                  ["Konten terbaik (ER)", best ? `${formatPct(best.engagement_rate)} — ${(best.caption || "—").slice(0, 48)}…` : "—", brand.emerald],
                  ["Konten terendah (ER)", worst ? `${formatPct(worst.engagement_rate)} — ${(worst.caption || "—").slice(0, 48)}…` : "—", brand.danger],
                  ["Video terbaik", topVideo ? `${(topVideo.likes || 0).toLocaleString("id-ID")} likes — ${(topVideo.caption || "—").slice(0, 40)}…` : "Belum ada video di 12 konten terakhir", brand.violet],
                  ["Total likes / komentar", `${totalLikes.toLocaleString("id-ID")} / ${totalComments.toLocaleString("id-ID")}`, domain.crm],
                  ["Total reach (12 konten)", totalReach.toLocaleString("id-ID"), domain.marketing],
                  ["Rata-rata jam posting (WIB)", avgHour !== null ? `${String(avgHour).padStart(2, "0")}:00` : "—", brand.blue],
                ];
                return rows.map(([label, value, color], i) => (
                  <div key={i} className="flex items-start justify-between gap-3 pb-2.5 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                    <span style={{ color: "var(--text-muted)" }}>{label}</span>
                    <span className="text-right font-medium" style={{ color: color as string }}>{value}</span>
                  </div>
                ));
              })()}
              <p className="flex items-center gap-1.5 pt-1" style={{ color: "var(--text-muted)" }}>
                <Clock size={11} /> Reach diestimasi dari likes+komentar vs followers saat sync.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="card-base p-5">
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Riwayat Konten
        </h3>
        <DataTable columns={postColumns} data={data?.posts || []} loading={isLoading} />
      </div>

      {selected && (
        <PostDetailModal
          post={selected}
          avgER={data?.summary?.postAvgEngagement || 0}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}