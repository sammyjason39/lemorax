import { buildOrgChart, fmtRp } from "./vault-seed-shared.mjs";

/** Additional vault notes — governance, SOPs, reporting, org */
export function buildAppendNotes(ctx) {
  const m1 = ctx.marketingStaff[0] ?? "Marketing Lead";
  const m2 = ctx.marketingStaff[1] ?? "Marketing Staff";
  const s1 = ctx.salesTeam[0] ?? "Sales Executive";
  const h1 = ctx.hrTeam[0] ?? "HR Admin";
  const f1 = ctx.financeTeam[0] ?? "Finance Admin";
  const o1 = ctx.opsTeam[0] ?? "Operational Staff";
  const orgChart = buildOrgChart(ctx);

  const deptTable = [...ctx.deptCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([d, c]) => `| ${d} | ${c} |`)
    .join("\n");

  const salesBranchTable = ctx.topBranches
    .map(([cab, tot]) => `| ${cab} | ${fmtRp(tot)} |`)
    .join("\n");

  return [
    {
      title: "Keputusan Direksi — Pengelolaan Budget Ads",
      note_type: "mom",
      tags: ["direksi", "ads", "budget", "governance"],
      content: `# Keputusan Direksi — Pengelolaan Budget Ads

**Tanggal:** 15 Jun 2026 · **Rapat:** Direksi & Finance
**Hadir:** ${ctx.ceo} (CEO), ${ctx.cfo} (CFO), ${ctx.cmo} (CMO), ${ctx.financeMgr}

## Latar belakang
Spend iklan digital ${ctx.periode} mencapai ${fmtRp(ctx.metaSpend)} (Meta) dari total marketing ${fmtRp(ctx.totalMktSpend)}. ROAS rata-rata **${ctx.avgRoas}x**. Direksi menetapkan kerangka pengelolaan budget agar aligned dengan [[Strategic OKR H2 2026]].

## Keputusan Direksi
1. **Plafon bulanan Meta Ads:** maks ${fmtRp(Math.round(ctx.metaSpend * 1.1))} — perubahan >10% wajib approval CFO
2. **Floor ROAS:** pause otomatis jika ROAS < 2.0x selama 3 hari (lihat [[Playbook Meta Ads Q2]])
3. **Alokasi channel:** 60% Meta · 25% Google · 15% LinkedIn/experimental
4. **Reporting wajib:** [[Reporting Marketing Bulanan]] dikirim ke Direksi tiap tanggal 5
5. **Escalation:** overspend tanpa PO → review [[MOM Rapat Finance & AR 12 Jun]]

## Tindak lanjut
- @${ctx.cmo}: update [[SOP Marketing Divisi]] & sosialisasi ke tim
- @${ctx.cfo}: integrasikan cap budget ke sistem finance
- @${m1}: eksekusi sesuai [[Q2 Marketing Plan]]

## Dokumen terkait
[[MOM Rapat Ads Performance 5 Jun]] · [[MOM Rapat Executive Committee 1 Jun]] · [[Index SOP Seluruh Divisi]]`,
    },
    {
      title: "SOP Marketing Divisi",
      note_type: "sop",
      tags: ["sop", "marketing"],
      content: `# SOP Marketing Divisi — PT Lemorax

**Penanggung jawab:** ${ctx.cmo}
**Berlaku:** Q2–Q4 2026 · Review triwulanan

## 1. Perencanaan kampanye
1. Brief dari [[Q2 Marketing Plan]] / OKR
2. Creative mengikuti [[Company Handbook — Brand Voice]]
3. Budget mengacu [[Keputusan Direksi — Pengelolaan Budget Ads]]

## 2. Eksekusi paid ads
- Setup campaign: [[Playbook Meta Ads Q2]]
- Daily monitoring ROAS & CPA
- Weekly sync: [[MOM Rapat Marketing 10 Jun]]

## 3. Reporting
- Isi [[Reporting Marketing Bulanan]] sebelum tgl 5
- Dashboard cohort & funnel ke Sales

## 4. Approval matrix
| Nilai aktivasi | Approver |
|----------------|----------|
| < ${fmtRp(10000000)} | Marketing Lead |
| ${fmtRp(10000000)}–${fmtRp(50000000)} | CMO |
| > ${fmtRp(50000000)} | CFO + CEO |

Induk: [[Index SOP Seluruh Divisi]]`,
    },
    {
      title: "SOP Sales Divisi",
      note_type: "sop",
      tags: ["sop", "sales"],
      content: `# SOP Sales Divisi

**Penanggung jawab:** ${ctx.salesMgr}

## Pipeline & CRM
1. Semua deal wajib di CRM — lihat [[MOM Rapat CRM Pipeline 6 Jun]]
2. Update stage maks 48 jam setelah aktivitas
3. Proposal > ${fmtRp(50000000)}: approval ${ctx.ceo}

## Forecast & reporting
- Weekly: [[MOM Rapat Sales Weekly 3 Jun]]
- Bulanan: [[Reporting Sales Bulanan]]
- Performa cabang: [[Ringkasan Penjualan per Cabang]]

## Order & fulfillment
- Proses order B2B: [[SOP Proses Order B2B]]
- Koordinasi cabang: [[MOM Kepala Cabang Jakarta Selatan]], [[MOM Kepala Cabang Surabaya]], [[MOM Kepala Cabang Medan]]

Induk: [[Index SOP Seluruh Divisi]] · Struktur: [[Susunan Organisasi Lemorax]]`,
    },
    {
      title: "SOP Finance Divisi",
      note_type: "sop",
      tags: ["sop", "finance"],
      content: `# SOP Finance Divisi

**Penanggung jawab:** ${ctx.cfo} · **Manager:** ${ctx.financeMgr}

## AR & AP
- Review aging mingguan — [[MOM Rapat Finance & AR 12 Jun]]
- Hold pengiriman jika overdue > 45 hari
- Rekonsiliasi bank harian

## Budget & marketing spend
- Validasi invoice ads vs [[Keputusan Direksi — Pengelolaan Budget Ads]]
- Cap spend channel dicatat per PO

## Reporting
- Laporan keuangan bulanan ke Direksi
- Dukung [[Reporting Sales Bulanan]] (revenue recognition)

Induk: [[Index SOP Seluruh Divisi]]`,
    },
    {
      title: "SOP HR Divisi",
      note_type: "sop",
      tags: ["sop", "hr"],
      content: `# SOP HR Divisi

**Penanggung jawab:** ${ctx.hrMgr}

## Rekrutmen & onboarding
1. Permintaan headcount dari manajer divisi
2. Posting & screening — lihat [[MOM Rapat HR & Talent 14 Jun]]
3. Onboarding pack + [[Peraturan Perusahaan & Kode Etik]]

## People ops
- Absensi & cuti: [[Panduan Kepegawaian & Cuti]]
- Performance review semesteran
- Offboarding & exit interview

## Reporting
- [[Reporting HR Bulanan]] ke Direksi & COO

Induk: [[Index SOP Seluruh Divisi]] · Org: [[Susunan Organisasi Lemorax]]`,
    },
    {
      title: "SOP Operations Divisi",
      note_type: "sop",
      tags: ["sop", "operations"],
      content: `# SOP Operations Divisi

**Koordinator:** ${o1}

## Supply chain
- Daily stock alert — [[MOM Operasional Supply Chain 7 Jun]]
- Transfer antar gudang: approval Ops Manager
- SLA fulfillment 96% (OKR)

## Koordinasi
- Warehouse: [[SOP Warehouse Divisi]]
- Order B2B: [[SOP Proses Order B2B]]
- Customer issue: eskalasi ke [[MOM Customer Success Review]]

Induk: [[Index SOP Seluruh Divisi]]`,
    },
    {
      title: "SOP Warehouse Divisi",
      note_type: "sop",
      tags: ["sop", "warehouse"],
      content: `# SOP Warehouse Divisi

## Receiving & picking
1. GRN dalam 4 jam dari barang datang
2. Pick-pack-ship < 24 jam (Jabodetabek)
3. Checklist packing standar — [[MOM Warehouse & Fulfillment]]

## Inventory
- Safety stock review mingguan
- Cycle count bulanan per SKU A

## Link operasional
[[MOM Operasional Supply Chain 7 Jun]] · [[SOP Operations Divisi]] · [[Index SOP Seluruh Divisi]]`,
    },
    {
      title: "Index SOP Seluruh Divisi",
      note_type: "doc",
      tags: ["sop", "index", "governance"],
      content: `# Index SOP Seluruh Divisi — PT Lemorax

Pusat dokumentasi prosedur operasional standar. Semua karyawan wajib membaca [[Peraturan Perusahaan & Kode Etik]].

## Direksi & Governance
- [[Keputusan Direksi — Pengelolaan Budget Ads]]
- [[Strategic OKR H2 2026]]
- [[Susunan Organisasi Lemorax]]

## SOP per divisi
| Divisi | Dokumen | PIC |
|--------|---------|-----|
| Marketing | [[SOP Marketing Divisi]] | ${ctx.cmo} |
| Sales | [[SOP Sales Divisi]] | ${ctx.salesMgr} |
| Finance | [[SOP Finance Divisi]] | ${ctx.cfo} |
| HR | [[SOP HR Divisi]] | ${ctx.hrMgr} |
| Operations | [[SOP Operations Divisi]] | COO |
| Warehouse | [[SOP Warehouse Divisi]] | ${o1} |

## SOP lintas fungsi
- [[SOP Proses Order B2B]]
- [[Company Handbook — Brand Voice]]
- [[Playbook Meta Ads Q2]]
- [[Panduan Kepegawaian & Cuti]]

## Reporting bulanan
- [[Reporting Marketing Bulanan]]
- [[Reporting Sales Bulanan]]
- [[Reporting HR Bulanan]]

> Diperbarui Jun 2026 — owner dokumentasi: ${ctx.coo} (COO)`,
    },
    {
      title: "Susunan Organisasi Lemorax",
      note_type: "doc",
      tags: ["org", "struktur", "hr"],
      content: `# Susunan Organisasi — PT Lemorax

**Total karyawan aktif:** ${ctx.emps.length} orang
**Periode data:** ${ctx.periode}

## Direksi
| Jabatan | Nama |
|---------|------|
| CEO | ${ctx.ceo} |
| COO | ${ctx.coo} |
| CFO | ${ctx.cfo} |
| CMO | ${ctx.cmo} |

## Struktur per departemen

${orgChart}

## Ringkasan headcount
| Departemen | Jumlah |
|------------|--------|
${deptTable}

## Dokumen terkait
[[Index SOP Seluruh Divisi]] · [[Reporting HR Bulanan]] · [[Peraturan Perusahaan & Kode Etik]]`,
    },
    {
      title: "Reporting Marketing Bulanan",
      note_type: "doc",
      tags: ["reporting", "marketing"],
      content: `# Reporting Marketing — ${ctx.periode}

**Disusun oleh:** ${m1} · **Review:** ${ctx.cmo}

## Ringkasan eksekutif
- Total spend marketing: ${fmtRp(ctx.totalMktSpend)}
- Spend Meta Ads: ${fmtRp(ctx.metaSpend)}
- ROAS rata-rata: **${ctx.avgRoas}x**
- Impressions Meta: ${ctx.metaImpressions.toLocaleString("id-ID")}
- Leads terdata: ${ctx.metaLeads || "—"}

## Channel performance
| Channel | Spend | Catatan |
|---------|-------|---------|
| Meta Ads | ${fmtRp(ctx.metaSpend)} | Ikuti [[Playbook Meta Ads Q2]] |
| Lainnya | ${fmtRp(ctx.totalMktSpend - ctx.metaSpend)} | Google, LinkedIn |

## Compliance budget
- Status vs plafon Direksi: [[Keputusan Direksi — Pengelolaan Budget Ads]]
- Action items dari [[MOM Rapat Ads Performance 5 Jun]]

## Rencana bulan depan
- Lanjutkan retargeting per [[Q2 Marketing Plan]]
- Creative refresh Q3

Lampiran rapat: [[MOM Rapat Marketing 10 Jun]]`,
    },
    {
      title: "Reporting Sales Bulanan",
      note_type: "doc",
      tags: ["reporting", "sales"],
      content: `# Reporting Sales — ${ctx.periode}

**Disusun oleh:** ${ctx.salesMgr} · **Kontribusi tim:** ${s1}, ${ctx.salesTeam[1] ?? "Sales Executive"}

## KPI utama
| Metrik | Nilai |
|--------|-------|
| Total penjualan | ${fmtRp(ctx.totalSales)} |
| Transaksi closed | ${ctx.closedCount}+ |
| Top cabang | ${ctx.topBranches[0]?.[0] ?? "—"} |

## Penjualan per cabang
| Cabang | Total |
|--------|-------|
${salesBranchTable}

## Pipeline
- Snapshot: [[MOM Rapat CRM Pipeline 6 Jun]]
- Weekly rhythm: [[MOM Rapat Sales Weekly 3 Jun]]

## Analisis
- Detail performa: [[Sales Performance Q2 2026]] · [[Ringkasan Penjualan per Cabang]]
- Proses order: [[SOP Sales Divisi]] · [[SOP Proses Order B2B]]

Dikirim ke Direksi bersama [[Reporting Marketing Bulanan]].`,
    },
    {
      title: "Reporting HR Bulanan",
      note_type: "doc",
      tags: ["reporting", "hr"],
      content: `# Reporting HR — ${ctx.periode}

**Disusun oleh:** ${h1} · **Review:** ${ctx.hrMgr}

## Headcount
- Total aktif: **${ctx.emps.length}** karyawan
- Struktur lengkap: [[Susunan Organisasi Lemorax]]

## Headcount per departemen
| Departemen | Jumlah |
|------------|--------|
${deptTable}

## Rekrutmen (status)
- Open role sales: 3 (Surabaya, Medan, Semarang)
- Digital marketing specialist: 1
- Sumber: [[MOM Rapat HR & Talent 14 Jun]]

## People metrics
- Turnover YTD: 4.2%
- Absensi rata-rata: 97.1%
- Onboarding completion: 100% (batch Mei)

## Kebijakan & kepatuhan
- Semua karyawan signed [[Peraturan Perusahaan & Kode Etik]]
- Cuti & benefit: [[Panduan Kepegawaian & Cuti]]

Induk: [[Index SOP Seluruh Divisi]] · SOP: [[SOP HR Divisi]]`,
    },
    {
      title: "Peraturan Perusahaan & Kode Etik",
      note_type: "sop",
      tags: ["hr", "policy", "etik"],
      content: `# Peraturan Perusahaan & Kode Etik

**Berlaku untuk:** seluruh karyawan PT Lemorax
**Pengesahan:** Direksi · ${ctx.ceo}

## Prinsip umum
1. Integritas & transparansi dalam setiap transaksi
2. Hormati data pelanggan & kerahasiaan perusahaan
3. Tidak ada diskriminasi; lingkungan kerja aman
4. Konflik kepentingan wajib dilaporkan ke HR

## Jam kerja & disiplin
- Kantor pusat: Sen–Jum 09:00–18:00 (hybrid 3 hari untuk back-office)
- Cabang: mengikuti jam operasional cabang
- Keterlambatan >3x/bulan: coaching + dokumentasi HR

## Marketing & sales
- Klaim produk harus berbasis data — [[Company Handbook — Brand Voice]]
- Discount di luar matrix [[SOP Sales Divisi]] = pelanggaran prosedur
- Spend iklan wajib sesuai [[Keputusan Direksi — Pengelolaan Budget Ads]]

## Sanksi
- Teguran → SP1 → SP2 → PHK sesuai UU Ketenagakerjaan

## Dokumen pendukung
[[Panduan Kepegawaian & Cuti]] · [[Susunan Organisasi Lemorax]] · [[Index SOP Seluruh Divisi]]`,
    },
    {
      title: "Panduan Kepegawaian & Cuti",
      note_type: "sop",
      tags: ["hr", "cuti", "kepegawaian"],
      content: `# Panduan Kepegawaian & Cuti

**Owner:** ${ctx.hrMgr} · HR Division

## Hak cuti tahunan
- 12 hari/tahun setelah 12 bulan kerja
- Ajukan min. H-3 via sistem HR (kecuali force majeure)
- Maks carry over: 5 hari (expire 31 Maret)

## Cuti khusus
| Jenis | Durasi |
|-------|--------|
| Melahirkan | Sesuai UU |
| Menikah karyawan | 3 hari |
| Keluarga inti meninggal | 2 hari |

## Benefit
- BPJS Kesehatan & Ketenagakerjaan
- THR sesuai regulasi
- Pelatihan internal 2x/tahun

## Onboarding
1. TTD [[Peraturan Perusahaan & Kode Etik]]
2. Orientasi [[Susunan Organisasi Lemorax]]
3. SOP divisi dari [[Index SOP Seluruh Divisi]]

Laporan headcount: [[Reporting HR Bulanan]]`,
    },
    {
      title: "MOM Rapat Direksi Budget Q2",
      note_type: "meeting",
      tags: ["direksi", "budget", "q2"],
      content: `# MOM — Rapat Direksi Budget Q2

**Tanggal:** 18 Jun 2026
**Hadir:** ${ctx.ceo}, ${ctx.coo}, ${ctx.cfo}, ${ctx.cmo}, ${ctx.salesMgr}

## Agenda
1. Realisasi revenue ${fmtRp(ctx.totalSales)} (${ctx.periode})
2. Alokasi budget H2 marketing & sales enablement
3. Finalisasi kebijakan ads

## Keputusan
1. Marketing budget H2 +12% vs H1 dengan syarat ROAS ≥ 3.0x
2. Sales incentive pool tied ke [[Strategic OKR H2 2026]]
3. Adopsi formal [[Keputusan Direksi — Pengelolaan Budget Ads]]

## Dokumen output
- Update [[Q2 Marketing Plan]]
- CFO publish cap ke Finance
- Semua divisi align via [[Index SOP Seluruh Divisi]]

## Lampiran
[[Reporting Marketing Bulanan]] · [[Reporting Sales Bulanan]] · [[MOM Rapat Executive Committee 1 Jun]]`,
    },
  ];
}

