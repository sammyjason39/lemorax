"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { BookOpen, Link2, Plus, Save, Search, Trash2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { brand } from "@/lib/brand";
import type { VaultNote, VaultNoteType } from "@/lib/vault/types";

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json());

const NOTE_TYPES: { value: VaultNoteType; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "mom", label: "MOM" },
  { value: "meeting", label: "Meeting" },
  { value: "doc", label: "Document" },
  { value: "sop", label: "SOP" },
];

export function VaultApp() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState<VaultNoteType>("note");
  const [saving, setSaving] = useState(false);

  const listUrl = query.trim() ? `/api/vault/notes?q=${encodeURIComponent(query)}` : "/api/vault/notes";
  const { data: listData, mutate: mutateList } = useSWR<{ notes: VaultNote[] }>(listUrl, fetcher);

  const { data: detailData, mutate: mutateDetail } = useSWR<{ note: VaultNote & { inboundLinks: { targetSlug: string }[]; outboundLinks: { targetSlug: string; targetId?: string }[]; brokenLinks: string[] } }>(
    activeId ? `/api/vault/notes/${activeId}` : null,
    fetcher
  );

  const notes = listData?.notes ?? [];
  const detail = detailData?.note;

  const loadNote = useCallback((note: VaultNote) => {
    setActiveId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setNoteType(note.noteType);
  }, []);

  const handleNew = () => {
    setActiveId(null);
    setTitle("");
    setContent("");
    setNoteType("note");
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (activeId) {
        const res = await fetch(`/api/vault/notes/${activeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, noteType }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        await mutateDetail();
      } else {
        const res = await fetch("/api/vault/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, noteType }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        setActiveId(body.note.id);
      }
      await mutateList();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal simpan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeId || !confirm("Hapus catatan ini?")) return;
    await fetch(`/api/vault/notes/${activeId}`, { method: "DELETE" });
    handleNew();
    await mutateList();
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <TopBar title="Company Vault" subtitle="Obsidian-style knowledge — MOM, dokumen, [[wikilinks]]" />

      <div className="flex flex-1 min-h-0">
        <aside
          className="w-72 shrink-0 border-r flex flex-col"
          style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}
        >
          <div className="p-3 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Search size={14} style={{ color: "var(--text-muted)" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari catatan..."
                className="flex-1 text-xs bg-transparent outline-none"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
            <button
              type="button"
              onClick={handleNew}
              className="w-full flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium"
              style={{ background: brand.blueSoft, color: brand.blue }}
            >
              <Plus size={14} /> Catatan Baru
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
            {notes.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => loadNote(n)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs"
                style={{
                  background: activeId === n.id ? brand.blueSoft : "transparent",
                  color: "var(--text-primary)",
                }}
              >
                <div className="font-medium truncate">{n.title}</div>
                <div className="text-[10px] opacity-60">{n.noteType}</div>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0" style={{ background: "var(--bg-tertiary)" }}>
          <div className="p-4 flex flex-wrap gap-2 items-center border-b" style={{ borderColor: "var(--border)" }}>
            <BookOpen size={18} style={{ color: brand.blue }} />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul catatan"
              className="flex-1 min-w-[200px] text-sm font-semibold bg-transparent outline-none"
              style={{ color: "var(--text-primary)" }}
            />
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value as VaultNoteType)}
              className="text-xs rounded-lg px-2 py-1.5"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
            >
              {NOTE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-white disabled:opacity-50"
              style={{ background: brand.blue }}
            >
              <Save size={14} /> {saving ? "..." : "Simpan"}
            </button>
            {activeId && (
              <button type="button" onClick={() => void handleDelete()} className="p-1.5 opacity-60 hover:opacity-100">
                <Trash2 size={16} />
              </button>
            )}
          </div>

          <div className="flex flex-1 min-h-0">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tulis MOM, dokumen, atau gunakan [[Nama Catatan]] untuk wikilink..."
              className="flex-1 p-4 text-sm font-mono resize-none outline-none bg-transparent"
              style={{ color: "var(--text-primary)" }}
            />
            {detail && (
              <div
                className="w-56 shrink-0 border-l p-3 text-xs overflow-y-auto scrollbar-thin"
                style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}
              >
                <div className="font-semibold mb-2 flex items-center gap-1" style={{ color: brand.blue }}>
                  <Link2 size={12} /> Backlinks
                </div>
                {detail.inboundLinks?.length ? (
                  detail.inboundLinks.map((l, i) => (
                    <div key={i} className="mb-1 opacity-80">
                      ← [[{l.targetSlug}]]
                    </div>
                  ))
                ) : (
                  <p className="opacity-50">Tidak ada backlink</p>
                )}
                <div className="font-semibold mt-4 mb-2" style={{ color: brand.blue }}>
                  Outgoing
                </div>
                {detail.outboundLinks?.length ? (
                  detail.outboundLinks.map((l, i) => (
                    <div key={i} className={`mb-1 ${l.targetId ? "" : "text-red-500"}`}>
                      → [[{l.targetSlug}]]{!l.targetId ? " (broken)" : ""}
                    </div>
                  ))
                ) : (
                  <p className="opacity-50">Tidak ada wikilink</p>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
