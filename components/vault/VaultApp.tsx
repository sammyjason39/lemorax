"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { BookOpen, GitBranch, LayoutGrid, Plus, Save, Search, Trash2, Eye, Columns2, Pencil } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { VaultMarkdown } from "@/components/vault/VaultMarkdown";
import { VaultGraphView } from "@/components/vault/VaultGraphView";
import { brand } from "@/lib/brand";
import type { VaultNote, VaultNoteType } from "@/lib/vault/types";
import { matchVaultNoteByLinkTitle } from "@/lib/vault/wikilink-markdown";

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json());

type ViewMode = "split" | "preview" | "edit" | "graph";

const NOTE_TYPES: { value: VaultNoteType; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "mom", label: "MOM" },
  { value: "meeting", label: "Meeting" },
  { value: "doc", label: "Document" },
  { value: "sop", label: "SOP" },
];

const VIEW_TABS: { id: ViewMode; label: string; icon: typeof Eye }[] = [
  { id: "split", label: "Split", icon: Columns2 },
  { id: "preview", label: "Baca", icon: Eye },
  { id: "edit", label: "Tulis", icon: Pencil },
  { id: "graph", label: "Graph", icon: GitBranch },
];

export function VaultApp() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState<VaultNoteType>("note");
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");

  const listUrl = query.trim() ? `/api/vault/notes?q=${encodeURIComponent(query)}` : "/api/vault/notes";
  const { data: listData, mutate: mutateList } = useSWR<{ notes: VaultNote[] }>(listUrl, fetcher);

  const { data: detailData, mutate: mutateDetail } = useSWR<{
    note: VaultNote & {
      inboundLinks: { targetSlug: string }[];
      outboundLinks: { targetSlug: string; targetId?: string }[];
      brokenLinks: string[];
    };
  }>(activeId ? `/api/vault/notes/${activeId}` : null, fetcher);

  const notes = listData?.notes ?? [];
  const detail = detailData?.note;

  const loadNote = useCallback((note: VaultNote) => {
    setActiveId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setNoteType(note.noteType);
    if (viewMode === "graph") setViewMode("split");
  }, [viewMode]);

  const openByTitle = useCallback(
    (linkTitle: string) => {
      const hit = matchVaultNoteByLinkTitle(notes, linkTitle);
      if (hit) loadNote(hit);
    },
    [notes, loadNote]
  );

  useEffect(() => {
    const open = searchParams.get("open")?.trim();
    if (!open || notes.length === 0) return;
    const hit = matchVaultNoteByLinkTitle(notes, open);
    if (hit) loadNote(hit);
  }, [searchParams, notes, loadNote]);

  const handleNew = () => {
    setActiveId(null);
    setTitle("");
    setContent("");
    setNoteType("note");
    setViewMode("split");
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

  const showEditor = viewMode === "edit" || viewMode === "split";
  const showPreview = viewMode === "preview" || viewMode === "split";

  return (
    <div className="flex flex-col h-[calc(100vh)] min-h-0 overflow-hidden">
      <TopBar title="Company Vault" subtitle="Obsidian-style knowledge — MOM, dokumen, [[wikilinks]]" />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside
          className="w-72 shrink-0 border-r flex flex-col min-h-0"
          style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}
        >
          <div className="p-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
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
          <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1 min-h-0">
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

        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
          <div
            className="px-4 py-3 flex flex-wrap gap-2 items-center border-b shrink-0"
            style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}
          >
            <BookOpen size={18} style={{ color: brand.blue }} />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul catatan"
              className="flex-1 min-w-[200px] text-sm font-semibold bg-transparent outline-none"
              style={{ color: "var(--text-primary)" }}
              disabled={viewMode === "graph"}
            />
            {viewMode !== "graph" && (
              <>
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value as VaultNoteType)}
                  className="text-xs rounded-lg px-2 py-1.5"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
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
              </>
            )}

            <div className="flex items-center gap-1 ml-auto rounded-lg p-0.5" style={{ background: "var(--bg-secondary)" }}>
              {VIEW_TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setViewMode(id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors"
                  style={{
                    background: viewMode === id ? "var(--bg-primary)" : "transparent",
                    color: viewMode === id ? brand.blue : "var(--text-muted)",
                    boxShadow: viewMode === id ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {viewMode === "graph" ? (
            <VaultGraphView
              onSelectNote={(id) => {
                const n = notes.find((x) => x.id === id);
                if (n) loadNote(n);
              }}
            />
          ) : (
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {showEditor && (
                <div
                  className={`flex flex-col min-h-0 overflow-hidden ${showPreview ? "w-1/2 border-r" : "flex-1"}`}
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide shrink-0" style={{ color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
                    Editor Markdown
                  </div>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Tulis MOM, dokumen, atau gunakan [[Nama Catatan]] untuk wikilink..."
                    className="flex-1 w-full p-4 text-sm resize-none outline-none min-h-0"
                    style={{
                      color: "var(--text-primary)",
                      background: "var(--bg-primary)",
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      lineHeight: 1.6,
                    }}
                  />
                </div>
              )}

              {showPreview && (
                <div className={`flex flex-col min-h-0 overflow-hidden ${showEditor ? "w-1/2" : "flex-1"}`} style={{ background: "var(--bg-primary)" }}>
                  <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide shrink-0" style={{ color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
                    Preview
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
                    {content.trim() ? (
                      <VaultMarkdown content={content} onWikilinkClick={openByTitle} />
                    ) : (
                      <p className="p-6 text-sm" style={{ color: "var(--text-muted)" }}>
                        Preview akan muncul di sini…
                      </p>
                    )}
                  </div>
                </div>
              )}

              {detail && (
                <div
                  className="w-52 shrink-0 border-l p-3 text-xs overflow-y-auto scrollbar-thin min-h-0"
                  style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}
                >
                  <div className="font-semibold mb-2 flex items-center gap-1" style={{ color: brand.blue }}>
                    <LayoutGrid size={12} /> Backlinks
                  </div>
                  {detail.inboundLinks?.length ? (
                    detail.inboundLinks.map((l, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => openByTitle(l.targetSlug)}
                        className="block mb-1 text-left opacity-80 hover:opacity-100 w-full"
                        style={{ color: brand.blue }}
                      >
                        ← [[{l.targetSlug}]]
                      </button>
                    ))
                  ) : (
                    <p className="opacity-50">Tidak ada backlink</p>
                  )}
                  <div className="font-semibold mt-4 mb-2" style={{ color: brand.blue }}>
                    Outgoing
                  </div>
                  {detail.outboundLinks?.length ? (
                    detail.outboundLinks.map((l, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => openByTitle(l.targetSlug)}
                        className={`block mb-1 text-left w-full ${l.targetId ? "hover:opacity-100" : "text-red-500"}`}
                        style={{ color: l.targetId ? brand.blue : undefined }}
                      >
                        → [[{l.targetSlug}]]{!l.targetId ? " (broken)" : ""}
                      </button>
                    ))
                  ) : (
                    <p className="opacity-50">Tidak ada wikilink</p>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
