import type { NextRequest } from "next/server";
import { buildAppUrl } from "@/lib/app-url";

export const WORKSPACE_ID = "default";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function getGoogleRedirectUri(req?: NextRequest, requestOrigin?: string): string {
  const explicit = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  return buildAppUrl("/api/workspace/google/callback", req, requestOrigin);
}

export function getGoogleOAuthConfig(req?: NextRequest, requestOrigin?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET belum dikonfigurasi di .env.local"
    );
  }
  return { clientId, clientSecret, redirectUri: getGoogleRedirectUri(req, requestOrigin) };
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}
