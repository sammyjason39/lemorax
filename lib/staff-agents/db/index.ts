import { createServerSupabaseClient } from "@/lib/supabase";
import * as fileStore from "@/lib/staff-agents/db/file-store";
import * as supabaseStore from "@/lib/staff-agents/db/supabase-store";
import { agentToRow, conversationToRow, messageToRow } from "@/lib/staff-agents/db/map";

export type StaffBackend = "supabase" | "file";

let cachedBackend: StaffBackend | null = null;

function errorMessage(err: unknown): string {
  if (!err) return "";
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

function isMissingTableError(err: unknown): boolean {
  const msg = errorMessage(err);
  return msg.includes("Could not find the table") || msg.includes("staff_agents");
}

async function detectBackend(): Promise<StaffBackend> {
  if (cachedBackend) return cachedBackend;
  try {
    const sb = createServerSupabaseClient();
    const { error } = await sb.from("staff_agents").select("id").limit(1);
    if (error && isMissingTableError(error)) {
      cachedBackend = "file";
      return cachedBackend;
    }
    if (error) throw error;
    cachedBackend = "supabase";
    return cachedBackend;
  } catch (err) {
    if (isMissingTableError(err)) {
      cachedBackend = "file";
      return cachedBackend;
    }
    throw err;
  }
}

/** Import JSON/file store into Supabase when tables become available */
async function migrateFileToSupabaseIfNeeded(): Promise<void> {
  const store = await fileStore.exportFullStore();
  const sb = createServerSupabaseClient();
  const { count } = await sb.from("staff_agents").select("*", { count: "exact", head: true });
  if ((count ?? 0) > 0) return;

  await sb.from("staff_agents").upsert(store.agents.map(agentToRow), { onConflict: "id" });
  await sb.from("staff_conversations").upsert(store.conversations.map(conversationToRow), { onConflict: "id" });
  if (store.messages.length > 0) {
    await sb.from("staff_messages").upsert(store.messages.map(messageToRow), { onConflict: "id" });
  }
}

async function withBackend<T>(fn: {
  supabase: () => Promise<T>;
  file: () => Promise<T>;
}): Promise<T> {
  const backend = await detectBackend();
  if (backend === "file") return fn.file();

  try {
    await migrateFileToSupabaseIfNeeded();
    return await fn.supabase();
  } catch (err) {
    if (isMissingTableError(err)) {
      cachedBackend = "file";
      return fn.file();
    }
    throw err;
  }
}

export async function getStaffBackend(): Promise<StaffBackend> {
  return detectBackend();
}

export const listAgents = () =>
  withBackend({ supabase: supabaseStore.listAgents, file: fileStore.listAgents });

export const getAgent = (id: string) =>
  withBackend({ supabase: () => supabaseStore.getAgent(id), file: () => fileStore.getAgent(id) });

export const updateAgent = (id: string, patch: Parameters<typeof supabaseStore.updateAgent>[1]) =>
  withBackend({
    supabase: () => supabaseStore.updateAgent(id, patch),
    file: () => fileStore.updateAgent(id, patch),
  });

export const createAgent = (input: Parameters<typeof supabaseStore.createAgent>[0]) =>
  withBackend({ supabase: () => supabaseStore.createAgent(input), file: () => fileStore.createAgent(input) });

export const listConversations = () =>
  withBackend({ supabase: supabaseStore.listConversations, file: fileStore.listConversations });

export const getConversation = (id: string) =>
  withBackend({
    supabase: () => supabaseStore.getConversation(id),
    file: () => fileStore.getConversation(id),
  });

export const createConversation = (input: Parameters<typeof supabaseStore.createConversation>[0]) =>
  withBackend({
    supabase: () => supabaseStore.createConversation(input),
    file: () => fileStore.createConversation(input),
  });

export const listMessages = (conversationId: string) =>
  withBackend({
    supabase: () => supabaseStore.listMessages(conversationId),
    file: () => fileStore.listMessages(conversationId),
  });

export const appendMessage = (input: Parameters<typeof supabaseStore.appendMessage>[0]) =>
  withBackend({
    supabase: () => supabaseStore.appendMessage(input),
    file: () => fileStore.appendMessage(input),
  });

export const syncAgentMetadataFromSeed = () =>
  withBackend({
    supabase: supabaseStore.syncAgentMetadataFromSeed,
    file: fileStore.syncAgentMetadataFromSeed,
  });
