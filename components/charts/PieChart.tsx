"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { getCategoricalColor } from "@/lib/brand";

interface PieData {
  name: string;
  value: number;
  color?: string;
}

interface AriesPieChartProps {
  data: PieData[];
  loading?: boolean;
  donut?: boolean;
  formatter?: (value: number) => string;
  height?: number;
}

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

export function AriesPieChart({
  data,
  loading,
  donut = false,
  formatter,
  height = 240,
}: AriesPieChartProps) {
  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const allFixed = sorted.length > 0 && sorted.every((d) => d.color);
    return sorted.map((entry, i) => ({
      ...entry,
      fill: allFixed
        ? entry.color!
        : getCategoricalColor(i, sorted.length),
    }));
  }, [data]);

  if (loading) return <div className="skeleton w-full rounded-xl" style={{ height }} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          innerRadius={donut ? "45%" : 0}
          outerRadius="65%"
          paddingAngle={donut ? 3 : 1}
          dataKey="value"
          strokeWidth={0}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} fillOpacity={0.92} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        <Legend
          wrapperStyle={{ fontSize: "11px", color: "var(--text-muted)" }}
          iconSize={10}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
