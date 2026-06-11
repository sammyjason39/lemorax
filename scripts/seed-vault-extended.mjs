#!/usr/bin/env node
/**
 * Seed Company Vault with realistic MOMs, docs, and wikilinks.
 * Pulls employee names + sales aggregates from Supabase.
 *
 * Usage:
 *   node scripts/seed-vault-extended.mjs          # skip if notes exist
 *   node scripts/seed-vault-extended.mjs --force  # replace all vault data
 */
import {
  createSeedClient,
  fmtRp,
  loadVaultContext,
  newId,
  pick,
  slugify,
  syncAllWikilinks,
  byCabang,
  byDept,
  byJabatan,
} from "./lib/vault-seed-shared.mjs";
import { buildAppendNotes } from "./lib/vault-seed-append-notes.mjs";

const FORCE = process.argv.includes("--force");
const sb = createSeedClient();

function buildNotes(ctx) {
  const m1 = ctx.marketingStaff[0] ?? "Marketing Lead";
  const m2 = ctx.marketingStaff[1] ?? "Marketing Staff";
  const s1 = ctx.salesTeam[0] ?? "Sales Executive";
  const s2 = ctx.salesTeam[1] ?? "Sales Executive";
  const o1 = ctx.opsTeam[0] ?? "Operational Staff";
  const f1 = ctx.financeTeam[0] ?? "Finance Admin";
  const h1 = ctx.hrTeam[0] ?? "HR Admin";

  const branchTable = ctx.topBranches
    .map(([cab, tot]) => `| ${cab} | ${fmtRp(tot)} |`)
    .join("\n");

  const medanMgr = ctx.branchMedan?.nama_lengkap ?? "Branch Manager Medan";
  const surabayaMgr = ctx.branchSurabaya?.nama_lengkap ?? "Branch Manager Surabaya";
  const jakselMgr = ctx.branchJaksel?.nama_lengkap ?? "Branch Manager Jakarta Selatan";

  return [
    {
      title: "Q2 Marketing Plan",
      note_type: "doc",
      tags: ["marketing", "q2", "plan"],
      content: `# Q2 Marketing Plan — PT Lemorax

## Tujuan
- Naikkan qualified leads 20% QoQ
- ROAS Meta Ads ≥ 3.5x (saat ini ~${ctx.avgRoas}x)
- 2 webinar edukasi produk

## Channel
- Meta Ads (retargeting + lookalike) — budget ${fmtRp(ctx.metaSpend)} bulan ini
- LinkedIn thought leadership
- Email nurture existing CRM

Lihat juga [[MOM Rapat Marketing 10 Jun]] dan [[Playbook Meta Ads Q2]].`,
    },
    {
      title: "Ringkasan Penjualan per Cabang",
      note_type: "doc",
      tags: ["sales", "report", "cabang"],
      content: `# Ringkasan Penjualan — ${ctx.periode}

**Total penjualan tercatat:** ${fmtRp(ctx.totalSales)}
**Transaksi closed:** ${ctx.closedCount}+ baris di sistem

| Cabang | Total Penjualan |
|--------|-----------------|
${branchTable || "| — | — |"}

Detail rapat: [[MOM Rapat Sales Weekly 3 Jun]] · [[Sales Performance Q2 2026]]`,
    },
    {
      title: "Sales Performance Q2 2026",
      note_type: "doc",
      tags: ["sales", "q2", "kpi"],
      content: `# Sales Performance Q2 2026

## Highlight
- Pipeline CRM masih kuat di cabang top 3
- ${ctx.salesMgr} memimpin review mingguan dengan tim field
- Target Q2: growth 15% vs Q1

## Cabang prioritas
${ctx.topBranches.map(([c, t], i) => `${i + 1}. **${c}** — ${fmtRp(t)}`).join("\n")}

Terhubung ke [[Ringkasan Penjualan per Cabang]] dan [[MOM Rapat CRM Pipeline 6 Jun]].`,
    },
    {
      title: "MOM Rapat Marketing 10 Jun",
      note_type: "mom",
      tags: ["mom", "marketing"],
      content: `# MOM — Rapat Marketing 10 Jun 2026

**Peserta:** ${ctx.cmo}, ${m1}, ${m2}

## Keputusan
1. Budget Meta Ads Q2 dipertahankan; shift 15% ke retargeting
2. Landing page baru A/B test minggu depan
3. Weekly campaign review setiap Rabu 10:00

## Action items
- @${m1}: draft creative brief → [[Q2 Marketing Plan]]
- @${m2}: siapkan dashboard cohort conversion

## Next meeting
17 Jun 2026, 10:00 WITA`,
    },
    {
      title: "MOM Rapat Sales Weekly 3 Jun",
      note_type: "mom",
      tags: ["mom", "sales", "weekly"],
      content: `# MOM — Sales Weekly 3 Jun 2026

**Peserta:** ${ctx.salesMgr}, ${s1}, ${s2}, ${ctx.salesTeam[2] ?? "Sales Executive"}

## Update pipeline
- Total bulan berjalan: ${fmtRp(ctx.totalSales)}
- Fokus closing deal enterprise di Jakarta & Surabaya

## Keputusan
1. Semua proposal > ${fmtRp(50000000)} wajib review ${ctx.ceo}
2. Discount maks 8% tanpa approval finance

## Action
- @${s1}: follow-up 12 deal stalled → lihat [[MOM Rapat CRM Pipeline 6 Jun]]
- @${s2}: update forecast di [[Sales Performance Q2 2026]]`,
    },
    {
      title: "MOM Rapat Ads Performance 5 Jun",
      note_type: "mom",
      tags: ["mom", "ads", "meta"],
      content: `# MOM — Rapat Ads Performance 5 Jun 2026

**Peserta:** ${ctx.cmo}, ${m1}, ${m2}

## Metrics ${ctx.periode}
- Spend Meta: ${fmtRp(ctx.metaSpend)}
- ROAS rata-rata: **${ctx.avgRoas}x**
- Creative fatigue terdeteksi di ad set lookalike 2%

## Keputusan
1. Refresh 4 creative utama minggu ini
2. Pause ad set ROAS < 2.0x
3. Ikuti [[Playbook Meta Ads Q2]]

## Next
Review bersama [[MOM Rapat Marketing 10 Jun]]`,
    },
    {
      title: "Playbook Meta Ads Q2",
      note_type: "sop",
      tags: ["ads", "meta", "sop"],
      content: `# Playbook Meta Ads Q2

## Struktur campaign
1. Prospecting — broad + interest stack
2. Retargeting — 7d website, 30d engagers
3. Lookalike — purchaser 1%, 3%

## Guardrails
- ROAS floor: 2.5x (pause di bawah 2.0x 3 hari berturut)
- Max CPA: sesuai LTV segment B2B

Referensi: [[Q2 Marketing Plan]] · [[MOM Rapat Ads Performance 5 Jun]]`,
    },
    {
      title: "MOM Operasional Supply Chain 7 Jun",
      note_type: "mom",
      tags: ["mom", "operations"],
      content: `# MOM — Operasional & Supply Chain 7 Jun 2026

**Peserta:** ${o1}, ${ctx.opsTeam[1] ?? "Operational Staff"}, ${f1}

## Isu
- Lead time gudang Surabaya +2 hari karena volume Ramadan carry-over
- Stok safety SKU premium menipis

## Keputusan
1. Transfer stok dari Jakarta Selatan ke Surabaya (200 unit)
2. Daily stock alert di grup ops

## Link
[[MOM Warehouse & Fulfillment]] · [[SOP Proses Order B2B]]`,
    },
    {
      title: "MOM Warehouse & Fulfillment",
      note_type: "mom",
      tags: ["mom", "warehouse"],
      content: `# MOM — Warehouse & Fulfillment 9 Jun 2026

**Peserta:** ${o1}, tim gudang Jakarta & Surabaya

## KPI mingguan
- Order fulfillment < 24 jam: 94%
- Return rate: 1.2%

## Action
- Standardisasi packing checklist
- Integrasi status pengiriman ke CRM

Lihat [[MOM Operasional Supply Chain 7 Jun]].`,
    },
    {
      title: "MOM Kepala Cabang Medan",
      note_type: "meeting",
      tags: ["cabang", "medan"],
      content: `# MOM — Kepala Cabang Medan 4 Jun 2026

**Pimpinan:** ${medanMgr}
**Hadir:** tim sales & CS Medan

## Performa cabang
- Kontribusi penjualan: ${fmtRp(ctx.topBranches.find(([c]) => c.toLowerCase().includes("medan"))?.[1] ?? 0)}

## Isu lokal
- Kompetitor diskon agresif di segment UMKM
- Perlu materi sales lokal Bahasa daerah (opsional)

## Keputusan
- Roadshow 2 kota propinsi minggu 3
- Sync dengan [[MOM Rapat Sales Weekly 3 Jun]]`,
    },
    {
      title: "MOM Kepala Cabang Surabaya",
      note_type: "meeting",
      tags: ["cabang", "surabaya"],
      content: `# MOM — Kepala Cabang Surabaya 4 Jun 2026

**Pimpinan:** ${surabayaMgr}

## Update
- Pipeline B2B manufacturing kuat
- Butuh demo produk onsite + engineer

## Action
- Jadwalkan demo dengan tim product
- Laporan mingguan ke ${ctx.salesMgr}

Terhubung: [[Ringkasan Penjualan per Cabang]]`,
    },
    {
      title: "MOM Kepala Cabang Jakarta Selatan",
      note_type: "meeting",
      tags: ["cabang", "jakarta"],
      content: `# MOM — Kepala Cabang Jakarta Selatan 6 Jun 2026

**Pimpinan:** ${jakselMgr}

## Highlight
- Cabang terbesar by revenue bulan ini
- Fokus enterprise account retention

## Keputusan
1. Dedicated AM untuk top 20 accounts
2. Quarterly business review template standar

Lihat [[Sales Performance Q2 2026]].`,
    },
    {
      title: "MOM Rapat CRM Pipeline 6 Jun",
      note_type: "mom",
      tags: ["mom", "crm"],
      content: `# MOM — CRM Pipeline 6 Jun 2026

**Peserta:** ${ctx.salesMgr}, ${s1}, ${s2}

## Pipeline snapshot
- Stage negotiation: 18 deal
- Stage proposal: 24 deal
- Stalled > 14 hari: 12 deal (prioritas)

## Keputusan
- Weekly pipeline hygiene setiap Senin
- Semua MOM sales referensi [[Sales Performance Q2 2026]]`,
    },
    {
      title: "MOM Rapat Finance & AR 12 Jun",
      note_type: "mom",
      tags: ["mom", "finance"],
      content: `# MOM — Finance & AR 12 Jun 2026

**Peserta:** ${f1}, ${ctx.financeTeam[1] ?? "Finance Manager"}, ${ctx.salesMgr}

## AR aging
- > 30 hari: diturunkan 8% vs bulan lalu
- 3 invoice besar menunggu PO klien

## Keputusan
1. Hold pengiriman untuk 2 akun overdue > 45 hari
2. Cash flow forecast update mingguan`,
    },
    {
      title: "MOM Rapat HR & Talent 14 Jun",
      note_type: "mom",
      tags: ["mom", "hr"],
      content: `# MOM — HR & Talent 14 Jun 2026

**Peserta:** ${h1}, ${ctx.hrTeam[1] ?? "HR Manager"}

## Rekrutmen
- 3 posisi sales executive (Surabaya, Medan, Semarang)
- 1 digital marketing specialist

## Kebijakan
- Hybrid 3 hari office untuk back-office
- Onboarding pack diperbarui Q3`,
    },
    {
      title: "MOM Customer Success Review",
      note_type: "mom",
      tags: ["mom", "cs"],
      content: `# MOM — Customer Success Review 11 Jun 2026

**Peserta:** tim CS, ${ctx.salesMgr}

## NPS & churn
- NPS bulan ini: 46 (target 50)
- Churn B2B: 2.1%

## Action
- Playbook onboarding 30-60-90 hari
- Escalation path ke [[MOM Rapat Executive Committee 1 Jun]] untuk akun strategis`,
    },
    {
      title: "MOM Rapat Executive Committee 1 Jun",
      note_type: "meeting",
      tags: ["executive", "mom"],
      content: `# MOM — Executive Committee 1 Jun 2026

**Peserta:** ${ctx.ceo}, ${ctx.cmo}, ${ctx.salesMgr}, CFO, COO

## Agenda
1. Review ${fmtRp(ctx.totalSales)} penjualan ${ctx.periode}
2. Prioritas H2 — lihat [[Strategic OKR H2 2026]]
3. Alignment marketing-sales

## Keputusan
- Tetapkan growth target 18% H2
- Investasi tool analytics customer journey`,
    },
    {
      title: "Strategic OKR H2 2026",
      note_type: "doc",
      tags: ["okr", "strategy"],
      content: `# Strategic OKR H2 2026

## Company OKR
**O1:** Scale revenue dengan efisiensi
- KR1: Revenue +18% vs H1
- KR2: CAC payback < 8 bulan
- KR3: NPS ≥ 50

**O2:** Operational excellence
- KR1: Fulfillment SLA 96%
- KR2: AR > 30 hari turun 20%

Dokumen terkait: [[MOM Rapat Executive Committee 1 Jun]] · [[Sales Performance Q2 2026]]`,
    },
    {
      title: "Company Handbook — Brand Voice",
      note_type: "sop",
      tags: ["brand", "sop"],
      content: `# Brand Voice Lemorax

- Bahasa Indonesia profesional, hangat
- Data dulu, opini kedua
- Hindari jargon tanpa definisi

## Tone per channel
| Channel | Tone |
|---------|------|
| LinkedIn | Thought leadership |
| Instagram | Edukatif + human interest |
| Email B2B | Formal, ringkas |

Terhubung ke [[Q2 Marketing Plan]] untuk contoh kampanye.`,
    },
    {
      title: "SOP Proses Order B2B",
      note_type: "sop",
      tags: ["sop", "operations"],
      content: `# SOP Proses Order B2B

## Alur
1. Sales input deal di CRM (status: Proposal Sent)
2. Finance cek limit kredit & PO
3. Ops konfirmasi stok → [[MOM Warehouse & Fulfillment]]
4. Pengiriman & update tracking

## SLA
- Quote: 2 hari kerja
- Fulfillment: 1-3 hari kerja (Jabodetabek)

Referensi: [[MOM Operasional Supply Chain 7 Jun]]`,
    },
  ];
}

