import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { resolvePeriode, DEFAULT_PERIODE_START, CURRENT_PERIODE_VALUE } from "@/lib/periode";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ps = searchParams.get("periode_start") || DEFAULT_PERIODE_START;
  const pe = resolvePeriode(searchParams.get("periode_end") || CURRENT_PERIODE_VALUE);
  const cabangParam = searchParams.get("cabang") || "";
  const cabang = cabangParam ? cabangParam.split(",") : [];
  const statusParam = searchParams.get("status") || "";
  const tipeParam = searchParams.get("tipe") || "";

  const sb = createServerSupabaseClient();
  try {
    let q = sb.from("crm").select("*");
    if (cabang.length) q = q.in("cabang_handler", cabang);
    if (statusParam) q = q.eq("status", statusParam);
    if (tipeParam) q = q.eq("tipe_bisnis", tipeParam);
    const { data: all } = await q;
    const allData = all || [];

    // Filter by periode if tanggal_closed or periode field
    const periodFiltered = allData.filter((r) => {
      if (r.periode) return r.periode >= ps && r.periode <= pe;
      return true;
    });

    // Pipeline summary (all active)
    const active = allData.filter((r) => !["Closed Won","Closed Lost"].includes(r.status));
    const totalPipeline = active.reduce((s, r) => s + (r.nilai_deal || 0), 0);

    const closedWon = allData.filter((r) => r.status === "Closed Won");
    const closedLost = allData.filter((r) => r.status === "Closed Lost");
    const totalWon = closedWon.reduce((s, r) => s + (r.nilai_deal || 0), 0);
    const totalLost = closedLost.reduce((s, r) => s + (r.nilai_deal || 0), 0);
    const winRate = (closedWon.length + closedLost.length) > 0
      ? (closedWon.length / (closedWon.length + closedLost.length)) * 100
      : 0;
    const avgDeal = allData.length > 0 ? allData.reduce((s, r) => s + (r.nilai_deal || 0), 0) / allData.length : 0;

    // Monthly Closed Won
    const wonMonthly: Record<string, { value: number; count: number }> = {};
    closedWon.forEach((r) => {
      const m = r.tanggal_closed ? r.tanggal_closed.slice(0, 7) : r.periode;
      if (!m) return;
      if (!wonMonthly[m]) wonMonthly[m] = { value: 0, count: 0 };
      wonMonthly[m].value += r.nilai_deal || 0;
      wonMonthly[m].count++;
    });
    const wonTrend = Object.entries(wonMonthly).sort(([a], [b]) => a.localeCompare(b))
      .map(([periode, v]) => ({ periode, ...v }));

    // By tipe bisnis
    const tipeMap: Record<string, number> = {};
    closedWon.forEach((r) => { tipeMap[r.tipe_bisnis] = (tipeMap[r.tipe_bisnis] || 0) + (r.nilai_deal || 0); });
    const tipeBreakdown = Object.entries(tipeMap).map(([name, value]) => ({ name, value }));

    // Top AMs
    const amMap: Record<string, { am: string; value: number; count: number }> = {};
    closedWon.forEach((r) => {
      if (!amMap[r.am_employee_id]) amMap[r.am_employee_id] = { am: r.account_manager, value: 0, count: 0 };
      amMap[r.am_employee_id].value += r.nilai_deal || 0;
      amMap[r.am_employee_id].count++;
    });
    const topAMs = Object.values(amMap).sort((a, b) => b.value - a.value).slice(0, 10);

    // Stale deals (follow up > 14 days)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const staleDeals = allData.filter((r) =>
      !["Closed Won","Closed Lost"].includes(r.status) &&
      r.last_follow_up && new Date(r.last_follow_up) < twoWeeksAgo
    );

    // Funnel stages
    const stageOrder = ["Prospecting","Proposal","Negotiation","Closed Won"];
    const funnelData = stageOrder.map((stage) => {
      const rows = allData.filter((r) => r.status === stage);
      return { stage, count: rows.length, value: rows.reduce((s, r) => s + (r.nilai_deal || 0), 0) };
    });

    return NextResponse.json({
      summary: { totalPipeline, totalWon, totalLost, winRate: Math.round(winRate * 10) / 10, avgDeal, activeDeals: active.length },
      wonTrend,
      tipeBreakdown,
      topAMs,
      deals: allData,
      staleDeals,
      funnelData,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
