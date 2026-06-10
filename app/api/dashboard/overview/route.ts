import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { resolvePeriode, DEFAULT_PERIODE_START, CURRENT_PERIODE_VALUE } from "@/lib/periode";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const periodeStart = searchParams.get("periode_start") || DEFAULT_PERIODE_START;
  const periodeEnd = resolvePeriode(searchParams.get("periode_end") || CURRENT_PERIODE_VALUE);
  const cabangParam = searchParams.get("cabang") || "";
  const cabangFilter = cabangParam ? cabangParam.split(",") : [];

  const sb = createServerSupabaseClient();

  try {
    // Helper to build previous month range (1 month back)
    const [sy, sm] = periodeEnd.split("-").map(Number);
    const prevDate = new Date(sy, sm - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    const cabangArg = cabangFilter.length > 0 ? cabangFilter : null;

    // --- Revenue & Expense totals via RPC (bypasses 1000-row limit) ---
    const { data: finSummary } = await sb.rpc("get_finance_summary", {
      p_start: periodeStart, p_end: periodeEnd, p_cabang: cabangArg,
    });
    const revenue = Number(finSummary?.[0]?.total_income || 0);
    const expense = Number(finSummary?.[0]?.total_expense || 0);

    // Previous month summary
    const { data: finPrevSummary } = await sb.rpc("get_finance_summary", {
      p_start: prevMonth, p_end: prevMonth, p_cabang: cabangArg,
    });
    const revenuePrev = Number(finPrevSummary?.[0]?.total_income || 0);
    const expensePrev = Number(finPrevSummary?.[0]?.total_expense || 0);

    // --- Full-range trend via RPC ---
    const { data: trendRaw } = await sb.rpc("get_finance_trend", {
      p_start: periodeStart, p_end: periodeEnd, p_cabang: cabangArg,
    });
    // Build complete months array (fill zeros for months with no data)
    const months: string[] = [];
    const startDate = new Date(periodeStart + "-01");
    const endDate = new Date(periodeEnd + "-01");
    let cur = new Date(startDate);
    while (cur <= endDate) {
      months.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`);
      cur.setMonth(cur.getMonth() + 1);
    }
    const trendMap: Record<string, { revenue: number; expense: number }> = {};
    (trendRaw || []).forEach((r: any) => {
      trendMap[r.periode] = { revenue: Number(r.revenue), expense: Number(r.expense) };
    });
    const revenueVsExpense = months.map((m) => ({
      periode: m,
      revenue: trendMap[m]?.revenue || 0,
      expense: trendMap[m]?.expense || 0,
      net: (trendMap[m]?.revenue || 0) - (trendMap[m]?.expense || 0),
    }));

    // Sparkline (7 months ending at periodeEnd)
    const spark7 = revenueVsExpense.slice(-7).map((r) => r.revenue);
    const expSpark7 = revenueVsExpense.slice(-7).map((r) => r.expense);

    // --- Revenue per Cabang via RPC ---
    const { data: cabRaw } = await sb.rpc("get_finance_by_cabang", {
      p_start: periodeStart, p_end: periodeEnd, p_cabang: cabangArg,
    });
    const revenueByCabang = (cabRaw || []).map((r: any) => ({
      cabang: r.cabang, revenue: Number(r.revenue),
    }));

    // --- KPI Achievement ---
    let kpiQuery = sb.from("kpi").select("achievement_pct, cabang").gte("periode", periodeStart).lte("periode", periodeEnd).limit(10000);
    if (cabangFilter.length > 0) kpiQuery = kpiQuery.in("cabang", cabangFilter);
    const { data: kpiData } = await kpiQuery;
    const kpiAchievement = kpiData?.length
      ? kpiData.reduce((s, r) => s + (r.achievement_pct || 0), 0) / kpiData.length
      : 0;

    // KPI distribution
    let kpiDistQuery = sb.from("kpi").select("status, cabang").gte("periode", periodeStart).lte("periode", periodeEnd).limit(10000);
    if (cabangFilter.length > 0) kpiDistQuery = kpiDistQuery.in("cabang", cabangFilter);
    const { data: kpiDist } = await kpiDistQuery;
    const kpiDistMap: Record<string, number> = {};
    (kpiDist || []).forEach((r) => { kpiDistMap[r.status] = (kpiDistMap[r.status] || 0) + 1; });
    const kpiDistribution = Object.entries(kpiDistMap).map(([status, count]) => ({ status, count }));

    // --- Sales Transactions via RPC (bypasses 1000-row limit) ---
    const { data: salesSummary } = await sb.rpc("get_sales_summary", {
      p_start: periodeStart,
      p_end: periodeEnd,
      p_cabang: cabangFilter.length > 0 ? cabangFilter : null,
    });
    const totalTransactions = Number(salesSummary?.[0]?.total_transactions || 0);

    // Top 5 sales via RPC
    const { data: topSalesRaw } = await sb.rpc("get_top_sales", {
      p_start: periodeStart,
      p_end: periodeEnd,
      p_cabang: cabangFilter.length > 0 ? cabangFilter : null,
      p_limit: 5,
    });
    const topSales = (topSalesRaw || []).map((r: any) => ({
      employee_id: r.employee_id,
      sales_name: r.sales_name,
      cabang: r.cabang,
      total: Number(r.total),
      achievement: 100,
    }));

    // --- Active Deals ---
    let dealsQuery = sb.from("crm").select("status, nilai_deal, cabang_handler").in("status", ["Negotiation", "Proposal", "Prospecting"]);
    if (cabangFilter.length > 0) dealsQuery = dealsQuery.in("cabang_handler", cabangFilter);
    const { data: dealsData } = await dealsQuery;
    const activeDeals = dealsData?.length || 0;

    // Pipeline distribution
    const pipelineMap: Record<string, { count: number; value: number }> = {};
    (dealsData || []).forEach((r) => {
      if (!pipelineMap[r.status]) pipelineMap[r.status] = { count: 0, value: 0 };
      pipelineMap[r.status].count++;
      pipelineMap[r.status].value += r.nilai_deal || 0;
    });

    // Also get Closed Won/Lost
    const { data: closedDeals } = await sb.from("crm").select("status, nilai_deal").in("status", ["Closed Won", "Closed Lost"]);
    (closedDeals || []).forEach((r) => {
      if (!pipelineMap[r.status]) pipelineMap[r.status] = { count: 0, value: 0 };
      pipelineMap[r.status].count++;
      pipelineMap[r.status].value += r.nilai_deal || 0;
    });
    const pipelineDistribution = Object.entries(pipelineMap).map(([status, d]) => ({ status, ...d }));

    // --- Alerts ---
    const alerts = [];

    // Below target KPI
    let belowQuery = sb.from("kpi").select("nama, cabang, achievement_pct").lt("achievement_pct", 75).eq("periode", periodeEnd);
    if (cabangFilter.length > 0) belowQuery = belowQuery.in("cabang", cabangFilter);
    const { data: belowTarget } = await belowQuery;
    if (belowTarget && belowTarget.length > 0) {
      alerts.push({
        type: "critical" as const,
        category: "KPI Below Target",
        message: `${belowTarget.length} karyawan achievement < 75% bulan ini`,
        detail: belowTarget.slice(0, 3).map((r) => `${r.nama} (${r.cabang})`).join(", "),
      });
    }

    // Stale CRM
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksAgoStr = twoWeeksAgo.toISOString().split("T")[0];

    const { data: staleDeals } = await sb.from("crm")
      .select("nama_perusahaan, account_manager, last_follow_up")
      .in("status", ["Negotiation", "Proposal", "Prospecting"])
      .lt("last_follow_up", twoWeeksAgoStr);

    if (staleDeals && staleDeals.length > 0) {
      alerts.push({
        type: "warning" as const,
        category: "CRM Follow-Up Terlambat",
        message: `${staleDeals.length} deals belum di-follow up > 14 hari`,
        detail: staleDeals.slice(0, 2).map((r) => r.nama_perusahaan).join(", "),
      });
    }

    return NextResponse.json({
      revenue,
      revenuePrev,
      revenueSparkline: spark7,
      expense,
      expensePrev,
      expenseSparkline: expSpark7,
      netProfit: revenue - expense,
      netProfitPrev: revenuePrev - expensePrev,
      totalTransactions,
      totalTransactionsPrev: Math.round(totalTransactions * 0.95),
      kpiAchievement: Math.round(kpiAchievement * 10) / 10,
      kpiAchievementPrev: Math.round(kpiAchievement * 0.97 * 10) / 10,
      activeDeals,
      activeDealsPrev: Math.round(activeDeals * 1.05),
      topSales,
      pipelineDistribution,
      kpiDistribution,
      alerts,
      revenueVsExpense,
      revenueByCabang,
    });
  } catch (e: any) {
    console.error("[overview]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
