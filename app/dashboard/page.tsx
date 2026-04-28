"use client";

import useSWR from "swr";
import { useFilters } from "@/contexts/FilterContext";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/cards/MetricCard";
import { AlertCard } from "@/components/cards/AlertCard";
import { RevenueLineChart } from "@/components/charts/RevenueLineChart";
import { BranchBarChart } from "@/components/charts/BranchBarChart";
import { LemoraxPieChart } from "@/components/charts/PieChart";
import { formatRupiahShort, formatRupiah, formatPct, getInitials, calcDelta } from "@/lib/formatters";
import { TrendingUp, DollarSign, Activity, Users, Target, Handshake, AlertTriangle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CRM_STATUS_COLORS: Record<string, string> = {
  "Closed Won": "#14B8A6",
  "Closed Lost": "#EF4444",
  Negotiation: "#3B82F6",
  Proposal: "#8B5CF6",
  Prospecting: "#F59E0B",
};

const KPI_STATUS_COLORS: Record<string, string> = {
  Excellent: "#14B8A6",
  "On Track": "#3B82F6",
  Warning: "#F59E0B",
  "Below Target": "#EF4444",
};

export default function OverviewPage() {
  const { periodeStart, periodeEnd, cabang } = useFilters();
  const params = new URLSearchParams({
    periode_start: periodeStart,
    periode_end: periodeEnd,
    ...(cabang.length ? { cabang: cabang.join(",") } : {}),
  });

  const { data, isLoading } = useSWR(`/api/dashboard/overview?${params}`, fetcher, {
    refreshInterval: 60000,
  });

  const metrics = [
    {
      title: "Total Revenue",
      value: data ? formatRupiahShort(data.revenue) : "—",
      delta: data ? calcDelta(data.revenue, data.revenuePrev) : undefined,
      deltaLabel: "vs bln lalu",
      sparklineData: data?.revenueSparkline,
      sparklineColor: "#14B8A6",
      icon: <TrendingUp size={16} color="#14B8A6" />,
    },
    {
      title: "Total Pengeluaran",
      value: data ? formatRupiahShort(data.expense) : "—",
      delta: data ? -calcDelta(data.expense, data.expensePrev) : undefined,
      deltaLabel: "vs bln lalu",
      sparklineData: data?.expenseSparkline,
      sparklineColor: "#EF4444",
      icon: <DollarSign size={16} color="#EF4444" />,
    },
    {
      title: "Net Profit",
      value: data ? formatRupiahShort(data.netProfit) : "—",
      delta: data ? calcDelta(data.netProfit, data.netProfitPrev) : undefined,
      deltaLabel: "vs bln lalu",
      icon: <Activity size={16} color="#3B82F6" />,
    },
    {
      title: "Total Transaksi",
      value: data ? data.totalTransactions.toLocaleString("id-ID") : "—",
      delta: data ? calcDelta(data.totalTransactions, data.totalTransactionsPrev) : undefined,
      deltaLabel: "vs bln lalu",
      icon: <Users size={16} color="#F59E0B" />,
    },
    {
      title: "KPI Achievement",
      value: data ? formatPct(data.kpiAchievement) : "—",
      delta: data ? calcDelta(data.kpiAchievement, data.kpiAchievementPrev) : undefined,
      deltaLabel: "vs bln lalu",
      icon: <Target size={16} color="#8B5CF6" />,
    },
    {
      title: "Active Deals",
      value: data ? data.activeDeals.toString() : "—",
      delta: data ? calcDelta(data.activeDeals, data.activeDealsPrev) : undefined,
      deltaLabel: "vs bln lalu",
      icon: <Handshake size={16} color="#06B6D4" />,
    },
  ];

  const pipelineChartData = (data?.pipelineDistribution || []).map((p: any) => ({
    name: p.status,
    value: p.count,
    color: CRM_STATUS_COLORS[p.status] || "#94A3B8",
  }));

  const kpiChartData = (data?.kpiDistribution || []).map((k: any) => ({
    name: k.status,
    value: k.count,
    color: KPI_STATUS_COLORS[k.status] || "#94A3B8",
  }));

  return (
    <div className="page-enter">
      <TopBar
        title="Executive Overview"
        subtitle="Ringkasan kondisi bisnis PT Lemorax"
      />

      <div className="p-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {metrics.map((m, i) => (
            <MetricCard key={i} {...m} loading={isLoading} />
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
          <div className="xl:col-span-2 card-base p-5 flex flex-col">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sora)" }}>
              Revenue vs Pengeluaran ({periodeStart} — {periodeEnd})
            </h3>
            <div className="flex-1">
              <RevenueLineChart data={data?.revenueVsExpense || []} loading={isLoading} />
            </div>
          </div>
          <div className="card-base p-5 flex flex-col">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sora)" }}>
              Revenue per Cabang
            </h3>
            <div className="flex-1">
              <BranchBarChart data={data?.revenueByCabang || []} loading={isLoading} />
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top Sales */}
          <div className="card-base p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sora)" }}>
              Top 5 Sales Performer
            </h3>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
              </div>
            ) : (
              <div className="space-y-2.5">
                {(data?.topSales || []).map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${["#14B8A6","#3B82F6","#8B5CF6","#F59E0B","#EF4444"][i]}, ${["#0E9484","#2563EB","#7C3AED","#D97706","#DC2626"][i]})`,
                        color: "white",
                      }}
                    >
                      {getInitials(s.sales_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {s.sales_name}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {s.cabang}
                      </p>
                    </div>
                    <span
                      className="text-xs font-semibold shrink-0"
                      style={{ fontFamily: "var(--font-jetbrains-mono)", color: "#14B8A6" }}
                    >
                      {formatRupiahShort(s.total)}
                    </span>
                  </div>
                ))}
                {!data?.topSales?.length && (
                  <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Belum ada data sales</p>
                )}
              </div>
            )}
          </div>

          {/* Pipeline Pie */}
          <div className="card-base p-5">
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sora)" }}>
              CRM Pipeline Status
            </h3>
            <LemoraxPieChart data={pipelineChartData} loading={isLoading} donut />
          </div>

          {/* KPI Distribution */}
          <div className="card-base p-5">
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sora)" }}>
              KPI Status Distribution
            </h3>
            <LemoraxPieChart data={kpiChartData} loading={isLoading} donut />
          </div>
        </div>

        {/* Alerts Section */}
        {(data?.alerts?.length > 0 || isLoading) && (
          <div className="card-base p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={15} color="#F59E0B" />
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sora)" }}>
                Perlu Perhatian
              </h3>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {data.alerts.map((alert: any, i: number) => (
                  <AlertCard key={i} {...alert} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
