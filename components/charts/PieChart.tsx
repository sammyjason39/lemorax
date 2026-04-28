"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

interface PieData {
  name: string;
  value: number;
  color?: string;
}

interface LemoraxPieChartProps {
  data: PieData[];
  loading?: boolean;
  donut?: boolean;
  formatter?: (value: number) => string;
  height?: number;
}

const DEFAULT_COLORS = [
  "#14B8A6","#3B82F6","#8B5CF6","#F59E0B","#EF4444",
  "#06B6D4","#10B981","#F97316","#EC4899","#6366F1",
];

const CustomTooltip = ({ active, payload, formatter }: any) => {
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
      <p className="font-semibold" style={{ color: payload[0].payload.fill }}>
        {payload[0].name}
      </p>
      <p style={{ color: "var(--text-primary)" }}>
        {formatter ? formatter(payload[0].value) : payload[0].value.toLocaleString("id-ID")}
      </p>
      <p style={{ color: "var(--text-muted)" }}>
        {(payload[0].percent * 100).toFixed(1)}%
      </p>
    </div>
  );
};

export function LemoraxPieChart({
  data,
  loading,
  donut = false,
  formatter,
  height = 240,
}: LemoraxPieChartProps) {
  if (loading) return <div className="skeleton w-full rounded-xl" style={{ height }} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={donut ? "45%" : 0}
          outerRadius="65%"
          paddingAngle={donut ? 3 : 1}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
              fillOpacity={0.9}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        <Legend
          wrapperStyle={{ fontSize: "11px", color: "#94A3B8" }}
          iconSize={10}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
