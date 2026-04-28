import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ps = searchParams.get("periode_start") || "2024-01";
  const pe = searchParams.get("periode_end") || "2026-04";
  const cabangParam = searchParams.get("cabang") || "";
  const cabang = cabangParam ? cabangParam.split(",") : [];

  const sb = createServerSupabaseClient();
  try {
    let q = sb.from("absensi").select("*").gte("periode", ps).lte("periode", pe).limit(30000);
    if (cabang.length) q = q.in("cabang", cabang);
    const { data: all } = await q;
    const allData = all || [];

    // Summary
    const totalHadir = allData.reduce((s, r) => s + (r.hadir || 0), 0);
    const totalHariKerja = allData.reduce((s, r) => s + (r.total_hari_kerja || 0), 0);
    const avgKehadiran = totalHariKerja > 0 ? (totalHadir / totalHariKerja) * 100 : 0;
    const totalSakit = allData.reduce((s, r) => s + (r.sakit || 0), 0);
    const totalAlfa = allData.reduce((s, r) => s + (r.alfa || 0), 0);
    const totalTerlambat = allData.reduce((s, r) => s + (r.terlambat || 0), 0);

    // Per cabang (last period)
    const cabangMap: Record<string, { hadir: number; total: number }> = {};
    allData.filter((r) => r.periode === pe).forEach((r) => {
      if (!cabangMap[r.cabang]) cabangMap[r.cabang] = { hadir: 0, total: 0 };
      cabangMap[r.cabang].hadir += r.hadir || 0;
      cabangMap[r.cabang].total += r.total_hari_kerja || 0;
    });
    const kehadiranPerCabang = Object.entries(cabangMap).map(([cabang, v]) => ({
      cabang,
      pct: v.total > 0 ? (v.hadir / v.total) * 100 : 0,
    }));

    // Monthly trend
    const monthlyMap: Record<string, { hadir: number; sakit: number; izin: number; alfa: number }> = {};
    allData.forEach((r) => {
      if (!monthlyMap[r.periode]) monthlyMap[r.periode] = { hadir: 0, sakit: 0, izin: 0, alfa: 0 };
      monthlyMap[r.periode].hadir += r.hadir || 0;
      monthlyMap[r.periode].sakit += r.sakit || 0;
      monthlyMap[r.periode].izin += r.izin || 0;
      monthlyMap[r.periode].alfa += r.alfa || 0;
    });
    const trend = Object.entries(monthlyMap).sort(([a], [b]) => a.localeCompare(b))
      .map(([periode, v]) => ({ periode, ...v }));

    // Employee attendance table (last period)
    const empMap: Record<string, any> = {};
    allData.filter((r) => r.periode === pe).forEach((r) => {
      if (!empMap[r.employee_id]) {
        empMap[r.employee_id] = { employee_id: r.employee_id, nama: r.nama, cabang: r.cabang, jabatan: r.jabatan, hadir: 0, sakit: 0, izin: 0, alfa: 0, terlambat: 0, total: 0 };
      }
      empMap[r.employee_id].hadir += r.hadir || 0;
      empMap[r.employee_id].sakit += r.sakit || 0;
      empMap[r.employee_id].izin += r.izin || 0;
      empMap[r.employee_id].alfa += r.alfa || 0;
      empMap[r.employee_id].terlambat += r.terlambat || 0;
      empMap[r.employee_id].total += r.total_hari_kerja || 0;
    });
    const employeeList = Object.values(empMap).map((e: any) => ({
      ...e,
      kehadiran_pct: e.total > 0 ? (e.hadir / e.total) * 100 : 0,
    })).sort((a: any, b: any) => a.kehadiran_pct - b.kehadiran_pct);

    // Birthdays this month from employees
    const thisMonth = new Date().getMonth() + 1;
    const { data: employees } = await sb.from("employees").select("nama_lengkap, jabatan, cabang, tanggal_bergabung");
    // Birthday from CRM owners
    const { data: crmOwners } = await sb.from("crm").select("nama_owner, jabatan_owner, cabang_handler, tanggal_lahir_owner")
      .not("tanggal_lahir_owner", "is", null);

    const birthdays: any[] = [];
    (crmOwners || []).forEach((r) => {
      if (r.tanggal_lahir_owner) {
        const m = new Date(r.tanggal_lahir_owner).getMonth() + 1;
        if (m === thisMonth) {
          birthdays.push({ nama: r.nama_owner, jabatan: r.jabatan_owner, cabang: r.cabang_handler, tanggal: r.tanggal_lahir_owner, type: "Client" });
        }
      }
    });

    return NextResponse.json({
      summary: { avgKehadiran: Math.round(avgKehadiran * 10) / 10, totalSakit, totalAlfa, totalTerlambat, totalKaryawan: Object.keys(empMap).length },
      kehadiranPerCabang,
      trend,
      employeeList,
      birthdays,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
