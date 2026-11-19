#!/usr/bin/env node
/**
 * Extend Lemorax dummy data from the last month in Supabase through today.
 * Re-runnable: refreshes the current month each time (deletes + regenerates).
 * Generates a varied economic-downturn curve (revenue down, costs sticky).
 *
 * Usage: npm run seed:extend
 *        node scripts/seed-extend-data.mjs --dry-run
 *        node scripts/seed-extend-data.mjs --refresh-from=2025-01
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

const DRY_RUN = process.argv.includes("--dry-run");
const FULL_MONTH = process.argv.includes("--full-month");
const REFRESH_FROM = (process.argv.find((a) => a.startsWith("--refresh-from=")) || "")
  .split("=")[1] || null;
const NOW = new Date();
const TODAY = new Date(NOW);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const BATCH = 100;
const DATA_TABLES = ["kpi", "absensi", "sales_report", "finance", "crm", "marketing"];

let HOLIDAY_SET = new Set();

async function loadHolidaySet(years) {
  const { data, error } = await sb
    .from("indonesian_holidays")
    .select("date")
    .in("year", years);
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

function formatYm(y, m) {
  return `${y}-${String(m).padStart(2, "0")}`;
}

function parseYm(ym) {
  const [y, m] = ym.split("-").map(Number);
  return { y, m };
}

function getCurrentPeriode() {
  return formatYm(NOW.getFullYear(), NOW.getMonth() + 1);
}

/** Last month with data we should fill — today's calendar month */
function getEndPeriode() {
  return formatYm(TODAY.getFullYear(), TODAY.getMonth() + 1);
}

function addMonths(ym, delta) {
  let { y, m } = parseYm(ym);
  m += delta;
  while (m > 12) {
    m -= 12;
    y++;
  }
  while (m < 1) {
    m += 12;
    y--;
  }
  return formatYm(y, m);
}

function monthsFromTo(start, end) {
  const out = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = addMonths(cur, 1);
  }
  return out;
}

function daysInMonth(ym) {
  const { y, m } = parseYm(ym);
  return new Date(y, m, 0).getDate();
}

function throughDayForMonth(periode) {
  const endMonth = getEndPeriode();
  if (periode > endMonth) return null;
  if (periode < endMonth) return daysInMonth(periode);
  // Full month seeding: useful when you want demo data through month-end
  // regardless of current calendar day.
  if (FULL_MONTH) return daysInMonth(periode);
  return TODAY.getDate();
}

async function getLatestSalesDay(periode) {
  const { data, error } = await sb
    .from("sales_report")
    .select("tanggal")
    .eq("periode", periode)
    .order("tanggal", { ascending: false })
    .limit(1);
  if (error) throw new Error(`sales_report latest: ${error.message}`);
  if (!data?.length) return 0;
  return parseInt(String(data[0].tanggal).slice(8, 10), 10);
}

async function isMonthIncomplete(periode) {
  const expected = throughDayForMonth(periode);
  if (!expected) return false;
  const latest = await getLatestSalesDay(periode);
  if (!latest) return true;
  // Historical months in this dataset often stop around day 28 — treat near-complete as done
  // so we don't wipe baseline months when filling a long gap to "today".
  const endMonth = getEndPeriode();
  if (periode < endMonth) return latest < Math.min(expected, 27);
  return latest < expected;
}

async function getMaxPeriode(table = "sales_report") {
  const { data, error } = await sb
    .from(table)
    .select("periode")
    .order("periode", { ascending: false })
    .limit(1);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data?.[0]?.periode ?? null;
}

