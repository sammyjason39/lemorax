"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import type { BrandScope, ContentPlanItem, ContentStatus } from "@/lib/content-plan/types";
import { BRAND_SCOPE_LABELS, CONTENT_STATUSES, STATUS_LABELS } from "@/lib/content-plan/types";
import { CHART_PRIMARY, CHART_MUTED } from "@/lib/brand";
import { Plus, X, Loader2, Send } from "lucide-react";

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error("Gagal memuat content plan");
    return r.json();
  });

const FORMAT_LABELS: Record<string, string> = {
  reel: "Reel",
  carousel: "Carousel",
  image: "Image",
  story: "Story",
};

export function ContentPlanBoard() {
  const [scope, setScope] = useState<BrandScope>("company");
  const { data, isLoading, mutate } = useSWR(`/api/content-plan?scope=${scope}`, fetcher);
  const [selected, setSelected] = useState<ContentPlanItem | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newFormat, setNewFormat] = useState("reel");
  const [draft, setDraft] = useState<Partial<ContentPlanItem>>({});

  const board = data?.board as Record<ContentStatus, ContentPlanItem[]> | undefined;

  const refresh = useCallback(() => mutate(undefined, { revalidate: true }), [mutate]);

  async function patchItem(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/content-plan/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Update gagal");
    return json.item as ContentPlanItem;
  }

  async function handleDrop(status: ContentStatus) {
    if (!dragId) return;
    try {
      const item = await patchItem(dragId, { status });
      if (selected?.id === dragId) setSelected(item);
      await refresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Gagal pindah kartu");
    } finally {
      setDragId(null);
    }
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/content-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, format: newFormat, brand_scope: scope }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setNewTitle("");
      setShowNew(false);
      await refresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Gagal buat kartu");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDetail() {
    if (!selected) return;
    setSaving(true);
    try {
      const item = await patchItem(selected.id, {
        title: draft.title ?? selected.title,
        format: draft.format ?? selected.format,
        script_md: draft.script_md ?? selected.script_md,
        notes: draft.notes ?? selected.notes,
        scheduled_at: draft.scheduled_at ?? selected.scheduled_at,
      });
      setSelected(item);
      await refresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Gagal simpan");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishDemo() {
    if (!selected) return;
    const ok = window.confirm(
      "Ini simulasi — konten TIDAK diposting ke Instagram.\n\nLanjutkan Publish (Demo)?"
    );
    if (!ok) return;

    setPublishing(true);
    setPublishProgress(0);
    const interval = setInterval(() => {
      setPublishProgress((p) => Math.min(p + 12, 90));
    }, 200);

    try {
      const res = await fetch(`/api/content-plan/${selected.id}/publish-demo`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      clearInterval(interval);
      setPublishProgress(100);
      setSelected(json.item);
      await refresh();
      setTimeout(() => {
        setPublishing(false);
        setPublishProgress(0);
      }, 800);
    } catch (e: unknown) {
      clearInterval(interval);
      setPublishing(false);
      setPublishProgress(0);
      alert(e instanceof Error ? e.message : "Publish gagal");
    }
  }

  function openDetail(item: ContentPlanItem) {
    setSelected(item);
    setDraft({
      title: item.title,
      format: item.format,
      script_md: item.script_md,
      notes: item.notes,
      scheduled_at: item.scheduled_at,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm" style={{ color: CHART_MUTED }}>
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat Content Plan…
      </div>
    );
  }

  return (
    <div className="flex gap-4 min-h-[520px]">
      <div className="flex-1 overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="inline-flex rounded-lg p-1 gap-1" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}>
            {(["personal", "company"] as BrandScope[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setScope(s);
                  setSelected(null);
                }}
                className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: scope === s ? CHART_PRIMARY : "transparent",
                  color: scope === s ? "#fff" : CHART_MUTED,
                }}
              >
                {BRAND_SCOPE_LABELS[s]}
              </button>
            ))}
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {data?.total ?? 0} kartu · {scope === "personal" ? "@anjas_maradita" : "Lemorax"} · @Soca via chat
          </p>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{ background: CHART_PRIMARY, color: "#fff" }}
          >
            <Plus className="h-3.5 w-3.5" /> Ide baru
          </button>
        </div>

        {showNew && (
          <div className="card-base p-4 mb-4 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs" style={{ color: CHART_MUTED }}>Judul ide</label>
              <input
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm border"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Contoh: Tips deterjen kiloan"
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: CHART_MUTED }}>Format</label>
              <select
                className="mt-1 block rounded-lg px-3 py-2 text-sm border"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
                value={newFormat}
                onChange={(e) => setNewFormat(e.target.value)}
              >
                <option value="reel">Reel</option>
                <option value="carousel">Carousel</option>
                <option value="image">Image</option>
                <option value="story">Story</option>
              </select>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={handleCreate}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{ background: CHART_PRIMARY, color: "#fff" }}
            >
              Tambah ke Backlog
            </button>
            <button type="button" onClick={() => setShowNew(false)} className="text-sm" style={{ color: CHART_MUTED }}>
              Batal
            </button>
          </div>
        )}

        <div className="flex gap-3 pb-4 min-w-[900px]">
          {CONTENT_STATUSES.map((status) => (
            <div
              key={status}
              className="flex-shrink-0 w-[200px] rounded-xl p-3"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(status)}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>
                  {STATUS_LABELS[status]}
                </span>
                <span className="text-xs rounded-full px-2 py-0.5" style={{ background: "var(--bg-tertiary)", color: CHART_MUTED }}>
                  {board?.[status]?.length ?? 0}
                </span>
              </div>
              <div className="space-y-2 min-h-[120px]">
                {(board?.[status] ?? []).map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => setDragId(item.id)}
                    onClick={() => openDetail(item)}
                    className="rounded-lg p-3 cursor-grab active:cursor-grabbing text-left transition-shadow hover:shadow-md"
                    style={{
                      background: "var(--bg-tertiary)",
                      border: selected?.id === item.id ? `2px solid ${CHART_PRIMARY}` : "1px solid var(--border)",
                    }}
                  >
                    <p className="text-xs font-medium line-clamp-2" style={{ color: "var(--text-primary)" }}>
                      {item.title}
                    </p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded" style={{ background: "rgba(22,82,240,0.1)", color: CHART_PRIMARY }}>
                        {FORMAT_LABELS[item.format] || item.format}
                      </span>
                      {item.last_touched_by === "soca-social" && (
                        <span className="text-[10px]">📱 Soca</span>
                      )}
                      {item.publish_mode === "demo" && (
                        <span className="text-[10px] rounded px-1" style={{ background: "rgba(225,29,72,0.15)", color: "#E11D48" }}>
                          Demo
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div
          className="w-full max-w-md flex-shrink-0 rounded-xl p-5 space-y-4 overflow-y-auto max-h-[calc(100vh-12rem)]"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Detail Konten
            </h3>
            <button type="button" onClick={() => setSelected(null)} aria-label="Tutup">
              <X className="h-4 w-4" style={{ color: CHART_MUTED }} />
            </button>
          </div>

          <div>
            <label className="text-xs" style={{ color: CHART_MUTED }}>Judul</label>
            <input
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm border"
              style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)" }}
              value={draft.title ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs" style={{ color: CHART_MUTED }}>Format</label>
            <select
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm border"
              style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)" }}
              value={draft.format ?? "reel"}
              onChange={(e) => setDraft((d) => ({ ...d, format: e.target.value as ContentPlanItem["format"] }))}
            >
              <option value="reel">Reel</option>
              <option value="carousel">Carousel</option>
              <option value="image">Image</option>
              <option value="story">Story</option>
            </select>
          </div>

          <div>
            <label className="text-xs" style={{ color: CHART_MUTED }}>Script (markdown)</label>
            <textarea
              rows={10}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm border font-mono"
              style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)" }}
              value={draft.script_md ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, script_md: e.target.value }))}
              placeholder="**Hook:** ...&#10;**Body:** ...&#10;**CTA:** ...&#10;#hashtag"
            />
          </div>

          <div>
            <label className="text-xs" style={{ color: CHART_MUTED }}>Jadwal (opsional)</label>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm border"
              style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)" }}
              value={
                draft.scheduled_at
                  ? new Date(draft.scheduled_at).toISOString().slice(0, 16)
                  : ""
              }
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                }))
              }
            />
          </div>

          <div>
            <label className="text-xs" style={{ color: CHART_MUTED }}>Catatan</label>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm border"
              style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)" }}
              value={draft.notes ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            />
          </div>

          <p className="text-[10px]" style={{ color: CHART_MUTED }}>
            {BRAND_SCOPE_LABELS[selected.brand_scope ?? scope]} · {STATUS_LABELS[selected.status]} · {selected.id}
          </p>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveDetail}
              className="w-full rounded-lg py-2 text-sm font-medium"
              style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}
            >
              {saving ? "Menyimpan…" : "Simpan"}
            </button>

            {["review", "scheduled"].includes(selected.status) && (
              <button
                type="button"
                disabled={publishing}
                onClick={handlePublishDemo}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium"
                style={{ background: "#E11D48", color: "#fff" }}
              >
                {publishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Publishing {publishProgress}%…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Publish (Demo)
                  </>
                )}
              </button>
            )}

            {publishing && (
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
                <div
                  className="h-full transition-all duration-200"
                  style={{ width: `${publishProgress}%`, background: CHART_PRIMARY }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
