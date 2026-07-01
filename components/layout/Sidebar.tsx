"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Target,
  Users,
  Handshake,
  DollarSign,
  Megaphone,
  Share2,
  Bot,
  ChevronDown,
  Check,
  RotateCcw,
  UsersRound,
  LayoutGrid,
  BookOpen,
  Settings2,
} from "lucide-react";
import { useFilters } from "@/contexts/FilterContext";
import { useState } from "react";
import { CABANG_LIST } from "@/types";
import { formatPeriode } from "@/lib/formatters";
import {
  CURRENT_PERIODE_VALUE,
  generatePeriodeMonths,
  formatPeriodeFilter,
} from "@/lib/periode";
import { useLanguage } from "@/contexts/LanguageContext";
import { TranslationKey } from "@/lib/translations";
import { AriesLogo } from "@/components/ui/AriesLogo";
import { brand } from "@/lib/brand";

const NAV_ITEMS: { href: string; labelKey: TranslationKey; icon: any; badge?: string }[] = [
  { href: "/dashboard", labelKey: "menu.overview", icon: LayoutDashboard },
  { href: "/dashboard/sales", labelKey: "menu.sales", icon: TrendingUp },
  { href: "/dashboard/kpi", labelKey: "menu.kpi", icon: Target },
  { href: "/dashboard/hr", labelKey: "menu.hr", icon: Users },
  { href: "/dashboard/crm", labelKey: "menu.crm", icon: Handshake },
  { href: "/dashboard/finance", labelKey: "menu.finance", icon: DollarSign },
  { href: "/dashboard/marketing", labelKey: "menu.marketing", icon: Megaphone },
  { href: "/dashboard/social-media", labelKey: "menu.social_media", icon: Share2 },
  {
    href: "/dashboard/ai-analyst",
    labelKey: "menu.ai",
    icon: Bot,
    badge: "AI",
  },
  {
    href: "/dashboard/ai-agents-staff",
    labelKey: "menu.ai_staff",
    icon: UsersRound,
    badge: "A2A",
  },
  {
    href: "/dashboard/workspace",
    labelKey: "menu.workspace",
    icon: LayoutGrid,
    badge: "GCal",
  },
  {
    href: "/dashboard/vault",
    labelKey: "menu.vault",
    icon: BookOpen,
    badge: "Vault",
  },
  {
    href: "/dashboard/settings",
    labelKey: "menu.settings",
    icon: Settings2,
  },
];

const MONTHS = generatePeriodeMonths();

export function Sidebar() {
  const pathname = usePathname();
  const { periodeStart, periodeEnd, cabang, setPeriodeStart, setPeriodeEnd, setCabang, resetFilters } =
    useFilters();
  const { t, language } = useLanguage();
  const [cabangOpen, setCabangOpen] = useState(false);

  const toggleCabang = (c: string) => {
    if (cabang.includes(c)) {
      setCabang(cabang.filter((x) => x !== c));
    } else {
      setCabang([...cabang, c]);
    }
  };

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-[260px] flex flex-col z-40"
      style={{
        backgroundColor: "var(--bg-primary)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <AriesLogo size="md" showTagline />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        <div
          className="label-mono px-3 mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          {t("global.main_menu")}
        </div>
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon, badge }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={`sidebar-item font-sans ${isActive ? "active" : ""}`}>
              <Icon size={16} className="shrink-0" />
              <span className="flex-1">{t(labelKey)}</span>
              {badge && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: brand.blueSoft, color: brand.blue }}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Global Filters */}
      <div className="px-3 py-4 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between">
          <span className="label-mono" style={{ color: "var(--text-muted)" }}>
            {t("global.filter")}
          </span>
          <button
            onClick={resetFilters}
            className="text-[10px] flex items-center gap-1 transition-colors hover:opacity-80"
            style={{ color: "var(--text-muted)" }}
          >
            <RotateCcw size={10} />
            {t("global.reset")}
          </button>
        </div>

        {/* Periode Range */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
            {t("global.period")}
          </label>
          <div className="flex gap-1.5">
            <select
              value={periodeStart}
              onChange={(e) => setPeriodeStart(e.target.value)}
              className="flex-1 text-[11px] rounded-lg px-2 py-1.5 outline-none focus:ring-2"
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>{formatPeriode(m)}</option>
              ))}
            </select>
            <span className="text-[11px] self-center" style={{ color: "var(--text-muted)" }}>—</span>
            <select
              value={periodeEnd}
              onChange={(e) => setPeriodeEnd(e.target.value)}
              className="flex-1 text-[11px] rounded-lg px-2 py-1.5 outline-none"
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <option value={CURRENT_PERIODE_VALUE}>
                {formatPeriodeFilter(CURRENT_PERIODE_VALUE, language)}
              </option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>{formatPeriode(m)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cabang Multi-select */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
            {t("global.branches")}{" "}
            {cabang.length > 0 && (
              <span style={{ color: brand.blue }}>({cabang.length})</span>
            )}
          </label>
          <div className="relative">
            <button
              onClick={() => setCabangOpen(!cabangOpen)}
              className="w-full flex items-center justify-between text-[11px] rounded-lg px-2 py-1.5"
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <span style={{ color: cabang.length === 0 ? "var(--text-muted)" : "var(--text-primary)" }}>
                {cabang.length === 0
                  ? t("global.all_branches")
                  : cabang.length === 1
                  ? cabang[0]
                  : `${cabang.length} ${t("global.branches").toLowerCase()}`}
              </span>
              <ChevronDown size={12} className={`transition-transform ${cabangOpen ? "rotate-180" : ""}`} />
            </button>

            {cabangOpen && (
              <div
                className="absolute bottom-full left-0 w-full mb-1 rounded-xl py-1 z-50 max-h-48 overflow-y-auto scrollbar-thin"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 -8px 24px rgba(10,10,10,0.08)",
                }}
              >
                {CABANG_LIST.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleCabang(c)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-black/[0.03] dark:hover:bg-white/5 transition-colors"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0"
                      style={{
                        borderColor: cabang.includes(c) ? brand.blue : "var(--border)",
                        background: cabang.includes(c) ? brand.blue : "transparent",
                      }}
                    >
                      {cabang.includes(c) && <Check size={9} color="white" />}
                    </div>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
