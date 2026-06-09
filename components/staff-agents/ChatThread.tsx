"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Users } from "lucide-react";
import type { StaffAgent, StaffConversation, StaffMessage } from "@/lib/staff-agents/types";
import { AgentAvatar, GroupAvatar } from "@/components/staff-agents/AgentAvatar";
import { getChatLabel, getDisplayName, getMentionTag, filterMentionSuggestions } from "@/lib/staff-agents/names";
import { brand } from "@/lib/brand";

type Props = {
  conversation: StaffConversation;
  agents: StaffAgent[];
  messages: StaffMessage[];
  onSend: (text: string) => Promise<void>;
  sending: boolean;
  streamingAgentId?: string | null;
  streamingContent?: string;
  a2aHandoff?: { from: string; to: string } | null;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function ChatThread({
  conversation,
  agents,
  messages,
  onSend,
  sending,
  streamingAgentId,
  streamingContent,
  a2aHandoff,
}: Props) {
  const [input, setInput] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mentionSuggestions =
    mentionQuery !== null ? filterMentionSuggestions(mentionQuery, agents) : [];

  const updateMentionState = (value: string, cursorPos: number) => {
    const before = value.slice(0, cursorPos);
    const atMatch = before.match(/@([\w]*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const applyMention = (agent: StaffAgent) => {
    const el = textareaRef.current;
    const cursor = el?.selectionStart ?? input.length;
    const before = input.slice(0, cursor);
    const after = input.slice(cursor);
    const atIdx = before.lastIndexOf("@");
    if (atIdx < 0) return;

    const tag = getMentionTag(agent) + " ";
    const next = before.slice(0, atIdx) + tag + after;
    setInput(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const pos = atIdx + tag.length;
      el?.setSelectionRange(pos, pos);
      el?.focus();
    });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, sending]);

  const convAgents = agents.filter((a) => conversation.agentIds.includes(a.id));
  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a]));

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    await onSend(text);
  };

  const showMentions = conversation.orchestrated || conversation.type === "group";
  const mentionable = convAgents.filter((a) => !a.isOrchestrator);

  const insertMention = (agent: StaffAgent) => {
    const tag = getMentionTag(agent) + " ";
    setInput((prev) => (prev.endsWith(" ") || prev === "" ? prev + tag : prev + " " + tag));
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-3 border-b shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
      >
        {conversation.type === "group" ? (
          <GroupAvatar agents={convAgents} size={44} />
        ) : (
          convAgents[0] && <AgentAvatar agent={convAgents[0]} size={44} />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
            {conversation.name}
          </div>
          <div className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
            {conversation.type === "group" ? (
              <>
                <Users size={12} />
                {convAgents.length} agents · Group
              </>
            ) : (
              convAgents[0] ? getChatLabel(convAgents[0]) : ""
            )}
          </div>
        </div>
      </div>

      {a2aHandoff && (
        <div
          className="px-4 py-1.5 text-[11px] border-b shrink-0 flex items-center gap-2"
          style={{ background: brand.blueSoft, borderColor: "var(--border)", color: brand.blue }}
        >
          <span>A2A handoff</span>
          <span className="font-medium">
            {agentMap[a2aHandoff.from] ? getChatLabel(agentMap[a2aHandoff.from]) : a2aHandoff.from}
            {" → "}
            {agentMap[a2aHandoff.to] ? getChatLabel(agentMap[a2aHandoff.to]) : a2aHandoff.to}
          </span>
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin"
        style={{ background: "var(--bg-tertiary)" }}
      >
        {messages.map((msg) => {
          const isUser = msg.senderType === "user";
          const agent = msg.senderAgentId ? agentMap[msg.senderAgentId] : undefined;

          return (
            <div key={msg.id} className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
              {!isUser && agent && <AgentAvatar agent={agent} size={32} />}
              <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                {!isUser && agent && (
                  <span className="text-[10px] font-medium px-1" style={{ color: agent.avatarColor }}>
                    {getChatLabel(agent)}
                    {msg.messageKind === "handoff" && (
                      <span className="ml-1 opacity-70">· handoff</span>
                    )}
                    {msg.messageKind === "crosstalk" && (
                      <span className="ml-1 opacity-70">· A2A</span>
                    )}
                    {msg.scheduleRun && (
                      <span className="ml-1 opacity-70">· terjadwal</span>
                    )}
                  </span>
                )}
                {msg.handoffFrom && agentMap[msg.handoffFrom] && (
                  <span className="text-[9px] px-1 opacity-60" style={{ color: "var(--text-muted)" }}>
                    ↪ dari {getChatLabel(agentMap[msg.handoffFrom])}
                  </span>
                )}
                <div
                  className="px-3 py-2 rounded-2xl text-sm leading-relaxed"
                  style={{
                    background: isUser ? brand.blueSoft : "var(--bg-primary)",
                    border: isUser ? `1px solid ${brand.blue}22` : "1px solid var(--border)",
                    color: "var(--text-primary)",
                    borderTopRightRadius: isUser ? 4 : undefined,
                    borderTopLeftRadius: !isUser ? 4 : undefined,
                  }}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
                <span className="text-[10px] px-1" style={{ color: "var(--text-muted)" }}>
                  {formatTime(msg.createdAt)}
                </span>
              </div>
            </div>
          );
        })}

        {streamingAgentId && streamingContent !== undefined && (
          <div className="flex gap-2">
            {agentMap[streamingAgentId] && (
              <AgentAvatar agent={agentMap[streamingAgentId]} size={32} />
            )}
            <div className="max-w-[75%]">
              <span
                className="text-[10px] font-medium px-1"
                style={{ color: agentMap[streamingAgentId]?.avatarColor }}
              >
                {agentMap[streamingAgentId] ? getChatLabel(agentMap[streamingAgentId]) : ""} · mengetik...
              </span>
              <div
                className="px-3 py-2 rounded-2xl rounded-tl-sm text-sm"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent || "..."}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="p-3 border-t shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
      >
        {showMentions && mentionable.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {mentionable.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => insertMention(a)}
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: brand.blueSoft, color: brand.blue }}
              >
                {getMentionTag(a)}
              </button>
            ))}
          </div>
        )}
        <div className="relative">
          {mentionQuery !== null && mentionSuggestions.length > 0 && (
            <div
              className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border shadow-lg overflow-hidden z-10"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
            >
              {mentionSuggestions.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyMention(a);
                  }}
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:opacity-90"
                  style={{
                    background: i === mentionIndex ? brand.blueSoft : "transparent",
                    color: "var(--text-primary)",
                  }}
                >
                  <AgentAvatar agent={a} size={24} />
                  <span className="font-medium">{getChatLabel(a)}</span>
                  <span className="text-xs ml-auto" style={{ color: brand.blue }}>
                    {getMentionTag(a)}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div
            className="flex items-end gap-2 rounded-2xl px-3 py-2"
            style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                updateMentionState(e.target.value, e.target.selectionStart ?? e.target.value.length);
              }}
              onKeyDown={(e) => {
                if (mentionQuery !== null && mentionSuggestions.length > 0) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setMentionIndex((i) => Math.min(i + 1, mentionSuggestions.length - 1));
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setMentionIndex((i) => Math.max(i - 1, 0));
                    return;
                  }
                  if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    applyMention(mentionSuggestions[mentionIndex] ?? mentionSuggestions[0]);
                    return;
                  }
                  if (e.key === "Escape") {
                    setMentionQuery(null);
                    return;
                  }
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              onClick={(e) =>
                updateMentionState(input, (e.target as HTMLTextAreaElement).selectionStart ?? input.length)
              }
              placeholder={
                conversation.orchestrated
                  ? "Tanya Executive Assistant atau @tag agent..."
                  : "Ketik pesan..."
              }
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm outline-none max-h-32 py-1"
              style={{ color: "var(--text-primary)" }}
              disabled={sending}
            />
            <button
              onClick={() => void handleSend()}
              disabled={sending || !input.trim()}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-opacity disabled:opacity-40"
              style={{ background: brand.blue, color: "white" }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
