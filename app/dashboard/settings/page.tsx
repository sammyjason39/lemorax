"use client";

import { TopBar } from "@/components/layout/TopBar";
import { AiSettingsPanel } from "@/components/settings/AiSettingsPanel";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SettingsPage() {
  const { t } = useLanguage();

  return (
    <div className="page-enter">
      <TopBar title={t("menu.settings")} subtitle={t("settings.page_subtitle")} />
      <div className="p-6 max-w-3xl">
        <AiSettingsPanel />
      </div>
    </div>
  );
}
