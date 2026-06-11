import { getVaultNote, listVaultNotes } from "@/lib/vault/store";
import { extractWikilinks, slugifyNoteTitle } from "@/lib/vault/wikilinks";
import type { VaultNote } from "@/lib/vault/types";

const STOPWORDS = new Set([
  "yang",
  "dan",
  "di",
  "ke",
  "dari",
  "untuk",
  "dengan",
  "pada",
  "ini",
  "itu",
  "ada",
  "apa",
  "bagaimana",
  "the",
  "and",
  "for",
  "are",
  "was",
  "how",
  "what",
  "when",
  "where",
  "bisa",
  "tolong",
  "mohon",
  "juga",
  "saya",
  "kami",
  "kita",
  "akan",
  "sudah",
  "belum",
  "atau",
  "tentang",
  "lebih",
  "semua",
]);

export type VaultRAGOptions = {
  maxNotes?: number;
  maxChunks?: number;
  maxChars?: number;
};

export type VaultRAGResult = {
  context: string;
  noteCount: number;
  chunkCount: number;
  titles: string[];
};

type ScoredChunk = {
  note: VaultNote;
  chunk: string;
  score: number;
  reason: string;
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\[\[([^\]]+)\]\]/g, " $1 ")
    .split(/[^a-z0-9\u00C0-\u024F]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function chunkNoteContent(content: string, maxLen = 520): string[] {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return [];

  const chunks: string[] = [];
  let buf = "";

  for (const p of paragraphs) {
    if ((buf + "\n\n" + p).length <= maxLen) {
      buf = buf ? `${buf}\n\n${p}` : p;
      continue;
    }
    if (buf) chunks.push(buf);
    if (p.length <= maxLen) {
      buf = p;
    } else {
      for (let i = 0; i < p.length; i += maxLen) {
        chunks.push(p.slice(i, i + maxLen));
      }
      buf = "";
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

function scoreText(tokens: string[], haystack: string, weight: number): number {
  const lower = haystack.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (lower.includes(t)) score += weight;
  }
  return score;
}

function scoreNote(tokens: string[], note: VaultNote): ScoredChunk[] {
  if (tokens.length === 0) return [];

  const titleScore = scoreText(tokens, note.title, 6);
  const tagScore = scoreText(tokens, note.tags.join(" "), 5);
  const slugScore = scoreText(tokens, note.slug.replace(/-/g, " "), 4);
  const typeScore = scoreText(tokens, note.noteType, 3);

  const chunks = chunkNoteContent(note.content);
  const results: ScoredChunk[] = [];

  if (titleScore > 0) {
    results.push({
      note,
      chunk: note.content.slice(0, 800),
      score: titleScore + typeScore + slugScore,
      reason: "title/tags",
    });
  }

  for (const chunk of chunks) {
    const bodyScore = scoreText(tokens, chunk, 2);
    const total = bodyScore + tagScore * 0.5 + typeScore;
    if (total > 0) {
      results.push({ note, chunk, score: total, reason: "content" });
    }
  }

  if (results.length === 0 && (tagScore > 0 || typeScore > 2)) {
    results.push({
      note,
      chunk: note.content.slice(0, 600),
      score: tagScore + typeScore,
      reason: "metadata",
    });
  }

  return results;
}

function buildNoteIndex(notes: VaultNote[]): Map<string, VaultNote> {
  const index = new Map<string, VaultNote>();
  for (const n of notes) {
    index.set(n.id, n);
    index.set(n.slug.toLowerCase(), n);
    index.set(slugifyNoteTitle(n.title), n);
    index.set(n.title.toLowerCase(), n);
  }
  return index;
}

async function expandViaWikilinks(
  ranked: ScoredChunk[],
  noteIndex: Map<string, VaultNote>,
  boost: number
): Promise<ScoredChunk[]> {
  const seen = new Set(ranked.map((r) => r.note.id));
  const extra: ScoredChunk[] = [];

  for (const hit of ranked.slice(0, 3)) {
    const links = extractWikilinks(hit.chunk);
    for (const link of links) {
      const linked =
        noteIndex.get(link.toLowerCase()) ??
        noteIndex.get(slugifyNoteTitle(link));
      if (!linked || seen.has(linked.id)) continue;
      seen.add(linked.id);
      extra.push({
        note: linked,
        chunk: linked.content.slice(0, 700),
        score: hit.score * boost,
        reason: `wikilink from [[${hit.note.title}]]`,
      });
    }
  }

  return extra;
}

function formatRAGBlock(chunks: ScoredChunk[]): string {
  const lines = chunks.map((c, i) => {
    const excerpt = c.chunk.trim().slice(0, 1400);
    return [
      `### [${i + 1}] [[${c.note.title}]] (${c.note.noteType})`,
      `_Relevansi: ${c.reason} | tags: ${c.note.tags.join(", ") || "—"}_`,
      excerpt,
    ].join("\n");
  });

  return [
    "## Company Vault — Internal RAG",
    "Kutipan dokumen internal di bawah ini. Prioritaskan fakta dari vault jika relevan dengan pertanyaan.",
    "Gunakan format [[Judul Catatan]] saat merujuk sumber.",
    "",
    ...lines,
  ].join("\n\n");
}

export async function retrieveVaultRAG(
  query: string,
  options: VaultRAGOptions = {}
): Promise<VaultRAGResult> {
  const maxNotes = options.maxNotes ?? 5;
  const maxChunks = options.maxChunks ?? 8;
  const maxChars = options.maxChars ?? 7000;

  const q = query.trim();
  if (!q) {
    return { context: "", noteCount: 0, chunkCount: 0, titles: [] };
  }

  const notes = await listVaultNotes();
  if (notes.length === 0) {
    return { context: "", noteCount: 0, chunkCount: 0, titles: [] };
  }

  const tokens = tokenize(q);
  const noteIndex = buildNoteIndex(notes);

  let ranked: ScoredChunk[] = [];
  for (const note of notes) {
    ranked.push(...scoreNote(tokens, note));
  }

  ranked.sort((a, b) => b.score - a.score);

  if (ranked.length < maxChunks) {
    const linked = await expandViaWikilinks(ranked, noteIndex, 0.65);
    ranked = [...ranked, ...linked].sort((a, b) => b.score - a.score);
  }

  const picked: ScoredChunk[] = [];
  const usedNotes = new Set<string>();
  let charCount = 0;

  for (const item of ranked) {
    if (picked.length >= maxChunks) break;
    if (usedNotes.size >= maxNotes && !usedNotes.has(item.note.id)) continue;

    const blockLen = item.chunk.length + item.note.title.length + 80;
    if (charCount + blockLen > maxChars && picked.length > 0) continue;

    usedNotes.add(item.note.id);
    picked.push(item);
    charCount += blockLen;
  }

  if (picked.length === 0) {
    const recent = notes.slice(0, Math.min(2, maxNotes));
    for (const note of recent) {
      picked.push({
        note,
        chunk: note.content.slice(0, 500),
        score: 0.1,
        reason: "recent fallback",
      });
    }
  }

  const titles = Array.from(new Set(picked.map((p) => p.note.title)));

  const withBacklinks = await Promise.all(
    picked.map(async (p) => {
      if (p.reason !== "title/tags" && p.reason !== "content") return p;
      try {
        const full = await getVaultNote(p.note.id);
        if (full && full.inboundLinks.length > 0) {
          return {
            ...p,
            chunk: `${p.chunk}\n\n_Terhubung: ${full.inboundLinks.length} backlink(s)_`,
          };
        }
      } catch {
        // ignore
      }
      return p;
    })
  );

  return {
    context: formatRAGBlock(withBacklinks),
    noteCount: titles.length,
    chunkCount: withBacklinks.length,
    titles,
  };
}

/** Back-compat wrapper used by store and older call sites */
export async function getVaultContextForQuery(query: string): Promise<string> {
  const result = await retrieveVaultRAG(query);
  return result.context;
}
