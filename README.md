# Lemorax — AIRIN Dashboard

AI business dashboard untuk Lemorax (laundry & retail multi-cabang) dengan
**staf AI virtual** yang bisa diobrol lewat chat, plus **MCP server** yang
membuat dashboard ini bisa di-*tap in* langsung oleh AI agent eksternal
(Hermes, Claude Code, Cursor, dll).

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres) · Recharts · SWR

---

## Apa yang bisa dilakukan dari sini

| Module (`/dashboard/...`) | Isi |
|---|---|
| Overview | Metrik ringkas + grafik revenue, per-cabang, alert |
| HR / KPI | Karyawan, absensi, KPI achievement |
| Sales / CRM | Transaksi, pipeline deals |
| Finance | Revenue vs expense, trend bulanan |
| Marketing | Campaign performance |
| Social Media | Analytics Instagram + **Content Plan Kanban** (ide → script → review → scheduled → published) |
| AI Analyst | Chat dengan **AIRIN agent** — tanya data bisnis pakai bahasa natural |
| Vault / Workspace | Dokumen internal, knowledge base |

### AI di dalam dashboard
- **AIRIN agent** (`/dashboard/ai-analyst` + floating chat) — analisis data
  bisnis via chat, generate SQL read-only, stream jawaban.
- **Staff Agents** (`lib/staff-agents/`) — multi-agent (Soca = social media,
  dll) dengan orchestrator, memory, dan jadwal.

### AI dari luar dashboard (MCP connector)
Dashboard mengekspos **MCP server** di `/api/mcp` — Hermes / Claude Code /
agent MCP lain bisa langsung query data bisnis dan mengelola Content Plan
tanpa membuka browser. Panduan lengkap: [`docs/mcp-connector.md`](docs/mcp-connector.md).

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env.local
# isi: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#       SUPABASE_SERVICE_ROLE_KEY, AIRIN_MCP_TOKEN
# generate token: openssl rand -hex 32

# 3. Setup database (Supabase SQL Editor atau MCP)
#    jalankan supabase/schema.sql + supabase/migrations/*.sql berurutan

# 4. Isi data dummy (opsional, untuk demo)
npm run seed:extend
npm run seed:social
npm run seed:content-plan

# 5. Jalankan
npm run dev        # http://localhost:3000 (dashboard)
npm run dev:mcp    # http://localhost:3001 (mode khusus agent/MCP)
```

### Scripts penting

| Script | Fungsi |
|---|---|
| `npm run dev` | Dev server port 3000 |
| `npm run dev:mcp` | Dev server **port 3001** — untuk konektor AI lokal |
| `npm run build` / `start` | Production |
| `npm run seed:*` | Seed data dummy (finance, HR, social, vault) |
| `npm run test:e2e` | Playwright E2E tests |

---

## Hubungkan AI Agent (plug & play)

### Hermes

1. Jalankan app: `npm run dev:mcp` (port 3001).
2. Tambahkan ke `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  lemorax:
    url: "http://localhost:3001/api/mcp"
    headers:
      Authorization: "Bearer <AIRIN_MCP_TOKEN>"
```

3. Buka `hermes` — langsung bisa: *"Berapa revenue bulan ini dibanding bulan
   lalu?"* atau *"@lemorax buatin 3 ide konten IG dari performa terakhir"*.

**Atau cara instan:** install skill **`lemorax-airin`** dari
[`skills/lemorax-airin/`](skills/lemorax-airin/) — copy foldernya ke
`~/.hermes/skills/`, lalu di Hermes: `/skills install` atau langsung
`/lemorax` untuk playbook lengkap + langkah setup otomatis.

### Claude Code

```bash
claude mcp add --transport http lemorax http://localhost:3001/api/mcp \
  --header "Authorization: Bearer <AIRIN_MCP_TOKEN>"
```

### Agent MCP lain (Cursor, dll)

Semua client MCP yang mendukung Streamable HTTP bisa konek ke
`http://localhost:3001/api/mcp` dengan header `Authorization: Bearer <token>`.

### Aturan keamanan (by design)

- Hanya `SELECT` read-only, whitelist tabel, max 1000 baris, PII auto-redacted.
- Agent **tidak bisa** memindahkan konten ke status `published` — keputusan
  manusia tetap di dashboard.
- Semua query tercatat di tabel `agent_query_log`.

---

## Struktur Proyek

```
app/
  dashboard/          # Halaman UI per domain (overview, hr, sales, ...)
  api/                # API routes per domain + /api/mcp (MCP server) + /api/ai-chat
components/           # UI components per modul (cards, charts, tables, ...)
lib/
  agents/             # AIRIN agent (planner, SQL policy, query executor, SSE)
  staff-agents/       # Multi-agent framework (orchestrator, memory, schedules)
  mcp/                # MCP server tools & schemas (konektor AI eksternal)
  openrouter.ts       # LLM calls
  supabase.ts         # DB clients (anon + service role)
supabase/             # schema.sql + migrations/
skills/               # Skill bundle (marketing-basics, lemorax-airin)
docs/                 # mcp-connector.md + planning artifacts
deploy/               # nginx, GitHub Actions docs
```

## Deploy

Docker + Coolify VPS — lihat `Dockerfile`, `docker-compose.yml`, dan
`deploy/GITHUB_ACTIONS.md`. Untuk produksi, set `AIRIN_MCP_TOKEN` di
environment dan arahkan agent ke `https://<domain>/api/mcp`. Blok `/api/mcp`
di nginx bila ingin endpoint tetap lokal-only.