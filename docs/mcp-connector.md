# AIRIN MCP Connector — Hermes & Claude Code

Lemorax exposes an **MCP (Model Context Protocol) server** at `/api/mcp` so local
AI agents (Hermes, Claude Code, or any MCP client) can talk to the business data
directly: query sales/finance/HR/KPI/CRM data and manage the Instagram content
plan Kanban.

## Cara kerja

```
┌─────────────┐   JSON-RPC 2.0    ┌──────────────────────────┐      ┌──────────┐
│ Hermes /    │ ────────────────► │  Next.js app (port 3001) │ ───► │ Supabase │
│ Claude Code │  Bearer token     │  POST /api/mcp           │      │  (data)  │
└─────────────┘                   └──────────────────────────┘      └──────────┘
```

- **Transport:** Streamable HTTP (stateless JSON-RPC 2.0) — setiap request
  berdiri sendiri, tidak ada session yang perlu dipertahankan.
- **Auth:** header `Authorization: Bearer <AIRIN_MCP_TOKEN>`.
- **Keamanan:** semua query SQL lewat `sql-policy.ts` (read-only, whitelist
  tabel, PII auto-redacted), semua aktivitas tercatat di tabel
  `agent_query_log`.

## 1. Jalankan app di port 3001

```bash
cp .env.example .env.local   # isi Supabase + AIRIN_MCP_TOKEN
npm run dev:mcp              # next dev -p 3001
```

Generate token:

```bash
openssl rand -hex 32
```

Verify endpoint hidup:

```bash
curl http://localhost:3001/api/mcp
```

## 2. Sambungkan Hermes

Tambahkan ke `~/.hermes/config.yaml` (key top-level `mcp_servers`):

```yaml
mcp_servers:
  lemorax:
    url: "http://localhost:3001/api/mcp"
    headers:
      Authorization: "Bearer <AIRIN_MCP_TOKEN>"
    timeout: 120
```

> Cara paling mudah: install **skill `lemorax-airin`** (lihat bagian bawah
> README) — skill ini otomatis memandu setup + punya playbook query bisnis.

Contoh pemakaian di chat Hermes:

> "Berapa revenue bulan ini dibanding bulan lalu?"
> "@lemorax buatin 3 ide konten IG dari performa terakhir"

## 3. Sambungkan Claude Code

```bash
claude mcp add --transport http lemorax http://localhost:3001/api/mcp \
  --header "Authorization: Bearer <AIRIN_MCP_TOKEN>"
```

Atau manual di `.mcp.json` (project) / `~/.claude.json` (global):

```json
{
  "mcpServers": {
    "lemorax": {
      "type": "http",
      "url": "http://localhost:3001/api/mcp",
      "headers": {
        "Authorization": "Bearer <AIRIN_MCP_TOKEN>"
      }
    }
  }
}
```

## Tools yang tersedia

| Tool | Fungsi |
|------|--------|
| `describe_business_schema` | Daftar tabel + kolom bisnis (panggil dulu sebelum nulis SQL) |
| `query_business_data` | SELECT read-only ke data bisnis (policy-checked, PII redacted) |
| `get_business_overview` | Ringkasan performa: revenue, expense, KPI, deals, top sales |
| `list_content_plan_items` | Lihat kartu Kanban Content Plan (status optional) |
| `create_content_idea` | Buat kartu ide konten baru di Backlog |
| `move_content_status` | Pindah status kartu (backlog/scripting/review/scheduled) |

## Batasan (by design)

1. **Read-only SQL** — hanya `SELECT`, tanpa CTE, whitelist tabel, max 1000
   baris. Tulis ke database hanya lewat `create_content_idea` /
   `move_content_status`.
2. **`published` dikunci** — agent tidak bisa memindahkan kartu ke status
   `published`. Publikasi selalu keputusan manusia via dashboard.
3. **PII redacted** — `no_telepon`, `email`, `gaji_pokok`, dll otomatis
   jadi `[REDACTED]`.
4. **Audit** — setiap query tercatat di `agent_query_log` dengan source
   `mcp` / `mcp-airin`.

## Deploy

Endpoint yang sama bekerja di production (VPS/Coolify). Set `AIRIN_MCP_TOKEN`
di environment, lalu arahkan Hermes/Claude Code ke
`https://<domain>/api/mcp`. Untuk akses lokal-only, jangan ekspos `/api/mcp`
ke internet publik (blok di nginx bila perlu).