function seededRand(seed) {
  // Park–Miller LCG. Normalize + warm up so nearby seeds (trx+1, trx+2, …)
  // don't collapse to the same first day/value.
  let s = Math.abs(Math.trunc(seed)) % 2147483647;
  if (s === 0) s = 1;
  for (let i = 0; i < 5; i++) s = (s * 16807) % 2147483647;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function varyNum(value, rng, pct = 0.12) {
  const delta = value * pct * (rng() * 2 - 1);
  return Math.round(value + delta);
}

function hashPeriode(periode) {
  return Number(periode.replace("-", ""));
}

/**
 * Economic downturn curve: soft drag → sharper squeeze → volatile bottom.
 * Returns revenue/volume multiplier vs source month (usually < 1).
 * step=1 is first generated month after the source template.
 */
function growthFactorForMonth(periode, step) {
  let factor = 1;
  for (let s = 1; s <= step; s++) {
    const r = seededRand(10007 + s * 97);
    // Phase by distance from source: soft → sharp → sticky/volatile
    let drag;
    if (s <= 6) drag = 0.015 + r() * 0.012; // -1.5%..-2.7%
    else if (s <= 15) drag = 0.025 + r() * 0.02; // -2.5%..-4.5%
    else if (s <= 21) drag = 0.02 + r() * 0.016; // -2.0%..-3.6%
    else drag = 0.014 + r() * 0.018; // -1.4%..-3.2%

    // Rare weak bounce (~8%) — still net down across the horizon
    const monthMul = r() < 0.08 ? 1 + (0.005 + r() * 0.012) : 1 - drag;
    factor *= monthMul;
  }

  // Small periode-specific jitter so sibling months aren't identical
  const jitter = seededRand(hashPeriode(periode) + 91)();
  factor *= 0.975 + jitter * 0.04;

  return Math.max(0.45, Math.min(1.02, factor));
}

/** Sticky costs: expenses fall slower (or creep up) vs revenue → margin squeeze. */
function expenseFactor(revenueFactor, periode) {
  const rng = seededRand(hashPeriode(periode) + 44);
  // stickiness = share of the revenue drop that costs refuse to give back
  const stickiness = 0.45 + rng() * 0.35;
  const inflation = 1 + Math.min(0.08, 0.0025 * Math.max(0, hashPeriode(periode) - 202405));
  return Math.min(1.15, (revenueFactor + (1 - revenueFactor) * stickiness) * inflation);
}

/** Intra-month softness: later days weaker (demand fade / cash squeeze). */
function dayDemandWeight(day, maxDay, periode) {
  const rng = seededRand(hashPeriode(periode) * 10 + day);
  const progress = (day - 1) / Math.max(1, maxDay - 1);
  const curve = 1.08 - progress * 0.28 - Math.pow(progress, 1.6) * 0.12;
  return Math.max(0.62, curve * (0.92 + rng() * 0.16));
}

function randomDateInMonth(ym, rng, maxDay = null) {
  const { y, m } = parseYm(ym);
  const last = maxDay ?? daysInMonth(ym);
  const d = randInt(rng, 1, last);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

async function fetchAll(table, select, filter = {}) {
  const rows = [];
  let from = 0;
  const page = 1000;
  while (true) {
    let q = sb.from(table).select(select).range(from, from + page - 1);
    for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < page) break;
    from += page;
  }
  return rows;
}

async function deletePeriode(table, periode) {
  const { error } = await sb.from(table).delete().eq("periode", periode);
  if (error) throw new Error(`delete ${table} ${periode}: ${error.message}`);
}

async function insertBatches(table, rows, onConflict = null) {
  if (!rows.length) {
    console.log(`  ⏭️  ${table}: 0 rows`);
    return 0;
  }
  let ok = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    let q = sb.from(table).insert(batch);
    if (onConflict) q = sb.from(table).upsert(batch, { onConflict });
    const { error } = await q;
    if (error) throw new Error(`${table} batch ${i / BATCH + 1}: ${error.message}`);
    ok += batch.length;
    process.stdout.write(`  → ${table}: ${ok}/${rows.length}\r`);
  }
  console.log(`  ✅ ${table}: ${ok} rows`);
  return ok;
}

async function getMaxId(table, col, prefix) {
  const { data, error } = await sb.from(table).select(col).order(col, { ascending: false }).limit(1);
  if (error) throw error;
  const val = data?.[0]?.[col] ?? `${prefix}00000`;
  return parseInt(String(val).replace(prefix, ""), 10);
}

function kpiStatus(pct) {
  if (pct >= 100) return "Excellent";
  if (pct >= 90) return "On Track";
  if (pct >= 75) return "Warning";
  return "Below Target";
}

