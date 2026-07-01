import { slugifyNoteTitle } from "@/lib/vault/wikilinks";

/** Deep-link into Company Vault by note title */
export function vaultOpenUrl(title: string): string {
  return `/dashboard/vault?open=${encodeURIComponent(title.trim())}`;
}

/** Convert Obsidian [[wikilinks]] to markdown links (vault:// protocol) */
export function preprocessWikilinks(content: string): string {
  return content.replace(/\[\[([^\]|#]+)(?:#[^\]]*)?\]\]/g, (_, raw: string) => {
    const title = raw.trim();
    return `[${title}](vault://${encodeURIComponent(title)})`;
  });
}

export function matchVaultNoteByLinkTitle<
  T extends { id: string; title: string; slug: string },
>(notes: T[], linkTitle: string): T | undefined {
  const trimmed = linkTitle.trim();
  const slug = slugifyNoteTitle(trimmed);
  return notes.find(
    (n) =>
      n.title.toLowerCase() === trimmed.toLowerCase() ||
      n.slug === slug ||
      n.slug === trimmed.toLowerCase().replace(/\s+/g, "-")
  );
}
