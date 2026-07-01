import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, fetchAllRows } from "@/lib/supabase";
import { resolvePeriode, DEFAULT_PERIODE_START, CURRENT_PERIODE_VALUE } from "@/lib/periode";

function buildTrendMonths(endPeriode: string, count = 12): string[] {
  const [ey, em] = endPeriode.split("-").map(Number);
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(ey, em - 1 - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

/** Use latest month in range that has absensi when filter end month is empty (e.g. current July, data through June). */
async function resolveEffectiveEndPeriode(
  sb: ReturnType<typeof createServerSupabaseClient>,
  ps: string,
  pe: string
): Promise<string> {
  const { count, error } = await sb
    .from("absensi")
    .select("*", { count: "exact", head: true })
    .eq("periode", pe);
  if (error) throw new Error(error.message);
  if ((count ?? 0) > 0) return pe;

  const { data, error: err2 } = await sb
    .from("absensi")
    .select("periode")
    .gte("periode", ps)
    .lte("periode", pe)
    .order("periode", { ascending: false })
    .limit(1);
  if (err2) throw new Error(err2.message);
  return data?.[0]?.periode ?? pe;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ps = searchParams.get("periode_start") || DEFAULT_PERIODE_START;
  const pe = resolvePeriode(searchParams.get("periode_end") || CURRENT_PERIODE_VALUE);
  const cabangParam = searchParams.get("cabang") || "";
  const cabang = cabangParam ? cabangParam.split(",") : [];

  const sb = createServerSupabaseClient();
  try {
    const effectivePe = await resolveEffectiveEndPeriode(sb, ps, pe);
    const trendMonths = buildTrendMonths(effectivePe).filter((m) => m >= ps && m <= effectivePe);

    const [periodData, trendData, employeesRes] = await Promise.all([
      fetchAllRows<any>((from, to) => {
        let q = sb.from("absensi").select("*").eq("periode", effectivePe).range(from, to);
        if (cabang.length) q = q.in("cabang", cabang);
        return q;
      }),
      trendMonths.length
        ? fetchAllRows<any>((from, to) => {
            let q = sb.from("absensi").select("periode,hadir,sakit,izin,alfa").in("periode", trendMonths).range(from, to);
            if (cabang.length) q = q.in("cabang", cabang);
            return q;
          })
        : Promise.resolve([]),
      sb.from("employees").select("id", { count: "exact", head: true }).eq("status", "Aktif"),
    ]);

    const totalKaryawan = employeesRes.count ?? 0;

    // Summary — end period only
    const totalHadir = periodData.reduce((s, r) => s + (r.hadir || 0), 0);
    const totalHariKerja = periodData.reduce((s, r) => s + (r.total_hari_kerja || 0), 0);
    const avgKehadiran = totalHariKerja > 0 ? (totalHadir / totalHariKerja) * 100 : 0;
    const totalSakit = periodData.reduce((s, r) => s + (r.sakit || 0), 0);
    const totalAlfa = periodData.reduce((s, r) => s + (r.alfa || 0), 0);
    const totalTerlambat = periodData.reduce((s, r) => s + (r.terlambat || 0), 0);

    // Kehadiran per cabang — end period
    const cabangMap: Record<string, { hadir: number; total: number }> = {};
    periodData.forEach((r) => {
      if (!cabangMap[r.cabang]) cabangMap[r.cabang] = { hadir: 0, total: 0 };
      cabangMap[r.cabang].hadir += r.hadir || 0;
      cabangMap[r.cabang].total += r.total_hari_kerja || 0;
    });
    const kehadiranPerCabang = Object.entries(cabangMap)
      .map(([cabangName, v]) => ({
        cabang: cabangName,
        pct: v.total > 0 ? Math.round((v.hadir / v.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.pct - a.pct);

    // Monthly trend — last 12 months
    const monthlyMap: Record<string, { hadir: number; sakit: number; izin: number; alfa: number }> = {};
    trendMonths.forEach((m) => {
      monthlyMap[m] = { hadir: 0, sakit: 0, izin: 0, alfa: 0 };
    });
    trendData.forEach((r) => {
      if (!monthlyMap[r.periode]) return;
      monthlyMap[r.periode].hadir += r.hadir || 0;
      monthlyMap[r.periode].sakit += r.sakit || 0;
      monthlyMap[r.periode].izin += r.izin || 0;
      monthlyMap[r.periode].alfa += r.alfa || 0;
    });
    const trend = trendMonths.map((periode) => ({ periode, ...monthlyMap[periode] }));

    // Employee attendance table — end period, dedupe by employee_id
    const empMap: Record<string, any> = {};
    periodData.forEach((r) => {
      if (!empMap[r.employee_id]) {
        empMap[r.employee_id] = {
          employee_id: r.employee_id,
          nama: r.nama,
          cabang: r.cabang,
          jabatan: r.jabatan,
          hadir: 0,
          sakit: 0,
          izin: 0,
          alfa: 0,
          terlambat: 0,
          total: 0,
        };
      }
      empMap[r.employee_id].hadir += r.hadir || 0;
      empMap[r.employee_id].sakit += r.sakit || 0;
      empMap[r.employee_id].izin += r.izin || 0;
      empMap[r.employee_id].alfa += r.alfa || 0;
      empMap[r.employee_id].terlambat += r.terlambat || 0;
      empMap[r.employee_id].total += r.total_hari_kerja || 0;
    });
    const employeeList = Object.values(empMap)
      .map((e: any) => ({
        ...e,
        kehadiran_pct: e.total > 0 ? Math.round((e.hadir / e.total) * 1000) / 10 : 0,
      }))
      .sort((a: any, b: any) => a.kehadiran_pct - b.kehadiran_pct);

    // Birthdays this month from CRM owners
    const thisMonth = new Date().getMonth() + 1;
    const { data: crmOwners } = await sb
      .from("crm")
      .select("nama_owner, jabatan_owner, cabang_handler, tanggal_lahir_owner")
      .not("tanggal_lahir_owner", "is", null);

    const birthdays: any[] = [];
    (crmOwners || []).forEach((r) => {
      if (r.tanggal_lahir_owner) {
        const m = new Date(r.tanggal_lahir_owner).getMonth() + 1;
        if (m === thisMonth) {
          birthdays.push({
            nama: r.nama_owner,
            jabatan: r.jabatan_owner,
            cabang: r.cabang_handler,
            tanggal: r.tanggal_lahir_owner,
            type: "Client",
          });
        }
      }
    });

    return NextResponse.json({
      effectivePeriode: effectivePe,
      filterPeriodeEnd: pe,
      summary: {
        avgKehadiran: Math.round(avgKehadiran * 10) / 10,
        totalSakit,
        totalAlfa,
        totalTerlambat,
        totalKaryawan,
      },
      kehadiranPerCabang,
      trend,
      employeeList,
      birthdays,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
