"use client";

import useSWR from "swr";
import { useFilters } from "@/contexts/FilterContext";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/cards/MetricCard";
import { DataTable } from "@/components/tables/DataTable";
import { formatPct, getKPIStatusColor } from "@/lib/formatters";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { CABANG_LIST } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function HeatmapCell({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const r = pct < 75 ? 239 : pct < 100 ? 245 : 20;
  const g = pct < 75 ? 68 : pct < 100 ? 158 : 184;
  const b = pct < 75 ? 68 : pct < 100 ? 11 : 166;
  const alpha = 0.15 + (pct / 100) * 0.5;
  return (
    <td
      title={`${pct.toFixed(1)}%`}
      className="border text-center text-[10px] font-mono cursor-default transition-all"
      style={{
        background: `rgba(${r},${g},${b},${alpha})`,
        borderColor: "var(--border)",
        color: value > 0 ? "var(--text-secondary)" : "var(--text-muted)",
        padding: "6px 4px",
        minWidth: "52px",
      }}
    >
      {value > 0 ? `${value.toFixed(0)}%` : "—"}
    </td>
  );
}

export default function KPIPage() {
  const { periodeStart, periodeEnd, cabang } = useFilters();
  const params = new URLSearchParams({
    periode_start: periodeStart, periode_end: periodeEnd,
    ...(cabang.length ? { cabang: cabang.join(",") } : {}),
  });

  const { data, isLoading } = useSWR(`/api/kpi?${params}`, fetcher, { refreshInterval: 60000 });

  const statusDist = data?.summary?.statusDistribution || {};
  const metrics = [
    { title: "Avg Achievement", value: data ? formatPct(data.summary?.avgAchievement) : "—" },
    { title: "Karyawan Excellent (≥110%)", value: data ? (statusDist["Excellent"] || 0).toString() : "—" },
    { title: "Karyawan Below Target (<75%)", value: data ? (statusDist["Below Target"] || 0).toString() : "—" },
    { title: "Total Karyawan", value: data ? data.summary?.totalEmployees?.toString() : "—" },
  ];

  // Build heatmap months (last 6)
  const [ey, em] = periodeEnd.split("-").map(Number);
  const heatmapMonths: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(ey, em - 1 - i, 1);
    heatmapMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const heatmapByName: Record<string, Record<string, number>> = {};
  (data?.heatmapData || []).forEach((row: any) => {
    heatmapByName[row.cabang] = row.months;
  });

  const columns = [
    { key: "employee_id", label: "ID", width: "90px" },
    { key: "nama", label: "Nama", sortable: true },
    { key: "cabang", label: "Cabang" },
    { key: "departemen", label: "Departemen" },
    { key: "jabatan", label: "Jabatan" },
    { key: "target", label: "Target", align: "right" as const, sortable: true },
    { key: "actual", label: "Aktual", align: "right" as const, sortable: true },
    {
      key: "achievement_pct", label: "Achievement", sortable: true, align: "right" as const,
      render: (r: any) => (
        <span style={{ fontFamily: "var(--font-jetbrains-mono)", color: (r.achievement_pct || 0) >= 100 ? "#14B8A6" : (r.achievement_pct || 0) >= 75 ? "#F59E0B" : "#EF4444" }}>
          {formatPct(r.achievement_pct)}
        </span>
      )
    },
    {
      key: "status", label: "Status",
      render: (r: any) => <span className={`badge ${getKPIStatusColor(r.status)}`}>{r.status}</span>
    },
  ];

  // Distribution histogram
  const distBuckets = [
    { label: "0-50%", min: 0, max: 50 },
    { label: "50-75%", min: 50, max: 75 },
    { label: "75-90%", min: 75, max: 90 },
    { label: "90-110%", min: 90, max: 110 },
    { label: "110%+", min: 110, max: Infinity },
  ];
  const distData = distBuckets.map(({ label, min }) => {
    const bucketItem = (data?.distribution || []).find((d: any) => d.bucket === label);
    return {
      label,
      count: Number(bucketItem?.cnt || 0),
      color: min < 50 ? "#EF4444" : min < 75 ? "#F97316" : min < 90 ? "#F59E0B" : min < 110 ? "#3B82F6" : "#14B8A6",
    };
  });

  return (
    <div className="page-enter">
      <TopBar title="KPI Karyawan" subtitle="Monitoring pencapaian target seluruh karyawan" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m, i) => <MetricCard key={i} {...m} loading={isLoading} />)}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Distribution Histogram */}
          <div className="card-base p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sora)" }}>
              Distribusi Achievement
            </h3>
            {isLoading ? <div className="skeleton h-48 rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={distData} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,42,61,0.8)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }} />
                  <Bar dataKey="count" name="Karyawan" radius={[4,4,0,0]} maxBarSize={56}>
                    {distData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top/Bottom 10 */}
          <div className="card-base p-5">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sora)" }}>
              Top 10 Performers
            </h3>
            {isLoading ? <div className="skeleton h-48 rounded-xl" /> : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                {(data?.top10 || []).map((r: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1">
                    <span className="w-5 text-center font-bold" style={{ color: i < 3 ? "#F59E0B" : "var(--text-muted)" }}>#{i+1}</span>
                    <span className="flex-1 truncate" style={{ color: "var(--text-secondary)" }}>{r.nama}</span>
                    <span style={{ color: "#14B8A6", fontFamily: "var(--font-jetbrains-mono)" }}>{formatPct(r.achievement_pct)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Heatmap */}
        <div className="card-base p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sora)" }}>
            Achievement per Cabang (6 Bulan Terakhir)
          </h3>
          {isLoading ? <div className="skeleton h-64 rounded-xl" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-4" style={{ color: "var(--text-muted)", minWidth: "120px" }}>Cabang</th>
                    {heatmapMonths.map((m) => (
                      <th key={m} className="text-center py-2 px-1" style={{ color: "var(--text-muted)", minWidth: "52px" }}>
                        {m.slice(5)} <span className="text-[9px]">{m.slice(2,4)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CABANG_LIST.map((cb) => (
                    <tr key={cb}>
                      <td className="py-1 pr-4 text-xs" style={{ color: "var(--text-secondary)" }}>{cb}</td>
                      {heatmapMonths.map((m) => (
                        <HeatmapCell key={m} value={heatmapByName[cb]?.[m] || 0} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Individual KPI Table */}
        <div className="card-base p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sora)" }}>
            Detail KPI Karyawan
          </h3>
          <DataTable
            columns={columns}
            data={data?.allData || []}
            loading={isLoading}
            searchable
            searchKeys={["nama", "cabang", "departemen", "employee_id"]}
            pageSize={25}
            getRowStyle={(r) => r.status === "Below Target" ? { background: "rgba(239,68,68,0.04)" } : {}}
          />
        </div>
      </div>
    </div>
  );
}
