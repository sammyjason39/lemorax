"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { brand } from "@/lib/brand";
import { preprocessWikilinks } from "@/lib/vault/wikilink-markdown";
import { renderVaultMarkdownLink } from "@/components/markdown/VaultWikilink";

type Props = {
  content: string;
  className?: string;
};

export function AgentMarkdown({ content, className }: Props) {
  const md = preprocessWikilinks(content);

  return (
    <div className={className ?? "prose prose-sm dark:prose-invert max-w-none"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const vault = renderVaultMarkdownLink(href, children);
            if (vault) return vault;
            if (!href) return <span>{children}</span>;
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: brand.blue }}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}
