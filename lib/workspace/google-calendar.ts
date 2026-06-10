import { google } from "googleapis";
import type { NextRequest } from "next/server";
import { getGoogleOAuthConfig, GOOGLE_CALENDAR_SCOPES } from "@/lib/workspace/google-config";
import {
  getGoogleCalendarConnection,
  updateGoogleTokens,
  type GoogleCalendarConnection,
} from "@/lib/workspace/google-store";

export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay: boolean;
  htmlLink?: string;
  status?: string;
};

function createOAuthClient(req?: NextRequest, requestOrigin?: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig(req, requestOrigin);
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGoogleAuthUrl(state: string, req?: NextRequest, requestOrigin?: string): string {
  const client = createOAuthClient(req, requestOrigin);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export async function exchangeGoogleCode(
  code: string,
  req?: NextRequest,
  requestOrigin?: string
) {
  const client = createOAuthClient(req, requestOrigin);
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("Google tidak mengembalikan refresh_token. Cabut akses app di Google Account lalu connect ulang.");
  }

  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data: profile } = await oauth2.userinfo.get();

  return {
    googleEmail: profile.email ?? "unknown@gmail.com",
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token,
    tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
  };
}

async function getAuthenticatedClient(conn: GoogleCalendarConnection) {
  const client = createOAuthClient();
  client.setCredentials({
    access_token: conn.accessToken ?? undefined,
    refresh_token: conn.refreshToken,
    expiry_date: conn.tokenExpiresAt ? new Date(conn.tokenExpiresAt).getTime() : undefined,
  });

  client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await updateGoogleTokens({
        accessToken: tokens.access_token,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      });
    }
  });

  return client;
}

export async function listCalendarEvents(options?: {
  timeMin?: Date;
  timeMax?: Date;
  maxResults?: number;
}): Promise<CalendarEvent[]> {
  const conn = await getGoogleCalendarConnection();
  if (!conn?.refreshToken) {
    throw new Error("Google Calendar belum terhubung");
  }

  const auth = await getAuthenticatedClient(conn);
  const calendar = google.calendar({ version: "v3", auth });

  const timeMin = options?.timeMin ?? new Date();
  const timeMax =
    options?.timeMax ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const { data } = await calendar.events.list({
    calendarId: conn.calendarId || "primary",
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    maxResults: options?.maxResults ?? 50,
    singleEvents: true,
    orderBy: "startTime",
  });

  return (data.items ?? []).map((ev) => {
    const allDay = Boolean(ev.start?.date && !ev.start?.dateTime);
    const start = ev.start?.dateTime ?? ev.start?.date ?? "";
    const end = ev.end?.dateTime ?? ev.end?.date ?? "";
    return {
      id: ev.id ?? `ev_${Math.random().toString(36).slice(2)}`,
      title: ev.summary ?? "(Tanpa judul)",
      description: ev.description ?? undefined,
      location: ev.location ?? undefined,
      start,
      end,
      allDay,
      htmlLink: ev.htmlLink ?? undefined,
      status: ev.status ?? undefined,
    };
  });
}

export async function getCalendarStatus() {
  const conn = await getGoogleCalendarConnection();
  return {
    connected: Boolean(conn?.refreshToken),
    email: conn?.googleEmail ?? null,
    calendarId: conn?.calendarId ?? "primary",
    connectedAt: conn?.connectedAt ?? null,
  };
}
