"use client";

import Link from "next/link";
import { Plug, ArrowRight } from "lucide-react";
import { brand } from "@/lib/brand";
import { useLanguage } from "@/contexts/LanguageContext";

/** Points AI Agents Staff users to full platform connections in Workspace */
export function WorkspaceConnectLink() {
  const { language: lang } = useLanguage();

  return (
    <Link
      href="/dashboard/workspace"
      className="mx-3 mb-3 flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors hover:opacity-90"
      style={{
        background: brand.blueSoft,
        borderColor: `${brand.blue}33`,
        color: brand.blue,
      }}
    >
      <Plug size={16} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">
          {lang === "id" ? "Koneksi Platform" : "Platform Connections"}
        </p>
        <p className="text-[10px] opacity-80 truncate">
          {lang === "id" ? "Kelola di Workspace" : "Manage in Workspace"}
        </p>
      </div>
      <ArrowRight size={14} className="shrink-0 opacity-70" />
    </Link>
  );
}
