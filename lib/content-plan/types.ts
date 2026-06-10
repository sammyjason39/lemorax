export const CONTENT_STATUSES = [
  "backlog",
  "scripting",
  "review",
  "scheduled",
  "published",
] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const CONTENT_FORMATS = ["reel", "carousel", "image", "story"] as const;

export type ContentFormat = (typeof CONTENT_FORMATS)[number];

export const BRAND_SCOPES = ["personal", "company"] as const;

export type BrandScope = (typeof BRAND_SCOPES)[number];

export type ContentPlanItem = {
  id: string;
  title: string;
  brand_scope: BrandScope;
  status: ContentStatus;
  format: ContentFormat;
  script_md: string;
  notes: string;
  scheduled_at: string | null;
  published_at: string | null;
  publish_mode: string | null;
  assigned_agent: string | null;
  created_by: string;
  last_touched_by: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type ContentPlanBoard = Record<ContentStatus, ContentPlanItem[]>;

export const STATUS_LABELS: Record<ContentStatus, string> = {
  backlog: "Backlog",
  scripting: "Scripting",
  review: "Review",
  scheduled: "Scheduled",
  published: "Published",
};

export const BRAND_SCOPE_LABELS: Record<BrandScope, string> = {
  personal: "Personal Branding",
  company: "Perusahaan (Lemorax)",
};
