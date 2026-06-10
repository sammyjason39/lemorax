#!/usr/bin/env node
/**
 * Extend Lemorax dummy data from last seeded month up to today.
 * Clones April 2026 patterns with slight variation for missing months.
 *
 * Usage: node scripts/seed-extend-data.mjs
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
const TODAY = new Date("2026-06-10");
const SOURCE_PERIODE = "2026-04";
const TARGET_MONTHS = ["2026-05", "2026-06"];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const BATCH = 100;

// Seeded pseudo-random for reproducible variation
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

function daysInMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function randomDateInMonth(ym, rng, maxDay = null) {
  const [y, m] = ym.split("-").map(Number);
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

async function upsertBatches(table, rows, onConflict = null) {
  let ok = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    let q = sb.from(table).upsert(batch);
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
  const { data, error } = await sb
    .from(table)
    .select(col)
    .order(col, { ascending: false })
    .limit(1);
  if (error) throw error;
  const val = data?.[0]?.[col] ?? `${prefix}00000`;
  return parseInt(val.replace(prefix, ""), 10);
}

function kpiStatus(pct) {
  if (pct >= 100) return "Excellent";
  if (pct >= 90) return "On Track";
  if (pct >= 75) return "Warning";
  return "Below Target";
}

function buildKpi(sourceKpi, periode, rng) {
  return sourceKpi.map((row, i) => {
    const target = row.target;
    const actual = varyNum(row.actual, seededRand(i + periode.charCodeAt(5)), 0.1);
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

function buildAbsensi(sourceAbsensi, periode, rng, weeks) {
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

function buildSales(sourceSales, periode, rng, count, startTrxNum, maxDay = null) {
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

function buildFinance(sourceFinance, periode, rng, count, startFinNum) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const src = sourceFinance[i % sourceFinance.length];
    const r = seededRand(startFinNum + i);
    out.push({
      periode,
      cabang: src.cabang,
      tipe: src.tipe,
      kategori: src.kategori,
      keterangan: src.keterangan.replace(SOURCE_PERIODE, periode),
      jumlah: varyNum(src.jumlah, r, 0.15),
      metode_pembayaran: src.metode_pembayaran,
      referensi: `FIN${String(startFinNum + i).padStart(6, "0")}`,
    });
  }
  return out;
}

function buildCrm(sourceCrm, periode, rng, count, startDealNum, maxDay = null) {
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

function buildMarketing(sourceMarketing, periode, rng) {
  return sourceMarketing.map((src, i) => {
    const r = seededRand(i + periode.charCodeAt(5) * 7);
    const spend = varyNum(src.spend, r, 0.1);
    const conversions = varyNum(src.conversions, r, 0.15);
    const revenue = varyNum(src.revenue_generated, r, 0.12);
    return {
      periode,
      campaign_name: src.campaign_name,
      channel: src.channel,
      target_audience: src.target_audience,
      budget: varyNum(src.budget, r, 0.08),
      spend,
      impressions: varyNum(src.impressions, r, 0.1),
      clicks: varyNum(src.clicks, r, 0.12),
      ctr_pct: src.ctr_pct,
      conversions,
      conv_rate_pct: src.conv_rate_pct,
      revenue_generated: revenue,
      roas: Math.round((revenue / spend) * 100) / 100,
      cpl: Math.round(spend / Math.max(conversions, 1)),
      status: src.status,
    };
  });
}

async function main() {
  console.log("📊 Lemorax Data Extender");
  console.log(`   Source: ${SOURCE_PERIODE} | Target: ${TARGET_MONTHS.join(", ")} (until ${TODAY.toISOString().slice(0, 10)})`);
  if (DRY_RUN) console.log("   Mode: DRY RUN (no writes)\n");
  else console.log("");

  // Check existing data for target months
  for (const p of TARGET_MONTHS) {
    const { count } = await sb.from("kpi").select("*", { count: "exact", head: true }).eq("periode", p);
    if (count > 0) {
      console.log(`⚠️  ${p} already has ${count} KPI rows — will upsert/append`);
    }
  }

  console.log("📥 Fetching source data...");
  const [sourceKpi, sourceAbsensi, sourceSales, sourceFinance, sourceCrm, sourceMarketing] =
    await Promise.all([
      fetchAll("kpi", "*", { periode: SOURCE_PERIODE }),
      fetchAll("absensi", "*", { periode: SOURCE_PERIODE }),
      fetchAll("sales_report", "*", { periode: SOURCE_PERIODE }),
      fetchAll("finance", "*", { periode: SOURCE_PERIODE }),
      fetchAll("crm", "*", { periode: SOURCE_PERIODE }),
      fetchAll("marketing", "*", { periode: SOURCE_PERIODE }),
    ]);

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

  const rng = seededRand(42);

  for (const periode of TARGET_MONTHS) {
    const isPartial = periode === "2026-06";
    const maxDay = isPartial ? TODAY.getDate() : null;
    const monthFraction = isPartial ? TODAY.getDate() / daysInMonth(periode) : 1;

    console.log(`🔧 Generating ${periode}${isPartial ? ` (partial, day 1–${maxDay})` : ""}...`);

    allKpi.push(...buildKpi(sourceKpi, periode, rng));
    allAbsensi.push(...buildAbsensi(sourceAbsensi, periode, rng, isPartial ? 2 : 5));

    const salesCount = Math.round(sourceSales.length * monthFraction);
    const financeCount = Math.round(sourceFinance.length * monthFraction);
    const crmCount = Math.max(1, Math.round(sourceCrm.length * monthFraction));

    allSales.push(...buildSales(sourceSales, periode, rng, salesCount, trxNum, maxDay));
    trxNum += salesCount;

    allFinance.push(...buildFinance(sourceFinance, periode, rng, financeCount, finNum));
    finNum += financeCount;

    allCrm.push(...buildCrm(sourceCrm, periode, rng, crmCount, dealNum, maxDay));
    dealNum += crmCount;

    allMarketing.push(...buildMarketing(sourceMarketing, periode, rng));
  }

  console.log("\n📦 Generated totals:");
  console.log(`   KPI: ${allKpi.length} | Absensi: ${allAbsensi.length} | Sales: ${allSales.length}`);
  console.log(`   Finance: ${allFinance.length} | CRM: ${allCrm.length} | Marketing: ${allMarketing.length}`);

  if (DRY_RUN) {
    console.log("\n🏁 Dry run complete — no data written.");
    return;
  }

  console.log("\n📤 Upserting to Supabase...");
  await upsertBatches("kpi", allKpi);
  await upsertBatches("absensi", allAbsensi);
  await upsertBatches("sales_report", allSales, "transaction_id");
  await upsertBatches("finance", allFinance);
  await upsertBatches("crm", allCrm, "deal_id");
  await upsertBatches("marketing", allMarketing);

  // Verify
  console.log("\n🔍 Verification:");
  for (const p of [...TARGET_MONTHS].reverse()) {
    const { count: k } = await sb.from("kpi").select("*", { count: "exact", head: true }).eq("periode", p);
    const { data: s } = await sb
      .from("sales_report")
      .select("tanggal")
      .eq("periode", p)
      .order("tanggal", { ascending: false })
      .limit(1);
    console.log(`   ${p}: KPI=${k}, latest sales=${s?.[0]?.tanggal ?? "N/A"}`);
  }

  console.log("\n🎉 Data extension selesai!");
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