function buildKpi(sourceKpi, periode, monthFraction, growthFactor) {
  return sourceKpi.map((row, i) => {
    const target = row.target;
    // Targets stay ambitious while actuals lag — more Warning / Below Target
    const hardship = 0.88 + seededRand(i * 3 + hashPeriode(periode))() * 0.1;
    const baseActual = Math.max(1, Math.round(row.actual * growthFactor * hardship * monthFraction));
    const actual = varyNum(baseActual, seededRand(i + hashPeriode(periode)), 0.06);
    const achievement_pct = Math.round((actual / target) * 1000) / 10;
    return {
      periode,
      employee_id: row.employee_id,
      nama: row.nama,
      cabang: row.cabang,
      departemen: row.departemen,
      jabatan: row.jabatan,
      kategori_kpi: row.kategori_kpi,
      target,
      actual,
      achievement_pct,
      status: kpiStatus(achievement_pct),
    };
  });
}

function buildAbsensi(sourceAbsensi, periode, weeks) {
  const byEmployee = {};
  for (const row of sourceAbsensi) {
    if (!byEmployee[row.employee_id]) byEmployee[row.employee_id] = [];
    byEmployee[row.employee_id].push(row);
  }

  const out = [];
  for (const [empId, weeksData] of Object.entries(byEmployee)) {
    const template = weeksData.slice(0, weeks);
    for (let w = 0; w < weeks; w++) {
      const src = template[w] ?? template[0];
      const holidaysInWeek = countHolidaysInWeek(periode, w + 1);
      const v = buildRealisticWeekValues(empId, src.cabang, periode, w + 1, holidaysInWeek);
      out.push({
        periode,
        minggu_ke: `Week ${w + 1}`,
        employee_id: empId,
        nama: src.nama,
        cabang: src.cabang,
        jabatan: src.jabatan,
        ...v,
      });
    }
  }
  return out;
}

function buildSales(sourceSales, periode, count, startTrxNum, growthFactor, maxDay = null) {
  const products = [...new Set(sourceSales.map((s) => s.produk))];
  const channels = [...new Set(sourceSales.map((s) => s.channel))];
  // Harder close rates + more cancellations as demand softens
  const statuses =
    growthFactor < 0.7
      ? ["Closed", "Closed", "Pending", "Pending", "Cancelled", "Cancelled"]
      : growthFactor < 0.85
        ? ["Closed", "Closed", "Closed", "Pending", "Cancelled", "Cancelled"]
        : ["Closed", "Closed", "Closed", "Closed", "Pending", "Cancelled"];
  const out = [];
  const lastDay = maxDay ?? daysInMonth(periode);

  for (let i = 0; i < count; i++) {
    const src = sourceSales[i % sourceSales.length];
    const r = seededRand(startTrxNum + i);
    const tanggal = randomDateInMonth(periode, r, maxDay);
    const day = parseInt(tanggal.slice(8, 10), 10);
    const dayW = dayDemandWeight(day, lastDay, periode);
    // Discounting pressure: harga turun lebih cepat dari qty
    const qty = Math.max(1, varyNum(src.qty * growthFactor * dayW, r, 0.14));
    const harga = Math.max(1, varyNum(src.harga_satuan * (0.94 + growthFactor * 0.06), r, 0.05));
    out.push({
      transaction_id: `TRX${String(startTrxNum + i).padStart(6, "0")}`,
      periode,
      tanggal,
      employee_id: src.employee_id,
      sales_name: src.sales_name,
      cabang: src.cabang,
      tipe: src.tipe,
      produk: products[randInt(r, 0, products.length - 1)],
      qty,
      harga_satuan: harga,
      total: qty * harga,
      status: statuses[randInt(r, 0, statuses.length - 1)],
      channel: channels[randInt(r, 0, channels.length - 1)],
    });
  }
  return out;
}

