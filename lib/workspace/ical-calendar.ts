import ical from "node-ical";
import type { CalendarEvent } from "@/lib/workspace/google-calendar";
import { getIcalCalendarConnection } from "@/lib/workspace/ical-store";

const ICAL_URL_PATTERN =
  /^https?:\/\/calendar\.google\.com\/calendar\/ical\/|^webcal:\/\/calendar\.google\.com\/calendar\/ical\//i;

export function isValidGoogleIcalUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed.replace(/^webcal:\/\//i, "https://"));
    return ICAL_URL_PATTERN.test(parsed.href) || parsed.hostname.includes("google.com");
  } catch {
    return false;
  }
}

export function normalizeIcalUrl(url: string): string {
  return url.trim().replace(/^webcal:\/\//i, "https://");
}

export async function listIcalCalendarEvents(options?: {
  timeMin?: Date;
  timeMax?: Date;
  maxResults?: number;
}): Promise<CalendarEvent[]> {
  const conn = await getIcalCalendarConnection();
  if (!conn?.icalUrl) {
    throw new Error("Kalender belum terhubung");
  }

  const timeMin = options?.timeMin ?? new Date();
  timeMin.setHours(0, 0, 0, 0);
  const timeMax =
    options?.timeMax ?? new Date(timeMin.getTime() + 14 * 24 * 60 * 60 * 1000);
  const maxResults = options?.maxResults ?? 100;

  const feedUrl = normalizeIcalUrl(conn.icalUrl);
  const data = await ical.async.fromURL(feedUrl);

  const events: CalendarEvent[] = [];

  for (const item of Object.values(data)) {
    if (!item || item.type !== "VEVENT") continue;

    const start = item.start instanceof Date ? item.start : new Date(String(item.start));
    const end = item.end instanceof Date ? item.end : start;
    if (Number.isNaN(start.getTime())) continue;
    if (end < timeMin || start > timeMax) continue;

    const allDay =
      typeof item.datetype === "string"
        ? item.datetype === "date"
        : start.getHours() === 0 &&
          start.getMinutes() === 0 &&
          end.getHours() === 0 &&
          end.getMinutes() === 0;

    events.push({
      id: String(item.uid ?? item.summary ?? `ical_${events.length}`),
      title: String(item.summary ?? "(Tanpa judul)"),
      description: item.description ? String(item.description) : undefined,
      location: item.location ? String(item.location) : undefined,
      start: allDay ? start.toISOString().slice(0, 10) : start.toISOString(),
      end: allDay ? end.toISOString().slice(0, 10) : end.toISOString(),
      allDay,
    });
  }

  return events
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, maxResults);
}

export async function getIcalCalendarStatus() {
  const conn = await getIcalCalendarConnection();
  return {
    connected: Boolean(conn?.icalUrl),
    label: conn?.label ?? null,
    connectedAt: conn?.connectedAt ?? null,
  };
}
