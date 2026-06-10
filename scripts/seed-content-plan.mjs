#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const items = [
  // Personal branding — @anjas_maradita
  {
    id: "cp_personal_backlog_1",
    brand_scope: "personal",
    title: "Behind the scenes: membangun AI dashboard",
    status: "backlog",
    format: "reel",
    script_md: "",
    notes: "Angle thought leadership + AI blueprint",
    position: 0,
    created_by: "soca-social",
    assigned_agent: "soca-social",
    last_touched_by: "soca-social",
  },
  {
    id: "cp_personal_scripting_1",
    brand_scope: "personal",
    title: "5 lesson dari scale personal brand di IG",
    status: "scripting",
    format: "carousel",
    script_md:
      "**Hook:** 332K followers tapi engagement turun? Ini yang saya ubah.\n\n**Slide 1-5:** Lesson tentang konsistensi, hook, dan CTA.\n\n#PersonalBranding #AI",
    position: 0,
    created_by: "soca-social",
    last_touched_by: "soca-social",
  },
  {
    id: "cp_personal_scheduled_1",
    brand_scope: "personal",
    title: "Hot take: AI agents untuk CEO",
    status: "scheduled",
    format: "reel",
    script_md: "**Hook:** CEO tanpa AI staff = bottleneck.\n\n**Body:** Demo Lemorax Executive HQ 30 detik.",
    scheduled_at: new Date(Date.now() + 2 * 86400000).toISOString(),
    position: 0,
    created_by: "user",
    last_touched_by: "user",
  },
  // Perusahaan — Lemorax
  {
    id: "cp_company_backlog_1",
    brand_scope: "company",
    title: "Tips hemat deterjen laundry kiloan",
    status: "backlog",
    format: "carousel",
    script_md: "",
    notes: "Referensi ER tinggi dari post BTS distribusi",
    position: 0,
    created_by: "soca-social",
    assigned_agent: "soca-social",
    last_touched_by: "soca-social",
  },
  {
    id: "cp_company_review_1",
    brand_scope: "company",
    title: "Testimoni hotel partner Bali",
    status: "review",
    format: "image",
    script_md:
      "**Visual:** Foto before/after linen\n\n**Caption:** 2 tahun konsistensi kualitas deterjen industrial Lemorax.\n\n#Lemorax",
    position: 0,
    created_by: "soca-social",
    assigned_agent: "soca-social",
    last_touched_by: "soca-social",
  },
  {
    id: "cp_company_published_1",
    brand_scope: "company",
    title: "Promo bundling Ramadan (demo)",
    status: "published",
    format: "carousel",
    script_md: "**Published demo** — bundling sabun + pewangi hemat 15%.",
    published_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    publish_mode: "demo",
    position: 0,
    created_by: "user",
    last_touched_by: "user",
  },
];

const now = new Date().toISOString();

for (const item of items) {
  const row = { ...item, notes: item.notes ?? "", created_at: now, updated_at: now };
  const { error } = await sb.from("content_plan_items").upsert(row, { onConflict: "id" });
  if (error) {
    console.error(item.id, error.message);
    console.error("Jalankan migration 011 + 012 dulu.");
    process.exit(1);
  }
  console.log("✓", `[${item.brand_scope}]`, item.title, "→", item.status);
}

console.log("\nDone — 3 personal + 3 company kartu.");