function buildFinance(sourceFinance, periode, sourcePeriode, count, startFinNum, growthFactor) {
  const out = [];
  const expF = expenseFactor(growthFactor, periode);
  for (let i = 0; i < count; i++) {
    const src = sourceFinance[i % sourceFinance.length];
    const r = seededRand(startFinNum + i);
    const keterangan = String(src.keterangan || "").replace(sourcePeriode, periode);
    const isExpense = /pengeluaran|expense|cost/i.test(String(src.tipe || ""));
    const factor = isExpense ? expF : growthFactor;
    // Pemasukan more volatile; pengeluaran stickier with less noise
    const jumlah = varyNum(src.jumlah * factor, r, isExpense ? 0.035 : 0.09);
    out.push({
      periode,
      cabang: src.cabang,
      tipe: src.tipe,
      kategori: src.kategori,
      keterangan: keterangan.includes(periode) ? keterangan : `${src.kategori} - ${src.cabang} ${periode}`,
      jumlah,
      metode_pembayaran: src.metode_pembayaran,
      referensi: `FIN${String(startFinNum + i).padStart(6, "0")}`,
    });
  }
  return out;
}

function buildCrm(sourceCrm, periode, count, startDealNum, growthFactor, maxDay = null) {
  const statuses =
    growthFactor < 0.7
      ? ["Closed Won", "Proposal", "Negotiation", "Prospecting", "Closed Lost", "Closed Lost"]
      : growthFactor < 0.85
        ? ["Closed Won", "Closed Won", "Proposal", "Negotiation", "Closed Lost", "Closed Lost"]
        : ["Closed Won", "Closed Won", "Proposal", "Negotiation", "Prospecting", "Closed Lost"];
  const out = [];
  for (let i = 0; i < count; i++) {
    const src = sourceCrm[i % sourceCrm.length];
    const r = seededRand(startDealNum + i);
    const status = statuses[randInt(r, 0, statuses.length - 1)];
    const followUp = randomDateInMonth(periode, r, maxDay);
    // Deal sizes shrink + more discounting in downturn
    const nilai = varyNum(src.nilai_deal * growthFactor * (0.9 + r() * 0.12), r, 0.08);
    out.push({
      deal_id: `DL${String(startDealNum + i).padStart(5, "0")}`,
      periode,
      nama_perusahaan: src.nama_perusahaan,
      tipe_bisnis: src.tipe_bisnis,
      kota: src.kota,
      cabang_handler: src.cabang_handler,
      account_manager: src.account_manager,
      am_employee_id: src.am_employee_id,
      nama_owner: src.nama_owner,
      jabatan_owner: src.jabatan_owner,
      no_hp_owner: src.no_hp_owner,
      email_owner: src.email_owner,
      tanggal_lahir_owner: src.tanggal_lahir_owner,
      nilai_deal: nilai,
      status,
      produk_utama: src.produk_utama,
      frekuensi_order: src.frekuensi_order,
      last_follow_up: followUp,
      tanggal_closed: status === "Closed Won" ? followUp : null,
      notes: src.notes,
    });
  }
  return out;
}

function buildMarketing(sourceMarketing, periode, monthFraction, growthFactor) {
  return sourceMarketing.map((src, i) => {
    const r = seededRand(i + periode.charCodeAt(5) * 7);
    // Spend cut slower than revenue; CAC rises, ROAS falls
    const spendF = Math.min(1.05, growthFactor + (1 - growthFactor) * 0.35);
    const spend = varyNum(Math.round(src.spend * spendF * monthFraction), r, 0.07);
    const convSoft = growthFactor * (0.82 + r() * 0.12);
    const conversions = varyNum(Math.max(1, Math.round(src.conversions * convSoft * monthFraction)), r, 0.1);
    const revenue = varyNum(Math.round(src.revenue_generated * growthFactor * 0.9 * monthFraction), r, 0.1);
    const impressions = varyNum(Math.round(src.impressions * spendF * monthFraction), r, 0.12);
    const clicks = varyNum(Math.round(src.clicks * convSoft * monthFraction), r, 0.14);
    const ctr = Math.round((clicks / Math.max(impressions, 1)) * 10000) / 100;
    const convRate = Math.round((conversions / Math.max(clicks, 1)) * 10000) / 100;
    return {
      periode,
      campaign_name: src.campaign_name,
      channel: src.channel,
      target_audience: src.target_audience,
      budget: varyNum(src.budget * spendF, r, 0.05),
      spend,
      impressions,
      clicks,
      ctr_pct: ctr || src.ctr_pct,
      conversions,
      conv_rate_pct: convRate || src.conv_rate_pct,
      revenue_generated: revenue,
      roas: Math.round((revenue / Math.max(spend, 1)) * 100) / 100,
      cpl: Math.round(spend / Math.max(conversions, 1)),
      status: src.status,
    };
  });
}

