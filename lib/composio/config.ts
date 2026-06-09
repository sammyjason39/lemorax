import { PRINCIPAL_NAME } from "@/lib/brand";

export {
  ALL_WORKSPACE_INTEGRATIONS,
  COMPOSIO_TOOLKITS,
  WORKSPACE_INTEGRATION_GROUPS,
  isAllowedToolkit,
} from "@/lib/composio/integrations";
export type {
  WorkspaceIntegration,
  WorkspaceIntegrationGroup,
} from "@/lib/composio/integrations";

/** Stable Composio user id for single-tenant Lemorax workspace */
export const COMPOSIO_USER_ID = process.env.COMPOSIO_USER_ID?.trim() || "lemorax-pak-anjas";

const PLATFORM_KEYWORDS =
  /\b(gmail|email|e-mail|surat|kirim email|calendar|google calendar|kalender|jadwal meeting|github|repo|issue|pull request|slack|notion|linear|whatsapp|drive|google docs|google sheets|spreadsheet|sheet|docs|facebook|instagram|meta ads|meta|zoom|teams|hubspot|salesforce|trello|asana|connect|hubungkan akun)\b/i;

export function isComposioConfigured(): boolean {
  return Boolean(process.env.COMPOSIO_API_KEY?.trim());
}

export function shouldRouteToComposio(
  userMessage: string,
  opts?: { force?: boolean }
): boolean {
  if (!isComposioConfigured()) return false;
  if (opts?.force) return true;
  return PLATFORM_KEYWORDS.test(userMessage);
}

export function buildComposioAgentInstructions(agentName: string, agentRole: string): string {
  return `You are ${agentName}, ${agentRole} for ${PRINCIPAL_NAME} at PT Lemorax.

Use Composio tools to take real actions across connected platforms (Gmail, Calendar, GitHub, Slack, etc.).
- Always address the user as ${PRINCIPAL_NAME}
- Reply in professional Bahasa Indonesia unless asked otherwise
- If a platform is not connected, explain which app to connect in ARIES → Workspace → Koneksi Platform
- Be concise and actionable
- For Lemorax business data (sales, KPI, HR), say you'll defer to internal SQL agents — focus on external platform tasks`;
}
