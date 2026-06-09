import { createServerSupabaseClient } from "@/lib/supabase";
import { COMPOSIO_USER_ID } from "@/lib/composio/config";

const ROW_ID = "default";

type SessionRow = {
  id: string;
  composio_user_id: string;
  composio_session_id: string;
  updated_at: string;
};

export async function getStoredComposioSessionId(): Promise<string | null> {
  const sb = createServerSupabaseClient();
  const { data, error } = await sb
    .from("composio_sessions")
    .select("composio_session_id")
    .eq("id", ROW_ID)
    .maybeSingle();

  if (error) {
    if (error.message.includes("Could not find the table")) return null;
    throw new Error(error.message);
  }
  return (data as SessionRow | null)?.composio_session_id ?? null;
}

export async function saveComposioSessionId(sessionId: string): Promise<void> {
  const sb = createServerSupabaseClient();
  const now = new Date().toISOString();
  const { error } = await sb.from("composio_sessions").upsert(
    {
      id: ROW_ID,
      composio_user_id: COMPOSIO_USER_ID,
      composio_session_id: sessionId,
      updated_at: now,
    },
    { onConflict: "id" }
  );
  if (error) throw new Error(error.message);
}
