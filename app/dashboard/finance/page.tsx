"use client";

import useSWR from "swr";
import { useFilters } from "@/contexts/FilterContext";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/cards/MetricCard";
import { DataTable } from "@/components/tables/DataTable";
import { formatRupiahShort, formatRupiah, formatPct, formatPeriode } from "@/lib/formatters";
import { AriesPieChart } from "@/components/charts/PieChart";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Cell, ReferenceLine
} from "recharts";
import { CHART_PRIMARY, CHART_SECONDARY, CHART_MUTED, CHART_AXIS, CHART_GRID } from "@/lib/brand";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 text-xs space-y-1" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}>
      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{typeof label === "string" && label.includes("-") ? formatPeriode(label) : label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {formatRupiahShort(p.value)}</p>
      ))}
    </div>
  );
};

export default function FinancePage() {
  const { periodeStart, periodeEnd, cabang } = useFilters();
  const params = new URLSearchParams({
    periode_start: periodeStart, periode_end: periodeEnd,
    ...(cabang.length ? { cabang: cabang.join(",") } : {}),
  });

  const { data, isLoading } = useSWR(`/api/finance?${params}`, fetcher, { refreshInterval: 60000 });

  const metrics = [
    { title: "Total Pemasukan", value: data ? formatRupiahShort(data.summary?.totalIncome) : "—" },
    { title: "Total Pengeluaran", value: data ? formatRupiahShort(data.summary?.totalExpense) : "—" },
    { title: "Net Profit/Loss", value: data ? formatRupiahShort(data.summary?.netProfit) : "—" },
    { title: "Profit Margin", value: data ? formatPct(data.summary?.margin) : "—" },
    { title: "Cabang Terprofitable", value: data?.summary?.topCabang || "—" },
  ];

  const expenseChartData = (data?.expenseByCategory || []).map((e: any) => ({ name: e.name, value: e.value }));

  const colFinance = [
    { key: "periode", label: "Periode" },
    { key: "cabang", label: "Cabang" },
    {
      key: "tipe", label: "Tipe",
      render: (r: any) => (
        <span className="badge" style={{
          background: r.tipe === "Pemasukan" ? "rgba(22,82,240,0.12)" : "rgba(148,163,184,0.2)",
          color: r.tipe === "Pemasukan" ? CHART_PRIMARY : CHART_SECONDARY,
          borderColor: "transparent"
        }}>{r.tipe}</span>
      )
    },
    { key: "kategori", label: "Kategori" },
    { key: "keterangan", label: "Keterangan" },
    {
      key: "jumlah", label: "Jumlah", sortable: true, align: "right" as const,
      render: (r: any) => (
        <span style={{ color: r.tipe === "Pemasukan" ? CHART_PRIMARY : CHART_SECONDARY }}>
          {r.tipe === "Pemasukan" ? "+" : "-"}{formatRupiah(r.jumlah)}
        </span>
      )
    },
    { key: "metode_pembayaran", label: "Metode" },
    { key: "referensi", label: "Referensi" },
  ];

  return (
    <div className="page-enter">
      <TopBar title="Finance" subtitle="Laporan keuangan, P&L, dan analisa cashflow" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {metrics.map((m, i) => <MetricCard key={i} {...m} loading={isLoading} />)}
        </div>

        {/* P&L Chart */}
        <div className="card-base p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Profit & Loss Trend
          </h3>
          {isLoading ? <div className="skeleton h-64 rounded-xl" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data?.monthlyPL || []} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={0.2} /><stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_SECONDARY} stopOpacity={0.2} /><stop offset="95%" stopColor={CHART_SECONDARY} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="periode" tickFormatter={formatPeriode} tick={{ fill: CHART_AXIS, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatRupiahShort} tick={{ fill: CHART_AXIS, fontSize: 11 }} axisLine={false} tickLine={false} width={72} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "12px", color: CHART_MUTED }} />
                <Area type="monotone" dataKey="revenue" name="Pemasukan" stroke={CHART_PRIMARY} strokeWidth={2} fill="url(#gRev)" />
                <Area type="monotone" dataKey="expense" name="Pengeluaran" stroke={CHART_SECONDARY} strokeWidth={2} strokeDasharray="4 3" fill="url(#gExp)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Expense Breakdown */}
          <div className="card-base p-5">
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Breakdown Pengeluaran per Kategori
            </h3>
            <AriesPieChart data={expenseChartData} loading={isLoading} donut formatter={formatRupiah} height={260} />
          </div>

          {/* Monthly Cashflow */}
          <div className="card-base p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              Monthly Cashflow (Net)
            </h3>
            {isLoading ? <div className="skeleton h-56 rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={224}>
                <BarChart data={data?.monthlyPL || []} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="periode" tickFormatter={formatPeriode} tick={{ fill: CHART_AXIS, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatRupiahShort} tick={{ fill: CHART_AXIS, fontSize: 11 }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke={CHART_GRID} />
                  <Bar dataKey="net" name="Net Profit" radius={[4,4,0,0]} maxBarSize={32}>
                    {(data?.monthlyPL || []).map((row: any, i: number) => (
                      <Cell key={i} fill={row.net >= 0 ? CHART_PRIMARY : CHART_SECONDARY} fillOpacity={row.net >= 0 ? 0.9 : 0.75} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Annual Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(data?.annualSummary || [{ year: "2024" }, { year: "2025" }, { year: "2026" }]).map((y: any, i: number) => (
            <div key={i} className="card-base p-5">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                Ringkasan {y.year}
              </p>
              {[
                ["Total Revenue", formatRupiahShort(y.revenue || 0), CHART_PRIMARY],
                ["Total Expense", formatRupiahShort(y.expense || 0), CHART_SECONDARY],
                ["Net Profit", formatRupiahShort(y.net || 0), (y.net || 0) >= 0 ? CHART_PRIMARY : CHART_SECONDARY],
                ["Margin", formatPct(y.margin || 0), CHART_PRIMARY],
              ].map(([label, value, color], j) => (
                <div key={j} className="flex justify-between py-1.5 text-xs border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ color: color as string,  }}>{value}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Finance Table */}
        <div className="card-base p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Semua Transaksi Keuangan
          </h3>
          <DataTable
            columns={colFinance}
            data={data?.transactions || []}
            loading={isLoading}
            searchable
            searchKeys={["cabang", "kategori", "keterangan", "referensi"]}
            pageSize={25}
          />
        </div>
      </div>
    </div>
  );
}
