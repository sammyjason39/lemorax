export type VaultNoteType = "note" | "mom" | "doc" | "sop" | "meeting";

export type VaultNote = {
  id: string;
  title: string;
  slug: string;
  content: string;
  tags: string[];
  noteType: VaultNoteType;
  createdAt: string;
  updatedAt: string;
};

export type VaultLink = {
  id: string;
  sourceId: string;
  targetSlug: string;
  targetId?: string;
  linkType: string;
  createdAt: string;
};

export type VaultNoteWithLinks = VaultNote & {
  outboundLinks: VaultLink[];
  inboundLinks: VaultLink[];
  brokenLinks: string[];
};
