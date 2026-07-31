# Auto Deploy ke Coolify VPS via GitHub Actions

Setiap push ke `main` akan otomatis:
1. Pull kode terbaru di VPS
2. Build image Docker
3. Replace container `qey0rb84p977ke3y89oyle49-023606369109`
4. Health check local port 3005

## Setup secrets di GitHub

Buka repo → **Settings → Secrets and variables → Actions → New repository secret**.

Tambahkan secrets berikut:

| Secret | Contoh value |
|--------|--------------|
| `VPS_HOST` | `43.156.118.56` |
| `VPS_USER` | `ubuntu` |
| `VPS_PASSWORD` | `forest-38$-storm` |
| `VPS_PORT` | `22` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://...supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` |
| `NEXT_PUBLIC_APP_URL` | `https://lemorax.indonesiabelajarai.com` |
| `QWEN_API_BASE_URL` | `https://...` |
| `QWEN_API_KEY` | `sk-ws-...` |
| `QWEN_MODEL` | `qwen3.7-plus` |
| `COMPOSIO_API_KEY` | `ak_...` |
| `COMPOSIO_USER_ID` | `lemorax-pak-anjas` |
| `OPENCLAW_GATEWAY_URL` | `ws://127.0.0.1:18789` |
| `OPENCLAW_GATEWAY_TOKEN` | `...` |
| `OPENCLAW_INTEGRATION_MODE` | `ws` |
| `OPENCLAW_DEFAULT_AGENT` | `main` |

## Trigger manual

Buka **Actions → Deploy to Coolify VPS → Run workflow**.

## Ganti ke SSH key (lebih aman)

Jika ingin pakai SSH key daripada password:
1. Generate key pair di lokal: `ssh-keygen -t ed25519 -f lemorax_deploy`
2. Tambahkan public key ke VPS: `~/.ssh/authorized_keys`
3. Di GitHub, ganti secret `VPS_PASSWORD` dengan `VPS_SSH_KEY`
4. Di `.github/workflows/deploy.yml`, ubah `password:` menjadi `key: ${{ secrets.VPS_SSH_KEY }}`
