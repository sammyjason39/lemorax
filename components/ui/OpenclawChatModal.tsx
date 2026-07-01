"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Send, User, X, Sparkles, Brain, Minimize2, Maximize2, Bot } from "lucide-react";
import { brand } from "@/lib/brand";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { streamAgentChat } from "@/lib/agents/chat-stream";
import { buildAgentChatPayload } from "@/lib/agents/chat-payload";
import { preprocessWikilinks } from "@/lib/vault/wikilink-markdown";
import { renderVaultMarkdownLink } from "@/components/markdown/VaultWikilink";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sqlQuery?: string;
  queryResult?: unknown;
  explanation?: string;
  isThinking?: boolean;
}

function AriesAvatar({ size = 24 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center shrink-0 font-bold text-white"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: brand.blue,
        fontSize: size * 0.45,
      }}
    >
      A
    </div>
  );
}

/* ─── Thinking Animation ─── */
function ThinkingBubble() {
  return (
    <div className="flex gap-2">
      <AriesAvatar size={24} />

      <div className="px-4 py-3 rounded-2xl flex items-center gap-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", minWidth: 150 }}>
        <div className="relative shrink-0">
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: brand.blueSoft }}>
            <Brain size={12} color="#1652F0" />
          </div>
          <span className="absolute inset-0 rounded-full" style={{ border: "1.5px solid #1652F0", animation: "ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite", opacity: 0.5 }} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium" style={{ color: "#1652F0" }}>Menganalisis...</span>
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-full" style={{ width: 4, height: 4, background: i % 2 === 0 ? "#1652F0" : "#1652F0", animation: `bounce 1.1s ${i * 0.12}s ease-in-out infinite`, opacity: 0.8 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Markdown renderer ─── */
function MarkdownContent({ content }: { content: string }) {
  const md = preprocessWikilinks(content);
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => {
          const vault = renderVaultMarkdownLink(href, children);
          if (vault) return vault;
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: brand.blue }}>
              {children}
            </a>
          );
        },
        h1: ({ children }) => <h1 className="text-sm font-bold mt-2 mb-1" style={{ color: "var(--text-primary)" }}>{children}</h1>,
        h2: ({ children }) => <h2 className="text-xs font-bold mt-2 mb-1" style={{ color: "#1652F0" }}>{children}</h2>,
        h3: ({ children }) => <h3 className="text-xs font-semibold mt-2 mb-1" style={{ color: "#1652F0" }}>{children}</h3>,
        p: ({ children }) => <p className="text-[11px] leading-relaxed mb-1.5" style={{ color: "var(--text-primary)" }}>{children}</p>,
        strong: ({ children }) => <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>{children}</strong>,
        em: ({ children }) => <em className="font-medium not-italic" style={{ color: brand.blue }}>{children}</em>,
        ul: ({ children }) => <ul className="text-[11px] space-y-1 mb-2 pl-3" style={{ color: "var(--text-primary)", listStyleType: "disc" }}>{children}</ul>,
        ol: ({ children }) => <ol className="text-[11px] space-y-1 mb-2 pl-3" style={{ color: "var(--text-primary)", listStyleType: "decimal" }}>{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed" style={{ color: "var(--text-primary)" }}>{children}</li>,
        code: ({ inline, children }: any) => inline ? <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: brand.blueSoft, color: brand.blue }}>{children}</code> : <pre className="p-2 rounded-lg text-[9px] overflow-x-auto my-1.5" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "#1652F0" }}><code>{children}</code></pre>,
        blockquote: ({ children }) => <blockquote className="pl-2 py-0.5 my-1.5 text-[11px]" style={{ borderLeft: "2px solid #1652F0", color: brand.blueMid }}>{children}</blockquote>,
      }}
    >
      {md}
    </ReactMarkdown>
  );
}

