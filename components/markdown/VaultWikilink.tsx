"use client";

import Link from "next/link";
import { brand } from "@/lib/brand";
import { vaultOpenUrl } from "@/lib/vault/wikilink-markdown";

type Props = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function VaultWikilink({ title, children, className }: Props) {
  return (
    <Link
      href={vaultOpenUrl(title)}
      className={
        className ??
        "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-sm font-medium no-underline hover:opacity-80"
      }
      style={{ background: `${brand.blue}18`, color: brand.blue }}
      title={`Buka di Company Vault: ${title}`}
    >
      [[{children}]]
    </Link>
  );
}

export function renderVaultMarkdownLink(href: string | undefined, children: React.ReactNode) {
  if (!href?.startsWith("vault://")) return null;
  const title = decodeURIComponent(href.replace("vault://", ""));
  return <VaultWikilink title={title}>{children}</VaultWikilink>;
}
