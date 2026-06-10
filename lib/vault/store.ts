import { createServerSupabaseClient } from "@/lib/supabase";
import { withSelfHealing } from "@/lib/staff-agents/healing";
import { extractWikilinks, slugifyNoteTitle } from "@/lib/vault/wikilinks";
import type { VaultLink, VaultNote, VaultNoteType, VaultNoteWithLinks } from "@/lib/vault/types";

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

type NoteRow = {
  id: string;
  title: string;
  slug: string;
  content: string;
  tags: string[] | null;
  note_type: string;
  created_at: string;
  updated_at: string;
};

type LinkRow = {
  id: string;
  source_id: string;
  target_slug: string;
  target_id: string | null;
  link_type: string;
  created_at: string;
};

function noteFromRow(row: NoteRow): VaultNote {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    tags: row.tags ?? [],
    noteType: (row.note_type as VaultNoteType) ?? "note",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function noteToRow(note: VaultNote): NoteRow {
  return {
    id: note.id,
    title: note.title,
    slug: note.slug,
    content: note.content,
    tags: note.tags,
    note_type: note.noteType,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
  };
}

function linkFromRow(row: LinkRow): VaultLink {
  return {
    id: row.id,
    sourceId: row.source_id,
    targetSlug: row.target_slug,
    targetId: row.target_id ?? undefined,
    linkType: row.link_type,
    createdAt: row.created_at,
  };
}

async function syncLinksForNote(noteId: string, content: string): Promise<void> {
  const sb = createServerSupabaseClient();
  const targets = extractWikilinks(content);

  await sb.from("vault_links").delete().eq("source_id", noteId);

  if (targets.length === 0) return;

  const { data: notes } = await sb.from("vault_notes").select("id, slug, title");
  const slugMap = new Map(
    (notes ?? []).flatMap((n) => {
      const row = n as { id: string; slug: string; title: string };
      return [
        [row.slug.toLowerCase(), row.id] as const,
        [slugifyNoteTitle(row.title), row.id] as const,
        [row.title.toLowerCase(), row.id] as const,
      ];
    })
  );

  const rows = targets.map((target) => ({
    id: newId("vlink"),
    source_id: noteId,
    target_slug: target,
    target_id: slugMap.get(target.toLowerCase()) ?? slugMap.get(slugifyNoteTitle(target)) ?? null,
    link_type: "wikilink",
    created_at: new Date().toISOString(),
  }));

  const { error } = await sb.from("vault_links").insert(rows);
  if (error) throw new Error(error.message);
}

export async function listVaultNotes(): Promise<VaultNote[]> {
  const sb = createServerSupabaseClient();
  const { data, error } = await sb
    .from("vault_notes")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    if (error.message.includes("Could not find the table")) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((r) => noteFromRow(r as NoteRow));
}

export async function getVaultNote(id: string): Promise<VaultNoteWithLinks | null> {
  const sb = createServerSupabaseClient();
  const { data: noteRow, error } = await sb.from("vault_notes").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!noteRow) return null;

  const note = noteFromRow(noteRow as NoteRow);

  const { data: outbound } = await sb.from("vault_links").select("*").eq("source_id", id);
  const { data: inbound } = await sb
    .from("vault_links")
    .select("*")
    .eq("target_id", id);

  const outboundLinks = (outbound ?? []).map((r) => linkFromRow(r as LinkRow));
  const inboundLinks = (inbound ?? []).map((r) => linkFromRow(r as LinkRow));
  const brokenLinks = outboundLinks.filter((l) => !l.targetId).map((l) => l.targetSlug);

  return { ...note, outboundLinks, inboundLinks, brokenLinks };
}

export async function createVaultNote(input: {
  title: string;
  content?: string;
  tags?: string[];
  noteType?: VaultNoteType;
  slug?: string;
}): Promise<VaultNote> {
  const now = new Date().toISOString();
  const note: VaultNote = {
    id: newId("vnote"),
    title: input.title.trim(),
    slug: input.slug?.trim() || slugifyNoteTitle(input.title),
    content: input.content ?? "",
    tags: input.tags ?? [],
    noteType: input.noteType ?? "note",
    createdAt: now,
    updatedAt: now,
  };

  const result = await withSelfHealing(async () => {
    const sb = createServerSupabaseClient();
    const { error } = await sb.from("vault_notes").insert(noteToRow(note));
    if (error) throw new Error(error.message);
    await syncLinksForNote(note.id, note.content);
    return note;
  }, { label: "vault create" });

  if (!result.ok) throw new Error(result.error);
  return result.value;
}

export async function updateVaultNote(
  id: string,
  patch: Partial<Pick<VaultNote, "title" | "content" | "tags" | "noteType" | "slug">>
): Promise<VaultNote> {
  const sb = createServerSupabaseClient();
  const { data: existing, error: getErr } = await sb.from("vault_notes").select("*").eq("id", id).maybeSingle();
  if (getErr) throw new Error(getErr.message);
  if (!existing) throw new Error("Note not found");

  const current = noteFromRow(existing as NoteRow);
  const updated: VaultNote = {
    ...current,
    ...patch,
    title: patch.title?.trim() ?? current.title,
    slug: patch.slug?.trim() ?? (patch.title ? slugifyNoteTitle(patch.title) : current.slug),
    updatedAt: new Date().toISOString(),
  };

  const { error } = await sb.from("vault_notes").upsert(noteToRow(updated), { onConflict: "id" });
  if (error) throw new Error(error.message);
  await syncLinksForNote(id, updated.content);
  return updated;
}

export async function deleteVaultNote(id: string): Promise<void> {
  const sb = createServerSupabaseClient();
  const { error } = await sb.from("vault_notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function searchVaultNotes(query: string, limit = 5): Promise<VaultNote[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const notes = await listVaultNotes();
  const scored = notes
    .map((n) => {
      const hay = `${n.title} ${n.content} ${n.tags.join(" ")}`.toLowerCase();
      const score =
        (n.title.toLowerCase().includes(q) ? 3 : 0) +
        (n.slug.includes(q) ? 2 : 0) +
        (hay.includes(q) ? 1 : 0);
      return { n, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((x) => x.n);
}

export async function getVaultContextForQuery(query: string): Promise<string> {
  const hits = await searchVaultNotes(query, 4);
  if (hits.length === 0) return "";

  const blocks = await Promise.all(
    hits.map(async (n) => {
      const full = await getVaultNote(n.id);
      const backlinks = full?.inboundLinks.length ?? 0;
      return `### [[${n.title}]] (${n.noteType})\n${n.content.slice(0, 1200)}\n_Backlinks: ${backlinks}_`;
    })
  );

  return `## Company Vault (Obsidian)\n${blocks.join("\n\n")}`;
}