/** Append wikilink blocks to existing notes (by slug) for denser graph */
export function getNotePatches() {
  return [
    {
      slug: "mom-rapat-executive-committee-1-jun",
      block: `\n\n## Dokumen governance\n- [[Keputusan Direksi — Pengelolaan Budget Ads]]\n- [[Susunan Organisasi Lemorax]]\n- [[Index SOP Seluruh Divisi]]`,
    },
    {
      slug: "q2-marketing-plan",
      block: `\n\n## Governance & SOP\n- [[Keputusan Direksi — Pengelolaan Budget Ads]]\n- [[SOP Marketing Divisi]]\n- [[Reporting Marketing Bulanan]]`,
    },
    {
      slug: "playbook-meta-ads-q2",
      block: `\n\n## Referensi kebijakan\n- [[Keputusan Direksi — Pengelolaan Budget Ads]]\n- [[SOP Marketing Divisi]]`,
    },
    {
      slug: "mom-rapat-marketing-10-jun",
      block: `\n\n## Dokumen pendukung\n- [[Reporting Marketing Bulanan]]\n- [[SOP Marketing Divisi]]`,
    },
    {
      slug: "mom-rapat-ads-performance-5-jun",
      block: `\n\n## Compliance\n- [[Keputusan Direksi — Pengelolaan Budget Ads]]\n- [[Reporting Marketing Bulanan]]`,
    },
    {
      slug: "sales-performance-q2-2026",
      block: `\n\n## Reporting\n- [[Reporting Sales Bulanan]]\n- [[SOP Sales Divisi]]`,
    },
    {
      slug: "mom-rapat-sales-weekly-3-jun",
      block: `\n\n## SOP & laporan\n- [[SOP Sales Divisi]]\n- [[Reporting Sales Bulanan]]`,
    },
    {
      slug: "mom-rapat-hr-talent-14-jun",
      block: `\n\n## Kebijakan HR\n- [[Peraturan Perusahaan & Kode Etik]]\n- [[Panduan Kepegawaian & Cuti]]\n- [[Reporting HR Bulanan]]`,
    },
    {
      slug: "mom-rapat-finance-ar-12-jun",
      block: `\n\n## Budget ads\n- [[Keputusan Direksi — Pengelolaan Budget Ads]]\n- [[SOP Finance Divisi]]`,
    },
    {
      slug: "strategic-okr-h2-2026",
      block: `\n\n## Operasional\n- [[Index SOP Seluruh Divisi]]\n- [[Susunan Organisasi Lemorax]]\n- [[MOM Rapat Direksi Budget Q2]]`,
    },
    {
      slug: "company-handbook-brand-voice",
      block: `\n\n## Terkait\n- [[SOP Marketing Divisi]]\n- [[Peraturan Perusahaan & Kode Etik]]`,
    },
    {
      slug: "sop-proses-order-b2b",
      block: `\n\n## SOP divisi\n- [[SOP Sales Divisi]]\n- [[SOP Operations Divisi]]\n- [[Index SOP Seluruh Divisi]]`,
    },
  ];
}
