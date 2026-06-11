"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { brand } from "@/lib/brand";

type Props = {
  content: string;
  onWikilinkClick?: (title: string) => void;
};

/** Convert Obsidian [[wikilinks]] to markdown links for preview */
function preprocessWikilinks(content: string): string {
  return content.replace(/\[\[([^\]|#]+)(?:#[^\]]*)?\]\]/g, (_, raw: string) => {
    const title = raw.trim();
    const encoded = encodeURIComponent(title);
    return `[${title}](vault://${encoded})`;
  });
}

const NOTE_TYPE_COLORS: Record<string, string> = {
  mom: "#7C3AED",
  meeting: "#0D9488",
  doc: brand.blue,
  sop: "#DB2777",
  note: "#64748B",
};

export function VaultMarkdown({ content, onWikilinkClick }: Props) {
  const md = preprocessWikilinks(content);

  return (
    <div className="vault-prose prose prose-sm dark:prose-invert max-w-none px-6 py-5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith("vault://")) {
              const title = decodeURIComponent(href.replace("vault://", ""));
              return (
                <button
                  type="button"
                  onClick={() => onWikilinkClick?.(title)}
                  className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-sm font-medium no-underline hover:opacity-80"
                  style={{ background: `${brand.blue}18`, color: brand.blue }}
                >
                  [[{children}]]
                </button>
              );
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#1652F0] underline">
                {children}
              </a>
            );
          },
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-0 mb-4 pb-2 border-b" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold mt-8 mb-3" style={{ color: "var(--text-primary)" }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold mt-6 mb-2" style={{ color: "var(--text-primary)" }}>
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-[15px] leading-7 mb-4" style={{ color: "var(--text-secondary)" }}>
              {children}
            </p>
          ),
          li: ({ children }) => (
            <li className="text-[15px] leading-7 mb-1" style={{ color: "var(--text-secondary)" }}>
              {children}
            </li>
          ),
          ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
          blockquote: ({ children }) => (
            <blockquote
              className="border-l-4 pl-4 my-4 italic"
              style={{ borderColor: brand.blue, color: "var(--text-muted)" }}
            >
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border px-3 py-2 text-left font-semibold" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border px-3 py-2" style={{ borderColor: "var(--border)" }}>
              {children}
            </td>
          ),
          code: ({ className, children }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <code
                  className="block text-xs p-4 rounded-lg overflow-x-auto my-4 font-mono"
                  style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="text-xs px-1.5 py-0.5 rounded font-mono"
                style={{ background: "var(--bg-secondary)", color: brand.blue }}
              >
                {children}
              </code>
            );
          },
          hr: () => <hr className="my-8" style={{ borderColor: "var(--border)" }} />,
          strong: ({ children }) => (
            <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {children}
            </strong>
          ),
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}

export { NOTE_TYPE_COLORS };
