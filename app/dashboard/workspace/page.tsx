"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { useSearchParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { WorkspaceConnections } from "@/components/workspace/WorkspaceConnections";
import { useLanguage } from "@/contexts/LanguageContext";
import { brand } from "@/lib/brand";
import {
  Calendar,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  Layers,
  Link2,
  Link2Off,
  Loader2,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type WorkspaceTab = "connections" | "calendar";

type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay: boolean;
  htmlLink?: string;
};

type CalendarStatus = {
  connected: boolean;
  source: "ical" | "google" | null;
  label: string | null;
  connectedAt: string | null;
  googleOAuthAvailable: boolean;
};

function formatEventTime(ev: CalendarEvent, lang: "id" | "en") {
  const locale = lang === "id" ? idLocale : undefined;
  if (ev.allDay) return lang === "id" ? "Sepanjang hari" : "All day";

  try {
    const start = parseISO(ev.start);
    const end = parseISO(ev.end);
    return `${format(start, "HH:mm", { locale })} – ${format(end, "HH:mm", { locale })}`;
  } catch {
    return ev.start;
  }
}

function formatEventDay(dateStr: string, lang: "id" | "en") {
  try {
    const d = parseISO(dateStr);
    const locale = lang === "id" ? idLocale : undefined;
    if (isToday(d)) return lang === "id" ? "Hari ini" : "Today";
    if (isTomorrow(d)) return lang === "id" ? "Besok" : "Tomorrow";
    return format(d, "EEE, d MMM yyyy", { locale });
  } catch {
    return dateStr;
  }
}

