"use client";

import { AlertTriangle, AlertCircle } from "lucide-react";

interface AlertCardProps {
  type: "critical" | "warning";
  category: string;
  message: string;
  detail?: string;
}

export function AlertCard({ type, category, message, detail }: AlertCardProps) {
  const isCritical = type === "critical";

  return (
    <div
      className="flex items-start gap-3 p-3.5 rounded-xl"
      style={{
        background: isCritical ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)",
        border: `1px solid ${isCritical ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
      }}
    >
      <div
        className="mt-0.5 shrink-0"
        style={{ color: isCritical ? "#EF4444" : "#F59E0B" }}
      >
        {isCritical ? <AlertCircle size={15} /> : <AlertTriangle size={15} />}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
          style={{ color: isCritical ? "#EF4444" : "#F59E0B" }}
        >
          {category}
        </div>
        <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
          {message}
        </p>
        {detail && (
          <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}
