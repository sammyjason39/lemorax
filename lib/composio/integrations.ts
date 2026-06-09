export type WorkspaceIntegration = {
  slug: string;
  name: string;
  emoji: string;
  description?: string;
};

export type WorkspaceIntegrationGroup = {
  id: string;
  titleId: string;
  titleEn: string;
  integrations: WorkspaceIntegration[];
};

/** Platform connections for Pak Anjas workspace — Composio toolkit slugs */
export const WORKSPACE_INTEGRATION_GROUPS: WorkspaceIntegrationGroup[] = [
  {
    id: "google",
    titleId: "Google Workspace",
    titleEn: "Google Workspace",
    integrations: [
      { slug: "gmail", name: "Gmail", emoji: "📧", description: "Email & inbox" },
      { slug: "googlecalendar", name: "Google Calendar", emoji: "📅", description: "Jadwal & meeting" },
      { slug: "googledrive", name: "Google Drive", emoji: "📁", description: "File & folder" },
      { slug: "googledocs", name: "Google Docs", emoji: "📄", description: "Dokumen" },
      { slug: "googlesheets", name: "Google Sheets", emoji: "📊", description: "Spreadsheet" },
    ],
  },
  {
    id: "developer",
    titleId: "Developer",
    titleEn: "Developer",
    integrations: [
      { slug: "github", name: "GitHub", emoji: "🐙", description: "Repo, issues, PR" },
    ],
  },
  {
    id: "meta",
    titleId: "Meta & Sosial",
    titleEn: "Meta & Social",
    integrations: [
      { slug: "facebook", name: "Facebook", emoji: "👤", description: "Pages & posting" },
      { slug: "instagram", name: "Instagram", emoji: "📸", description: "IG business" },
      { slug: "metaads", name: "Meta Ads", emoji: "📣", description: "Iklan Facebook/IG" },
    ],
  },
  {
    id: "productivity",
    titleId: "Produktivitas",
    titleEn: "Productivity",
    integrations: [
      { slug: "slack", name: "Slack", emoji: "💬", description: "Tim chat" },
      { slug: "notion", name: "Notion", emoji: "📝", description: "Wiki & notes" },
      { slug: "linear", name: "Linear", emoji: "📋", description: "Issue tracking" },
    ],
  },
  {
    id: "messaging",
    titleId: "Messaging",
    titleEn: "Messaging",
    integrations: [
      { slug: "whatsapp", name: "WhatsApp", emoji: "📱", description: "WA Business" },
    ],
  },
];

export const ALL_WORKSPACE_INTEGRATIONS = WORKSPACE_INTEGRATION_GROUPS.flatMap(
  (g) => g.integrations
);

export const ALLOWED_TOOLKIT_SLUGS = new Set(
  ALL_WORKSPACE_INTEGRATIONS.map((i) => i.slug)
);

export function isAllowedToolkit(slug: string): boolean {
  return ALLOWED_TOOLKIT_SLUGS.has(slug.trim().toLowerCase());
}

/** @deprecated use ALL_WORKSPACE_INTEGRATIONS — kept for staff-agents sidebar compat */
export const COMPOSIO_TOOLKITS = ALL_WORKSPACE_INTEGRATIONS.map(({ slug, name, emoji }) => ({
  slug,
  name,
  emoji,
}));
