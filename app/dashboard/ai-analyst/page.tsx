"use client";

import { useState, useRef, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Bot, Send, User, Code, ChevronRight, Database, Sparkles, Brain } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { streamAgentChat } from "@/lib/agents/chat-stream";
import { preprocessWikilinks } from "@/lib/vault/wikilink-markdown";
import { renderVaultMarkdownLink } from "@/components/markdown/VaultWikilink";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sqlQuery?: string;
  queryResult?: unknown;
  explanation?: string;
  isThinking?: boolean; // still fetching meta (before streaming text)
}

const SUGGESTED_QUESTIONS = [
  "Cabang mana yang revenue-nya turun paling besar bulan ini dibanding bulan lalu?",
  "Siapa 5 sales terbaik di Q1 2025?",
  "Berapa total profit Lemorax tahun 2024?",
  "Campaign marketing mana yang ROAS-nya paling tinggi sepanjang 2025?",
  "Karyawan mana yang absensinya paling bermasalah 3 bulan terakhir?",
  "Proyeksikan revenue Lemorax untuk sisa tahun 2026 berdasarkan YoY growth",
  "Berapa win rate CRM kita per tipe bisnis?",
  "Cabang mana yang paling efisien (revenue vs pengeluaran)?",
  "Siapa account manager dengan total closed deal terbesar?",
  "Bandingkan performa KPI antara cabang Jakarta dan Surabaya",
];

/* ─── Thinking Animation ─── */
function ThinkingBubble() {
  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: "linear-gradient(135deg, #1652F0, #1E293B)" }}
      >
        <Bot size={14} color="white" />
      </div>

      {/* Bubble */}
      <div
        className="px-5 py-4 rounded-2xl flex items-center gap-4"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          minWidth: 180,
        }}
      >
        {/* Pulsing ring icon */}
        <div className="relative shrink-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(20,184,166,0.15)" }}
          >
            <Brain size={14} color="#1652F0" />
          </div>
          {/* outer ring pulse */}
          <span
            className="absolute inset-0 rounded-full"
            style={{
              border: "1.5px solid #1652F0",
              animation: "ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite",
              opacity: 0.5,
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium" style={{ color: "#1652F0" }}>
            Menganalisis data...
          </span>
          {/* Three bouncing dots */}
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  width: 5,
                  height: 5,
                  background: i % 2 === 0 ? "#1652F0" : "#1652F0",
                  animation: `bounce 1.1s ${i * 0.12}s ease-in-out infinite`,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Markdown renderer for assistant messages ─── */
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
            <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#1652F0" }}>
              {children}
            </a>
          );
        },
        h1: ({ children }) => (
          <h1
            className="text-lg font-bold mt-4 mb-2 pb-1"
            style={{
              color: "var(--text-primary)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2
            className="text-base font-bold mt-4 mb-2"
            style={{ color: "#1652F0" }}
          >
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3
            className="text-sm font-semibold mt-3 mb-1.5"
            style={{ color: "#1652F0" }}
          >
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--text-primary)" }}>
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {children}
          </strong>
        ),
        em: ({ children }) => (
          <em className="font-medium not-italic" style={{ color: "#1652F0" }}>{children}</em>
        ),
        ul: ({ children }) => (
          <ul className="text-sm space-y-1 mb-3 pl-4" style={{ color: "var(--text-primary)", listStyleType: "disc" }}>
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="text-sm space-y-1 mb-3 pl-4" style={{ color: "var(--text-primary)", listStyleType: "decimal" }}>
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed" style={{ color: "var(--text-primary)" }}>
            {children}
          </li>
        ),
        code: ({ inline, children }: any) =>
          inline ? (
            <code
              className="px-1.5 py-0.5 rounded text-[11px]"
              style={{
                background: "rgba(22,82,240,0.1)",
                color: "#1652F0",
              }}
            >
              {children}
            </code>
          ) : (
            <pre
              className="p-3 rounded-xl text-[11px] overflow-x-auto my-2"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "#1652F0",
              }}
            >
              <code>{children}</code>
            </pre>
          ),
        blockquote: ({ children }) => (
          <blockquote
            className="pl-3 py-1 my-2 text-sm"
            style={{
              borderLeft: "3px solid #1652F0",
              color: "#3B5CB8",
            }}
          >
            {children}
          </blockquote>
        ),
        hr: () => (
          <hr className="my-3" style={{ borderColor: "var(--border)" }} />
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table
              className="text-xs w-full rounded-lg overflow-hidden"
              style={{ borderCollapse: "collapse" }}
            >
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead style={{ background: "rgba(20,184,166,0.1)" }}>{children}</thead>
        ),
        th: ({ children }) => (
          <th
            className="px-3 py-2 text-left font-semibold"
            style={{ color: "#1652F0", border: "1px solid var(--border)" }}
          >
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td
            className="px-3 py-2"
            style={{ color: "var(--text-primary)", border: "1px solid var(--border)" }}
          >
            {children}
          </td>
        ),
      }}
    >
      {md}
    </ReactMarkdown>
  );
}

