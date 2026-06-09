import fs from "fs/promises";
import path from "path";
import { createSeedStore } from "@/lib/staff-agents/seed";
import { migrateStaffStore, sortConversations } from "@/lib/staff-agents/migrate";
import type {
  StaffAgent,
  StaffAgentUpdate,
  StaffConversation,
  StaffMessage,
  StaffStore,
} from "@/lib/staff-agents/types";

const STORE_PATH = path.join(process.cwd(), "data/staff-store.json");

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readStore(): Promise<StaffStore> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return migrateStaffStore(JSON.parse(raw) as StaffStore);
  } catch {
    return migrateStaffStore(createSeedStore());
  }
}

async function writeStore(store: StaffStore): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function listAgents(): Promise<StaffAgent[]> {
  const store = await readStore();
  return store.agents;
}

export async function getAgent(id: string): Promise<StaffAgent | undefined> {
  const store = await readStore();
  return store.agents.find((a) => a.id === id);
}

export async function updateAgent(id: string, patch: StaffAgentUpdate): Promise<StaffAgent | null> {
  const store = await readStore();
  const idx = store.agents.findIndex((a) => a.id === id);
  if (idx < 0) return null;

  const current = store.agents[idx];
  const { memoryAppend, ...rest } = patch;
  const updated: StaffAgent = {
    ...current,
    ...rest,
    memory: memoryAppend ? [...current.memory, memoryAppend] : current.memory,
    updatedAt: new Date().toISOString(),
  };
  store.agents[idx] = updated;
  await writeStore(store);
  return updated;
}

export async function createAgent(
  input: Omit<StaffAgent, "id" | "createdAt" | "updatedAt" | "memory"> & { memory?: StaffAgent["memory"] }
): Promise<StaffAgent> {
  const store = await readStore();
  const now = new Date().toISOString();
  const agent: StaffAgent = {
    ...input,
    id: newId("agent"),
    memory: input.memory ?? [],
    createdAt: now,
    updatedAt: now,
  };
  store.agents.push(agent);
  store.conversations.push({
    id: `dm-${agent.id}`,
    type: "dm",
    name: agent.displayName ?? agent.name,
    agentIds: [agent.id],
    createdAt: now,
    updatedAt: now,
  });
  await writeStore(store);
  return agent;
}

export async function listConversations(): Promise<StaffConversation[]> {
  const store = await readStore();
  return sortConversations(store.conversations);
}

export async function getConversation(id: string): Promise<StaffConversation | undefined> {
  const store = await readStore();
  return store.conversations.find((c) => c.id === id);
}

export async function createConversation(input: {
  type: StaffConversation["type"];
  name: string;
  agentIds: string[];
}): Promise<StaffConversation> {
  const store = await readStore();
  const now = new Date().toISOString();
  const conv: StaffConversation = {
    id: newId("conv"),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  store.conversations.push(conv);
  await writeStore(store);
  return conv;
}

export async function listMessages(conversationId: string): Promise<StaffMessage[]> {
  const store = await readStore();
  return store.messages.filter((m) => m.conversationId === conversationId);
}

export async function appendMessage(
  input: Omit<StaffMessage, "id" | "createdAt">
): Promise<StaffMessage> {
  const store = await readStore();
  const message: StaffMessage = {
    ...input,
    id: newId("msg"),
    createdAt: new Date().toISOString(),
  };
  store.messages.push(message);

  const conv = store.conversations.find((c) => c.id === input.conversationId);
  if (conv) {
    conv.lastMessage = input.content.slice(0, 120);
    conv.lastMessageAt = message.createdAt;
    conv.updatedAt = message.createdAt;
  }

  await writeStore(store);
  return message;
}

export async function syncAgentMetadataFromSeed(): Promise<void> {
  const store = await readStore();
  const seed = migrateStaffStore(createSeedStore());
  for (const agent of seed.agents) {
    const idx = store.agents.findIndex((a) => a.id === agent.id);
    if (idx < 0) store.agents.push(agent);
    else {
      store.agents[idx].displayName = agent.displayName;
      store.agents[idx].isOrchestrator = agent.isOrchestrator;
    }
  }
  for (const conv of seed.conversations) {
    if (!store.conversations.some((c) => c.id === conv.id)) store.conversations.push(conv);
    else {
      const c = store.conversations.find((x) => x.id === conv.id)!;
      Object.assign(c, conv);
    }
  }
  await writeStore(store);
}

export async function exportFullStore(): Promise<StaffStore> {
  return readStore();
}
