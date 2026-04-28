"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from "recharts";
import { formatRupiahShort } from "@/lib/formatters";

interface CabangData {
  cabang: string;
  revenue: number;
}

interface BranchBarChartProps {
  data: CabangData[];
  loading?: boolean;
  horizontal?: boolean;
}

const COLORS = [
  "#14B8A6","#3B82F6","#8B5CF6","#F59E0B","#EF4444",
  "#06B6D4","#10B981","#F97316","#EC4899","#6366F1",
  "#84CC16","#0EA5E9",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg p-3 text-xs"
      style={{
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      }}
    >
      <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
        {label}
      </p>
      <p style={{ color: "#14B8A6" }}>
        {formatRupiahShort(payload[0]?.value)}
      </p>
    </div>
  );
};

export function BranchBarChart({ data, loading, horizontal = true }: BranchBarChartProps) {
  if (loading) return <div className="skeleton w-full h-64 rounded-xl" />;

  const sorted = [...data].sort((a, b) => b.revenue - a.revenue);

  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={Math.max(260, sorted.length * 38)}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 0, right: 80, left: 10, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(31,42,61,0.8)"
            horizontal={false}
          />
          <XAxis
            type="number"
            tickFormatter={formatRupiahShort}
            tick={{ fill: "#475569", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="cabang"
            tick={{ fill: "#94A3B8", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={100}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {sorted.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
            ))}
            <LabelList
              dataKey="revenue"
              position="right"
              formatter={formatRupiahShort}
              style={{ fill: "#94A3B8", fontSize: 11 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={sorted} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,42,61,0.8)" vertical={false} />
        <XAxis
          dataKey="cabang"
          tick={{ fill: "#475569", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          angle={-30}
          textAnchor="end"
        />
        <YAxis
          tickFormatter={formatRupiahShort}
          tick={{ fill: "#475569", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {sorted.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
