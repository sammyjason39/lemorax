#!/usr/bin/env node
/**
 * Rewrite all absensi rows with realistic 94–98% attendance rates.
 * Usage: npm run seed:absensi:repair
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { buildRealisticWeekValues } from "./lib/realistic-absensi.mjs";

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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const BATCH = 100;

function parseWeekIndex(mingguKe) {
  const m = String(mingguKe || "").match(/(\d+)/);
  return m ? Math.max(1, parseInt(m[1], 10)) : 1;
}

async function fetchAll() {
  const rows = [];
  let from = 0;
  const page = 1000;
  while (true) {
    const { data, error } = await sb.from("absensi").select("*").range(from, from + page - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < page) break;
    from += page;
  }
  return rows;
}

async function main() {
  console.log("Fetching absensi rows...");
  const rows = await fetchAll();
  if (!rows.length) {
    console.log("No absensi rows found.");
    return;
  }

  const updates = rows.map((row) => {
    const weekIndex = parseWeekIndex(row.minggu_ke);
    const v = buildRealisticWeekValues(row.employee_id, row.cabang, row.periode, weekIndex);
    return {
      ...row,
      hadir: v.hadir,
      sakit: v.sakit,
      izin: v.izin,
      alfa: v.alfa,
      terlambat: v.terlambat,
      wfh: v.wfh,
      total_hari_kerja: v.total_hari_kerja,
    };
  });

  console.log(`Updating ${updates.length} absensi rows...`);
  let ok = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    const { error } = await sb.from("absensi").upsert(batch, { onConflict: "id" });
    if (error) throw new Error(error.message);
    ok += batch.length;
    process.stdout.write(`\r  ${ok}/${updates.length}`);
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
