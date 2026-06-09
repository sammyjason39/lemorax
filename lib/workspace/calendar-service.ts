import {
  getCalendarStatus as getGoogleStatus,
  listCalendarEvents as listGoogleEvents,
  type CalendarEvent,
} from "@/lib/workspace/google-calendar";
import { getIcalCalendarStatus, listIcalCalendarEvents } from "@/lib/workspace/ical-calendar";
import { isGoogleCalendarConfigured } from "@/lib/workspace/google-config";

export type CalendarSource = "ical" | "google" | null;

export type WorkspaceCalendarStatus = {
  connected: boolean;
  source: CalendarSource;
  label: string | null;
  connectedAt: string | null;
  googleOAuthAvailable: boolean;
};

export async function getWorkspaceCalendarStatus(): Promise<WorkspaceCalendarStatus> {
  const [ical, google] = await Promise.all([getIcalCalendarStatus(), getGoogleStatus()]);

  if (ical.connected) {
    return {
      connected: true,
      source: "ical",
      label: ical.label ?? "Google Calendar (iCal)",
      connectedAt: ical.connectedAt,
      googleOAuthAvailable: isGoogleCalendarConfigured(),
    };
  }

  if (google.connected) {
    return {
      connected: true,
      source: "google",
      label: google.email,
      connectedAt: google.connectedAt,
      googleOAuthAvailable: isGoogleCalendarConfigured(),
    };
  }

  return {
    connected: false,
    source: null,
    label: null,
    connectedAt: null,
    googleOAuthAvailable: isGoogleCalendarConfigured(),
  };
}

export async function listWorkspaceCalendarEvents(options?: {
  timeMin?: Date;
  timeMax?: Date;
  maxResults?: number;
}): Promise<CalendarEvent[]> {
  const status = await getWorkspaceCalendarStatus();

  if (status.source === "ical") {
    return listIcalCalendarEvents(options);
  }
  if (status.source === "google") {
    return listGoogleEvents(options);
  }

  throw new Error("Kalender belum terhubung");
}
