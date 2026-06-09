"use client";

import { Plus, MessageCircle, Settings2, CalendarClock, Loader2 } from "lucide-react";
import type { StaffAgent, StaffConversation } from "@/lib/staff-agents/types";
import { AgentAvatar, GroupAvatar } from "@/components/staff-agents/AgentAvatar";
import { getChatLabel } from "@/lib/staff-agents/names";
import { brand } from "@/lib/brand";

type Tab = "chats" | "agents";

type Props = {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  conversations: StaffConversation[];
  agents: StaffAgent[];
  activeConversationId: string | null;
  selectedAgentId: string | null;
  onSelectConversation: (id: string) => void;
  onSelectAgent: (id: string) => void;
  onNewGroup: () => void;
  onRunSchedules?: () => void;
  runningSchedules?: boolean;
};

function formatPreview(text?: string) {
  if (!text) return "Belum ada pesan";
  return text.replace(/\*\*/g, "").slice(0, 48);
}

export function ConversationSidebar({
  tab,
  onTabChange,
  conversations,
  agents,
  activeConversationId,
  selectedAgentId,
  onSelectConversation,
  onSelectAgent,
  onNewGroup,
  onRunSchedules,
  runningSchedules,
}: Props) {
  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a]));

  return (
    <div
      className="w-[320px] shrink-0 flex flex-col border-r h-full"
      style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}
    >
      <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
          AI Agents Staff
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          WhatsApp-style multi-agent workspace
        </p>

        <div
          className="mt-3 flex rounded-xl p-1 text-xs font-medium"
          style={{ background: "var(--bg-tertiary)" }}
        >
          {(["chats", "agents"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => onTabChange(t)}
              className="flex-1 py-1.5 rounded-lg transition-colors capitalize"
              style={{
                background: tab === t ? "var(--bg-primary)" : "transparent",
                color: tab === t ? brand.blue : "var(--text-muted)",
                boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.06)" : undefined,
              }}
            >
              {t === "chats" ? "Chats" : "Agents"}
            </button>
          ))}
        </div>
      </div>

      {tab === "chats" && (
        <>
          <div className="px-3 py-2 space-y-2">
            <button
              onClick={onNewGroup}
              className="w-full flex items-center justify-center gap-2 text-xs font-medium py-2 rounded-xl transition-colors"
              style={{ background: brand.blueSoft, color: brand.blue }}
            >
              <Plus size={14} />
              Group Chat Baru
            </button>
            {onRunSchedules && (
              <button
                onClick={onRunSchedules}
                disabled={runningSchedules}
                className="w-full flex items-center justify-center gap-2 text-xs font-medium py-2 rounded-xl transition-colors disabled:opacity-50"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                }}
              >
                {runningSchedules ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CalendarClock size={14} />
                )}
                {runningSchedules ? "Menjalankan schedule..." : "Jalankan Schedule ke DM"}
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2 space-y-0.5">
            {conversations.map((conv) => {
              const convAgents = conv.agentIds.map((id) => agentMap[id]).filter(Boolean);
              const active = activeConversationId === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors"
                  style={{
                    background: active ? brand.blueSoft : "transparent",
                  }}
                >
                  {conv.type === "group" ? (
                    <GroupAvatar agents={convAgents} size={44} />
                  ) : (
                    convAgents[0] && <AgentAvatar agent={convAgents[0]} size={44} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <span
                        className="text-sm font-medium truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {conv.type === "dm" && convAgents[0]
                          ? getChatLabel(convAgents[0])
                          : conv.name}
                      </span>
                      {conv.type === "group" && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}
                        >
                          GROUP
                        </span>
                      )}
                    </div>
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {formatPreview(conv.lastMessage)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {tab === "agents" && (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-0.5">
          {agents.map((agent) => {
            const active = selectedAgentId === agent.id;
            return (
              <button
                key={agent.id}
                onClick={() => onSelectAgent(agent.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left"
                style={{ background: active ? brand.blueSoft : "transparent" }}
              >
                <AgentAvatar agent={agent} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {getChatLabel(agent)}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        background: agent.status === "online" ? "#22c55e" : "#94a3b8",
                      }}
                    />
                  </div>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    {agent.role}
                  </p>
                </div>
                <Settings2 size={14} style={{ color: "var(--text-muted)" }} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ConversationSidebarIcon({ size = 16 }: { size?: number }) {
  return <MessageCircle size={size} />;
}
