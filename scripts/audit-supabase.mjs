#!/usr/bin/env node
/** Audit Supabase tables: existence, row counts, schema gaps */
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
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const EXPECTED_TABLES = {
  // Business BI data (from ARIES prompts)
  employees: { minRows: 1, purpose: "Data karyawan Lemorax" },
  kpi: { minRows: 1, purpose: "KPI per karyawan" },
  absensi: { minRows: 1, purpose: "Absensi mingguan" },
  sales_report: { minRows: 1, purpose: "Transaksi sales" },
  crm: { minRows: 1, purpose: "Deal CRM" },
  finance: { minRows: 1, purpose: "Pemasukan/pengeluaran" },
  marketing: { minRows: 1, purpose: "Campaign marketing" },
  // Agent tooling
  agent_query_log: { minRows: 0, purpose: "Audit log SQL agent" },
  // Staff agents chat
  staff_agents: { minRows: 5, purpose: "AI staff agents (EA + 4 spesialis)" },
  staff_conversations: { minRows: 6, purpose: "DM + Executive HQ" },
  staff_messages: { minRows: 1, purpose: "Chat history" },
};

const STAFF_AGENT_IDS = [
  "executive-assistant",
  "aries-analyst",
  "finance-guardian",
  "marketing-pulse",
  "hr-companion",
];

const STAFF_CONV_IDS = [
  "dm-executive-assistant",
  "group-executive",
  "dm-aries-analyst",
  "dm-finance-guardian",
  "dm-marketing-pulse",
  "dm-hr-companion",
];

async function countTable(name) {
  const { count, error } = await sb.from(name).select("*", { count: "exact", head: true });
  if (error) return { error: error.message, count: null };
  return { count: count ?? 0 };
}

async function main() {
  console.log("=== SUPABASE AUDIT ===");
  console.log("Project:", url.replace("https://", "").split(".")[0]);
  console.log("");

  const results = [];
  for (const [table, meta] of Object.entries(EXPECTED_TABLES)) {
    const { count, error } = await countTable(table);
    const status = error
      ? "MISSING/ERROR"
      : count === 0
        ? "KOSONG"
        : count < meta.minRows
          ? "KURANG"
          : "OK";
    results.push({ table, count, status, error, ...meta });
  }

  console.log("TABLE OVERVIEW");
  console.log("-".repeat(80));
  for (const r of results) {
    const cnt = r.error ? `ERR: ${r.error.slice(0, 50)}` : String(r.count);
    console.log(`${r.status.padEnd(14)} ${r.table.padEnd(22)} rows=${cnt.padEnd(6)} — ${r.purpose}`);
  }

  // Staff agents detail
  console.log("\n=== STAFF AGENTS DETAIL ===");
  const { data: agents, error: agentErr } = await sb.from("staff_agents").select("id,name,display_name,is_orchestrator,status");
  if (agentErr) {
    console.log("Error:", agentErr.message);
  } else {
    const ids = new Set((agents ?? []).map((a) => a.id));
    for (const id of STAFF_AGENT_IDS) {
      const a = agents?.find((x) => x.id === id);
      if (!a) console.log(`MISSING agent: ${id}`);
      else
        console.log(
          `OK  ${a.id} | display=${a.display_name ?? "(null)"} | orchestrator=${a.is_orchestrator} | ${a.name}`
        );
    }
    for (const a of agents ?? []) {
      if (!STAFF_AGENT_IDS.includes(a.id)) console.log(`EXTRA agent: ${a.id}`);
    }
    if (!agents?.some((a) => a.id === "executive-assistant" && a.is_orchestrator))
      console.log("WARN: executive-assistant missing or not marked is_orchestrator");
    if (agents?.some((a) => !a.display_name && a.id !== "executive-assistant"))
      console.log("WARN: some agents missing display_name");
  }

  // Conversations
  console.log("\n=== STAFF CONVERSATIONS ===");
  const { data: convs, error: convErr } = await sb
    .from("staff_conversations")
    .select("id,type,name,orchestrated,is_main_group,agent_ids");
  if (convErr) {
    console.log("Error:", convErr.message);
  } else {
    for (const id of STAFF_CONV_IDS) {
      const c = convs?.find((x) => x.id === id);
      if (!c) console.log(`MISSING conversation: ${id}`);
      else {
        const flags = [c.orchestrated ? "orchestrated" : "", c.is_main_group ? "main_group" : ""]
          .filter(Boolean)
          .join(",");
        console.log(`OK  ${c.id} (${c.type}) "${c.name}" agents=${c.agent_ids?.length ?? 0} ${flags}`);
      }
    }
    const hq = convs?.find((c) => c.id === "group-executive");
    if (hq && !hq.orchestrated) console.log("WARN: group-executive orchestrated=false");
    if (hq && !hq.is_main_group) console.log("WARN: group-executive is_main_group=false");
    if (hq && !(hq.agent_ids ?? []).includes("executive-assistant"))
      console.log("WARN: Executive HQ missing executive-assistant in agent_ids");
  }

  // Messages per conversation
  console.log("\n=== STAFF MESSAGES (per conversation) ===");
  const { data: msgs, error: msgErr } = await sb
    .from("staff_messages")
    .select("conversation_id");
  if (msgErr) {
    console.log("Error:", msgErr.message);
  } else {
    const byConv = {};
    for (const m of msgs ?? []) {
      byConv[m.conversation_id] = (byConv[m.conversation_id] ?? 0) + 1;
    }
    for (const id of STAFF_CONV_IDS) {
      const n = byConv[id] ?? 0;
      console.log(`${n === 0 ? "KOSONG" : "OK  "} ${id}: ${n} messages`);
    }
    const orphan = Object.keys(byConv).filter((id) => !STAFF_CONV_IDS.includes(id) && !convs?.some((c) => c.id === id));
    if (orphan.length) console.log("WARN: messages in unknown conversations:", orphan);
  }

  // Column spot-check via sample row
  console.log("\n=== SCHEMA SPOT-CHECK (staff_messages columns) ===");
  const { data: sampleMsg, error: sampleErr } = await sb.from("staff_messages").select("*").limit(1).maybeSingle();
  if (sampleErr) console.log("Error:", sampleErr.message);
  else if (!sampleMsg) console.log("No messages to inspect columns");
  else {
    const expectedCols = [
      "id",
      "conversation_id",
      "sender_type",
      "sender_agent_id",
      "content",
      "schedule_run",
      "handoff_from",
      "mentions",
      "message_kind",
      "created_at",
    ];
    for (const col of expectedCols) {
      console.log(`${col in sampleMsg ? "OK" : "MISSING"}  ${col}`);
    }
  }

  const issues = results.filter((r) => r.status !== "OK");
  console.log("\n=== RINGKASAN ===");
  if (issues.length === 0) console.log("Semua tabel expected dalam kondisi OK.");
  else {
    console.log(`${issues.length} tabel perlu perhatian:`);
    for (const r of issues) console.log(`  - ${r.table}: ${r.status}${r.error ? ` (${r.error})` : ""}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
