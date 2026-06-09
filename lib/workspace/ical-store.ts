import { createServerSupabaseClient } from "@/lib/supabase";
import { WORKSPACE_ID } from "@/lib/workspace/google-config";

export type IcalCalendarConnection = {
  id: string;
  icalUrl: string;
  label: string | null;
  connectedAt: string;
  updatedAt: string;
};

type IcalRow = {
  id: string;
  ical_url: string;
  label: string | null;
  connected_at: string;
  updated_at: string;
};

function fromRow(row: IcalRow): IcalCalendarConnection {
  return {
    id: row.id,
    icalUrl: row.ical_url,
    label: row.label,
    connectedAt: row.connected_at,
    updatedAt: row.updated_at,
  };
}

export async function getIcalCalendarConnection(): Promise<IcalCalendarConnection | null> {
  const sb = createServerSupabaseClient();
  const { data, error } = await sb
    .from("workspace_ical_calendar")
    .select("*")
    .eq("id", WORKSPACE_ID)
    .maybeSingle();

  if (error) {
    if (error.message.includes("Could not find the table")) return null;
    throw new Error(error.message);
  }
  return data ? fromRow(data as IcalRow) : null;
}

export async function saveIcalCalendarConnection(input: {
  icalUrl: string;
  label?: string;
}): Promise<IcalCalendarConnection> {
  const sb = createServerSupabaseClient();
  const now = new Date().toISOString();
  const row = {
    id: WORKSPACE_ID,
    ical_url: input.icalUrl,
    label: input.label ?? "Google Calendar",
    connected_at: now,
    updated_at: now,
  };

  const { data, error } = await sb
    .from("workspace_ical_calendar")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return fromRow(data as IcalRow);
}

export async function deleteIcalCalendarConnection(): Promise<void> {
  const sb = createServerSupabaseClient();
  const { error } = await sb.from("workspace_ical_calendar").delete().eq("id", WORKSPACE_ID);
  if (error) throw new Error(error.message);
}
