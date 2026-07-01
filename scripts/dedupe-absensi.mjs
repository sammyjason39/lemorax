#!/usr/bin/env node
/**
 * Remove duplicate absensi rows (same periode + employee_id + minggu_ke).
 * Keeps the row with the lowest id.
 *
 * Usage: npm run seed:absensi:dedupe
 *        node scripts/dedupe-absensi.mjs --periode 2026-05
 */
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

const periodeArg = process.argv.find((a) => a.startsWith("--periode="))?.split("=")[1];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const BATCH = 100;

async function fetchAll(periode) {
  const rows = [];
  let from = 0;
  while (true) {
    let q = sb.from("absensi").select("id,periode,employee_id,minggu_ke").order("id");
    if (periode) q = q.eq("periode", periode);
    const { data, error } = await q.range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

async function main() {
  console.log(periodeArg ? `Deduping absensi for ${periodeArg}...` : "Deduping all absensi...");
  const rows = await fetchAll(periodeArg);
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.periode}|${row.employee_id}|${row.minggu_ke ?? ""}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row.id);
  }

  const toDelete = [];
  for (const ids of groups.values()) {
    if (ids.length <= 1) continue;
    ids.sort((a, b) => a - b);
    toDelete.push(...ids.slice(1));
  }

  if (!toDelete.length) {
    console.log("No duplicates found.");
    return;
  }

  console.log(`Deleting ${toDelete.length} duplicate rows...`);
  let ok = 0;
  for (let i = 0; i < toDelete.length; i += BATCH) {
    const batch = toDelete.slice(i, i + BATCH);
    const { error } = await sb.from("absensi").delete().in("id", batch);
    if (error) throw new Error(error.message);
    ok += batch.length;
    process.stdout.write(`\r  ${ok}/${toDelete.length}`);
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
