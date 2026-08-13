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
let HOLIDAY_SET = new Set();

function parseWeekIndex(mingguKe) {
  const m = String(mingguKe || "").match(/(\d+)/);
  return m ? Math.max(1, parseInt(m[1], 10)) : 1;
}

async function loadHolidaySet() {
  const { data, error } = await sb.from("indonesian_holidays").select("date");
  if (error) {
    console.warn("Could not load holidays:", error.message);
    return;
  }
  HOLIDAY_SET = new Set((data ?? []).map((h) => h.date));
}

function weekDateRange(periode, weekIndex) {
  const [y, m] = periode.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const start = new Date(firstDay);
  start.setDate(start.getDate() + (weekIndex - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const lastDay = new Date(y, m, 0);
  if (end > lastDay) end.setTime(lastDay.getTime());
  return { start, end };
}

function countHolidaysInWeek(periode, weekIndex) {
  const { start, end } = weekDateRange(periode, weekIndex);
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const iso = cur.toISOString().split("T")[0];
    if (HOLIDAY_SET.has(iso)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
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
  await loadHolidaySet();
  console.log(`   Holidays loaded: ${HOLIDAY_SET.size} days`);
  const rows = await fetchAll();
  if (!rows.length) {
    console.log("No absensi rows found.");
    return;
  }

  const updates = rows.map((row) => {
    const weekIndex = parseWeekIndex(row.minggu_ke);
    const holidaysInWeek = countHolidaysInWeek(row.periode, weekIndex);
    const v = buildRealisticWeekValues(row.employee_id, row.cabang, row.periode, weekIndex, holidaysInWeek);
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
