"use client";

import useSWR from "swr";
import { useFilters } from "@/contexts/FilterContext";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/cards/MetricCard";
import { DataTable } from "@/components/tables/DataTable";
import { formatRupiahShort, formatRupiah, formatPct, formatPeriode } from "@/lib/formatters";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, Cell, ScatterChart, Scatter, ZAxis, ReferenceLine
} from "recharts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CHANNEL_COLORS: Record<string, string> = {
  "TikTok Ads": "#EE1D52", "Meta Ads": "#1877F2", "Google Ads": "#EA4335",
  "Tokopedia Ads": "#03AC0E", "Shopee Ads": "#EE4D2D", "Influencer": "#8B5CF6",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 text-xs space-y-1" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}>
      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.value > 1000 ? formatRupiahShort(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function MarketingPage() {
  const { periodeStart, periodeEnd } = useFilters();
  const params = new URLSearchParams({ periode_start: periodeStart, periode_end: periodeEnd });
  const { data, isLoading } = useSWR(`/api/marketing?${params}`, fetcher, { refreshInterval: 60000 });

  const metrics = [
    { title: "Total Marketing Spend", value: data ? formatRupiahShort(data.summary?.totalSpend) : "—" },
    { title: "Revenue dari Marketing", value: data ? formatRupiahShort(data.summary?.totalRevenue) : "—" },
    { title: "Average ROAS", value: data ? `${(data.summary?.avgROAS || 0).toFixed(2)}x` : "—" },
    { title: "Total Conversions", value: data ? data.summary?.totalConversions.toLocaleString("id-ID") : "—" },
    { title: "Average CTR", value: data ? formatPct(data.summary?.avgCTR) : "—" },
  ];

  const columns = [
    { key: "periode", label: "Periode" },
    { key: "campaign_name", label: "Campaign", sortable: true },
    { key: "channel", label: "Channel" },
    { key: "target_audience", label: "Audience" },
    { key: "budget", label: "Budget", align: "right" as const, sortable: true, render: (r: any) => formatRupiahShort(r.budget) },
    { key: "spend", label: "Spend", align: "right" as const, sortable: true, render: (r: any) => formatRupiahShort(r.spend) },
    { key: "impressions", label: "Impresi", align: "right" as const, sortable: true, render: (r: any) => (r.impressions || 0).toLocaleString("id-ID") },
    { key: "clicks", label: "Clicks", align: "right" as const, sortable: true },
    { key: "ctr_pct", label: "CTR%", align: "right" as const, sortable: true, render: (r: any) => formatPct(r.ctr_pct) },
    { key: "conversions", label: "Conv.", align: "right" as const, sortable: true },
    { key: "revenue_generated", label: "Revenue", align: "right" as const, sortable: true, render: (r: any) => <span style={{ color: "#14B8A6", fontFamily: "var(--font-jetbrains-mono)" }}>{formatRupiahShort(r.revenue_generated)}</span> },
    {
      key: "roas", label: "ROAS", align: "right" as const, sortable: true,
      render: (r: any) => <span style={{ color: (r.roas || 0) >= 3 ? "#14B8A6" : "#EF4444", fontFamily: "var(--font-jetbrains-mono)" }}>{(r.roas || 0).toFixed(2)}x</span>
    },
    { key: "cpl", label: "CPL", align: "right" as const, sortable: true, render: (r: any) => formatRupiahShort(r.cpl) },
  ];

  return (
    <div className="page-enter">
      <TopBar title="Marketing" subtitle="Analisa performa campaign dan efisiensi anggaran marketing" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {metrics.map((m, i) => <MetricCard key={i} {...m} loading={isLoading} />)}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* ROAS per Channel */}
          <div className="card-base p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sora)" }}>
              ROAS per Channel
            </h3>
            {isLoading ? <div className="skeleton h-48 rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.roasPerChannel || []} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                  <XAxis type="number" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="channel" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip formatter={(v: any) => [`${Number(v).toFixed(2)}x`, "ROAS"]} contentStyle={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }} />
                  <ReferenceLine x={3} stroke="#F59E0B" strokeDasharray="4 2" label={{ value: "Breakeven", fill: "#F59E0B", fontSize: 10 }} />
                  <Bar dataKey="roas" radius={[0,4,4,0]} maxBarSize={20}>
                    {(data?.roasPerChannel || []).map((r: any, i: number) => (
                      <Cell key={i} fill={CHANNEL_COLORS[r.channel] || "#3B82F6"} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Budget vs Spend vs Revenue */}
          <div className="card-base p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sora)" }}>
              Budget vs Spend vs Revenue (Monthly)
            </h3>
            {isLoading ? <div className="skeleton h-48 rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.monthlyData || []} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,42,61,0.8)" vertical={false} />
                  <XAxis dataKey="periode" tickFormatter={(v) => v.slice(5)} tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatRupiahShort} tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} width={68} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "11px", color: "#94A3B8" }} />
                  <Bar dataKey="budget" name="Budget" fill="#475569" fillOpacity={0.7} radius={[2,2,0,0]} maxBarSize={14} />
                  <Bar dataKey="spend" name="Spend" fill="#3B82F6" fillOpacity={0.85} radius={[2,2,0,0]} maxBarSize={14} />
                  <Bar dataKey="revenue" name="Revenue" fill="#14B8A6" fillOpacity={0.85} radius={[2,2,0,0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Scatter: Spend vs ROAS */}
        <div className="card-base p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sora)" }}>
            Campaign Efficiency Map (Spend vs ROAS, ukuran bubble = Revenue)
          </h3>
          {isLoading ? <div className="skeleton h-56 rounded-xl" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,42,61,0.8)" />
                <XAxis type="number" dataKey="spend" name="Spend" tickFormatter={formatRupiahShort} tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: "Spend", fill: "#475569", fontSize: 11, dy: 16 }} />
                <YAxis type="number" dataKey="roas" name="ROAS" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: "ROAS", fill: "#475569", fontSize: 11, angle: -90, dx: -18 }} />
                <ZAxis type="number" dataKey="revenue" range={[40, 400]} />
                <Tooltip cursor={{ stroke: "var(--border)" }} content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg p-3 text-xs" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}>
                      <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{d.campaign}</p>
                      <p style={{ color: "#94A3B8" }}>Spend: {formatRupiahShort(d.spend)}</p>
                      <p style={{ color: "#3B82F6" }}>ROAS: {(d.roas || 0).toFixed(2)}x</p>
                      <p style={{ color: "#14B8A6" }}>Revenue: {formatRupiahShort(d.revenue)}</p>
                    </div>
                  );
                }} />
                <ReferenceLine y={3} stroke="#F59E0B" strokeDasharray="4 2" />
                <Scatter data={data?.scatterData || []} fill="#3B82F6" fillOpacity={0.7}>
                  {(data?.scatterData || []).map((d: any, i: number) => (
                    <Cell key={i} fill={CHANNEL_COLORS[d.channel] || "#3B82F6"} fillOpacity={0.75} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Campaign Table */}
        <div className="card-base p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sora)" }}>
            Semua Campaigns
          </h3>
          <DataTable
            columns={columns}
            data={(data?.campaigns || []).sort((a: any, b: any) => (b.roas || 0) - (a.roas || 0))}
            loading={isLoading}
            searchable
            searchKeys={["campaign_name", "channel", "target_audience"]}
            pageSize={25}
            getRowStyle={(r) => (r.roas || 0) < 1 ? { background: "rgba(239,68,68,0.04)" } : {}}
          />
        </div>
      </div>
    </div>
  );
}
