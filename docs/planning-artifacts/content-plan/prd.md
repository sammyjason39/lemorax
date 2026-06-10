---
title: Content Plan — Social Media Kanban
status: draft
created: 2026-06-10
updated: 2026-06-10
product: Lemorax ARIES Dashboard
module: Social Media / Soca Agent
---

# PRD: Content Plan (Kanban + Soca)

## 1. Ringkasan

Tab **Content Plan** di halaman Social Media (`/dashboard/social-media`) yang berisi Kanban board untuk mengelola siklus konten Instagram Lemorax — dari ide hingga "published". Agent **Soca** (`soca-social`) dapat membuat ide, menulis script, dan menggeser status kartu secara agentic. **Auto-publish ke Instagram adalah demo/gimmick** pada v1 (tanpa Meta API); sisanya (CRUD, Kanban, script, tool Soca) harus berfungsi nyata.

**Pemilik produk:** Sam (Pak Anjas)  
**Bahasa UI:** Indonesia (konsisten dengan dashboard)

---

## 2. Masalah & Peluang

| Masalah | Dampak |
|---------|--------|
| Ide konten tersebar (chat, notes, kepala) | Tidak ada pipeline terlihat |
| Script konten tidak terpusat | Sulit review sebelum produksi |
| Data performa sosmed sudah ada, belum dipakai untuk perencanaan | Soca punya data tapi tidak mengarahkan konten berikutnya |
| Tidak ada workflow status konten | Tim tidak tahu apa yang siap shoot/edit/publish |

**Peluang:** Satu board + Soca yang membaca metrics real (`social_media_*`) dan mengisi backlog dengan ide berbasis data.

---

## 3. Tujuan & Non-Tujuan

### Tujuan (v1)

1. Pak Anjas melihat dan mengelola semua konten dalam satu Kanban.
2. Soca dapat **membuat kartu**, **menulis/mengedit script**, **memindahkan status** lewat chat Executive HQ / DM Soca.
3. Drag-and-drop manual di UI memicu perubahan status yang sama dengan tool Soca.
4. Tombol **Publish** memberikan pengalaman demo (konfirmasi → animasi → status Published + timestamp) tanpa posting ke Instagram.

### Non-Tujuan (v1)

- Integrasi Meta Graph API / upload media ke Instagram
- Upload file video/gambar ke storage
- Approval multi-user / role-based workflow
- Kalender editorial penuh (hanya `scheduled_at` opsional di kartu)
- Auto-publish tanpa konfirmasi user

---

## 4. Persona & Journey

### Protagonis: Pak Anjas

Setelah sync real time data di tab Analytics, dia pindah ke tab **Content Plan**. Board menampilkan 5 kolom. Dia drag kartu "Tips deterjen kiloan" dari **Backlog** ke **Scripting**, buka panel kanan, edit script Reels. Di chat: *"@Soca buatin 3 ide konten dari performa terakhir"*. Soca membuat 3 kartu di Backlog dengan hook + format. Pak Anjas approve satu kartu → drag ke **Review** → klik **Jadwalkan** (isi Jumat 19:00) → **Scheduled**. Saat siap demo, klik **Publish (Demo)** → modal konfirmasi → kartu pindah ke **Published** dengan badge "Demo — tidak diposting ke IG".

### Protagonis: Soca (agent)

Menerima delegasi dari EA atau mention langsung. Membaca `social_media_profiles` / `social_media_posts`, mengusulkan ide, menulis `script_md` (hook, body, CTA, hashtag), memindahkan status hingga **Scheduled**. **Tidak** boleh memindahkan ke **Published** tanpa aksi user atau flag demo eksplisit.

---

## 5. Kanban — Kolom & Aturan

| Kolom | ID | Makna | Siapa boleh masuk |
|-------|-----|--------|-------------------|
| Backlog | `backlog` | Ide mentah, belum ada script | Soca / user |
| Scripting | `scripting` | Script sedang ditulis | Soca / user |
| Review | `review` | Script siap ditinjau human | User drag atau Soca suggest |
| Scheduled | `scheduled` | Ada `scheduled_at`, siap produksi | User (gate utama) |
| Published | `published` | Selesai / demo publish | **Hanya user** via Publish Demo |

**Aturan transisi:**

- Soca: `backlog` ↔ `scripting` ↔ `review` ↔ `scheduled` (tool `move_content_status`)
- Soca: **dilarang** → `published`
- User: semua transisi via drag-drop atau tombol aksi di card detail
- `published` set `published_at`; gimmick publish set `publish_mode: demo`

---

## 6. Model Data (konseptual)

Tabel: `content_plan_items`

| Field | Tipe | Keterangan |
|-------|------|------------|
| `id` | text PK | |
| `title` | text | Judul singkat kartu |
| `status` | enum | 5 nilai di atas |
| `format` | text | `reel` \| `carousel` \| `image` \| `story` |
| `script_md` | text | Script markdown (hook, body, CTA, hashtags) |
| `notes` | text | Catatan internal |
| `scheduled_at` | timestamptz | Opsional |
| `published_at` | timestamptz | Set saat published |
| `publish_mode` | text | `null` \| `demo` |
| `assigned_agent` | text | Default `soca-social` jika dibuat Soca |
| `created_by` | text | `user` \| `soca-social` |
| `position` | int | Urutan dalam kolom (sort Kanban) |
| `created_at` / `updated_at` | timestamptz | |

---

## 7. Functional Requirements

### UI — Tab & Kanban

