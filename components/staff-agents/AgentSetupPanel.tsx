"use client";

import { useEffect, useState } from "react";
import { Save, Clock, Brain, FileText } from "lucide-react";
import type { StaffAgent } from "@/lib/staff-agents/types";
import { AgentAvatar } from "@/components/staff-agents/AgentAvatar";
import { AgentSkillsSection } from "@/components/staff-agents/AgentSkillsSection";
import { brand } from "@/lib/brand";

type Props = {
  agent: StaffAgent;
  onSave: (patch: Partial<StaffAgent>) => Promise<void>;
  saving: boolean;
};

export function AgentSetupPanel({ agent, onSave, saving }: Props) {
  const [displayName, setDisplayName] = useState(agent.displayName ?? agent.name);
  const [soulMd, setSoulMd] = useState(agent.soulMd);
  const [scheduleLabel, setScheduleLabel] = useState(agent.schedule.label);
  const [scheduleAction, setScheduleAction] = useState(agent.schedule.action);
  const [scheduleEnabled, setScheduleEnabled] = useState(agent.schedule.enabled);
  const [runningSchedule, setRunningSchedule] = useState(false);

  useEffect(() => {
    setDisplayName(agent.displayName ?? agent.name);
    setSoulMd(agent.soulMd);
    setScheduleLabel(agent.schedule.label);
    setScheduleAction(agent.schedule.action);
    setScheduleEnabled(agent.schedule.enabled);
  }, [agent]);

  const handleSave = async () => {
    await onSave({
      displayName: displayName.trim() || agent.name,
      soulMd,
      schedule: {
        ...agent.schedule,
        enabled: scheduleEnabled,
        label: scheduleLabel,
        action: scheduleAction,
      },
    });
  };

  return (
    <div
      className="w-[360px] shrink-0 flex flex-col border-l h-full overflow-hidden"
      style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}
    >
      <div className="p-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <AgentAvatar agent={agent} size={48} />
          <div>
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {displayName || agent.name}
            </h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {agent.role}
            </p>
          </div>
        </div>
        <p className="text-xs mt-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {agent.description}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-5">
        {!agent.isOrchestrator && (
          <section>
            <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
              Nama / @Tag
            </div>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Contoh: Fania"
              className="w-full text-sm rounded-xl px-3 py-2 outline-none"
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
              Dipakai untuk @mention di grup. Role resmi: {agent.name}
            </p>
          </section>
        )}

        {/* Soul.md */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} style={{ color: brand.blue }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              soul.md
            </span>
          </div>
          <textarea
            value={soulMd}
            onChange={(e) => setSoulMd(e.target.value)}
            rows={10}
            className="w-full text-xs font-mono rounded-xl p-3 outline-none resize-none"
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </section>

        <AgentSkillsSection agent={agent} />

        {/* Schedule */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} style={{ color: brand.blue }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Schedule
            </span>
          </div>
          <label className="flex items-center gap-2 text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
            />
            Aktifkan jadwal otomatis
          </label>
          <input
            value={scheduleLabel}
            onChange={(e) => setScheduleLabel(e.target.value)}
            placeholder="Label jadwal"
            className="w-full text-xs rounded-lg px-3 py-2 mb-2 outline-none"
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
          <textarea
            value={scheduleAction}
            onChange={(e) => setScheduleAction(e.target.value)}
            placeholder="Aksi yang dijalankan..."
            rows={3}
            className="w-full text-xs rounded-lg px-3 py-2 outline-none resize-none"
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </section>

        {/* Memory */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Brain size={14} style={{ color: brand.blue }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Memory ({agent.memory.length})
            </span>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
            {agent.memory.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Memori terisi otomatis dari percakapan.
              </p>
            ) : (
              agent.memory
                .slice()
                .reverse()
                .slice(0, 8)
                .map((m) => (
                  <div
                    key={m.id}
                    className="text-[11px] rounded-lg px-2 py-1.5"
                    style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                  >
                    <span className="opacity-50 text-[9px]">{m.source} · </span>
                    {m.content}
                  </div>
                ))
            )}
          </div>
        </section>

        {/* A2A */}
        <section
          className="rounded-xl p-3 text-xs"
          style={{ background: brand.blueSoft, border: `1px solid ${brand.blue}33` }}
        >
          <div className="font-semibold mb-1" style={{ color: brand.blue }}>
            A2A Protocol
          </div>
          <code className="block break-all text-[10px]" style={{ color: "var(--text-secondary)" }}>
            /api/staff-agents/{agent.id}/card
          </code>
          <code className="block break-all text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>
            /api/staff-agents/{agent.id}/a2a/jsonrpc
          </code>
        </section>
      </div>

      <div className="p-4 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={async () => {
            setRunningSchedule(true);
            try {
              await fetch("/api/staff-agents/schedules/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ force: true, agentId: agent.id }),
              });
            } finally {
              setRunningSchedule(false);
            }
          }}
          disabled={runningSchedule}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium mb-2 disabled:opacity-50"
          style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        >
          <Clock size={14} />
          {runningSchedule ? "Menjalankan..." : "Jalankan Schedule Sekarang"}
        </button>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
          style={{ background: brand.blue }}
        >
          <Save size={16} />
          {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
        </button>
      </div>
    </div>
  );
}