export function OpenclawChatModal() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const assistantId = (Date.now() + 1).toString();
    let assistantContent = "";

    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", isThinking: true },
    ]);

    try {
      const payload = buildAgentChatPayload(messages, text);
      await streamAgentChat({
        ...payload,
        onEvent: (parsed) => {
          if (parsed.type === "meta" && parsed.sql_query) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, isThinking: false, sqlQuery: parsed.sql_query, queryResult: parsed.queryResult, explanation: parsed.explanation }
                  : m
              )
            );
          } else if (parsed.type === "meta" && parsed.source === "qwen-fallback" && parsed.note) {
            // Keep thinking animation while Qwen fallback runs after OpenClaw failure.
          } else if (parsed.type === "meta" && (parsed.sql_query || parsed.source === "qwen-fallback")) {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, isThinking: false } : m))
            );
          } else if (parsed.type === "chunk") {
            assistantContent += parsed.content;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, isThinking: false, content: assistantContent } : m
              )
            );
          } else if (parsed.type === "error") {
            assistantContent += `\n\n❌ **Error:** ${parsed.message}`;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, isThinking: false, content: assistantContent.trim() } : m
              )
            );
          }
        },
      });
    } catch (e: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, isThinking: false, content: `❌ **Error:** ${e.message}` }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (pathname?.startsWith("/dashboard/ai-agents-staff")) {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes bounce { 0%, 100% { transform: translateY(0); opacity: 0.5; } 50% { transform: translateY(-3px); opacity: 1; } }
        @keyframes ping { 75%, 100% { transform: scale(1.6); opacity: 0; } }
      `}</style>

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all z-50 border-2 hover:scale-105 hover:shadow-xl ${isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"}`}
        style={{ background: brand.blue, borderColor: "rgba(22,82,240,0.4)", boxShadow: "0 16px 50px -20px rgba(22,82,240,0.45)" }}
      >
        <Bot size={24} color="white" />
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div 
          className={`fixed bottom-6 right-6 flex flex-col rounded-2xl shadow-2xl z-50 transition-all duration-300 ${isExpanded ? "w-[600px] h-[80vh]" : "w-[380px] h-[600px]"}`}
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", boxShadow: "0 30px 80px -30px rgba(10,10,10,0.18)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
            <div className="flex items-center gap-3">
              <AriesAvatar size={32} />
              <div>
                <h3 className="text-sm font-sans font-extrabold" style={{ color: brand.blue, letterSpacing: "-0.03em" }}>
                  ARIES AI
                </h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: brand.blue }} />
                  <span className="text-[10px] font-sans font-semibold" style={{ color: "var(--text-muted)" }}>Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 rounded-md hover:bg-white/5 transition-colors" style={{ color: "var(--text-muted)" }}>
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-md hover:bg-white/5 transition-colors" style={{ color: "var(--text-muted)" }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin" style={{ background: "var(--bg-primary)" }}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center pb-8">
                <div className="mb-4">
                  <AriesAvatar size={56} />
                </div>
                <h2 className="text-sm font-sans font-extrabold mb-1.5" style={{ color: brand.blue }}>
                  Halo, saya ARIES AI
                </h2>
                <p className="text-[11px] mb-6 px-4" style={{ color: "var(--text-secondary)" }}>
                  Asisten bisnis PT Lemorax. Tanya performa cabang, sales, atau data keuangan.
                </p>
                <div className="grid grid-cols-1 gap-2 w-full max-w-[280px]">
                  {["Performa cabang bulan ini?", "Siapa top sales Q1 2025?", "Berapa total profit tahun ini?"].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="text-left px-3 py-2 rounded-lg text-[10px] transition-all hover:border-[#1652F0]/40"
                      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                if (msg.role === "user") {
                  return (
                    <div key={msg.id} className="flex gap-2 flex-row-reverse">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: brand.ink }}>
                        <User size={12} color="white" />
                      </div>
                      <div className="flex-1 max-w-[85%] flex flex-col items-end">
                        <div className="px-3 py-2 rounded-2xl text-[11px] leading-relaxed" style={{ background: brand.blueSoft, border: "1px solid rgba(22,82,240,0.2)", color: "var(--text-primary)" }}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                }

                if (msg.isThinking) return <ThinkingBubble key={msg.id} />;

                return (
                  <div key={msg.id} className="flex gap-2">
                    <AriesAvatar size={24} />
                    <div className="flex-1 max-w-[85%] flex flex-col items-start">
                      <div className="px-4 py-3 rounded-2xl ai-prose w-full shadow-md" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                        {msg.content ? (
                          <MarkdownContent content={msg.content} />
                        ) : (
                          <div className="flex items-center gap-1">
                            {[0, 1, 2].map((i) => (
                              <div key={i} className="rounded-full" style={{ width: 4, height: 4, background: "#1652F0", animation: `bounce 1.1s ${i * 0.15}s ease-in-out infinite` }} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
            <div className="flex items-end gap-2 rounded-xl p-2 shadow-inner" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Tanya ARIES AI..."
                rows={1}
                className="flex-1 bg-transparent text-[11px] p-1 outline-none resize-none scrollbar-thin"
                style={{ color: "var(--text-primary)", maxHeight: "100px" }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all disabled:opacity-30 hover:scale-105"
                style={{ background: brand.blue }}
              >
                <Send size={12} color="white" />
              </button>
            </div>
            <div className="text-[9px] text-center mt-2 flex items-center justify-center gap-1 opacity-60" style={{ color: "var(--text-muted)" }}>
              <Sparkles size={9} color={brand.blue} /> ARIES AI · PT Lemorax
            </div>
          </div>
        </div>
      )}
    </>
  );
}
