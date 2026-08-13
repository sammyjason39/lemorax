import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { resolvePeriode, DEFAULT_PERIODE_START, CURRENT_PERIODE_VALUE } from "@/lib/periode";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ps = searchParams.get("periode_start") || DEFAULT_PERIODE_START;
  const pe = resolvePeriode(searchParams.get("periode_end") || CURRENT_PERIODE_VALUE);
  const cabangParam = searchParams.get("cabang") || "";
  const cabang = cabangParam ? cabangParam.split(",") : [];
  const tipe = searchParams.get("tipe") || "";
  const status = searchParams.get("status") || "";
  const channel = searchParams.get("channel") || "";
  const page = parseInt(searchParams.get("page") || "0");
  const limit = parseInt(searchParams.get("limit") || "25");
  const sort = searchParams.get("sort") || "tanggal";
  const order = searchParams.get("order") || "desc";

  const sb = createServerSupabaseClient();
  try {
    const cabangArg = cabang.length > 0 ? cabang : null;
    const tipeArg = tipe || null;
    const channelArg = channel || null;

    // All aggregations done in DB via RPC to bypass 1000-row PostgREST limit

    // Summary totals
    const { data: summaryRaw } = await sb.rpc("get_sales_summary", {
      p_start: ps, p_end: pe, p_cabang: cabangArg,
    });
    const totalRevenue = Number(summaryRaw?.[0]?.total_revenue || 0);
    const totalTransactions = Number(summaryRaw?.[0]?.total_transactions || 0);

    // B2B / B2C breakdown via trend data
    const { data: trendRaw } = await sb.rpc("get_sales_monthly_trend", {
      p_start: ps, p_end: pe, p_cabang: cabangArg, p_tipe: tipeArg, p_channel: channelArg,
    });
    const monthlyTrend = (trendRaw || []).map((r: any) => ({
      periode: r.periode,
      total: Number(r.total),
      b2b: Number(r.b2b),
      b2c: Number(r.b2c),
    }));
    const b2bRevenue = monthlyTrend.reduce((s: number, r: any) => s + r.b2b, 0);
    const b2cRevenue = monthlyTrend.reduce((s: number, r: any) => s + r.b2c, 0);
    const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Top products
    const { data: productsRaw } = await sb.rpc("get_top_products", {
      p_start: ps, p_end: pe, p_cabang: cabangArg, p_limit: 10,
    });
    const topProducts = (productsRaw || []).map((r: any) => ({
      produk: r.produk, revenue: Number(r.revenue),
    }));

    // YoY data
    // Use full-year bounds so comparison years are not accidentally filtered out.
    // Example: selected range 2025-08..2026-04 still needs Jan-Apr 2024/2025
    // to compare against Jan-Apr 2026.
    const yoyStartYear = Math.min(Number(ps.slice(0, 4)) || 2024, 2024);
    const yoyEndYear = Math.max(Number(pe.slice(0, 4)) || 2026, 2026);
    const { data: yoyRaw } = await sb.rpc("get_sales_yoy", {
      p_start: `${yoyStartYear}-01`, p_end: `${yoyEndYear}-12`, p_cabang: cabangArg,
    });
    const yoyData = (yoyRaw || []).map((r: any) => ({
      month: r.month, "2024": Number(r.y2024), "2025": Number(r.y2025), "2026": Number(r.y2026),
    }));

    // Paginated transactions table (this one is OK with limit for display only)
    let q = sb.from("sales_report").select("*").gte("periode", ps).lte("periode", pe);
    if (cabang.length) q = q.in("cabang", cabang);
    if (tipe) q = q.eq("tipe", tipe);
    if (status) q = q.eq("status", status);
    if (channel) q = q.eq("channel", channel);
    const from = page * limit;
    const { data: transactions, count: txCount } = await (q as any)
      .order(sort, { ascending: order === "asc" })
      .range(from, from + limit - 1)
      .select("*", { count: "exact" });

    return NextResponse.json({
      summary: { totalRevenue, totalTransactions, avgOrderValue, b2bRevenue, b2cRevenue },
      monthlyTrend,
      topProducts,
      yoyData,
      transactions: transactions || [],
      total: txCount ?? 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
