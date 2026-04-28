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
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
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
            <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(31,42,61,0.8)"
          vertical={false}
        />
        <XAxis
          dataKey="periode"
          tickFormatter={formatPeriode}
          tick={{ fill: "#475569", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatRupiahShort(v)}
          tick={{ fill: "#475569", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={72}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: "12px", color: "#94A3B8", paddingTop: "8px" }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke="#14B8A6"
          strokeWidth={2}
          fill="url(#colorRevenue)"
        />
        <Area
          type="monotone"
          dataKey="expense"
          name="Pengeluaran"
          stroke="#EF4444"
          strokeWidth={2}
          fill="url(#colorExpense)"
        />
      </AreaChart>
    </ResponsiveContainer>
    </div>
  );
}
