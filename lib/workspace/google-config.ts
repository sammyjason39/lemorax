export const WORKSPACE_ID = "default";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function getGoogleRedirectUri(): string {
  const explicit = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (explicit) return explicit;

  const base = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.ARIES_BASE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

  return `${base}/api/workspace/google/callback`;
}

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET belum dikonfigurasi di .env.local"
    );
  }
  return { clientId, clientSecret, redirectUri: getGoogleRedirectUri() };
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}
