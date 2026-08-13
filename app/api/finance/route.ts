import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { resolvePeriode, DEFAULT_PERIODE_START, CURRENT_PERIODE_VALUE } from "@/lib/periode";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ps = searchParams.get("periode_start") || DEFAULT_PERIODE_START;
  const pe = resolvePeriode(searchParams.get("periode_end") || CURRENT_PERIODE_VALUE);
  const cabangParam = searchParams.get("cabang") || "";
  const cabang = cabangParam ? cabangParam.split(",") : [];

  const sb = createServerSupabaseClient();
  try {
    let q = sb.from("finance").select("*").gte("periode", ps).lte("periode", pe).limit(10000);
    if (cabang.length) q = q.in("cabang", cabang);
    const { data: all } = await q;
    const allData = all || [];

    // Keep selected-range data for the current view, but use full-year data for
    // YoY/annual comparisons so a range like 2025-08..2026-04 does not zero out
    // Jan-Apr 2024/2025 comparison months.
    const yoyStartYear = Math.min(Number(ps.slice(0, 4)) || 2024, 2024);
    const yoyEndYear = Math.max(Number(pe.slice(0, 4)) || 2026, 2026);
    let yoyQ = sb.from("finance").select("*")
      .gte("periode", `${yoyStartYear}-01`)
      .lte("periode", `${yoyEndYear}-12`)
      .limit(30000);
    if (cabang.length) yoyQ = yoyQ.in("cabang", cabang);
    const { data: yoyRows } = await yoyQ;
    const comparisonData = yoyRows || [];

    const income = allData.filter((r) => r.tipe === "Pemasukan");
    const expense = allData.filter((r) => r.tipe === "Pengeluaran");
    const totalIncome = income.reduce((s, r) => s + (r.jumlah || 0), 0);
    const totalExpense = expense.reduce((s, r) => s + (r.jumlah || 0), 0);
    const netProfit = totalIncome - totalExpense;
    const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    // Monthly P&L
    const monthlyMap: Record<string, { revenue: number; expense: number }> = {};
    allData.forEach((r) => {
      if (!monthlyMap[r.periode]) monthlyMap[r.periode] = { revenue: 0, expense: 0 };
      if (r.tipe === "Pemasukan") monthlyMap[r.periode].revenue += r.jumlah || 0;
      else monthlyMap[r.periode].expense += r.jumlah || 0;
    });
    const monthlyPL = Object.entries(monthlyMap).sort(([a], [b]) => a.localeCompare(b))
      .map(([periode, v]) => ({ periode, ...v, net: v.revenue - v.expense }));

    // Expense by category
    const catMap: Record<string, number> = {};
    expense.forEach((r) => { catMap[r.kategori] = (catMap[r.kategori] || 0) + (r.jumlah || 0); });
    const expenseByCategory = Object.entries(catMap).map(([name, value]) => ({ name, value }));

    // Cabang YoY
    const cabangYoY: Record<string, { "2024": number; "2025": number; "2026": number }> = {};
    comparisonData.filter((r) => r.tipe === "Pemasukan").forEach((r) => {
      const year = r.periode.slice(0, 4);
      if (!cabangYoY[r.cabang]) cabangYoY[r.cabang] = { "2024": 0, "2025": 0, "2026": 0 };
      if (["2024","2025","2026"].includes(year)) (cabangYoY[r.cabang] as any)[year] += r.jumlah || 0;
    });
    const cabangRevYoY = Object.entries(cabangYoY).map(([cabang, v]) => ({ cabang, ...v }));

    // Most profitable cabang
    const cabangNetMap: Record<string, number> = {};
    allData.forEach((r) => {
      if (!cabangNetMap[r.cabang]) cabangNetMap[r.cabang] = 0;
      cabangNetMap[r.cabang] += r.tipe === "Pemasukan" ? (r.jumlah || 0) : -(r.jumlah || 0);
    });
    const topCabang = Object.entries(cabangNetMap).sort(([,a],[,b]) => b - a)[0]?.[0] || "-";

    // Annual summary
    const annualSummary = ["2024","2025","2026"].map((year) => {
      const rows = comparisonData.filter((r) => r.periode.startsWith(year));
      const rev = rows.filter((r) => r.tipe === "Pemasukan").reduce((s, r) => s + (r.jumlah || 0), 0);
      const exp = rows.filter((r) => r.tipe === "Pengeluaran").reduce((s, r) => s + (r.jumlah || 0), 0);
      return { year, revenue: rev, expense: exp, net: rev - exp, margin: rev > 0 ? ((rev - exp) / rev) * 100 : 0 };
    });

    return NextResponse.json({
      summary: { totalIncome, totalExpense, netProfit, margin: Math.round(margin * 10) / 10, topCabang },
      monthlyPL,
      expenseByCategory,
      cabangRevYoY,
      transactions: allData,
      annualSummary,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
