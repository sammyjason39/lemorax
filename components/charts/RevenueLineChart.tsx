"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatRupiahShort, formatPeriode } from "@/lib/formatters";
import { CHART_PRIMARY, CHART_SECONDARY } from "@/lib/brand";

interface DataPoint {
  periode: string;
  revenue: number;
  expense: number;
}

interface RevenueLineChartProps {
  data: DataPoint[];
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg p-3 text-xs space-y-1.5"
      style={{
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 24px rgba(10,10,10,0.08)",
      }}
    >
      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
        {formatPeriode(label)}
      </p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatRupiahShort(p.value)}
        </p>
      ))}
    </div>
  );
};

export function RevenueLineChart({ data, loading }: RevenueLineChartProps) {
  if (loading) {
    return <div className="skeleton w-full rounded-xl" style={{ minHeight: 420 }} />;
  }

  return (
    <div style={{ width: "100%", minHeight: 420 }}>
      <ResponsiveContainer width="100%" height={420}>
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={0.18} />
              <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_SECONDARY} stopOpacity={0.2} />
              <stop offset="95%" stopColor={CHART_SECONDARY} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="periode"
            tickFormatter={formatPeriode}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatRupiahShort(v)}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: "12px", color: "var(--text-muted)", paddingTop: "8px" }} />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke={CHART_PRIMARY}
            strokeWidth={2}
            fill="url(#colorRevenue)"
          />
          <Area
            type="monotone"
            dataKey="expense"
            name="Pengeluaran"
            stroke={CHART_SECONDARY}
            strokeWidth={2}
            strokeDasharray="4 3"
            fill="url(#colorExpense)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
