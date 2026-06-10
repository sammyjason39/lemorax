#!/usr/bin/env node
/**
 * Seed dummy social media profiles + past posts for Soca dashboard.
 * Usage: node scripts/seed-social-media.mjs
 */
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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const PROFILE_ID = "instagram_lemorax_official";

const profile = {
  id: PROFILE_ID,
  platform: "instagram",
  username: "lemorax_official",
  display_name: "PT Lemorax",
  followers: 24580,
  following: 312,
  posts_count: 186,
  engagement_rate: 4.25,
  conversion_rate: 0.82,
  profile_views: 12400,
  link_clicks: 890,
  conversions: 73,
  bio: "Solusi kebersihan & laundry supply untuk bisnis & rumah tangga. 12 cabang di Indonesia.",
  source: "seed",
  synced_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const posts = [
  {
    id: `${PROFILE_ID}_post_1`,
    caption:
      "Tips hemat deterjen untuk laundry kiloan — formula Lemorax Pro kini tersedia di semua cabang. #Lemorax #LaundryTips",
    media_type: "Carousel",
    daysAgo: 3,
    likes: 412,
    comments: 38,
    reach: 5200,
    clicks: 124,
    conversions: 9,
  },
  {
    id: `${PROFILE_ID}_post_2`,
    caption:
      "Behind the scenes: tim distribusi Lemorax Medan & Palembang siap kirim pesanan B2B minggu ini.",
    media_type: "Reel",
    daysAgo: 7,
    likes: 891,
    comments: 67,
    reach: 11200,
    clicks: 210,
    conversions: 14,
  },
  {
    id: `${PROFILE_ID}_post_3`,
    caption:
      "Promo Ramadan: bundling sabun cuci + pewangi — hemat 15% untuk pembelian grosir. DM untuk katalog.",
    media_type: "Image",
    daysAgo: 12,
    likes: 634,
    comments: 52,
    reach: 8900,
    clicks: 178,
    conversions: 11,
  },
  {
    id: `${PROFILE_ID}_post_4`,
    caption:
      "Testimoni hotel partner di Bali — konsistensi kualitas deterjen industrial Lemorax selama 2 tahun.",
    media_type: "Image",
    daysAgo: 18,
    likes: 298,
    comments: 24,
    reach: 4100,
    clicks: 86,
    conversions: 6,
  },
  {
    id: `${PROFILE_ID}_post_5`,
    caption:
      "Grand opening corner display Lemorax di Jakarta Selatan. Kunjungi dan dapatkan sample gratis!",
    media_type: "Reel",
    daysAgo: 25,
    likes: 1204,
    comments: 94,
    reach: 15800,
    clicks: 292,
    conversions: 33,
  },
];

function daysAgoIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function engagementRate(likes, comments, followers) {
  return Math.round(((likes + comments) / followers) * 10000) / 100;
}

async function main() {
  const { error: pErr } = await sb.from("social_media_profiles").upsert(profile, {
    onConflict: "platform,username",
  });
  if (pErr) {
    console.error("Profile upsert failed:", pErr.message);
    console.error("Pastikan migration 010_social_media.sql sudah dijalankan.");
    process.exit(1);
  }
  console.log("✓ Profile lemorax_official");

  for (const p of posts) {
    const published_at = daysAgoIso(p.daysAgo);
    const er = engagementRate(p.likes, p.comments, profile.followers);
    const row = {
      id: p.id,
      profile_id: PROFILE_ID,
      platform: "instagram",
      caption: p.caption,
      media_type: p.media_type,
      published_at,
      likes: p.likes,
      comments: p.comments,
      shares: Math.round(p.likes * 0.02),
      saves: Math.round(p.likes * 0.08),
      reach: p.reach,
      impressions: Math.round(p.reach * 1.35),
      engagement_rate: er,
      clicks: p.clicks,
      conversions: p.conversions,
      updated_at: new Date().toISOString(),
    };
    const { error } = await sb.from("social_media_posts").upsert(row, { onConflict: "id" });
    if (error) {
      console.error(`Post ${p.id} failed:`, error.message);
      process.exit(1);
    }
    console.log(`✓ Post ${p.id} (${p.media_type}, ER ${er}%)`);
  }

  console.log("\nDone — 1 profile + 5 posts seeded.");
}

main();
