"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Send, User, X, Loader2, Sparkles, Brain, Minimize2, Maximize2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sqlQuery?: string;
  queryResult?: unknown;
  explanation?: string;
  isThinking?: boolean;
}

/* ─── Thinking Animation ─── */
function ThinkingBubble() {
  return (
    <div className="flex gap-2">
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 overflow-hidden border border-emerald-500/30">
        <Image src="/openclaw_logo.png" alt="Openclaw" width={24} height={24} className="object-cover" />
      </div>

      <div className="px-4 py-3 rounded-2xl flex items-center gap-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", minWidth: 150 }}>
        <div className="relative shrink-0">
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(20,184,166,0.15)" }}>
            <Brain size={12} color="#14B8A6" />
          </div>
          <span className="absolute inset-0 rounded-full" style={{ border: "1.5px solid #14B8A6", animation: "ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite", opacity: 0.5 }} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium" style={{ color: "#14B8A6" }}>Menganalisis...</span>
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-full" style={{ width: 4, height: 4, background: i % 2 === 0 ? "#14B8A6" : "#3B82F6", animation: `bounce 1.1s ${i * 0.12}s ease-in-out infinite`, opacity: 0.8 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Markdown renderer ─── */
function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="text-sm font-bold mt-2 mb-1" style={{ color: "var(--text-primary)" }}>{children}</h1>,
        h2: ({ children }) => <h2 className="text-xs font-bold mt-2 mb-1" style={{ color: "#14B8A6" }}>{children}</h2>,
        h3: ({ children }) => <h3 className="text-xs font-semibold mt-2 mb-1" style={{ color: "#3B82F6" }}>{children}</h3>,
        p: ({ children }) => <p className="text-[11px] leading-relaxed mb-1.5" style={{ color: "var(--text-primary)" }}>{children}</p>,
        strong: ({ children }) => <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>{children}</strong>,
        em: ({ children }) => <em style={{ color: "#94A3B8" }}>{children}</em>,
        ul: ({ children }) => <ul className="text-[11px] space-y-1 mb-2 pl-3" style={{ color: "var(--text-primary)", listStyleType: "disc" }}>{children}</ul>,
        ol: ({ children }) => <ol className="text-[11px] space-y-1 mb-2 pl-3" style={{ color: "var(--text-primary)", listStyleType: "decimal" }}>{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed" style={{ color: "var(--text-primary)" }}>{children}</li>,
        code: ({ inline, children }: any) => inline ? <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: "rgba(20,184,166,0.12)", color: "#14B8A6" }}>{children}</code> : <pre className="p-2 rounded-lg text-[9px] overflow-x-auto my-1.5" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "#14B8A6" }}><code>{children}</code></pre>,
        blockquote: ({ children }) => <blockquote className="pl-2 py-0.5 my-1.5 text-[11px] italic" style={{ borderLeft: "2px solid #14B8A6", color: "#94A3B8" }}>{children}</blockquote>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function OpenclawChatModal() {
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
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) throw new Error("Gagal terhubung ke AI");
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") break;

          try {
            const parsed = JSON.parse(raw);
            if (parsed.type === "meta") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, isThinking: false, sqlQuery: parsed.sql_query, queryResult: parsed.queryResult, explanation: parsed.explanation }
                    : m
                )
              );
            } else if (parsed.type === "chunk") {
              assistantContent += parsed.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, isThinking: false, content: assistantContent } : m
                )
              );
            }
          } catch {}
        }
      }
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

  return (
    <>
      <style>{`
        @keyframes bounce { 0%, 100% { transform: translateY(0); opacity: 0.5; } 50% { transform: translateY(-3px); opacity: 1; } }
        @keyframes ping { 75%, 100% { transform: scale(1.6); opacity: 0; } }
      `}</style>

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all z-50 overflow-hidden border-2 border-[#14B8A6]/50 hover:scale-105 hover:shadow-[#14B8A6]/20 hover:shadow-xl ${isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"}`}
        style={{ background: "#0f172a" }}
      >
        <Image src="/openclaw_logo.png" alt="Openclaw" fill className="object-cover" />
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div 
          className={`fixed bottom-6 right-6 flex flex-col rounded-2xl shadow-2xl z-50 transition-all duration-300 ${isExpanded ? "w-[600px] h-[80vh]" : "w-[380px] h-[600px]"}`}
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(20, 184, 166, 0.1)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)", background: "rgba(20,184,166,0.03)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-emerald-500/30 shrink-0 relative">
                 <Image src="/openclaw_logo.png" alt="Openclaw" fill className="object-cover" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Openclaw</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>AI Assistant Online</span>
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
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin bg-black/20">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center pb-8">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border border-[#14B8A6]/30 mb-4 relative shadow-lg shadow-[#14B8A6]/10">
                   <Image src="/openclaw_logo.png" alt="Openclaw" fill className="object-cover" />
                </div>
                <h2 className="text-sm font-bold mb-1.5" style={{ color: "var(--text-primary)" }}>Halo, saya Openclaw</h2>
                <p className="text-[11px] mb-6 px-4" style={{ color: "var(--text-secondary)" }}>
                  Asisten AI Lemorax. Tanya saya performa cabang, sales, atau data keuangan kita.
                </p>
                <div className="grid grid-cols-1 gap-2 w-full max-w-[280px]">
                  {["Performa cabang bulan ini?", "Siapa top sales Q1 2025?", "Berapa total profit Lemorax?"].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="text-left px-3 py-2 rounded-lg text-[10px] transition-all hover:border-[#14B8A6]/40 hover:text-white"
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
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
                        <User size={12} color="white" />
                      </div>
                      <div className="flex-1 max-w-[85%] flex flex-col items-end">
                        <div className="px-3 py-2 rounded-2xl text-[11px] leading-relaxed" style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "var(--text-primary)" }}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                }

                if (msg.isThinking) return <ThinkingBubble key={msg.id} />;

                return (
                  <div key={msg.id} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 overflow-hidden border border-emerald-500/30 relative">
                       <Image src="/openclaw_logo.png" alt="Openclaw" fill className="object-cover" />
                    </div>
                    <div className="flex-1 max-w-[85%] flex flex-col items-start">
                      <div className="px-4 py-3 rounded-2xl ai-prose w-full shadow-md" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                        {msg.content ? (
                          <MarkdownContent content={msg.content} />
                        ) : (
                          <div className="flex items-center gap-1">
                            {[0, 1, 2].map((i) => (
                              <div key={i} className="rounded-full" style={{ width: 4, height: 4, background: "#14B8A6", animation: `bounce 1.1s ${i * 0.15}s ease-in-out infinite` }} />
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
          <div className="p-3 border-t bg-black/40" style={{ borderColor: "var(--border)" }}>
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
                placeholder="Tanya Openclaw..."
                rows={1}
                className="flex-1 bg-transparent text-[11px] p-1 outline-none resize-none scrollbar-thin"
                style={{ color: "var(--text-primary)", maxHeight: "100px" }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all disabled:opacity-30 hover:scale-105"
                style={{ background: "linear-gradient(135deg, #14B8A6, #3B82F6)" }}
              >
                <Send size={12} color="white" />
              </button>
            </div>
            <div className="text-[9px] text-center mt-2 flex items-center justify-center gap-1 opacity-60" style={{ color: "var(--text-muted)" }}>
              <Sparkles size={9} color="#14B8A6" /> Openclaw AI · PT Lemorax
            </div>
          </div>
        </div>
      )}
    </>
  );
}
