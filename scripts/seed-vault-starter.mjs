#!/usr/bin/env node
/**
 * Seed Company Vault starter notes + optional local skill install.
 * Usage: node scripts/seed-vault-starter.mjs
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

function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(title) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

const STARTER_NOTES = [
  {
    title: "Q2 Marketing Plan",
    note_type: "doc",
    tags: ["marketing", "q2", "plan"],
    content: `# Q2 Marketing Plan — PT Lemorax

## Tujuan
- Naikkan qualified leads 20% QoQ
- ROAS Meta Ads ≥ 3.5x
- 2 webinar edukasi produk

## Channel
- Meta Ads (retargeting + lookalike)
- LinkedIn thought leadership
- Email nurture existing CRM

Lihat juga [[MOM Rapat Marketing 10 Jun]] untuk keputusan terbaru.`,
  },
  {
    title: "MOM Rapat Marketing 10 Jun",
    note_type: "mom",
    tags: ["mom", "marketing", "meeting"],
    content: `# MOM — Rapat Marketing 10 Jun 2026

**Peserta:** Pak Anjas, Marta (Marketing Pulse)

## Keputusan
1. Budget Meta Ads Q2 dipertahankan; shift 15% ke retargeting
2. Landing page baru A/B test minggu depan
3. Weekly campaign review setiap Rabu 10:00

## Action items
- @Marta: draft creative brief → [[Q2 Marketing Plan]]
- @Arin: siapkan dashboard cohort conversion

## Next meeting
17 Jun 2026, 10:00 WITA`,
  },
  {
    title: "Company Handbook — Brand Voice",
    note_type: "sop",
    tags: ["brand", "sop"],
    content: `# Brand Voice Lemorax

- Bahasa Indonesia profesional, hangat
- Data dulu, opini kedua
- Panggil principal: **Pak Anjas**
- Hindari jargon tanpa definisi

Terhubung ke [[Q2 Marketing Plan]] untuk contoh kampanye.`,
  },
];

async function seedVault() {
  const { count } = await sb.from("vault_notes").select("*", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    console.log(`Vault: skip (${count} notes already exist)`);
    return;
  }

  const now = new Date().toISOString();
  const rows = STARTER_NOTES.map((n) => ({
    id: newId("vnote"),
    title: n.title,
    slug: slugify(n.title),
    content: n.content,
    tags: n.tags,
    note_type: n.note_type,
    created_at: now,
    updated_at: now,
  }));

  const { error } = await sb.from("vault_notes").insert(rows);
  if (error) throw new Error(`vault_notes: ${error.message}`);

  // Wikilinks
  const { data: allNotes } = await sb.from("vault_notes").select("id, title, slug");
  const map = new Map();
  for (const n of allNotes ?? []) {
    map.set(n.title.toLowerCase(), n.id);
    map.set(n.slug, n.id);
    map.set(slugify(n.title), n.id);
  }

  const linkRe = /\[\[([^\]|#]+)/g;
  const links = [];
  for (const row of rows) {
    let m;
    while ((m = linkRe.exec(row.content)) !== null) {
      const target = m[1].trim();
      links.push({
        id: newId("vlink"),
        source_id: row.id,
        target_slug: target,
        target_id: map.get(target.toLowerCase()) ?? map.get(slugify(target)) ?? null,
        link_type: "wikilink",
        created_at: now,
      });
    }
  }
  if (links.length) {
    const { error: lErr } = await sb.from("vault_links").insert(links);
    if (lErr) throw new Error(`vault_links: ${lErr.message}`);
  }

  console.log(`Vault: seeded ${rows.length} notes, ${links.length} wikilinks`);
}

async function seedMarketingSkill() {
  const skillPath = path.join(process.cwd(), "skills/marketing-basics/SKILL.md");
  if (!fs.existsSync(skillPath)) {
    console.log("Skill: marketing-basics/SKILL.md not found, skip");
    return;
  }

  const contentMd = fs.readFileSync(skillPath, "utf8");
  const now = new Date().toISOString();
  const skill = {
    id: "skill_marketing_basics",
    slug: "marketing-basics",
    name: "Marketing Basics",
    description: "Framework copywriting, campaign review, dan CTA",
    source_url: "local://skills/marketing-basics/SKILL.md",
    source_ref: "seed",
    content_md: contentMd,
    tags: ["marketing", "copywriting", "campaign"],
    installed_at: now,
    updated_at: now,
  };

  const { error } = await sb.from("staff_skill_registry").upsert(skill, { onConflict: "slug" });
  if (error) throw new Error(`staff_skill_registry: ${error.message}`);

  const { data: skillRow } = await sb
    .from("staff_skill_registry")
    .select("id")
    .eq("slug", "marketing-basics")
    .single();

  const assignments = [
    { agent_id: "marketing-pulse", skill_id: skillRow.id },
    { agent_id: "executive-assistant", skill_id: skillRow.id },
  ];

  for (const a of assignments) {
    await sb.from("staff_agent_installed_skills").upsert(
      { ...a, enabled: true, config: {}, installed_at: now },
      { onConflict: "agent_id,skill_id" }
    );
  }

  console.log(`Skill: marketing-basics → marketing-pulse, executive-assistant`);
}

async function main() {
  await seedVault();
  await seedMarketingSkill();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
