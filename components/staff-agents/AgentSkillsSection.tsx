"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { Download, Loader2, Package } from "lucide-react";
import { brand } from "@/lib/brand";
import type { StaffAgent } from "@/lib/staff-agents/types";

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json());

type RegistrySkill = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sourceUrl: string;
  tags: string[];
};

type InstalledSkill = {
  skillId: string;
  enabled: boolean;
  skill?: RegistrySkill;
};

type Props = {
  agent: StaffAgent;
};

export function AgentSkillsSection({ agent }: Props) {
  const [installUrl, setInstallUrl] = useState("");
  const [installing, setInstalling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: registryData, mutate: mutateRegistry } = useSWR<{ skills: RegistrySkill[] }>(
    "/api/staff-agents/skills",
    fetcher
  );
  const { data: agentData, mutate: mutateAgentSkills } = useSWR<{ skills: InstalledSkill[] }>(
    `/api/staff-agents/${agent.id}/skills`,
    fetcher
  );

  const registry = registryData?.skills ?? [];

  useEffect(() => {
    const ids = (agentData?.skills ?? []).map((s) => s.skillId);
    setSelected(new Set(ids));
  }, [agent.id, agentData?.skills]);

  const handleInstall = useCallback(async () => {
    if (!installUrl.trim()) return;
    setInstalling(true);
    try {
      const res = await fetch("/api/staff-agents/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: installUrl.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Install failed");
      setInstallUrl("");
      await mutateRegistry();
      if (body.skill?.id) {
        setSelected((prev) => new Set([...Array.from(prev), body.skill.id]));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal install skill");
    } finally {
      setInstalling(false);
    }
  }, [installUrl, mutateRegistry]);

  const handleSaveAssignment = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/staff-agents/${agent.id}/skills`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillIds: Array.from(selected) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Save failed");
      await mutateAgentSkills();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal simpan skills");
    } finally {
      setSaving(false);
    }
  }, [agent.id, selected, mutateAgentSkills]);

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <Package size={14} style={{ color: brand.blue }} />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Built-in Skills
        </span>
      </div>
      <div className="space-y-2 mb-4">
        {agent.skills.map((s) => (
          <div
            key={s.id}
            className="rounded-xl px-3 py-2 text-xs"
            style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}
          >
            <div className="font-medium" style={{ color: "var(--text-primary)" }}>
              {s.name}
            </div>
            <div style={{ color: "var(--text-muted)" }}>{s.description}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-2 mt-4">
        <Download size={14} style={{ color: brand.blue }} />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Installed Skills (GitHub)
        </span>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          value={installUrl}
          onChange={(e) => setInstallUrl(e.target.value)}
          placeholder="https://github.com/.../SKILL.md"
          className="flex-1 text-[11px] rounded-lg px-2 py-2 outline-none"
          style={{
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
        <button
          type="button"
          onClick={() => void handleInstall()}
          disabled={installing || !installUrl.trim()}
          className="px-3 py-2 rounded-lg text-[11px] font-medium text-white disabled:opacity-50"
          style={{ background: brand.blue }}
        >
          {installing ? <Loader2 size={14} className="animate-spin" /> : "Install"}
        </button>
      </div>

      {registry.length === 0 ? (
        <p className="text-[11px] mb-2" style={{ color: "var(--text-muted)" }}>
          Belum ada skill terinstall. Paste URL GitHub ke SKILL.md (marketing, SEO, dll).
        </p>
      ) : (
        <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin mb-2">
          {registry.map((skill) => (
            <label
              key={skill.id}
              className="flex items-start gap-2 text-xs rounded-lg px-2 py-1.5 cursor-pointer"
              style={{ background: "var(--bg-tertiary)" }}
            >
              <input
                type="checkbox"
                checked={selected.has(skill.id)}
                onChange={(e) => {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(skill.id);
                    else next.delete(skill.id);
                    return next;
                  });
                }}
                className="mt-0.5"
              />
              <div>
                <div className="font-medium" style={{ color: "var(--text-primary)" }}>
                  {skill.name}
                </div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {skill.description || skill.slug}
                </div>
              </div>
            </label>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleSaveAssignment()}
        disabled={saving}
        className="w-full py-2 rounded-lg text-[11px] font-medium disabled:opacity-50"
        style={{ background: brand.blueSoft, color: brand.blue }}
      >
        {saving ? "Menyimpan..." : "Simpan skill assignment ke agent"}
      </button>
    </section>
  );
}
