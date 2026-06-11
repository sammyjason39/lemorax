import { createServerSupabaseClient } from "@/lib/supabase";
import { listVaultNotes } from "@/lib/vault/store";
import type { VaultNoteType } from "@/lib/vault/types";

export type VaultGraphNode = {
  id: string;
  title: string;
  slug: string;
  noteType: VaultNoteType;
  linkCount: number;
};

export type VaultGraphEdge = {
  id: string;
  source: string;
  target: string;
  targetSlug: string;
};

export type VaultGraph = {
  nodes: VaultGraphNode[];
  edges: VaultGraphEdge[];
};

export async function getVaultGraph(): Promise<VaultGraph> {
  const notes = await listVaultNotes();
  const sb = createServerSupabaseClient();
  const { data: links, error } = await sb.from("vault_links").select("*");
  if (error) throw new Error(error.message);

  const degree = new Map<string, number>();
  for (const n of notes) degree.set(n.id, 0);

  const edges: VaultGraphEdge[] = [];
  for (const row of links ?? []) {
    const r = row as { id: string; source_id: string; target_id: string | null; target_slug: string };
    if (!r.target_id) continue;
    edges.push({
      id: r.id,
      source: r.source_id,
      target: r.target_id,
      targetSlug: r.target_slug,
    });
    degree.set(r.source_id, (degree.get(r.source_id) ?? 0) + 1);
    degree.set(r.target_id, (degree.get(r.target_id) ?? 0) + 1);
  }

  const nodes: VaultGraphNode[] = notes.map((n) => ({
    id: n.id,
    title: n.title,
    slug: n.slug,
    noteType: n.noteType,
    linkCount: degree.get(n.id) ?? 0,
  }));

  return { nodes, edges };
}