function groupByDay(events: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const key = new Date(ev.start).toLocaleDateString("en-CA");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

export default function WorkspacePage() {
  const { t, language: lang } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<WorkspaceTab>("connections");
  const [disconnecting, setDisconnecting] = useState(false);
  const [icalUrl, setIcalUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [showOAuth, setShowOAuth] = useState(false);

  const { data: status, mutate: mutateStatus } = useSWR<CalendarStatus>(
    "/api/workspace/calendar/status",
    fetcher
  );

  const eventsKey = status?.connected ? "/api/workspace/calendar/events?days=14" : null;
  const {
    data: eventsData,
    isLoading: eventsLoading,
    mutate: mutateEvents,
  } = useSWR<{ events: CalendarEvent[]; today: CalendarEvent[]; error?: string }>(
    eventsKey,
    fetcher,
    { refreshInterval: 120000 }
  );

  useEffect(() => {
    const composio = searchParams.get("composio");
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (composio === "connected") {
      setTab("connections");
      void globalMutate("/api/composio/status");
      window.setTimeout(() => void globalMutate("/api/composio/status"), 2000);
      router.replace("/dashboard/workspace");
    } else if (connected || error) {
      setTab("calendar");
      router.replace("/dashboard/workspace");
      if (connected) void mutateStatus();
    }
  }, [searchParams, router, mutateStatus]);

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true);
    try {
      if (status?.source === "ical") {
        await fetch("/api/workspace/calendar/ical", { method: "DELETE" });
      } else {
        await fetch("/api/workspace/google/disconnect", { method: "POST" });
      }
      await mutateStatus();
      await mutateEvents(undefined, { revalidate: false });
    } finally {
      setDisconnecting(false);
    }
  }, [mutateStatus, mutateEvents, status?.source]);

  const handleIcalConnect = useCallback(async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      const res = await fetch("/api/workspace/calendar/ical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icalUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConnectError(data.error ?? "Gagal menghubungkan");
        return;
      }
      setIcalUrl("");
      await mutateStatus();
      await mutateEvents();
    } catch {
      setConnectError(lang === "id" ? "Gagal menghubungkan kalender" : "Failed to connect calendar");
    } finally {
      setConnecting(false);
    }
  }, [icalUrl, mutateStatus, mutateEvents, lang]);

  const grouped = useMemo(
    () => groupByDay(eventsData?.events ?? []),
    [eventsData?.events]
  );

  const todayEvents = eventsData?.today ?? [];

  const tabs: { id: WorkspaceTab; label: string; icon: typeof Layers }[] = [
    { id: "connections", label: t("workspace.tab_connections"), icon: Layers },
    { id: "calendar", label: t("workspace.tab_calendar"), icon: CalendarDays },
  ];

  return (
    <div className="page-enter">
      <TopBar title={t("workspace.title")} subtitle={t("workspace.subtitle")} />

      <div className={`px-6 pt-4 ${tab === "connections" ? "max-w-7xl" : "max-w-6xl"}`}>
        <div
          className="inline-flex rounded-xl p-1 text-xs font-medium border"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors"
              style={{
                background: tab === id ? "var(--bg-primary)" : "transparent",
                color: tab === id ? brand.blue : "var(--text-muted)",
                boxShadow: tab === id ? "0 1px 3px rgba(0,0,0,0.06)" : undefined,
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={`p-6 space-y-6 ${tab === "connections" ? "max-w-7xl" : "max-w-6xl"}`}>
        {tab === "connections" && <WorkspaceConnections />}

        {tab === "calendar" && (
          <>
            <div
              className="rounded-2xl p-5 border"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: brand.blueSoft, color: brand.blue }}
                  >
                    <CalendarDays size={22} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                      Google Calendar
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {t("workspace.calendar_tab_hint")}
                    </p>
                    {!status ? (
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        {t("workspace.loading")}
                      </p>
                    ) : status.connected ? (
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        {t("workspace.connected_as")}{" "}
                        <span className="font-medium" style={{ color: brand.blue }}>
                          {status.label}
                        </span>
                        {status.source === "ical" && (
                          <span className="ml-1 opacity-70">({t("workspace.via_ical")})</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        {t("workspace.not_connected")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {status?.connected && (
                    <>
                      <button
                        type="button"
                        onClick={() => void mutateEvents()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border"
                        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                      >
                        <RefreshCw size={14} />
                        {t("workspace.refresh")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDisconnect()}
                        disabled={disconnecting}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border disabled:opacity-50"
                        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                      >
                        {disconnecting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Link2Off size={14} />
                        )}
                        {t("workspace.disconnect")}
                      </button>
                    </>
                  )}
                  {!status?.connected && (
                    <button
                      type="button"
                      onClick={() => setTab("connections")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white"
                      style={{ background: brand.blue }}
                    >
                      <Link2 size={14} />
                      {t("workspace.connect_composio_calendar")}
                    </button>
                  )}
                </div>
              </div>

              {!status?.connected && (
                <div
                  className="mt-4 pt-4 border-t space-y-3"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                      {t("workspace.ical_title")}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      {t("workspace.ical_hint")}
                    </p>
                  </div>
                  <ol
                    className="text-xs space-y-1 list-decimal list-inside"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <li>{t("workspace.ical_step1")}</li>
                    <li>{t("workspace.ical_step2")}</li>
                    <li>{t("workspace.ical_step3")}</li>
                  </ol>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      value={icalUrl}
                      onChange={(e) => setIcalUrl(e.target.value)}
                      placeholder="https://calendar.google.com/calendar/ical/..."
                      className="flex-1 px-3 py-2 rounded-xl text-xs border outline-none focus:ring-1"
                      style={{
                        borderColor: "var(--border)",
                        background: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void handleIcalConnect()}
                      disabled={connecting || !icalUrl.trim()}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
                      style={{ background: brand.blue }}
                    >
                      {connecting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Link2 size={14} />
                      )}
                      {t("workspace.ical_connect")}
                    </button>
                  </div>
                  {connectError && (
                    <p className="text-xs" style={{ color: "#ef4444" }}>
                      {connectError}
                    </p>
                  )}
                </div>
              )}

              {!status?.connected && status?.googleOAuthAvailable && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowOAuth((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${showOAuth ? "rotate-180" : ""}`}
                    />
                    {t("workspace.oauth_advanced")}
                  </button>
                  {showOAuth && (
                    <div className="mt-2">
                      <a
                        href="/api/workspace/google/auth"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border"
                        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                      >
                        <Link2 size={14} />
                        {t("workspace.connect")}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {status?.connected && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div
                  className="lg:col-span-1 rounded-2xl p-5 border"
                  style={{ background: brand.blueSoft, borderColor: `${brand.blue}33` }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar size={16} style={{ color: brand.blue }} />
                    <span
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: brand.blue }}
                    >
                      {lang === "id" ? "Agenda Hari Ini" : "Today's Agenda"}
                    </span>
                  </div>
                  {eventsLoading ? (
                    <Loader2 size={20} className="animate-spin" style={{ color: brand.blue }} />
                  ) : todayEvents.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {t("workspace.no_events_today")}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {todayEvents.map((ev) => (
                        <li
                          key={ev.id}
                          className="text-sm rounded-xl px-3 py-2"
                          style={{
                            background: "var(--bg-primary)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <div className="font-medium" style={{ color: "var(--text-primary)" }}>
                            {ev.title}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {formatEventTime(ev, lang)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div
                  className="lg:col-span-2 rounded-2xl border overflow-hidden"
                  style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
                >
                  <div
                    className="px-5 py-3 border-b flex items-center justify-between"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {t("workspace.upcoming")}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      14 {lang === "id" ? "hari ke depan" : "days ahead"}
                    </span>
                  </div>

                  <div className="max-h-[520px] overflow-y-auto scrollbar-thin">
                    {eventsLoading ? (
                      <div className="p-8 flex justify-center">
                        <Loader2 size={24} className="animate-spin" style={{ color: brand.blue }} />
                      </div>
                    ) : grouped.length === 0 ? (
                      <p className="p-6 text-sm" style={{ color: "var(--text-muted)" }}>
                        {t("workspace.no_events")}
                      </p>
                    ) : (
                      grouped.map(([dayKey, dayEvents]) => (
                        <div key={dayKey}>
                          <div
                            className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wide sticky top-0"
                            style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}
                          >
                            {formatEventDay(dayEvents[0].start, lang)}
                          </div>
                          <ul>
                            {dayEvents.map((ev) => (
                              <li
                                key={ev.id}
                                className="px-5 py-3 border-b last:border-b-0 flex gap-3"
                                style={{ borderColor: "var(--border)" }}
                              >
                                <div
                                  className="w-16 shrink-0 text-xs pt-0.5"
                                  style={{ color: brand.blue }}
                                >
                                  {formatEventTime(ev, lang)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <span
                                      className="text-sm font-medium"
                                      style={{ color: "var(--text-primary)" }}
                                    >
                                      {ev.title}
                                    </span>
                                    {ev.htmlLink && (
                                      <a
                                        href={ev.htmlLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="shrink-0 opacity-60 hover:opacity-100"
                                        style={{ color: brand.blue }}
                                      >
                                        <ExternalLink size={14} />
                                      </a>
                                    )}
                                  </div>
                                  {ev.location && (
                                    <div
                                      className="flex items-center gap-1 text-xs mt-1"
                                      style={{ color: "var(--text-muted)" }}
                                    >
                                      <MapPin size={11} />
                                      {ev.location}
                                    </div>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {!status?.connected && (
              <div
                className="rounded-2xl p-8 text-center border border-dashed"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                <CalendarDays size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm max-w-md mx-auto">{t("workspace.connect_hint")}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
