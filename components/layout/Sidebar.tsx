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
  Bot,
  ChevronDown,
  Check,
  X,
  RotateCcw,
} from "lucide-react";
import { useFilters } from "@/contexts/FilterContext";
import { useState } from "react";
import { CABANG_LIST } from "@/types";
import { formatPeriode } from "@/lib/formatters";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/sales", label: "Sales & Revenue", icon: TrendingUp },
  { href: "/dashboard/kpi", label: "KPI Karyawan", icon: Target },
  { href: "/dashboard/hr", label: "HR & Absensi", icon: Users },
  { href: "/dashboard/crm", label: "CRM & Deals", icon: Handshake },
  { href: "/dashboard/finance", label: "Finance", icon: DollarSign },
  { href: "/dashboard/marketing", label: "Marketing", icon: Megaphone },
  {
    href: "/dashboard/ai-analyst",
    label: "AI Analyst",
    icon: Bot,
    badge: "AI",
  },
];

const MONTHS = [
  "2024-01","2024-02","2024-03","2024-04","2024-05","2024-06",
  "2024-07","2024-08","2024-09","2024-10","2024-11","2024-12",
  "2025-01","2025-02","2025-03","2025-04","2025-05","2025-06",
  "2025-07","2025-08","2025-09","2025-10","2025-11","2025-12",
  "2026-01","2026-02","2026-03","2026-04",
];

export function Sidebar() {
  const pathname = usePathname();
  const { periodeStart, periodeEnd, cabang, setPeriodeStart, setPeriodeEnd, setCabang, resetFilters } =
    useFilters();
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
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{
              background: "linear-gradient(135deg, #3B82F6, #14B8A6)",
              boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)",
            }}
          >
            L
          </div>
          <div>
            <div
              className="text-sm font-bold tracking-wider"
              style={{ fontFamily: "var(--font-sora)", color: "var(--text-primary)" }}
            >
              LEMORAX
            </div>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              Business Intelligence
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        <div className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-2"
          style={{ color: "var(--text-muted)" }}>
          Menu Utama
        </div>
        {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={`sidebar-item ${isActive ? "active" : ""}`}>
              <Icon size={16} className="shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(20, 184, 166, 0.2)", color: "#14B8A6" }}
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
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Filter Global
          </span>
          <button
            onClick={resetFilters}
            className="text-[10px] flex items-center gap-1 hover:text-blue-400 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <RotateCcw size={10} />
            Reset
          </button>
        </div>

        {/* Periode Range */}
        <div className="space-y-1.5">
          <label className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            Periode
          </label>
          <div className="flex gap-1.5">
            <select
              value={periodeStart}
              onChange={(e) => setPeriodeStart(e.target.value)}
              className="flex-1 text-[11px] rounded-md px-2 py-1.5 outline-none"
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
              className="flex-1 text-[11px] rounded-md px-2 py-1.5 outline-none"
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
          </div>
        </div>

        {/* Cabang Multi-select */}
        <div className="space-y-1.5">
          <label className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            Cabang {cabang.length > 0 && <span style={{ color: "#3B82F6" }}>({cabang.length})</span>}
          </label>
          <div className="relative">
            <button
              onClick={() => setCabangOpen(!cabangOpen)}
              className="w-full flex items-center justify-between text-[11px] rounded-md px-2 py-1.5"
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <span style={{ color: cabang.length === 0 ? "var(--text-muted)" : "var(--text-primary)" }}>
                {cabang.length === 0 ? "Semua Cabang" : cabang.length === 1 ? cabang[0] : `${cabang.length} cabang`}
              </span>
              <ChevronDown size={12} className={`transition-transform ${cabangOpen ? "rotate-180" : ""}`} />
            </button>

            {cabangOpen && (
              <div
                className="absolute bottom-full left-0 w-full mb-1 rounded-md py-1 z-50 max-h-48 overflow-y-auto scrollbar-thin"
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 -8px 24px rgba(0,0,0,0.4)",
                }}
              >
                {CABANG_LIST.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleCabang(c)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-white/5 transition-colors"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0"
                      style={{
                        borderColor: cabang.includes(c) ? "#3B82F6" : "var(--border)",
                        background: cabang.includes(c) ? "#3B82F6" : "transparent",
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
