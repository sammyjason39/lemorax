import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ps = searchParams.get("periode_start") || "2024-01";
  const pe = searchParams.get("periode_end") || "2026-04";
  const channelParam = searchParams.get("channel") || "";

  const sb = createServerSupabaseClient();
  try {
    let q = sb.from("marketing").select("*").gte("periode", ps).lte("periode", pe);
    if (channelParam) q = q.eq("channel", channelParam);
    const { data: all } = await q;
    const allData = all || [];

    const totalSpend = allData.reduce((s, r) => s + (r.spend || 0), 0);
    const totalRevenue = allData.reduce((s, r) => s + (r.revenue_generated || 0), 0);
    const totalConversions = allData.reduce((s, r) => s + (r.conversions || 0), 0);
    const avgROAS = allData.length ? allData.reduce((s, r) => s + (r.roas || 0), 0) / allData.length : 0;
    const avgCTR = allData.length ? allData.reduce((s, r) => s + (r.ctr_pct || 0), 0) / allData.length : 0;

    // ROAS per channel
    const channelMap: Record<string, { spend: number; revenue: number; roas_sum: number; count: number }> = {};
    allData.forEach((r) => {
      if (!channelMap[r.channel]) channelMap[r.channel] = { spend: 0, revenue: 0, roas_sum: 0, count: 0 };
      channelMap[r.channel].spend += r.spend || 0;
      channelMap[r.channel].revenue += r.revenue_generated || 0;
      channelMap[r.channel].roas_sum += r.roas || 0;
      channelMap[r.channel].count++;
    });
    const roasPerChannel = Object.entries(channelMap).map(([channel, v]) => ({
      channel, spend: v.spend, revenue: v.revenue,
      roas: v.count > 0 ? v.roas_sum / v.count : 0,
    })).sort((a, b) => b.roas - a.roas);

    // Monthly budget/spend/revenue
    const monthlyMap: Record<string, { budget: number; spend: number; revenue: number }> = {};
    allData.forEach((r) => {
      if (!monthlyMap[r.periode]) monthlyMap[r.periode] = { budget: 0, spend: 0, revenue: 0 };
      monthlyMap[r.periode].budget += r.budget || 0;
      monthlyMap[r.periode].spend += r.spend || 0;
      monthlyMap[r.periode].revenue += r.revenue_generated || 0;
    });
    const monthlyData = Object.entries(monthlyMap).sort(([a], [b]) => a.localeCompare(b))
      .map(([periode, v]) => ({ periode, ...v }));

    // CTR per channel per month
    const ctrMap: Record<string, Record<string, { total: number; count: number }>> = {};
    allData.forEach((r) => {
      if (!ctrMap[r.channel]) ctrMap[r.channel] = {};
      if (!ctrMap[r.channel][r.periode]) ctrMap[r.channel][r.periode] = { total: 0, count: 0 };
      ctrMap[r.channel][r.periode].total += r.ctr_pct || 0;
      ctrMap[r.channel][r.periode].count++;
    });

    // Scatter data (spend vs ROAS, bubble = revenue)
    const scatterData = allData.map((r) => ({
      campaign: r.campaign_name,
      spend: r.spend,
      roas: r.roas,
      revenue: r.revenue_generated,
      channel: r.channel,
    }));

    return NextResponse.json({
      summary: {
        totalSpend, totalRevenue, totalConversions,
        avgROAS: Math.round(avgROAS * 100) / 100,
        avgCTR: Math.round(avgCTR * 100) / 100,
      },
      roasPerChannel,
      monthlyData,
      ctrTrend: ctrMap,
      scatterData,
      campaigns: allData,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
