"use client";

import { useFilters } from "@/contexts/FilterContext";
import { formatPeriode } from "@/lib/formatters";
import { Calendar, Building2 } from "lucide-react";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function TopBar({ title, subtitle }: TopBarProps) {
  const { periodeStart, periodeEnd, cabang } = useFilters();

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-opacity-90"
      style={{
        backgroundColor: "var(--bg-primary)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div>
        <h1
          className="text-lg font-bold"
          style={{ fontFamily: "var(--font-sora)", color: "var(--text-primary)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <Calendar size={13} />
          <span>
            {formatPeriode(periodeStart)} — {formatPeriode(periodeEnd)}
          </span>
        </div>

        {cabang.length > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
            style={{
              background: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              color: "#93C5FD",
            }}
          >
            <Building2 size={13} />
            <span>
              {cabang.length === 1 ? cabang[0] : `${cabang.length} Cabang`}
            </span>
          </div>
        )}

        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
          style={{
            background: "rgba(20, 184, 166, 0.1)",
            border: "1px solid rgba(20, 184, 166, 0.2)",
            color: "#14B8A6",
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          Live
        </div>
        
        <ThemeToggle />
      </div>
    </header>
  );
}
