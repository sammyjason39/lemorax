import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

export function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

export function createSeedClient() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function slugify(title) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function fmtRp(n) {
  if (!n || Number.isNaN(n)) return "Rp 0";
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

export function pick(arr, n = 1) {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return n === 1 ? out[0] : out;
}

export function byDept(employees, dept) {
  return employees.filter((e) => e.departemen?.toLowerCase().includes(dept.toLowerCase()));
}

export function byJabatan(employees, jab) {
  return employees.filter((e) => e.jabatan?.toLowerCase().includes(jab.toLowerCase()));
}

export function byCabang(employees, cabang) {
  return employees.filter((e) => e.cabang?.toLowerCase().includes(cabang.toLowerCase()));
}

export async function loadVaultContext(sb) {
  const { data: employees } = await sb
    .from("employees")
    .select("nama_lengkap, cabang, departemen, jabatan")
    .eq("status", "Aktif")
    .limit(300);

  const emps = employees ?? [];
  const ceo = byJabatan(emps, "CEO")[0]?.nama_lengkap ?? "Eko Pratama";
  const coo = byJabatan(emps, "COO")[0]?.nama_lengkap ?? "Sari Handoko";
  const cfo = byJabatan(emps, "CFO")[0]?.nama_lengkap ?? "Maya Santoso";
  const cmo = byJabatan(emps, "CMO")[0]?.nama_lengkap ?? "Hendra Santoso";
  const hrMgr = byJabatan(emps, "HR Manager")[0]?.nama_lengkap ?? "Ahmad Purnama";
  const salesMgr = byJabatan(emps, "Sales Manager")[0]?.nama_lengkap ?? "Ahmad Wijaya";
  const financeMgr = byJabatan(emps, "Finance Manager")[0]?.nama_lengkap ?? "Indah Pratama";
  const marketingStaff = pick(byDept(emps, "Marketing"), 3).map((e) => e.nama_lengkap);
  const salesTeam = pick(byDept(emps, "Sales"), 4).map((e) => e.nama_lengkap);
  const opsTeam = pick(byDept(emps, "Operations"), 2).map((e) => e.nama_lengkap);
  const financeTeam = pick(byDept(emps, "Finance"), 2).map((e) => e.nama_lengkap);
  const hrTeam = pick(byDept(emps, "HR"), 2).map((e) => e.nama_lengkap);

  const periode = "2026-06";
  const { data: salesRows } = await sb
    .from("sales_report")
    .select("cabang, total, status, channel")
    .eq("periode", periode)
    .limit(5000);

  const byBranch = new Map();
  let totalSales = 0;
  let closedCount = 0;
  for (const r of salesRows ?? []) {
    const cab = r.cabang || "Lainnya";
    byBranch.set(cab, (byBranch.get(cab) ?? 0) + Number(r.total || 0));
    totalSales += Number(r.total || 0);
    if (r.status === "Closed Won" || r.status === "Selesai") closedCount++;
  }

  const topBranches = [...byBranch.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const branchMedan = byCabang(emps, "Medan")[0];
  const branchSurabaya = byCabang(emps, "Surabaya")[0];
  const branchJaksel = byCabang(emps, "Jakarta Selatan")[0];

  const { data: mktRows } = await sb
    .from("marketing")
    .select("channel, spend, roas, impressions, leads")
    .eq("periode", periode)
    .limit(50);

  let metaSpend = 0;
  let metaRoas = 0;
  let metaImpressions = 0;
  let metaLeads = 0;
  let metaCount = 0;
  let totalMktSpend = 0;
  for (const m of mktRows ?? []) {
    totalMktSpend += Number(m.spend || 0);
    if (String(m.channel).toLowerCase().includes("meta")) {
      metaSpend += Number(m.spend || 0);
      metaRoas += Number(m.roas || 0);
      metaImpressions += Number(m.impressions || 0);
      metaLeads += Number(m.leads || 0);
      metaCount++;
    }
  }
  const avgRoas = metaCount ? (metaRoas / metaCount).toFixed(2) : "3.4";

  const deptCounts = new Map();
  for (const e of emps) {
    const d = e.departemen || "Lainnya";
    deptCounts.set(d, (deptCounts.get(d) ?? 0) + 1);
  }

  const branchManagers = emps
    .filter((e) => String(e.jabatan).toLowerCase().includes("branch manager"))
    .slice(0, 8);

  return {
    ceo,
    coo,
    cfo,
    cmo,
    hrMgr,
    salesMgr,
    financeMgr,
    marketingStaff,
    salesTeam,
    opsTeam,
    financeTeam,
    hrTeam,
    periode,
    totalSales,
    closedCount,
    topBranches,
    branchMedan,
    branchSurabaya,
    branchJaksel,
    branchManagers,
    metaSpend,
    totalMktSpend,
    metaImpressions,
    metaLeads,
    avgRoas,
    emps,
    deptCounts,
  };
}

/** Rebuild vault_links from wikilinks in every note's content */
export async function syncAllWikilinks(sb, now = new Date().toISOString()) {
  const { data: allNotes, error } = await sb.from("vault_notes").select("id, title, slug, content");
  if (error) throw new Error(error.message);

  const map = new Map();
  for (const n of allNotes ?? []) {
    map.set(n.title.toLowerCase(), n.id);
    map.set(n.slug, n.id);
    map.set(slugify(n.title), n.id);
  }

  await sb.from("vault_links").delete().neq("id", "");

  const linkRe = /\[\[([^\]|#]+)/g;
  const links = [];
  for (const note of allNotes ?? []) {
    let m;
    while ((m = linkRe.exec(note.content)) !== null) {
      const target = m[1].trim();
      links.push({
        id: newId("vlink"),
        source_id: note.id,
        target_slug: target,
        target_id: map.get(target.toLowerCase()) ?? map.get(slugify(target)) ?? null,
        link_type: "wikilink",
        created_at: now,
      });
    }
  }

  if (links.length) {
    const { error: lErr } = await sb.from("vault_links").insert(links);
    if (lErr) throw new Error(`vault_links: ${lErr.message}`);
  }
  return links.length;
}

export function buildOrgChart(ctx) {
  const depts = [...ctx.deptCounts.entries()].sort((a, b) => b[1] - a[1]);
  const lines = depts.map(([d, c]) => {
    const leads = ctx.emps
      .filter((e) => e.departemen === d && /manager|head|ceo|coo|cfo|cmo/i.test(e.jabatan))
      .slice(0, 3)
      .map((e) => `${e.nama_lengkap} (${e.jabatan})`);
    const leadStr = leads.length ? leads.join(", ") : "—";
    return `### ${d} (${c} orang)\n- **Pimpinan:** ${leadStr}`;
  });

  const bmLines = ctx.branchManagers.map(
    (e) => `- **${e.cabang}:** ${e.nama_lengkap}`
  );

  return `${lines.join("\n\n")}\n\n## Kepala Cabang\n${bmLines.join("\n") || "- Lihat MOM cabang terkait"}`;
}
