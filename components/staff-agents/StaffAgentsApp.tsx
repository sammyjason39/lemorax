"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { ConversationSidebar } from "@/components/staff-agents/ConversationSidebar";
import { ChatThread } from "@/components/staff-agents/ChatThread";
import { AgentSetupPanel } from "@/components/staff-agents/AgentSetupPanel";
import type { StaffAgent, StaffConversation, StaffMessage } from "@/lib/staff-agents/types";
import { X } from "lucide-react";
import { brand } from "@/lib/brand";

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => r.json());

type Tab = "chats" | "agents";

export function StaffAgentsApp() {
  const [tab, setTab] = useState<Tab>("chats");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [streamingAgentId, setStreamingAgentId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [agentProcessing, setAgentProcessing] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupAgentIds, setGroupAgentIds] = useState<string[]>([]);
  const [savingAgent, setSavingAgent] = useState(false);
  const [runningSchedules, setRunningSchedules] = useState(false);
  const [scheduleToast, setScheduleToast] = useState<string | null>(null);
  const [a2aHandoff, setA2aHandoff] = useState<{ from: string; to: string } | null>(null);

  const { data: agentsData, mutate: mutateAgents } = useSWR<{ agents: StaffAgent[] }>(
    "/api/staff-agents",
    fetcher
  );
  const { data: convData, mutate: mutateConversations } = useSWR<{ conversations: StaffConversation[] }>(
    "/api/staff-agents/conversations",
    fetcher
  );

  const agents = agentsData?.agents ?? [];
  const conversations = convData?.conversations ?? [];

  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null;
  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null;

  const loadMessages = useCallback(async (conversationId: string) => {
    const res = await fetch(`/api/staff-agents/conversations/${conversationId}/messages`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.messages)) setMessages(data.messages);
  }, []);

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      const eaDm = conversations.find((c) => c.id === "dm-executive-assistant");
      setActiveConversationId(eaDm?.id ?? conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  useEffect(() => {
    if (activeConversationId) void loadMessages(activeConversationId);
  }, [activeConversationId, loadMessages]);

  const handleSelectConversation = (id: string) => {
    setTab("chats");
    setActiveConversationId(id);
    setSelectedAgentId(null);
  };

  const handleSelectAgent = (id: string) => {
    setTab("agents");
    setSelectedAgentId(id);
    const dm = conversations.find((c) => c.type === "dm" && c.agentIds[0] === id);
    if (dm) {
      setActiveConversationId(dm.id);
    }
  };

  const handleSend = async (text: string) => {
    if (!activeConversationId) return;
    setSending(true);
    setStreamingAgentId(null);
    setStreamingContent("");
    setAgentProcessing(false);
    setA2aHandoff(null);

    const optimistic: StaffMessage = {
      id: `tmp_${Date.now()}`,
      conversationId: activeConversationId,
      senderType: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch("/api/staff-agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConversationId, message: text }),
      });

      if (!res.ok || !res.body) throw new Error("Chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const agentBuffers: Record<string, string> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") break;

          try {
            const event = JSON.parse(raw) as {
              type: string;
              agentId?: string;
              content?: string;
              message?: StaffMessage;
              fromAgentId?: string;
              toAgentId?: string;
            };

            if (event.type === "a2a_handoff" && event.fromAgentId && event.toAgentId) {
              setA2aHandoff({ from: event.fromAgentId, to: event.toAgentId });
            } else if (event.type === "agent_start" && event.agentId) {
              setStreamingAgentId(event.agentId);
              agentBuffers[event.agentId] = "";
              setStreamingContent("");
              setAgentProcessing(false);
            } else if (event.type === "agent_processing" && event.agentId) {
              setStreamingAgentId(event.agentId);
              setAgentProcessing(true);
              setStreamingContent("");
            } else if (event.type === "agent_chunk" && event.agentId && event.content) {
              setAgentProcessing(false);
              agentBuffers[event.agentId] = (agentBuffers[event.agentId] || "") + event.content;
              setStreamingContent(agentBuffers[event.agentId]);
            } else if (event.type === "agent_message" && event.message) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === event.message!.id)) {
                  return prev.map((m) => (m.id === event.message!.id ? event.message! : m));
                }
                return [...prev, event.message!];
              });
            } else if (event.type === "user_message" && event.message) {
              setMessages((prev) =>
                prev.map((m) => (m.id === optimistic.id ? event.message! : m))
              );
            }
          } catch {
            // ignore
          }
        }
      }

      await loadMessages(activeConversationId);
      await mutateConversations();
      await mutateAgents();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
      setStreamingAgentId(null);
      setStreamingContent("");
      setAgentProcessing(false);
      setA2aHandoff(null);
    }
  };

  const handleSaveAgent = async (patch: Partial<StaffAgent>) => {
    if (!selectedAgentId) return;
    setSavingAgent(true);
    try {
      await fetch(`/api/staff-agents/${selectedAgentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      await mutateAgents();
    } finally {
      setSavingAgent(false);
    }
  };

  const handleRunAllSchedules = async () => {
    setRunningSchedules(true);
    setScheduleToast(null);
    try {
      const res = await fetch("/api/staff-agents/schedules/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menjalankan schedule");

      const { summary } = data as { summary: { ran: number; failed: number; skipped: number } };
      setScheduleToast(
        `Schedule selesai: ${summary.ran} laporan terkirim ke personal chat` +
          (summary.failed ? `, ${summary.failed} gagal` : "")
      );
      await mutateConversations();
      await mutateAgents();
      if (activeConversationId) await loadMessages(activeConversationId);
    } catch (e) {
      setScheduleToast(e instanceof Error ? e.message : "Schedule gagal");
    } finally {
      setRunningSchedules(false);
      setTimeout(() => setScheduleToast(null), 6000);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || groupAgentIds.length === 0) return;
    const res = await fetch("/api/staff-agents/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "group",
        name: groupName.trim(),
        agentIds: groupAgentIds,
      }),
    });
    const data = await res.json();
    setShowNewGroup(false);
    setGroupName("");
    setGroupAgentIds([]);
    await mutateConversations();
    if (data.conversation?.id) {
      setActiveConversationId(data.conversation.id);
      setTab("chats");
    }
  };

  const showSetup = tab === "agents" && selectedAgent;

  return (
    <div className="flex h-full min-h-0 relative">
      <ConversationSidebar
        tab={tab}
        onTabChange={setTab}
        conversations={conversations}
        agents={agents}
        activeConversationId={activeConversationId}
        selectedAgentId={selectedAgentId}
        onSelectConversation={handleSelectConversation}
        onSelectAgent={handleSelectAgent}
        onNewGroup={() => {
          setGroupAgentIds(agents.map((a) => a.id));
          setShowNewGroup(true);
        }}
        onRunSchedules={() => void handleRunAllSchedules()}
        runningSchedules={runningSchedules}
      />

      {scheduleToast && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-medium shadow-lg"
          style={{ background: brand.blue, color: "white" }}
        >
          {scheduleToast}
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {activeConversation ? (
          <ChatThread
            conversation={activeConversation}
            agents={agents}
            messages={messages}
            onSend={handleSend}
            sending={sending}
            streamingAgentId={streamingAgentId}
            streamingContent={streamingContent}
            agentProcessing={agentProcessing}
            a2aHandoff={a2aHandoff}
          />
        ) : (
          <div
            className="flex-1 flex items-center justify-center text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            Pilih chat untuk mulai
          </div>
        )}
      </div>

      {showSetup && selectedAgent && (
        <AgentSetupPanel
          key={selectedAgent.id}
          agent={selectedAgent}
          onSave={handleSaveAgent}
          saving={savingAgent}
        />
      )}

      {showNewGroup && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            className="w-full max-w-md rounded-2xl p-5 shadow-xl"
            style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                Group Chat Baru
              </h3>
              <button onClick={() => setShowNewGroup(false)}>
                <X size={18} style={{ color: "var(--text-muted)" }} />
              </button>
            </div>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Nama group, e.g. Leadership Sync"
              className="w-full text-sm rounded-xl px-3 py-2 mb-3 outline-none"
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
              Pilih agents:
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto mb-4">
              {agents.map((a) => (
                <label
                  key={a.id}
                  className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg cursor-pointer"
                  style={{ color: "var(--text-primary)" }}
                >
                  <input
                    type="checkbox"
                    checked={groupAgentIds.includes(a.id)}
                    onChange={(e) => {
                      if (e.target.checked) setGroupAgentIds((ids) => [...ids, a.id]);
                      else setGroupAgentIds((ids) => ids.filter((id) => id !== a.id));
                    }}
                  />
                  {a.emoji} {a.name}
                </label>
              ))}
            </div>
            <button
              onClick={() => void handleCreateGroup()}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background: brand.blue }}
            >
              Buat Group
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