async function resolvePlan() {
  const currentMonth = getCurrentPeriode();
  const endMonth = getEndPeriode();
  const maxPeriode = await getMaxPeriode("sales_report");

  if (!maxPeriode) {
    throw new Error("No sales_report data in Supabase. Run scripts/seed_supabase.py first.");
  }

  const targetMonths = [];

  if (REFRESH_FROM) {
    if (!/^\d{4}-\d{2}$/.test(REFRESH_FROM)) {
      throw new Error(`Invalid --refresh-from=${REFRESH_FROM}. Use YYYY-MM.`);
    }
    if (REFRESH_FROM > endMonth) {
      throw new Error(`--refresh-from=${REFRESH_FROM} is after today (${endMonth}).`);
    }
    targetMonths.push(...monthsFromTo(REFRESH_FROM, endMonth));
  } else {
    // Refresh incomplete tail month (usually the current calendar month)
    if (maxPeriode <= endMonth && (await isMonthIncomplete(maxPeriode))) {
      targetMonths.push(maxPeriode);
    }

    // Then fill every missing month after the DB max through today
    const firstMissing = addMonths(maxPeriode, 1);
    if (firstMissing <= endMonth) {
      for (const m of monthsFromTo(firstMissing, endMonth)) {
        if (!targetMonths.includes(m)) targetMonths.push(m);
      }
    }

    // Current month already in DB but needs a refresh pass
    if (!targetMonths.length) {
      if (maxPeriode >= endMonth) {
        targetMonths.push(endMonth);
      } else {
        targetMonths.push(...monthsFromTo(addMonths(maxPeriode, 1), endMonth));
      }
    }
  }

  const sourcePeriode = addMonths(targetMonths[0], -1);
  const throughDate = TODAY.toISOString().slice(0, 10);

  return { currentMonth, endMonth, maxPeriode, targetMonths, sourcePeriode, throughDate };
}

