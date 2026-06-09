import { createServerSupabaseClient } from "@/lib/supabase";
import { WORKSPACE_ID } from "@/lib/workspace/google-config";

export type GoogleCalendarConnection = {
  id: string;
  googleEmail: string | null;
  accessToken: string | null;
  refreshToken: string;
  tokenExpiresAt: string | null;
  calendarId: string;
  connectedAt: string;
  updatedAt: string;
};

type ConnectionRow = {
  id: string;
  google_email: string | null;
  access_token: string | null;
  refresh_token: string;
  token_expires_at: string | null;
  calendar_id: string;
  connected_at: string;
  updated_at: string;
};

function fromRow(row: ConnectionRow): GoogleCalendarConnection {
  return {
    id: row.id,
    googleEmail: row.google_email,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    tokenExpiresAt: row.token_expires_at,
    calendarId: row.calendar_id,
    connectedAt: row.connected_at,
    updatedAt: row.updated_at,
  };
}

export async function getGoogleCalendarConnection(): Promise<GoogleCalendarConnection | null> {
  const sb = createServerSupabaseClient();
  const { data, error } = await sb
    .from("workspace_google_calendar")
    .select("*")
    .eq("id", WORKSPACE_ID)
    .maybeSingle();

  if (error) {
    if (error.message.includes("Could not find the table")) return null;
    throw new Error(error.message);
  }
  return data ? fromRow(data as ConnectionRow) : null;
}

export async function saveGoogleCalendarConnection(input: {
  googleEmail: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date | null;
  calendarId?: string;
}): Promise<GoogleCalendarConnection> {
  const sb = createServerSupabaseClient();
  const now = new Date().toISOString();
  const row = {
    id: WORKSPACE_ID,
    google_email: input.googleEmail,
    access_token: input.accessToken,
    refresh_token: input.refreshToken,
    token_expires_at: input.tokenExpiresAt?.toISOString() ?? null,
    calendar_id: input.calendarId ?? "primary",
    connected_at: now,
    updated_at: now,
  };

  const { data, error } = await sb
    .from("workspace_google_calendar")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return fromRow(data as ConnectionRow);
}

export async function updateGoogleTokens(input: {
  accessToken: string;
  tokenExpiresAt: Date | null;
}): Promise<void> {
  const sb = createServerSupabaseClient();
  const { error } = await sb
    .from("workspace_google_calendar")
    .update({
      access_token: input.accessToken,
      token_expires_at: input.tokenExpiresAt?.toISOString() ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", WORKSPACE_ID);

  if (error) throw new Error(error.message);
}

export async function deleteGoogleCalendarConnection(): Promise<void> {
  const sb = createServerSupabaseClient();
  const { error } = await sb.from("workspace_google_calendar").delete().eq("id", WORKSPACE_ID);
  if (error) throw new Error(error.message);
}

export async function saveOAuthState(state: string, purpose = "google_calendar"): Promise<void> {
  const sb = createServerSupabaseClient();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { error } = await sb.from("oauth_states").upsert(
    { state, purpose, expires_at: expiresAt },
    { onConflict: "state" }
  );
  if (error) throw new Error(error.message);
}

export async function consumeOAuthState(state: string, purpose = "google_calendar"): Promise<boolean> {
  const sb = createServerSupabaseClient();
  const { data, error } = await sb
    .from("oauth_states")
    .select("state, purpose, expires_at")
    .eq("state", state)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || data.purpose !== purpose) return false;
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await sb.from("oauth_states").delete().eq("state", state);
    return false;
  }

  await sb.from("oauth_states").delete().eq("state", state);
  return true;
}
