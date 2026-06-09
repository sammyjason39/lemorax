"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatPct } from "@/lib/formatters";
import { brand } from "@/lib/brand";

interface MetricCardProps {
  title: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  sparklineData?: number[];
  sparklineColor?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ v, i }));
  return (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        <Tooltip content={() => null} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MetricCard({
  title,
  value,
  delta,
  deltaLabel,
  sparklineData,
  sparklineColor = brand.blue,
  icon,
  loading = false,
  className = "",
}: MetricCardProps) {
  if (loading) {
    return (
      <div className={`card-base p-5 ${className}`}>
        <div className="skeleton h-3.5 w-24 mb-4" />
        <div className="skeleton h-7 w-36 mb-3" />
        <div className="skeleton h-3 w-20" />
      </div>
    );
  }

  const isPositive = (delta ?? 0) > 0;
  const isNegative = (delta ?? 0) < 0;

  return (
    <div className={`card-hover p-5 group ${className}`}>
      <div className="flex items-start justify-between mb-1">
        <p className="label-mono" style={{ color: "var(--text-muted)" }}>
          {title}
        </p>
        {icon && <div className="opacity-60 group-hover:opacity-100 transition-opacity">{icon}</div>}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="flex-1">
          <p
            className="text-2xl font-extrabold tracking-tight leading-none mt-1 font-tabular"
            style={{ color: "var(--text-primary)" }}
          >
            {value}
          </p>

          {delta !== undefined && (
            <div className="flex items-center gap-1.5 mt-2.5">
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold"
                style={{
                  background: isPositive
                    ? brand.blueSoft
                    : isNegative
                    ? "rgba(239,68,68,0.1)"
                    : "rgba(107,114,128,0.1)",
                  color: isPositive ? brand.blue : isNegative ? brand.danger : brand.muted,
                }}
              >
                {isPositive ? <TrendingUp size={10} /> : isNegative ? <TrendingDown size={10} /> : <Minus size={10} />}
                {isPositive ? "+" : ""}
                {formatPct(delta)}
              </div>
              {deltaLabel && (
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {deltaLabel}
                </span>
              )}
            </div>
          )}
        </div>

        {sparklineData && sparklineData.length > 0 && (
          <div className="w-24 opacity-70 group-hover:opacity-100 transition-opacity">
            <Sparkline data={sparklineData} color={sparklineColor} />
          </div>
        )}
      </div>
    </div>
  );
}
