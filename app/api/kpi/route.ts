import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { resolvePeriode, DEFAULT_PERIODE_START, CURRENT_PERIODE_VALUE } from "@/lib/periode";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ps = searchParams.get("periode_start") || DEFAULT_PERIODE_START;
  const pe = resolvePeriode(searchParams.get("periode_end") || CURRENT_PERIODE_VALUE);
  const cabangParam = searchParams.get("cabang") || "";
  const cabang = cabangParam ? cabangParam.split(",") : [];
  const dept = searchParams.get("departemen") || "";

  const sb = createServerSupabaseClient();
  try {
    const cabangArg = cabang.length > 0 ? cabang : null;
    const deptArg = dept || null;

    // 1. Summary via RPC
    const { data: summaryData } = await sb.rpc("get_kpi_summary", {
      p_start: ps, p_end: pe, p_cabang: cabangArg, p_dept: deptArg
    });
    const sumRow = summaryData?.[0] || {};
    
    const statusMap = {
      "Excellent": Number(sumRow.cnt_excellent || 0),
      "On Track": Number(sumRow.cnt_on_track || 0),
      "Warning": Number(sumRow.cnt_warning || 0),
      "Below Target": Number(sumRow.cnt_below_target || 0),
    };

    // 2. Heatmap via RPC
    const { data: heatmapRaw } = await sb.rpc("get_kpi_heatmap", {
      p_start: ps, p_end: pe, p_cabang: cabangArg, p_dept: deptArg
    });
    
    const heatmapMap: Record<string, Record<string, number>> = {};
    (heatmapRaw || []).forEach((r: any) => {
      if (!heatmapMap[r.cabang]) heatmapMap[r.cabang] = {};
      heatmapMap[r.cabang][r.periode] = Number(r.avg_achievement);
    });
    const heatmapData = Object.entries(heatmapMap).map(([cabang, months]) => ({
      cabang,
      months,
    }));

    // 3. Top 10 Performers (Current Period)
    let topQuery = sb.from("kpi").select("*").eq("periode", pe).order("achievement_pct", { ascending: false }).limit(10);
    if (cabang.length) topQuery = topQuery.in("cabang", cabang);
    if (dept) topQuery = topQuery.eq("departemen", dept);
    const { data: top10 } = await topQuery;

    // 4. All Data for Table (limit 1000 to avoid huge payload, aggregations are now safe)
    let q = sb.from("kpi").select("*").gte("periode", ps).lte("periode", pe).limit(1000);
    if (cabang.length) q = q.in("cabang", cabang);
    if (dept) q = q.eq("departemen", dept);
    const { data: allData } = await q;

    // 5. Distribution for Histogram via RPC
    const { data: distRaw } = await sb.rpc("get_kpi_distribution", {
      p_start: ps, p_end: pe, p_cabang: cabangArg, p_dept: deptArg
    });
    const distribution = distRaw || [];

    return NextResponse.json({
      summary: {
        avgAchievement: Math.round(Number(sumRow.avg_achievement || 0) * 10) / 10,
        statusDistribution: statusMap,
        totalEmployees: Number(sumRow.total_employees || 0),
      },
      heatmapData,
      distribution,
      top10: top10 || [],
      allData: allData || [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