| ID | Requirement |
|----|-------------|
| FR-1 | Halaman Social Media punya tab **Analytics** (konten existing) dan **Content Plan** (Kanban baru). |
| FR-2 | Kanban menampilkan 5 kolom sesuai §5 dengan jumlah kartu per kolom. |
| FR-3 | User dapat **membuat kartu** manual (title, format) di Backlog. |
| FR-4 | User dapat **drag-and-drop** kartu antar kolom; UI memanggil API update status + position. |
| FR-5 | Klik kartu membuka **panel detail** (kanan atau modal): title, format, script markdown editor, scheduled_at, notes. |
| FR-6 | Kartu yang disentuh Soca terakhir menampilkan indikator agent (avatar/label Soca). |
| FR-7 | Kolom **Published** menampilkan badge **Demo** jika `publish_mode = demo`. |

### Publish Demo (Gimmick)

| ID | Requirement |
|----|-------------|
| FR-8 | Tombol **Publish (Demo)** hanya aktif dari status `scheduled` atau `review`. |
| FR-9 | Modal konfirmasi menjelaskan: *"Ini simulasi — konten tidak diposting ke Instagram."* |
| FR-10 | Setelah konfirmasi: animasi progress singkat (2–3 detik) → status `published`, `published_at` = now, `publish_mode` = `demo`. |
| FR-11 | Toast sukses: *"Published (demo) — @anjas_maradita"* (username configurable). |

### API

| ID | Requirement |
|----|-------------|
| FR-12 | `GET /api/content-plan` — list semua item, grouped by status. |
| FR-13 | `POST /api/content-plan` — buat item. |
| FR-14 | `PATCH /api/content-plan/[id]` — update field termasuk status, script, position. |
| FR-15 | `POST /api/content-plan/[id]/publish-demo` — gimmick publish dengan validasi gate. |
| FR-16 | `DELETE /api/content-plan/[id]` — hapus kartu (opsional v1, nice-to-have). |

### Soca — Agentic Tools

| ID | Requirement |
|----|-------------|
| FR-17 | Tool `create_content_idea`: title, format, optional script draft → insert `backlog`. |
| FR-18 | Tool `update_content_script`: item id + script_md (+ optional title/notes). |
| FR-19 | Tool `move_content_status`: item id + target status; **reject** jika target = `published`. |
| FR-20 | Saat chat Soca menyentuh topik content plan / ide konten / script, inject konteks board (ringkasan kartu per kolom). |
| FR-21 | Soca dapat memakai data performa sosmed (followers, ER, post terakhir) untuk justify ide dalam script/chat. |

### Seed & Demo

| ID | Requirement |
|----|-------------|
| FR-22 | Script seed minimal 3–5 kartu contoh di berbagai kolom untuk demo board tidak kosong. |

---

## 8. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Drag-drop responsif di desktop; mobile read-only atau simplified list (v1 boleh desktop-first). |
| NFR-2 | API `force-dynamic`, no-store (konsisten social media API). |
| NFR-3 | Perubahan status Soca dan user tercatat `updated_at`; idealnya `last_touched_by` (opsional v1). |
| NFR-4 | Script markdown disimpan plain text; XSS-safe rendering di UI. |

---

## 9. Integrasi Existing

- **Halaman:** `app/dashboard/social-media/page.tsx` → refactor tabs Analytics | Content Plan
- **Agent:** `soca-social` di `lib/staff-agents/seed.ts` — tambah skill `content-plan`
- **LLM:** `lib/staff-agents/llm.ts` — tool routing untuk Soca (mirip social context)
- **DB:** migration `011_content_plan.sql`
- **SQL policy:** tambah `content_plan_items` ke allowed tables (jika Soca query via SQL)

---

## 10. Metrik Sukses

| Metrik | Target v1 |
|--------|-----------|
| User dapat membuat + drag kartu tanpa error | 100% happy path |
| Soca membuat ≥1 kartu dari chat dalam 1 sesi demo | Berhasil |
| Soca menulis script ke kartu existing | Berhasil |
| Publish demo selesai dengan konfirmasi | Berhasil |
| Tidak ada posting nyata ke Instagram | 0 API calls Meta |

---

## 11. Risiko & Mitigasi

| Risiko | Mitigasi |
|--------|----------|
| User kira publish demo = posting nyata | Copy jelas di modal + badge Demo |
| Soca geser semua ke Scheduled tanpa review | Gate: Scheduled disarankan via user; Soca max sampai Review |
| Kanban kosong saat pertama buka | Seed script + CTA "Minta @Soca buatkan ide" |

---

## 12. Rencana Implementasi (urutan disarankan)

1. Migration `011_content_plan.sql` + seed
2. API CRUD + publish-demo
3. UI tab + Kanban + card detail
4. Soca tools (3 tools) + prompt context
5. Polish: animasi publish, indikator Soca

**Estimasi:** 1 sprint kecil (MVP agentic + gimmick publish).

---

## 13. Open Questions

| # | Pertanyaan | Default jika tidak dijawab |
|---|------------|----------------------------|
| OQ-1 | Username default di toast publish demo? | `anjas_maradita` |
| OQ-2 | Apakah EA boleh delegasikan "buat content plan" ke Soca otomatis? | Ya, via orchestrator existing |
| OQ-3 | Perlu history/audit log per kartu? | Defer v2 |

---

## 14. Asumsi

- [ASSUMPTION] Satu brand/account utama (Lemorax / Pak Anjas IG) — tidak multi-account di v1.
- [ASSUMPTION] Bahasa konten default Indonesia.
- [ASSUMPTION] Composio/Meta integration untuk publish nyata masuk v2+.
