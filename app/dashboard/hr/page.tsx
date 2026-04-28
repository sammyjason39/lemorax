"use client";

import useSWR from "swr";
import { useFilters } from "@/contexts/FilterContext";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/cards/MetricCard";
import { DataTable } from "@/components/tables/DataTable";
import { formatPct, formatDateID } from "@/lib/formatters";
import { Gift, Calendar } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, Cell
} from "recharts";
import { formatPeriode } from "@/lib/formatters";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CABANG_COLORS = ["#14B8A6","#3B82F6","#8B5CF6","#F59E0B","#EF4444","#06B6D4","#10B981","#F97316","#EC4899","#6366F1","#84CC16","#0EA5E9"];

export default function HRPage() {
  const { periodeStart, periodeEnd, cabang } = useFilters();
  const params = new URLSearchParams({
    periode_start: periodeStart, periode_end: periodeEnd,
    ...(cabang.length ? { cabang: cabang.join(",") } : {}),
  });

  const { data, isLoading } = useSWR(`/api/hr?${params}`, fetcher, { refreshInterval: 60000 });

  const metrics = [
    { title: "Total Karyawan Aktif", value: data ? data.summary?.totalKaryawan.toString() : "—" },
    { title: "Rata-rata Kehadiran", value: data ? formatPct(data.summary?.avgKehadiran) : "—" },
    { title: "Total Hari Sakit", value: data ? data.summary?.totalSakit.toLocaleString("id-ID") : "—" },
    { title: "Total Alfa", value: data ? data.summary?.totalAlfa.toLocaleString("id-ID") : "—" },
    { title: "Total Keterlambatan", value: data ? data.summary?.totalTerlambat.toLocaleString("id-ID") : "—" },
  ];

  const columns = [
    { key: "employee_id", label: "ID", width: "90px" },
    { key: "nama", label: "Nama", sortable: true },
    { key: "cabang", label: "Cabang" },
    { key: "jabatan", label: "Jabatan" },
    { key: "hadir", label: "Hadir", align: "right" as const, sortable: true },
    { key: "sakit", label: "Sakit", align: "right" as const, sortable: true },
    { key: "izin", label: "Izin", align: "right" as const, sortable: true },
    { key: "alfa", label: "Alfa", align: "right" as const, sortable: true },
    { key: "terlambat", label: "Terlambat", align: "right" as const, sortable: true },
    {
      key: "kehadiran_pct", label: "Kehadiran %", sortable: true, align: "right" as const,
      render: (r: any) => (
        <span style={{ fontFamily: "var(--font-jetbrains-mono)", color: (r.kehadiran_pct || 0) >= 90 ? "#14B8A6" : (r.kehadiran_pct || 0) >= 75 ? "#F59E0B" : "#EF4444" }}>
          {formatPct(r.kehadiran_pct)}
        </span>
      )
    },
  ];

  return (
    <div className="page-enter">
      <TopBar title="HR & Absensi" subtitle="Monitoring kehadiran dan disiplin karyawan" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {metrics.map((m, i) => <MetricCard key={i} {...m} loading={isLoading} />)}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Kehadiran per Cabang */}
          <div className="card-base p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sora)" }}>
              Kehadiran per Cabang
            </h3>
            {isLoading ? <div className="skeleton h-56 rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[...(data?.kehadiranPerCabang || [])].sort((a: any, b: any) => b.pct - a.pct)} layout="vertical" margin={{ top: 0, right: 60, left: 10, bottom: 0 }}>
                  <XAxis type="number" domain={[0,100]} tickFormatter={(v) => `${v}%`} tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="cabang" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Kehadiran"]} contentStyle={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }} />
                  <Bar dataKey="pct" radius={[0,4,4,0]} maxBarSize={20}>
                    {(data?.kehadiranPerCabang || []).map((_: any, i: number) => (
                      <Cell key={i} fill={CABANG_COLORS[i % CABANG_COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Absensi Trend */}
          <div className="card-base p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sora)" }}>
              Tren Absensi (12 Bulan)
            </h3>
            {isLoading ? <div className="skeleton h-56 rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data?.trend || []} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                  <defs>
                    {[["hadir","#14B8A6"],["sakit","#3B82F6"],["izin","#F59E0B"],["alfa","#EF4444"]].map(([key, color]) => (
                      <linearGradient key={key} id={`g-${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,42,61,0.8)" vertical={false} />
                  <XAxis dataKey="periode" tickFormatter={formatPeriode} tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }} />
                  {[["hadir","#14B8A6"],["sakit","#3B82F6"],["izin","#F59E0B"],["alfa","#EF4444"]].map(([key, color]) => (
                    <Area key={key} type="monotone" dataKey={key} name={key.charAt(0).toUpperCase()+key.slice(1)} stroke={color} strokeWidth={1.5} fill={`url(#g-${key})`} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Birthday Card */}
        {(data?.birthdays?.length > 0 || isLoading) && (
          <div className="card-base p-5">
            <div className="flex items-center gap-2 mb-4">
              <Gift size={15} color="#F59E0B" />
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sora)" }}>
                Ulang Tahun Bulan Ini
              </h3>
            </div>
            {isLoading ? <div className="skeleton h-16 rounded-xl" /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(data?.birthdays || []).map((b: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.2)" }}>
                      <Gift size={14} color="#F59E0B" />
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{b.nama}</p>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{b.jabatan} · {b.cabang}</p>
                      <p className="text-[11px]" style={{ color: "#F59E0B" }}>{formatDateID(b.tanggal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Attendance Table */}
        <div className="card-base p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sora)" }}>
            Detail Kehadiran Karyawan
          </h3>
          <DataTable
            columns={columns}
            data={data?.employeeList || []}
            loading={isLoading}
            searchable
            searchKeys={["nama", "cabang", "jabatan"]}
            pageSize={25}
            getRowStyle={(r) => (r.kehadiran_pct || 0) < 75 ? { background: "rgba(239,68,68,0.04)" } : {}}
          />
        </div>
      </div>
    </div>
  );
}
