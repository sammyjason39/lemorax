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
  AreaChart, Area, Cell, LabelList
} from "recharts";
import { formatPeriode } from "@/lib/formatters";
import { CHART_PRIMARY, CHART_SECONDARY, CHART_AXIS, CHART_GRID, ATTENDANCE_COLORS, getKehadiranBarColor } from "@/lib/brand";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function HRPage() {
  const { periodeStart, periodeEnd, cabang } = useFilters();
  const params = new URLSearchParams({
    periode_start: periodeStart, periode_end: periodeEnd,
    ...(cabang.length ? { cabang: cabang.join(",") } : {}),
  });

  const { data, isLoading } = useSWR(`/api/hr?${params}`, fetcher, { refreshInterval: 60000 });

  const kehadiranPerCabang = [...(data?.kehadiranPerCabang || [])].sort(
    (a: { pct: number }, b: { pct: number }) => b.pct - a.pct
  );

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
        <span style={{ color: (r.kehadiran_pct || 0) >= 90 ? CHART_PRIMARY : (r.kehadiran_pct || 0) >= 75 ? CHART_SECONDARY : CHART_AXIS }}>
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
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Kehadiran per Cabang
            </h3>
            {data?.effectivePeriode && data?.filterPeriodeEnd && data.effectivePeriode !== data.filterPeriodeEnd ? (
              <p className="text-[11px] mt-1 mb-3" style={{ color: "var(--text-muted)" }}>
                Menampilkan data {formatPeriode(data.effectivePeriode)} (belum ada data {formatPeriode(data.filterPeriodeEnd)})
              </p>
            ) : (
              <div className="mb-4" />
            )}
            {isLoading ? <div className="skeleton h-56 rounded-xl" /> : kehadiranPerCabang.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
                Belum ada data absensi untuk periode filter ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, kehadiranPerCabang.length * 36)}>
                <BarChart data={kehadiranPerCabang} layout="vertical" margin={{ top: 0, right: 56, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: CHART_AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="cabang" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} width={108} />
                  <Tooltip formatter={(v: number) => [`${Number(v).toFixed(1)}%`, "Kehadiran"]} contentStyle={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }} />
                  <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {kehadiranPerCabang.map((row: { pct: number }, i: number) => (
                      <Cell key={i} fill={getKehadiranBarColor(row.pct)} fillOpacity={0.95} />
                    ))}
                    <LabelList dataKey="pct" position="right" formatter={(v: number) => `${v}%`} style={{ fill: CHART_AXIS, fontSize: 11 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Absensi Trend */}
          <div className="card-base p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              Tren Absensi (12 Bulan)
            </h3>
            {isLoading ? <div className="skeleton h-56 rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data?.trend || []} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                  <defs>
                    {Object.entries(ATTENDANCE_COLORS).map(([key, color]) => (
                      <linearGradient key={key} id={`g-${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="periode" tickFormatter={formatPeriode} tick={{ fill: CHART_AXIS, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: CHART_AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }} />
                  {Object.entries(ATTENDANCE_COLORS).map(([key, color]) => (
                    <Area key={key} type="monotone" dataKey={key} name={key.charAt(0).toUpperCase()+key.slice(1)} stroke={color} strokeWidth={key === "hadir" ? 2 : 1.5} strokeDasharray={key === "hadir" ? undefined : "4 3"} fill={`url(#g-${key})`} />
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
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
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
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Detail Kehadiran Karyawan
          </h3>
          <DataTable
            columns={columns}
            data={data?.employeeList || []}
            loading={isLoading}
            searchable
            searchKeys={["nama", "cabang", "jabatan"]}
            pageSize={25}
            getRowStyle={(r) => (r.kehadiran_pct || 0) < 75 ? { background: "rgba(148,163,184,0.08)" } : {}}
          />
        </div>
      </div>
    </div>
  );
}
