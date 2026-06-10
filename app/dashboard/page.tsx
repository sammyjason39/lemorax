"use client";

import useSWR from "swr";
import { useFilters } from "@/contexts/FilterContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/cards/MetricCard";
import { AlertCard } from "@/components/cards/AlertCard";
import { RevenueLineChart } from "@/components/charts/RevenueLineChart";
import { BranchBarChart } from "@/components/charts/BranchBarChart";
import { AriesPieChart } from "@/components/charts/PieChart";
import { formatRupiahShort, formatPct, getInitials, calcDelta } from "@/lib/formatters";
import { formatPeriodeFilter } from "@/lib/periode";
import { brand, getCategoricalColor } from "@/lib/brand";
import { TrendingUp, DollarSign, Activity, Users, Target, Handshake, AlertTriangle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function OverviewPage() {
  const { periodeStart, periodeEnd, cabang } = useFilters();
  const { t, language } = useLanguage();
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
      title: t("dash.revenue"),
      value: data ? formatRupiahShort(data.revenue) : "—",
      delta: data ? calcDelta(data.revenue, data.revenuePrev) : undefined,
      deltaLabel: t("dash.vs_last_month"),
      sparklineData: data?.revenueSparkline,
      sparklineColor: brand.blue,
      icon: <TrendingUp size={16} color={brand.blue} />,
    },
    {
      title: t("dash.expense"),
      value: data ? formatRupiahShort(data.expense) : "—",
      delta: data ? -calcDelta(data.expense, data.expensePrev) : undefined,
      deltaLabel: t("dash.vs_last_month"),
      sparklineData: data?.expenseSparkline,
      sparklineColor: brand.muted2,
      icon: <DollarSign size={16} color={brand.muted2} />,
    },
    {
      title: t("dash.profit"),
      value: data ? formatRupiahShort(data.netProfit) : "—",
      delta: data ? calcDelta(data.netProfit, data.netProfitPrev) : undefined,
      deltaLabel: t("dash.vs_last_month"),
      icon: <Activity size={16} color={brand.slate} />,
    },
    {
      title: t("dash.transactions"),
      value: data ? data.totalTransactions.toLocaleString("id-ID") : "—",
      delta: data ? calcDelta(data.totalTransactions, data.totalTransactionsPrev) : undefined,
      deltaLabel: t("dash.vs_last_month"),
      icon: <Users size={16} color={brand.muted} />,
    },
    {
      title: t("dash.kpi"),
      value: data ? formatPct(data.kpiAchievement) : "—",
      delta: data ? calcDelta(data.kpiAchievement, data.kpiAchievementPrev) : undefined,
      deltaLabel: t("dash.vs_last_month"),
      icon: <Target size={16} color={brand.muted} />,
    },
    {
      title: t("dash.deals"),
      value: data ? data.activeDeals.toString() : "—",
      delta: data ? calcDelta(data.activeDeals, data.activeDealsPrev) : undefined,
      deltaLabel: t("dash.vs_last_month"),
      icon: <Handshake size={16} color={brand.blue} />,
    },
  ];

  const pipelineChartData = (data?.pipelineDistribution || []).map((p: any) => ({
    name: p.status,
    value: p.count,
  }));

  const kpiChartData = (data?.kpiDistribution || []).map((k: any) => ({
    name: k.status,
    value: k.count,
  }));

  return (
    <div className="page-enter">
      <TopBar title={t("dash.title")} subtitle={t("dash.subtitle")} />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {metrics.map((m, i) => (
            <MetricCard key={i} {...m} loading={isLoading} />
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
          <div className="xl:col-span-2 card-base p-5 flex flex-col">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              {t("chart.rev_vs_exp")} ({periodeStart} — {formatPeriodeFilter(periodeEnd, language)})
            </h3>
            <div className="flex-1">
              <RevenueLineChart data={data?.revenueVsExpense || []} loading={isLoading} />
            </div>
          </div>
          <div className="card-base p-5 flex flex-col">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              {t("chart.rev_per_branch")}
            </h3>
            <div className="flex-1">
              <BranchBarChart data={data?.revenueByCabang || []} loading={isLoading} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card-base p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
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
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
                      style={{ background: getCategoricalColor(i, (data?.topSales || []).length) }}
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
                      style={{ color: brand.blue }}
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

          <div className="card-base p-5">
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              CRM Pipeline Status
            </h3>
            <AriesPieChart data={pipelineChartData} loading={isLoading} donut />
          </div>

          <div className="card-base p-5">
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              KPI Status Distribution
            </h3>
            <AriesPieChart data={kpiChartData} loading={isLoading} donut />
          </div>
        </div>

        {(data?.alerts?.length > 0 || isLoading) && (
          <div className="card-base p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={15} color={brand.warning} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
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
