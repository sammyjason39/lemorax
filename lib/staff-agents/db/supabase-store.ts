import fs from "fs/promises";
import path from "path";
import { createServerSupabaseClient } from "@/lib/supabase";
import { createSeedStore } from "@/lib/staff-agents/seed";
import { migrateStaffStore, sortConversations } from "@/lib/staff-agents/migrate";
import {
  agentFromRow,
  agentToRow,
  conversationFromRow,
  conversationToRow,
  messageFromRow,
  messageToRow,
} from "@/lib/staff-agents/db/map";
import type {
  StaffAgent,
  StaffAgentUpdate,
  StaffConversation,
  StaffMessage,
  StaffStore,
} from "@/lib/staff-agents/types";

const LEGACY_STORE_PATH = path.join(process.cwd(), "data/staff-store.json");

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function loadLegacyFile(): Promise<StaffStore | null> {
  try {
    const raw = await fs.readFile(LEGACY_STORE_PATH, "utf8");
    return JSON.parse(raw) as StaffStore;
  } catch {
    return null;
  }
}

async function upsertFullStore(store: StaffStore): Promise<void> {
  const sb = createServerSupabaseClient();

  const agentRows = store.agents.map(agentToRow);
  const { error: agentErr } = await sb.from("staff_agents").upsert(agentRows, { onConflict: "id" });
  if (agentErr) throw new Error(`staff_agents upsert: ${agentErr.message}`);

  const convRows = store.conversations.map(conversationToRow);
  const { error: convErr } = await sb.from("staff_conversations").upsert(convRows, { onConflict: "id" });
  if (convErr) throw new Error(`staff_conversations upsert: ${convErr.message}`);

  if (store.messages.length > 0) {
    const msgRows = store.messages.map(messageToRow);
    const { error: msgErr } = await sb.from("staff_messages").upsert(msgRows, { onConflict: "id" });
    if (msgErr) throw new Error(`staff_messages upsert: ${msgErr.message}`);
  }
}

async function ensureBootstrapped(): Promise<void> {
  const sb = createServerSupabaseClient();
  const { count, error } = await sb.from("staff_agents").select("*", { count: "exact", head: true });
  if (error) throw new Error(`Supabase staff_agents: ${error.message}. Run migrations 003 + 004.`);

  if ((count ?? 0) > 0) return;

  const legacy = await loadLegacyFile();
  const store = migrateStaffStore(legacy?.agents?.length ? legacy : createSeedStore());
  await upsertFullStore(store);
}

export async function listAgents(): Promise<StaffAgent[]> {
  await ensureBootstrapped();
  const sb = createServerSupabaseClient();
  const { data, error } = await sb.from("staff_agents").select("*").order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => agentFromRow(r as never));
}

export async function getAgent(id: string): Promise<StaffAgent | undefined> {
  await ensureBootstrapped();
  const sb = createServerSupabaseClient();
  const { data, error } = await sb.from("staff_agents").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? agentFromRow(data as never) : undefined;
}

export async function updateAgent(id: string, patch: StaffAgentUpdate): Promise<StaffAgent | null> {
  const current = await getAgent(id);
  if (!current) return null;

  const { memoryAppend, ...rest } = patch;
  const memory = memoryAppend ? [...current.memory, memoryAppend] : current.memory;

  const updated: StaffAgent = {
    ...current,
    ...rest,
    memory,
    updatedAt: new Date().toISOString(),
  };

  const sb = createServerSupabaseClient();
  const { error } = await sb.from("staff_agents").upsert(agentToRow(updated), { onConflict: "id" });
  if (error) throw new Error(error.message);
  return updated;
}

export async function createAgent(
  input: Omit<StaffAgent, "id" | "createdAt" | "updatedAt" | "memory"> & { memory?: StaffAgent["memory"] }
): Promise<StaffAgent> {
  await ensureBootstrapped();
  const now = new Date().toISOString();
  const agent: StaffAgent = {
    ...input,
    id: newId("agent"),
    memory: input.memory ?? [],
    createdAt: now,
    updatedAt: now,
  };

  const conv: StaffConversation = {
    id: `dm-${agent.id}`,
    type: "dm",
    name: agent.displayName ?? agent.name,
    agentIds: [agent.id],
    createdAt: now,
    updatedAt: now,
  };

  const sb = createServerSupabaseClient();
  const { error: aErr } = await sb.from("staff_agents").insert(agentToRow(agent));
  if (aErr) throw new Error(aErr.message);
  const { error: cErr } = await sb.from("staff_conversations").insert(conversationToRow(conv));
  if (cErr) throw new Error(cErr.message);

  return agent;
}

export async function listConversations(): Promise<StaffConversation[]> {
  await ensureBootstrapped();
  const sb = createServerSupabaseClient();
  const { data, error } = await sb.from("staff_conversations").select("*");
  if (error) throw new Error(error.message);
  return sortConversations((data ?? []).map((r) => conversationFromRow(r as never)));
}

export async function getConversation(id: string): Promise<StaffConversation | undefined> {
  await ensureBootstrapped();
  const sb = createServerSupabaseClient();
  const { data, error } = await sb.from("staff_conversations").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? conversationFromRow(data as never) : undefined;
}

export async function createConversation(input: {
  type: StaffConversation["type"];
  name: string;
  agentIds: string[];
}): Promise<StaffConversation> {
  const now = new Date().toISOString();
  const conv: StaffConversation = {
    id: newId("conv"),
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  const sb = createServerSupabaseClient();
  const { error } = await sb.from("staff_conversations").insert(conversationToRow(conv));
  if (error) throw new Error(error.message);
  return conv;
}

export async function listMessages(conversationId: string): Promise<StaffMessage[]> {
  await ensureBootstrapped();
  const sb = createServerSupabaseClient();
  const { data, error } = await sb
    .from("staff_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => messageFromRow(r as never));
}

export async function appendMessage(
  input: Omit<StaffMessage, "id" | "createdAt">
): Promise<StaffMessage> {
  const message: StaffMessage = {
    ...input,
    id: newId("msg"),
    createdAt: new Date().toISOString(),
  };

  const sb = createServerSupabaseClient();
  const { error: msgErr } = await sb.from("staff_messages").insert(messageToRow(message));
  if (msgErr) throw new Error(msgErr.message);

  const { error: convErr } = await sb
    .from("staff_conversations")
    .update({
      last_message: input.content.slice(0, 120),
      last_message_at: message.createdAt,
      updated_at: message.createdAt,
    })
    .eq("id", input.conversationId);
  if (convErr) throw new Error(convErr.message);

  return message;
}

/** Sync migrated agent metadata (EA, display names) into existing Supabase rows */
export async function syncAgentMetadataFromSeed(): Promise<void> {
  await ensureBootstrapped();
  const seed = migrateStaffStore(createSeedStore());
  const sb = createServerSupabaseClient();

  for (const agent of seed.agents) {
    const existing = await getAgent(agent.id);
    if (!existing) {
      await sb.from("staff_agents").upsert(agentToRow(agent), { onConflict: "id" });
      continue;
    }
    await updateAgent(agent.id, {
      displayName: agent.displayName,
      isOrchestrator: agent.isOrchestrator,
    });
  }

  for (const conv of seed.conversations) {
    const row = conversationToRow(conv);
    await sb.from("staff_conversations").upsert(row, { onConflict: "id" });
  }
}
