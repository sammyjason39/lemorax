"use client";

import useSWR from "swr";
import { useFilters } from "@/contexts/FilterContext";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/cards/MetricCard";
import { DataTable } from "@/components/tables/DataTable";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Cell
} from "recharts";
import { formatRupiahShort, formatRupiah, formatPeriode, getSalesStatusColor } from "@/lib/formatters";
import { CHART_PRIMARY, CHART_SECONDARY, CHART_AXIS, CHART_GRID, CHART_MUTED, getChartColor, getCategoricalColor } from "@/lib/brand";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 text-xs space-y-1" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}>
      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {formatRupiahShort(p.value)}</p>
      ))}
    </div>
  );
};

export default function SalesPage() {
  const { periodeStart, periodeEnd, cabang } = useFilters();
  const params = new URLSearchParams({
    periode_start: periodeStart, periode_end: periodeEnd,
    ...(cabang.length ? { cabang: cabang.join(",") } : {}),
  });

  const { data, isLoading } = useSWR(`/api/sales?${params}`, fetcher, { refreshInterval: 60000 });

  const yoyYears = ["2024", "2025", "2026"];
  const yoyYearColors: Record<string, string> = {};
  if (data?.yoyData?.length) {
    const ranked = yoyYears
      .map((year) => ({
        year,
        total: (data.yoyData as any[]).reduce((s, row) => s + (Number(row[year]) || 0), 0),
      }))
      .sort((a, b) => b.total - a.total);
    ranked.forEach((y, i) => {
      yoyYearColors[y.year] = getCategoricalColor(i, ranked.length);
    });
  }

  const metrics = [
    { title: "Total Revenue", value: data ? formatRupiahShort(data.summary?.totalRevenue) : "—" },
    { title: "Total Transaksi", value: data ? data.summary?.totalTransactions.toLocaleString("id-ID") : "—" },
    { title: "Avg Order Value", value: data ? formatRupiahShort(data.summary?.avgOrderValue) : "—" },
    {
      title: "B2B vs B2C",
      value: data ? `${formatRupiahShort(data.summary?.b2bRevenue)} / ${formatRupiahShort(data.summary?.b2cRevenue)}` : "—",
    },
  ];

  const columns = [
    { key: "transaction_id", label: "ID", width: "120px" },
    { key: "tanggal", label: "Tanggal", sortable: true, render: (r: any) => r.tanggal?.slice(0, 10) || "-" },
    { key: "sales_name", label: "Sales" },
    { key: "cabang", label: "Cabang" },
    {
      key: "tipe", label: "Tipe",
      render: (r: any) => (
        <span className="badge" style={{ background: r.tipe === "B2B" ? "rgba(22,82,240,0.12)" : "rgba(148,163,184,0.2)", color: r.tipe === "B2B" ? CHART_PRIMARY : CHART_SECONDARY, borderColor: "transparent" }}>
          {r.tipe}
        </span>
      )
    },
    { key: "produk", label: "Produk" },
    { key: "qty", label: "Qty", align: "right" as const, sortable: true },
    { key: "total", label: "Total", sortable: true, align: "right" as const, render: (r: any) => <span style={{ color: "#1652F0" }}>{formatRupiah(r.total)}</span> },
    {
      key: "status", label: "Status",
      render: (r: any) => <span className={`badge ${getSalesStatusColor(r.status)}`}>{r.status}</span>
    },
    { key: "channel", label: "Channel" },
  ];

  return (
    <div className="page-enter">
      <TopBar title="Sales & Revenue" subtitle="Analisa penjualan dan pendapatan seluruh cabang" />
      <div className="p-6 space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m, i) => <MetricCard key={i} {...m} loading={isLoading} />)}
        </div>

        {/* Revenue Trend B2B vs B2C */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="card-base p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              Revenue Trend — B2B vs B2C
            </h3>
            {isLoading ? <div className="skeleton h-56 rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data?.monthlyTrend || []} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="periode" tickFormatter={formatPeriode} tick={{ fill: CHART_AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatRupiahShort} tick={{ fill: CHART_AXIS, fontSize: 11 }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "12px", color: CHART_MUTED }} />
                  <Line type="monotone" dataKey="b2b" name="B2B" stroke={CHART_PRIMARY} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="b2c" name="B2C" stroke={CHART_SECONDARY} strokeWidth={2} strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* YoY Comparison */}
          <div className="card-base p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              YoY Growth Analysis
            </h3>
            {isLoading ? <div className="skeleton h-56 rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.yoyData || []} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: CHART_AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatRupiahShort} tick={{ fill: CHART_AXIS, fontSize: 11 }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "12px", color: CHART_MUTED }} />
                  <Bar dataKey="2024" name="2024" fill={yoyYearColors["2024"] || CHART_SECONDARY} fillOpacity={0.92} radius={[2,2,0,0]} maxBarSize={20} />
                  <Bar dataKey="2025" name="2025" fill={yoyYearColors["2025"] || CHART_PRIMARY} fillOpacity={0.92} radius={[2,2,0,0]} maxBarSize={20} />
                  <Bar dataKey="2026" name="2026" fill={yoyYearColors["2026"] || CHART_PRIMARY} fillOpacity={0.92} radius={[2,2,0,0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="card-base p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Top 10 Produk by Revenue
          </h3>
          {isLoading ? <div className="skeleton h-48 rounded-xl" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.topProducts || []} layout="vertical" margin={{ top: 0, right: 80, left: 10, bottom: 0 }}>
                <XAxis type="number" tickFormatter={formatRupiahShort} tick={{ fill: CHART_AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="produk" tick={{ fill: CHART_MUTED, fontSize: 11 }} axisLine={false} tickLine={false} width={150} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" radius={[0,4,4,0]} maxBarSize={20}>
                  {(data?.topProducts || []).map((_: any, i: number) => (
                    <Cell key={i} fill={getChartColor(i, (data?.topProducts || []).length)} fillOpacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Transactions Table */}
        <div className="card-base p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Semua Transaksi
          </h3>
          <DataTable
            columns={columns}
            data={data?.transactions || []}
            loading={isLoading}
            searchable
            searchKeys={["sales_name", "produk", "cabang", "transaction_id"]}
            pageSize={25}
            getRowStyle={(r) => r.status === "Cancelled" ? { opacity: 0.6 } : {}}
          />
        </div>
      </div>
    </div>
  );
}