async function main() {
  const { currentMonth, endMonth, maxPeriode, targetMonths, sourcePeriode, throughDate } =
    await resolvePlan();

  const targetYears = [...new Set(targetMonths.map((m) => Number(m.split("-")[0])))].sort((a, b) => a - b);
  await loadHolidaySet(targetYears);
  console.log(`   Holidays loaded: ${HOLIDAY_SET.size} days for years ${targetYears.join(", ")}`);

  console.log("📊 Lemorax Data Extender");
  console.log(`   DB max periode: ${maxPeriode}`);
  console.log(`   Calendar month: ${currentMonth} | Fill through: ${endMonth}`);
  console.log(`   Target months: ${targetMonths.join(", ")}`);
  console.log(`   Source template: ${sourcePeriode}`);
  console.log(`   Through: ${throughDate}`);
  if (REFRESH_FROM) console.log(`   Force refresh from: ${REFRESH_FROM}`);
  if (DRY_RUN) console.log("   Mode: DRY RUN (no writes)\n");
  else console.log("");

  console.log("📥 Fetching source data...");
  const [sourceKpi, sourceAbsensi, sourceSales, sourceFinance, sourceCrm, sourceMarketing] =
    await Promise.all([
      fetchAll("kpi", "*", { periode: sourcePeriode }),
      fetchAll("absensi", "*", { periode: sourcePeriode }),
      fetchAll("sales_report", "*", { periode: sourcePeriode }),
      fetchAll("finance", "*", { periode: sourcePeriode }),
      fetchAll("crm", "*", { periode: sourcePeriode }),
      fetchAll("marketing", "*", { periode: sourcePeriode }),
    ]);

  if (!sourceSales.length) {
    throw new Error(`No source rows for ${sourcePeriode}. Seed earlier months first.`);
  }

  console.log(`   KPI: ${sourceKpi.length} | Absensi: ${sourceAbsensi.length} | Sales: ${sourceSales.length}`);
  console.log(`   Finance: ${sourceFinance.length} | CRM: ${sourceCrm.length} | Marketing: ${sourceMarketing.length}\n`);

  let trxNum = (await getMaxId("sales_report", "transaction_id", "TRX")) + 1;
  let dealNum = (await getMaxId("crm", "deal_id", "DL")) + 1;
  let finNum = (await getMaxId("finance", "referensi", "FIN")) + 1;

  const allKpi = [];
  const allAbsensi = [];
  const allSales = [];
  const allFinance = [];
  const allCrm = [];
  const allMarketing = [];

  for (const [monthIndex, periode] of targetMonths.entries()) {
    const maxDay = throughDayForMonth(periode);
    const monthFraction = maxDay / daysInMonth(periode);
    const isPartial = monthFraction < 1;
    const weeks = Math.max(1, Math.ceil(maxDay / 7));
    const growthFactor = growthFactorForMonth(periode, monthIndex + 1);

    const vsPct = ((growthFactor - 1) * 100).toFixed(1);
    console.log(
      `🔧 Generating ${periode}${isPartial ? ` (partial, day 1–${maxDay})` : ""} ` +
        `(economy ${vsPct}% vs ${sourcePeriode}, expense sticky)...`
    );

    allKpi.push(...buildKpi(sourceKpi, periode, monthFraction, growthFactor));
    allAbsensi.push(...buildAbsensi(sourceAbsensi, periode, weeks));

    // Volume softens with demand; keep a floor so charts stay readable
    const vol = Math.max(0.55, growthFactor);
    const salesCount = Math.max(1, Math.round(sourceSales.length * vol * monthFraction));
    const financeCount = Math.max(1, Math.round(sourceFinance.length * monthFraction));
    const crmCount = Math.max(1, Math.round(sourceCrm.length * Math.max(0.6, growthFactor) * monthFraction));

    allSales.push(...buildSales(sourceSales, periode, salesCount, trxNum, growthFactor, maxDay));
    trxNum += salesCount;

    allFinance.push(...buildFinance(sourceFinance, periode, sourcePeriode, financeCount, finNum, growthFactor));
    finNum += financeCount;

    allCrm.push(...buildCrm(sourceCrm, periode, crmCount, dealNum, growthFactor, maxDay));
    dealNum += crmCount;

    allMarketing.push(...buildMarketing(sourceMarketing, periode, monthFraction, growthFactor));
  }

  console.log("\n📦 Generated totals:");
  console.log(`   KPI: ${allKpi.length} | Absensi: ${allAbsensi.length} | Sales: ${allSales.length}`);
  console.log(`   Finance: ${allFinance.length} | CRM: ${allCrm.length} | Marketing: ${allMarketing.length}`);

  if (DRY_RUN) {
    console.log("\n🏁 Dry run complete — no data written.");
    return;
  }

  console.log("\n🗑️  Clearing target months before insert...");
  for (const periode of targetMonths) {
    for (const table of DATA_TABLES) {
      await deletePeriode(table, periode);
    }
    console.log(`   cleared ${periode}`);
  }

  console.log("\n📤 Inserting to Supabase...");
  await insertBatches("kpi", allKpi);
  await insertBatches("absensi", allAbsensi);
  await insertBatches("sales_report", allSales, "transaction_id");
  await insertBatches("finance", allFinance);
  await insertBatches("crm", allCrm, "deal_id");
  await insertBatches("marketing", allMarketing);

  console.log("\n🔍 Verification:");
  for (const p of [...targetMonths].reverse()) {
    const { count: k } = await sb.from("kpi").select("*", { count: "exact", head: true }).eq("periode", p);
    const { data: s } = await sb
      .from("sales_report")
      .select("tanggal")
      .eq("periode", p)
      .order("tanggal", { ascending: false })
      .limit(1);
    console.log(`   ${p}: KPI=${k}, latest sales=${s?.[0]?.tanggal ?? "N/A"}`);
  }

  console.log(`\n🎉 Data extended through ${throughDate}. Re-run daily to stay current.`);
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
