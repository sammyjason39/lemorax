---
name: lemorax-aries
description: Query Lemorax ARIES business data via MCP connector.
version: 1.0.0
author: Samuel Jason
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [lemorax, aries, business-data, mcp, dashboard, laundry, content-plan]
    category: productivity
    related_skills: []
---

# Lemorax ARIES Skill

Plug-and-play connector ke **Lemorax ARIES Dashboard** — AI business dashboard
untuk bisnis laundry/retail multi-cabang (Supabase-backed). Setelah
terkonfigurasi, agent bisa langsung menjawab pertanyaan data bisnis dan
mengelola pipeline konten Instagram milik Pak Anjas.

## When to Use

- User menanyakan data bisnis Lemorax: revenue, expense, KPI, sales, CRM
  deals, absensi karyawan, performa marketing, analytics sosmed
- User minta analisis perbandingan periode (bulan ini vs bulan lalu)
- User minta ide konten Instagram / mengelola Content Plan Kanban
- User menyebut "lemorax", "aries", "dashboard", "Pak Anjas", "data laundry"
- User minta setup koneksi ke dashboard Lemorax

## Prerequisites

1. **App Lemorax berjalan** (default lokal: `http://localhost:3001`):
   ```bash
   cd ~/GitHub/lemorax && npm run dev:mcp   # next dev -p 3001
   ```
2. **MCP server terkonfigurasi** di Hermes (`~/.hermes/config.yaml`):
   ```yaml
   mcp_servers:
     lemorax:
       url: "http://localhost:3001/api/mcp"
       headers:
         Authorization: "Bearer <ARIES_MCP_TOKEN>"
       timeout: 120
   ```
   Token: minta ke user, atau baca dari `~/GitHub/lemorax/.env.local`
   (`ARIES_MCP_TOKEN=`) bila ada. Generate baru: `openssl rand -hex 32`.
3. Verifikasi koneksi: `curl http://localhost:3001/api/mcp` harus
   mengembalikan JSON `{"name":"lemorax-aries",...}`.
4. Restart Hermes setelah mengubah config agar MCP server ter-load.

## How to Run

Setup otomatis bila koneksi belum ada:

1. Cek `curl -s http://localhost:3001/api/mcp` — kalau gagal, jalankan
   `cd ~/GitHub/lemorax && npm run dev:mcp` di background.
2. Cek config `mcp_servers.lemorax` di `~/.hermes/config.yaml`. Bila belum
   ada, tambahkan blok YAML di atas (gunakan token dari `.env.local` project,
   jangan pernah menampilkannya di chat).
3. Suruh user restart Hermes, atau pakai `/skills reload --now` bila tersedia.

Setelah konek, semua tools tersedia sebagai MCP tools dengan prefix server
`lemorax` (misal `lemorax__query_business_data` — nama persisnya tergantung
versi Hermes; gunakan tool search bila tidak yakin).

## Quick Reference — Tools

| Tool | Kapan dipakai |
|------|---------------|
| `describe_business_schema` | Selalu panggil **dulu** saat pertama kali / belum yakin kolom |
| `query_business_data` | Pertanyaan data spesifik — tulis SELECT sendiri |
| `get_business_overview` | Ringkasan performa (revenue, expense, KPI, deals, top sales) — paling murah, tanpa SQL |
| `list_content_plan_items` | Lihat kartu Kanban konten (filter `status`) |
| `create_content_idea` | Buat ide konten baru (masuk Backlog) |
| `move_content_status` | Pindah status kartu (backlog/scripting/review/scheduled) |

## Procedure

### Pertanyaan data bisnis
1. Bila pertanyaan umum (revenue/expense/KPI/deals/top sales per periode) →
   `get_business_overview` dengan `periode_start`/`periode_end` format
   `YYYY-MM`, optional `cabang`.
2. Bila pertanyaan spesifik → `describe_business_schema` (jika belum tahu
   kolom), lalu `query_business_data` dengan SQL SELECT.
3. Sajikan angka dengan format Rupiah (mis. Rp 16,6 M) dan selalu sebutkan
   periode + cabang yang dianalisis.
4. Untuk analisis lanjutan yang merujuk query sebelumnya, jalankan query baru
   — MCP stateless, tidak ada konteks query tersimpan.

### Content Plan (Instagram)
1. `list_content_plan_items` untuk melihat kondisi board.
2. Ide baru → `create_content_idea` (`format`: reel/carousel/image/story,
   sertakan `hook` dan `notes`). Kartu masuk ke **Backlog**.
3. Alur kerja agent: backlog → scripting → review → scheduled. Untuk pindah
   ke `scheduled` wajib sertakan `scheduled_at` (ISO).
4. **JANGAN PERNAH mencoba memindahkan kartu ke `published`** — akan ditolak
   oleh server. Publikasi adalah keputusan manusia via dashboard.

### Bahasa & gaya jawab
- Balas dalam Bahasa Indonesia (bahasa UI dashboard).
- Data-driven: selalu sertakan angka dari tool, jangan mengarang.
- Bila data kosong untuk periode itu, katakan apa adanya dan tawarkan
  periode lain.

## Pitfalls

- **Tabel tidak dikenal** → hanya whitelist ini yang boleh di-query:
  `employees, kpi, absensi, sales_report, crm, finance, marketing,
  social_media_profiles, social_media_posts, content_plan_items`.
- **CTE (`WITH`) tidak diizinkan** oleh SQL policy — pakai subquery biasa.
- **Kolom PII** (`no_telepon`, `email`, `gaji_pokok`, ...) otomatis
  `[REDACTED]` — jangan coba menampilkannya.
- **Max 1000 baris** per query — agregasi (SUM/COUNT) lebih disarankan
  daripada dump baris.
- `periode` di tabel KPI/absensi berformat `YYYY-MM`.
- Semua query ter-audit di `agent_query_log` — jangan spam query redundan.

## Verification

- Koneksi: `curl -s http://localhost:3001/api/mcp` → JSON server info.
- Tools hidup: panggil `get_business_overview` tanpa argumen → respons
  `ok: true` dengan angka revenue.
- Bila semua tools gagal dengan connection error: app belum jalan (langkah
  Prerequisites #1) atau token salah (Prerequisites #2).