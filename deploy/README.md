# Deploy Lemorax ke VPS

Cara paling cepat: build image Docker, jalankan container, dan expose via Nginx + SSL.

## Prasyarat VPS
- Ubuntu 22.04/24.04 (disarankan)
- Docker + Docker Compose plugin terinstall
- Domain mengarah ke IP VPS (contoh: `lemorax.indonesiabelajarai.com`)
- SSL certificate (misal dari Let's Encrypt via `certbot`)

## Langkah-langkah

1. **Clone repo di VPS**
   ```bash
   git clone https://github.com/sammyjason39/lemorax.git /opt/lemorax
   cd /opt/lemorax
   ```

2. **Buat `.env.local` dari template**  
   Isi semua variabel yang dibutuhkan (Supabase, Qwen, Composio, dll):
   ```bash
   cp .env.example .env.local
   nano .env.local
   ```

3. **Build & run container**
   ```bash
   chmod +x deploy/deploy.sh
   ./deploy/deploy.sh
   ```
   Atau manual:
   ```bash
   docker compose build
   docker compose up -d
   docker compose logs -f
   ```

4. **Setup Nginx + SSL**
   ```bash
   sudo apt install nginx certbot python3-certbot-nginx
   sudo cp deploy/nginx-lemorax.conf /etc/nginx/sites-available/lemorax
   sudo ln -sf /etc/nginx/sites-available/lemorax /etc/nginx/sites-enabled/lemorax
   sudo nginx -t
   sudo certbot --nginx -d lemorax.indonesiabelajarai.com
   sudo systemctl reload nginx
   ```

5. **Update aplikasi di kemudian hari**
   ```bash
   cd /opt/lemorax
   git pull origin main
   ./deploy/deploy.sh
   ```

## Catatan penting
- `NEXT_PUBLIC_*` harus di-build ulang kalau berubah.
- Env server-side (Qwen, Composio, Supabase service role) bisa diubah di `.env.local` tanpa rebuild; cukup `docker compose restart`.
- Port default aplikasi: `3000` di `localhost` VPS; Nginx yang expose ke internet.
