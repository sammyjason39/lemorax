#!/usr/bin/env node
/** One-time import: data/staff-store.json → Supabase staff_* tables */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

function agentToRow(a) {
  return {
    id: a.id,
    name: a.name,
    display_name: a.displayName ?? null,
    role: a.role,
    description: a.description ?? "",
    avatar_color: a.avatarColor ?? "#1652F0",
    emoji: a.emoji ?? "🤖",
    soul_md: a.soulMd,
    skills: a.skills ?? [],
    schedule: a.schedule ?? {},
    memory: a.memory ?? [],
    status: a.status ?? "online",
    is_orchestrator: a.isOrchestrator ?? false,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  };
}

function conversationToRow(c) {
  return {
    id: c.id,
    type: c.type,
    name: c.name,
    agent_ids: c.agentIds ?? [],
    last_message: c.lastMessage ?? null,
    last_message_at: c.lastMessageAt ?? null,
    orchestrated: c.orchestrated ?? false,
    is_main_group: c.isMainGroup ?? false,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

function messageToRow(m) {
  return {
    id: m.id,
    conversation_id: m.conversationId,
    sender_type: m.senderType,
    sender_agent_id: m.senderAgentId ?? null,
    content: m.content,
    schedule_run: m.scheduleRun ?? false,
    handoff_from: m.handoffFrom ?? null,
    mentions: m.mentions ?? [],
    message_kind: m.messageKind ?? null,
    created_at: m.createdAt,
  };
}

const storePath = path.join(process.cwd(), "data/staff-store.json");
if (!fs.existsSync(storePath)) {
  console.error("No data/staff-store.json found");
  process.exit(1);
}

const store = JSON.parse(fs.readFileSync(storePath, "utf8"));

for (const table of ["staff_agents", "staff_conversations", "staff_messages"]) {
  const { error } = await sb.from(table).select("id").limit(1);
  if (error) {
    console.error(`Table ${table} missing:`, error.message);
    process.exit(1);
  }
}

const { error: aErr } = await sb.from("staff_agents").upsert(store.agents.map(agentToRow), { onConflict: "id" });
if (aErr) {
  console.error("staff_agents:", aErr.message);
  process.exit(1);
}

const { error: cErr } = await sb.from("staff_conversations").upsert(store.conversations.map(conversationToRow), {
  onConflict: "id",
});
if (cErr) {
  console.error("staff_conversations:", cErr.message);
  process.exit(1);
}

if (store.messages?.length) {
  const { error: mErr } = await sb.from("staff_messages").upsert(store.messages.map(messageToRow), {
    onConflict: "id",
  });
  if (mErr) {
    console.error("staff_messages:", mErr.message);
    process.exit(1);
  }
}

const counts = {};
for (const t of ["staff_agents", "staff_conversations", "staff_messages"]) {
  const { count } = await sb.from(t).select("*", { count: "exact", head: true });
  counts[t] = count;
}

console.log("✓ Import selesai:", counts);
