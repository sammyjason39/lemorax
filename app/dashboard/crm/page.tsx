"use client";

import useSWR from "swr";
import { useState } from "react";
import { useFilters } from "@/contexts/FilterContext";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/cards/MetricCard";
import { DataTable } from "@/components/tables/DataTable";
import { formatRupiahShort, formatRupiah, formatPct, getCRMStatusColor, formatDateID } from "@/lib/formatters";
import { AriesPieChart } from "@/components/charts/PieChart";
import { AlertTriangle, X } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Cell
} from "recharts";
import { formatPeriode } from "@/lib/formatters";
import { CHART_PRIMARY, getCategoricalColor } from "@/lib/brand";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CRMPage() {
  const { periodeStart, periodeEnd, cabang } = useFilters();
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const params = new URLSearchParams({
    periode_start: periodeStart, periode_end: periodeEnd,
    ...(cabang.length ? { cabang: cabang.join(",") } : {}),
  });

  const { data, isLoading } = useSWR(`/api/crm?${params}`, fetcher, { refreshInterval: 60000 });

  const metrics = [
    { title: "Total Pipeline", value: data ? formatRupiahShort(data.summary?.totalPipeline) : "—" },
    { title: "Closed Won", value: data ? formatRupiahShort(data.summary?.totalWon) : "—" },
    { title: "Closed Lost", value: data ? formatRupiahShort(data.summary?.totalLost) : "—" },
    { title: "Win Rate", value: data ? formatPct(data.summary?.winRate) : "—" },
    { title: "Avg Deal Value", value: data ? formatRupiahShort(data.summary?.avgDeal) : "—" },
  ];

  const tipeChartData = (data?.tipeBreakdown || []).map((t: any) => ({ name: t.name, value: t.value }));

  const funnelStages = data?.funnelData || [];
  const funnelRanked = [...funnelStages].sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
  const funnelColorByStage: Record<string, string> = {};
  funnelRanked.forEach((f: any, i: number) => {
    funnelColorByStage[f.stage] = getCategoricalColor(i, funnelRanked.length);
  });

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const columns = [
    { key: "deal_id", label: "ID", width: "80px" },
    { key: "nama_perusahaan", label: "Perusahaan", sortable: true },
    { key: "tipe_bisnis", label: "Tipe" },
    { key: "kota", label: "Kota" },
    { key: "account_manager", label: "AM" },
    {
      key: "nilai_deal", label: "Nilai Deal", sortable: true, align: "right" as const,
      render: (r: any) => <span style={{ color: "#1652F0" }}>{formatRupiahShort(r.nilai_deal)}</span>
    },
    {
      key: "status", label: "Status",
      render: (r: any) => <span className={`badge ${getCRMStatusColor(r.status)}`}>{r.status}</span>
    },
    { key: "produk_utama", label: "Produk" },
    { key: "last_follow_up", label: "Last FU", render: (r: any) => r.last_follow_up?.slice(0, 10) || "-" },
  ];

  return (
    <div className="page-enter">
      <TopBar title="CRM & Deals" subtitle="Pipeline, deal tracking, dan follow-up management" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {metrics.map((m, i) => <MetricCard key={i} {...m} loading={isLoading} />)}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Funnel */}
          <div className="card-base p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Pipeline Funnel</h3>
            {isLoading ? <div className="skeleton h-48 rounded-xl" /> : (
              <div className="space-y-2">
                {(data?.funnelData || []).map((f: any, i: number) => {
                  const max = Math.max(...(data?.funnelData || []).map((x: any) => x.count), 1);
                  const pct = (f.count / max) * 100;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
                        <span>{f.stage}</span>
                        <span style={{ color: "var(--text-muted)" }}>{f.count} deals · {formatRupiahShort(f.value)}</span>
                      </div>
                      <div className="h-7 rounded-lg overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
                        <div className="h-full rounded-lg transition-all" style={{ width: `${pct}%`, background: funnelColorByStage[f.stage] || CHART_PRIMARY, opacity: 0.92 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tipe Bisnis */}
          <div className="card-base p-5">
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Breakdown Tipe Bisnis</h3>
            <AriesPieChart data={tipeChartData} loading={isLoading} donut formatter={formatRupiah} />
          </div>

          {/* Top AMs */}
          <div className="card-base p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Top Account Managers</h3>
            {isLoading ? <div className="skeleton h-48 rounded-xl" /> : (
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                {(data?.topAMs || []).slice(0, 8).map((am: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-5 font-bold text-center" style={{ color: i < 3 ? CHART_PRIMARY : "var(--text-muted)" }}>#{i+1}</span>
                    <span className="flex-1 truncate" style={{ color: "var(--text-secondary)" }}>{am.am}</span>
                    <span style={{ color: "#1652F0",  }}>{formatRupiahShort(am.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Follow-up Reminders */}
        {(data?.staleDeals?.length > 0) && (
          <div className="card-base p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={15} color="#F59E0B" />
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Perlu Follow-Up Segera ({data.staleDeals.length} deals)
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {data.staleDeals.slice(0, 6).map((d: any, i: number) => (
                <div key={i} className="p-3 rounded-xl text-xs" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{d.nama_perusahaan}</p>
                  <p style={{ color: "var(--text-secondary)" }}>AM: {d.account_manager}</p>
                  <p style={{ color: "#1652F0" }}>Nilai: {formatRupiahShort(d.nilai_deal)}</p>
                  <p style={{ color: "#F59E0B" }}>Last FU: {d.last_follow_up?.slice(0,10) || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deals Table */}
        <div className="card-base p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Semua Deals
          </h3>
          <DataTable
            columns={columns}
            data={data?.deals || []}
            loading={isLoading}
            searchable
            searchKeys={["nama_perusahaan", "account_manager", "kota", "deal_id"]}
            pageSize={25}
            onRowClick={setSelectedDeal}
            getRowStyle={(r) => {
              if (r.status === "Negotiation" && r.last_follow_up && new Date(r.last_follow_up) < twoWeeksAgo) {
                return { background: "rgba(245,158,11,0.05)" };
              }
              return {};
            }}
          />
        </div>
      </div>

      {/* Deal Detail Modal */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-lg rounded-2xl p-6 max-h-[80vh] overflow-y-auto scrollbar-thin" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{selectedDeal.nama_perusahaan}</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{selectedDeal.deal_id} · {selectedDeal.tipe_bisnis}</p>
              </div>
              <button onClick={() => setSelectedDeal(null)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <X size={16} color="var(--text-secondary)" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ["Status", <span className={`badge ${getCRMStatusColor(selectedDeal.status)}`}>{selectedDeal.status}</span>],
                ["Nilai Deal", <span style={{ color: "#1652F0" }}>{formatRupiah(selectedDeal.nilai_deal)}</span>],
                ["Account Manager", selectedDeal.account_manager],
                ["Cabang Handler", selectedDeal.cabang_handler],
                ["Produk Utama", selectedDeal.produk_utama],
                ["Frekuensi Order", selectedDeal.frekuensi_order],
                ["Last Follow-Up", selectedDeal.last_follow_up?.slice(0,10) || "—"],
                ["Tanggal Closed", selectedDeal.tanggal_closed?.slice(0,10) || "—"],
              ].map(([label, value], i) => (
                <div key={i} className="flex justify-between gap-4">
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ color: "var(--text-secondary)" }}>{value as any}</span>
                </div>
              ))}
              <div className="pt-3 border-t mt-3" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>INFO OWNER</p>
                {[
                  ["Nama Owner", selectedDeal.nama_owner],
                  ["Jabatan", selectedDeal.jabatan_owner],
                  ["No HP", selectedDeal.no_hp_owner],
                  ["Email", selectedDeal.email_owner],
                  ["Tanggal Lahir", selectedDeal.tanggal_lahir_owner ? formatDateID(selectedDeal.tanggal_lahir_owner) : "—"],
                ].map(([label, value], i) => (
                  <div key={i} className="flex justify-between gap-4 py-1">
                    <span style={{ color: "var(--text-muted)" }}>{label}</span>
                    <span style={{ color: "var(--text-secondary)" }}>{value as any}</span>
                  </div>
                ))}
              </div>
              {selectedDeal.notes && (
                <div className="pt-2">
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>NOTES</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{selectedDeal.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
