#!/usr/bin/env node
/**
 * Extend Lemorax dummy data from the last month in Supabase through yesterday.
 * Re-runnable: refreshes the current month each time (deletes + regenerates).
 *
 * Usage: npm run seed:extend
 *        node scripts/seed-extend-data.mjs --dry-run
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

const DRY_RUN = process.argv.includes("--dry-run");
const NOW = new Date();
const YESTERDAY = new Date(NOW);
YESTERDAY.setDate(YESTERDAY.getDate() - 1);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const BATCH = 100;
const DATA_TABLES = ["kpi", "absensi", "sales_report", "finance", "crm", "marketing"];

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
  const { y, m } = parseYm(periode);
  const current = getCurrentPeriode();
  if (periode !== current) return null;
  if (YESTERDAY.getFullYear() === y && YESTERDAY.getMonth() + 1 === m) {
    return YESTERDAY.getDate();
  }
  return daysInMonth(periode);
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
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
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

function buildKpi(sourceKpi, periode, monthFraction) {
  return sourceKpi.map((row, i) => {
    const target = row.target;
    const baseActual = Math.max(1, Math.round(row.actual * monthFraction));
    const actual = varyNum(baseActual, seededRand(i + periode.charCodeAt(5)), 0.1);
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
  let idx = 0;
  for (const [empId, weeksData] of Object.entries(byEmployee)) {
    const template = weeksData.slice(0, weeks);
    for (let w = 0; w < weeks; w++) {
      const src = template[w] ?? template[0];
      const r = seededRand(idx++ + periode.charCodeAt(5));
      out.push({
        periode,
        minggu_ke: `Week ${w + 1}`,
        employee_id: empId,
        nama: src.nama,
        cabang: src.cabang,
        jabatan: src.jabatan,
        hadir: randInt(r, Math.max(3, src.hadir - 1), Math.min(5, src.hadir + 1)),
        sakit: randInt(r, 0, src.sakit > 0 ? src.sakit : 1),
        izin: randInt(r, 0, src.izin > 0 ? src.izin : 1),
        alfa: randInt(r, 0, src.alfa),
        terlambat: randInt(r, 0, src.terlambat > 0 ? src.terlambat + 1 : 1),
        wfh: randInt(r, 0, src.wfh > 0 ? src.wfh + 1 : 1),
        total_hari_kerja: 5,
      });
    }
  }
  return out;
}

function buildSales(sourceSales, periode, count, startTrxNum, maxDay = null) {
  const products = [...new Set(sourceSales.map((s) => s.produk))];
  const channels = [...new Set(sourceSales.map((s) => s.channel))];
  const statuses = ["Closed", "Closed", "Closed", "Closed", "Pending", "Cancelled"];
  const out = [];

  for (let i = 0; i < count; i++) {
    const src = sourceSales[i % sourceSales.length];
    const r = seededRand(startTrxNum + i);
    const qty = varyNum(src.qty, r, 0.25);
    const harga = varyNum(src.harga_satuan, r, 0.08);
    const tanggal = randomDateInMonth(periode, r, maxDay);
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

function buildFinance(sourceFinance, periode, sourcePeriode, count, startFinNum) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const src = sourceFinance[i % sourceFinance.length];
    const r = seededRand(startFinNum + i);
    const keterangan = String(src.keterangan || "").replace(sourcePeriode, periode);
    out.push({
      periode,
      cabang: src.cabang,
      tipe: src.tipe,
      kategori: src.kategori,
      keterangan: keterangan.includes(periode) ? keterangan : `${src.kategori} - ${src.cabang} ${periode}`,
      jumlah: varyNum(src.jumlah, r, 0.15),
      metode_pembayaran: src.metode_pembayaran,
      referensi: `FIN${String(startFinNum + i).padStart(6, "0")}`,
    });
  }
  return out;
}

function buildCrm(sourceCrm, periode, count, startDealNum, maxDay = null) {
  const statuses = ["Closed Won", "Closed Won", "Proposal", "Negotiation", "Prospecting", "Closed Lost"];
  const out = [];
  for (let i = 0; i < count; i++) {
    const src = sourceCrm[i % sourceCrm.length];
    const r = seededRand(startDealNum + i);
    const status = statuses[randInt(r, 0, statuses.length - 1)];
    const followUp = randomDateInMonth(periode, r, maxDay);
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
      nilai_deal: varyNum(src.nilai_deal, r, 0.12),
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

function buildMarketing(sourceMarketing, periode, monthFraction) {
  return sourceMarketing.map((src, i) => {
    const r = seededRand(i + periode.charCodeAt(5) * 7);
    const spend = varyNum(Math.round(src.spend * monthFraction), r, 0.1);
    const conversions = varyNum(Math.max(1, Math.round(src.conversions * monthFraction)), r, 0.15);
    const revenue = varyNum(Math.round(src.revenue_generated * monthFraction), r, 0.12);
    return {
      periode,
      campaign_name: src.campaign_name,
      channel: src.channel,
      target_audience: src.target_audience,
      budget: varyNum(src.budget, r, 0.08),
      spend,
      impressions: varyNum(Math.round(src.impressions * monthFraction), r, 0.1),
      clicks: varyNum(Math.round(src.clicks * monthFraction), r, 0.12),
      ctr_pct: src.ctr_pct,
      conversions,
      conv_rate_pct: src.conv_rate_pct,
      revenue_generated: revenue,
      roas: Math.round((revenue / Math.max(spend, 1)) * 100) / 100,
      cpl: Math.round(spend / Math.max(conversions, 1)),
      status: src.status,
    };
  });
}

async function resolvePlan() {
  const currentMonth = getCurrentPeriode();
  const maxPeriode = await getMaxPeriode("sales_report");

  if (!maxPeriode) {
    throw new Error("No sales_report data in Supabase. Run scripts/seed_supabase.py first.");
  }

  let targetMonths;
  if (maxPeriode >= currentMonth) {
    targetMonths = [currentMonth];
  } else {
    targetMonths = monthsFromTo(addMonths(maxPeriode, 1), currentMonth);
  }

  const sourcePeriode = addMonths(targetMonths[0], -1);
  const throughDate = YESTERDAY.toISOString().slice(0, 10);

  return { currentMonth, maxPeriode, targetMonths, sourcePeriode, throughDate };
}

async function main() {
  const { currentMonth, maxPeriode, targetMonths, sourcePeriode, throughDate } = await resolvePlan();

  console.log("📊 Lemorax Data Extender");
  console.log(`   DB max periode: ${maxPeriode}`);
  console.log(`   Target months: ${targetMonths.join(", ")}`);
  console.log(`   Source template: ${sourcePeriode}`);
  console.log(`   Through: ${throughDate} (yesterday)`);
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

  for (const periode of targetMonths) {
    const maxDay = throughDayForMonth(periode);
    const isPartial = maxDay !== null;
    const monthFraction = isPartial ? maxDay / daysInMonth(periode) : 1;
    const weeks = isPartial ? Math.max(1, Math.ceil(maxDay / 7)) : 5;

    console.log(
      `🔧 Generating ${periode}${isPartial ? ` (partial, day 1–${maxDay})` : ""}...`
    );

    allKpi.push(...buildKpi(sourceKpi, periode, monthFraction));
    allAbsensi.push(...buildAbsensi(sourceAbsensi, periode, weeks));

    const salesCount = Math.max(1, Math.round(sourceSales.length * monthFraction));
    const financeCount = Math.max(1, Math.round(sourceFinance.length * monthFraction));
    const crmCount = Math.max(1, Math.round(sourceCrm.length * monthFraction));

    allSales.push(...buildSales(sourceSales, periode, salesCount, trxNum, maxDay));
    trxNum += salesCount;

    allFinance.push(...buildFinance(sourceFinance, periode, sourcePeriode, financeCount, finNum));
    finNum += financeCount;

    allCrm.push(...buildCrm(sourceCrm, periode, crmCount, dealNum, maxDay));
    dealNum += crmCount;

    allMarketing.push(...buildMarketing(sourceMarketing, periode, monthFraction));
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
