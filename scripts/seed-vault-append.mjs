#!/usr/bin/env node
/**
 * Append governance, SOP, reporting, org chart notes to Company Vault.
 * Patches existing notes with extra wikilinks, then rebuilds full link graph.
 *
 * Usage: npm run seed:vault:append
 *        node scripts/seed-vault-append.mjs --resync-only
 */
import {
  createSeedClient,
  loadVaultContext,
  newId,
  slugify,
  syncAllWikilinks,
} from "./lib/vault-seed-shared.mjs";
import { buildAppendNotes, getNotePatches } from "./lib/vault-seed-append-notes.mjs";

const RESYNC_ONLY = process.argv.includes("--resync-only");
const sb = createSeedClient();

async function patchExistingNotes() {
  const patches = getNotePatches();
  let patched = 0;

  for (const { slug, block } of patches) {
    const { data: note } = await sb.from("vault_notes").select("id, content").eq("slug", slug).maybeSingle();
    if (!note) continue;
    if (note.content.includes(block.trim().split("\n")[1] ?? "")) continue;

    const { error } = await sb
      .from("vault_notes")
      .update({
        content: note.content + block,
        updated_at: new Date().toISOString(),
      })
      .eq("id", note.id);
    if (error) throw new Error(`patch ${slug}: ${error.message}`);
    patched++;
  }
  return patched;
}

async function insertNewNotes(ctx) {
  const templates = buildAppendNotes(ctx);
  const { data: existing } = await sb.from("vault_notes").select("slug, title");
  const existingSlugs = new Set((existing ?? []).map((n) => n.slug));
  const existingTitles = new Set((existing ?? []).map((n) => n.title.toLowerCase()));

  const toInsert = templates.filter(
    (n) => !existingSlugs.has(slugify(n.title)) && !existingTitles.has(n.title.toLowerCase())
  );

  if (toInsert.length === 0) {
    console.log("Vault append: no new notes to insert (all exist)");
    return 0;
  }

  const now = new Date().toISOString();
  const rows = toInsert.map((n) => ({
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
  console.log(`Vault append: inserted ${rows.length} new notes`);
  return rows.length;
}

async function main() {
  if (RESYNC_ONLY) {
    const links = await syncAllWikilinks(sb);
    console.log(`Vault: resynced ${links} wikilinks`);
    return;
  }

  const ctx = await loadVaultContext(sb);
  const inserted = await insertNewNotes(ctx);
  const patched = await patchExistingNotes();
  const links = await syncAllWikilinks(sb);

  const { count } = await sb.from("vault_notes").select("*", { count: "exact", head: true });
  console.log(`Vault append: done — ${inserted} new, ${patched} patched, ${links} total links, ${count} notes`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