/* ─── Main Page ─── */
export default function AIAnalystPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeQuery, setActiveQuery] = useState<{ sql?: string; result?: unknown; explanation?: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const assistantId = (Date.now() + 1).toString();
    let assistantContent = "";

    // Add thinking placeholder immediately
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", isThinking: true },
    ]);

    try {
      await streamAgentChat({
        message: text,
        onEvent: (parsed) => {
          if (parsed.type === "meta" && parsed.sql_query) {
            setActiveQuery({ sql: parsed.sql_query, result: parsed.queryResult, explanation: parsed.explanation });
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, isThinking: false, sqlQuery: parsed.sql_query, queryResult: parsed.queryResult, explanation: parsed.explanation }
                  : m
              )
            );
          } else if (parsed.type === "meta" && parsed.source === "qwen-fallback" && parsed.note) {
            // Keep thinking while Qwen fallback runs.
          } else if (parsed.type === "meta" && parsed.source === "qwen-fallback") {
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
            ? { ...m, isThinking: false, content: `❌ **Error:** ${e.message}\n\nPastikan OpenClaw gateway berjalan dan env OPENCLAW_* sudah dikonfigurasi.` }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Keyframe styles */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes ping {
          75%, 100% { transform: scale(1.8); opacity: 0; }
        }
        .ai-prose { line-height: 1.7; }
        .ai-prose > *:first-child { margin-top: 0 !important; }
        .ai-prose > *:last-child { margin-bottom: 0 !important; }
      `}</style>

      <div className="page-enter flex flex-col h-screen">
        <TopBar title="AI Analyst" subtitle="ARIES AI · Tanya apa saja tentang bisnis PT Lemorax" />

        <div className="flex flex-1 overflow-hidden">
          {/* ── Chat Panel ── */}
          <div className="flex flex-col flex-1 min-w-0 border-r" style={{ borderColor: "var(--border)" }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
              {messages.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center h-full text-center pb-16">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{
                      background: "var(--blue-soft)",
                      border: "1px solid rgba(22,82,240,0.2)",
                    }}
                  >
                    <Sparkles size={28} color="#1652F0" />
                  </div>
                  <h2 className="text-lg font-sans font-extrabold mb-2" style={{ color: "#1652F0", letterSpacing: "-0.03em" }}>
                    Halo, saya ARIES AI Analyst
                  </h2>
                  <p className="text-sm mb-6 max-w-sm" style={{ color: "var(--text-secondary)" }}>
                    Tanya saya apa saja tentang performa bisnis, sales, karyawan, atau keuangan PT Lemorax.
                  </p>
                  <div className="grid grid-cols-1 gap-2 w-full max-w-lg">
                    {SUGGESTED_QUESTIONS.slice(0, 5).map((q, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(q)}
                        className="text-left px-4 py-2.5 rounded-xl text-xs transition-all"
                        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "rgba(20,184,166,0.4)";
                          (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                          (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                        }}
                      >
                        <ChevronRight size={12} className="inline mr-1.5" style={{ color: "#1652F0" }} />
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  if (msg.role === "user") {
                    return (
                      <div key={msg.id} className="flex gap-3 flex-row-reverse">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: "linear-gradient(135deg, #1652F0, #2563EB)" }}
                        >
                          <User size={14} color="white" />
                        </div>
                        <div className="flex-1 max-w-2xl flex flex-col items-end">
                          <div
                            className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                            style={{
                              background: "rgba(59,130,246,0.15)",
                              border: "1px solid rgba(59,130,246,0.3)",
                              color: "var(--text-primary)",
                            }}
                          >
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Assistant message
                  if (msg.isThinking) {
                    return <ThinkingBubble key={msg.id} />;
                  }

                  return (
                    <div key={msg.id} className="flex gap-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: "linear-gradient(135deg, #1652F0, #1E293B)" }}
                      >
                        <Bot size={14} color="white" />
                      </div>
                      <div className="flex-1 max-w-3xl flex flex-col items-start">
                        <div
                          className="px-5 py-4 rounded-2xl ai-prose w-full"
                          style={{
                            background: "var(--bg-secondary)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {msg.content ? (
                            <MarkdownContent content={msg.content} />
                          ) : (
                            /* Still streaming first chunk — show tiny indicator */
                            <div className="flex items-center gap-1.5">
                              {[0, 1, 2].map((i) => (
                                <div
                                  key={i}
                                  className="rounded-full"
                                  style={{
                                    width: 5,
                                    height: 5,
                                    background: "#1652F0",
                                    animation: `bounce 1.1s ${i * 0.15}s ease-in-out infinite`,
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        {msg.sqlQuery && (
                          <button
                            onClick={() => setActiveQuery({ sql: msg.sqlQuery, result: msg.queryResult, explanation: msg.explanation })}
                            className="mt-1.5 flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg transition-colors"
                            style={{ color: "#1652F0", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
                          >
                            <Code size={11} /> Lihat SQL Query
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
              <div
                className="flex items-end gap-3 rounded-2xl p-3"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
              >
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
                  placeholder="Tanya tentang bisnis PT Lemorax..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm outline-none resize-none scrollbar-thin"
                  style={{ color: "var(--text-primary)", maxHeight: "120px" }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg, #1652F0, #1652F0)" }}
                >
                  <Send size={14} color="white" />
                </button>
              </div>
              <p className="text-[10px] text-center mt-2" style={{ color: "var(--text-muted)" }}>
                Enter untuk kirim · Shift+Enter untuk baris baru
              </p>
            </div>
          </div>

          {/* ── Context Panel ── */}
          <div className="w-96 flex flex-col overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <Database size={14} color="#1652F0" />
                <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Data Context</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              {!activeQuery ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(59,130,246,0.1)" }}>
                    <Database size={20} color="#1652F0" />
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    SQL query dan hasil data akan ditampilkan di sini setelah Anda bertanya
                  </p>
                  <div className="mt-6 w-full space-y-2">
                    <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Pertanyaan Lainnya</p>
                    {SUGGESTED_QUESTIONS.slice(5).map((q, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(q)}
                        className="w-full text-left px-3 py-2 rounded-lg text-[11px] transition-all"
                        style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeQuery.explanation && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Penjelasan Query</p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{activeQuery.explanation}</p>
                    </div>
                  )}
                  {activeQuery.sql && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>SQL Query</p>
                      <pre
                        className="p-3 rounded-xl text-[11px] overflow-x-auto scrollbar-thin"
                        style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "#1652F0", whiteSpace: "pre-wrap" }}
                      >
                        {activeQuery.sql}
                      </pre>
                    </div>
                  )}
                  {activeQuery.result !== undefined && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Hasil Data</p>
                      <pre
                        className="p-3 rounded-xl text-[10px] overflow-auto scrollbar-thin max-h-64"
                        style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "#94A3B8" }}
                      >
                        {JSON.stringify(activeQuery.result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