async function main() {
  const { count } = await sb.from("vault_notes").select("*", { count: "exact", head: true });
  if ((count ?? 0) > 0 && !FORCE) {
    console.log(`Vault extended: skip (${count} notes exist). Use --force to replace.`);
    return;
  }

  if (FORCE && (count ?? 0) > 0) {
    await sb.from("vault_links").delete().neq("id", "");
    await sb.from("vault_notes").delete().neq("id", "");
    console.log("Vault: cleared existing notes & links");
  }

  const ctx = await loadVaultContext(sb);
  const templates = [...buildNotes(ctx), ...buildAppendNotes(ctx)];
  const now = new Date().toISOString();

  const rows = templates.map((n) => ({
    id: newId("vnote"),
    title: n.title,
    slug: slugify(n.title),
    content: n.content,
    tags: n.tags,
    note_type: n.note_type,
    created_at: now,
    updated_at: now,
  }));

  const { error } = await sb.from("vault_notes").insert(rows);
  if (error) throw new Error(`vault_notes: ${error.message}`);

  const linkCount = await syncAllWikilinks(sb, now);

  console.log(`Vault extended: seeded ${rows.length} notes, ${linkCount} wikilinks`);
  console.log(`  Sales total ${ctx.periode}: ${fmtRp(ctx.totalSales)}`);
  console.log(`  Staff names from DB: ${ctx.emps.length} employees loaded`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
