#!/usr/bin/env bash
set -e

# Lemorax VPS deployment helper
# Run on your VPS after cloning the repo and configuring .env.local

cd "$(dirname "$0")/.."

echo "🚀 Building Lemorax app..."
docker compose build --no-cache

echo "🛑 Stopping old container (if any)..."
docker compose down || true

echo "▶️  Starting Lemorax..."
docker compose up -d

echo "✅ Lemorax deployed. Check status with: docker compose logs -f"
