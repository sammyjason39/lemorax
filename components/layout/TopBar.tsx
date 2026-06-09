"use client";

import { useFilters } from "@/contexts/FilterContext";
import { formatPeriode } from "@/lib/formatters";
import { Calendar, Building2 } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { brand } from "@/lib/brand";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const { periodeStart, periodeEnd, cabang } = useFilters();
  const { t } = useLanguage();

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-[var(--bg-primary)]/95 backdrop-blur-md"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div>
        <h1
          className="text-lg font-sans font-bold tracking-tight"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}
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
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: brand.blueSoft,
              border: "1px solid rgba(22, 82, 240, 0.15)",
              color: brand.blue,
            }}
          >
            <Building2 size={13} />
            <span>
              {cabang.length === 1 ? cabang[0] : `${cabang.length} ${t("global.branches")}`}
            </span>
          </div>
        )}

        <div className="live-badge">
          <span className="pulse" />
          {t("global.live")}
        </div>

        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
