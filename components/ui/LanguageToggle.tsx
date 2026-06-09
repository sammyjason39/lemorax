"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === "id" ? "en" : "id")}
      className="h-10 px-3 rounded-xl flex items-center gap-2 transition-all font-semibold text-xs"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        color: "var(--text-secondary)",
      }}
      title={t("global.switch_lang")}
    >
      <Languages size={16} />
      <span>{language === "id" ? "ID" : "EN"}</span>
    </button>
  );
}
