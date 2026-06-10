import type { StaffAgent } from "@/lib/staff-agents/types";
import { PRINCIPAL_NAME } from "@/lib/brand";

export { PRINCIPAL_NAME };

export const EXECUTIVE_ASSISTANT_ID = "executive-assistant";
export const MAIN_GROUP_ID = "group-executive";

export function getDisplayName(agent: StaffAgent): string {
  return agent.displayName?.trim() || agent.name;
}

const CHAT_ROLE_SHORT: Record<string, string> = {
  [EXECUTIVE_ASSISTANT_ID]: "Chief of Staff",
  "aries-analyst": "Data",
  "finance-guardian": "Finance",
  "marketing-pulse": "Marketing",
  "hr-companion": "HR",
  "soca-social": "Social",
};

/** Label shown in chat bubbles, e.g. "Heru - HR" */
export function getChatLabel(agent: StaffAgent): string {
  if (agent.isOrchestrator) return getDisplayName(agent);
  const short = CHAT_ROLE_SHORT[agent.id] ?? agent.role.split(/[&/]/)[0]?.trim().slice(0, 24) ?? agent.role;
  return `${getDisplayName(agent)} - ${short}`;
}

export function getMentionTag(agent: StaffAgent): string {
  return `@${getDisplayName(agent).replace(/\s+/g, "")}`;
}

/** Map planner output (id, display name, or partial) → canonical agent id */
export function resolveAgentId(raw: string, agents: StaffAgent[]): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const exact = agents.find((a) => a.id === trimmed);
  if (exact) return exact.id;

  const lower = trimmed.toLowerCase().replace(/^@/, "");
  for (const agent of agents) {
    if (agent.isOrchestrator) continue;
    const nick = getDisplayName(agent).toLowerCase().replace(/\s+/g, "");
    const name = agent.name.toLowerCase().replace(/\s+/g, "");
    if (nick === lower || name === lower || nick.startsWith(lower) || name.includes(lower)) {
      return agent.id;
    }
  }
  return null;
}

/** Agents matching partial @mention query (e.g. "h" → Heru) */
export function filterMentionSuggestions(query: string, agents: StaffAgent[]): StaffAgent[] {
  const q = query.toLowerCase().replace(/^@/, "");
  const candidates = agents.filter((a) => !a.isOrchestrator);
  if (!q) return candidates.slice(0, 6);

  return candidates
    .filter((a) => {
      const nick = getDisplayName(a).toLowerCase();
      const tag = getMentionTag(a).slice(1).toLowerCase();
      const name = a.name.toLowerCase();
      return nick.startsWith(q) || tag.startsWith(q) || name.includes(q);
    })
    .slice(0, 6);
}

export function buildTeamRoster(agents: StaffAgent[]): string {
  return agents
    .map((a) => {
      const tag = getMentionTag(a);
      const role = a.isOrchestrator ? "Orchestrator" : a.role;
      return `- ${tag} (${a.name} / id:${a.id}) — ${role}`;
    })
    .join("\n");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Resolve @mentions in text to agent ids (displayName or name, case-insensitive). */
export function parseMentions(text: string, agents: StaffAgent[]): string[] {
  const found = new Set<string>();
  const lower = text.toLowerCase();

  for (const agent of agents) {
    const labels = new Set<string>();
    if (agent.displayName) labels.add(agent.displayName.replace(/\s+/g, ""));
    labels.add(agent.name.replace(/\s+/g, ""));
    labels.add(getDisplayName(agent).replace(/\s+/g, ""));

    for (const label of Array.from(labels)) {
      if (label.length < 2) continue;
      if (lower.includes(`@${label.toLowerCase()}`)) {
        found.add(agent.id);
        break;
      }
    }
  }
  return Array.from(found);
}

export function highlightMentions(text: string, agents: StaffAgent[]): string {
  let out = text;
  for (const agent of agents) {
    const tag = getMentionTag(agent);
    const compact = tag.slice(1);
    const re = new RegExp(`@${escapeRegex(compact)}\\b`, "gi");
    out = out.replace(re, `**${tag}**`);
  }
  return out;
}

export function isOrchestratedConversation(conversationId: string): boolean {
  return conversationId === MAIN_GROUP_ID || conversationId === `dm-${EXECUTIVE_ASSISTANT_ID}`;
}
