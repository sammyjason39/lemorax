import type { StaffAgent, StaffMessage } from "@/lib/staff-agents/types";
import { ARIES_SYSTEM_PROMPT } from "@/lib/openrouter";
import { buildTeamRoster, getDisplayName, PRINCIPAL_NAME } from "@/lib/staff-agents/names";

export function buildStaffAgentSystemPrompt(
  agent: StaffAgent,
  team?: StaffAgent[],
  extras?: { installedSkills?: string; vaultContext?: string }
): string {
  const skillsBlock = agent.skills
    .map((s) => `- **${s.name}**: ${s.description} (${s.tags.join(", ")})`)
    .join("\n");

  const memoryBlock =
    agent.memory.length > 0
      ? agent.memory
          .slice(-8)
          .map((m) => `- ${m.content}`)
          .join("\n")
      : "(Belum ada memori tersimpan)";

  const scheduleBlock = agent.schedule.enabled
    ? `Jadwal: ${agent.schedule.label}\nAksi terjadwal: ${agent.schedule.action}`
    : "Tidak ada jadwal aktif";

  const teamBlock =
    team && team.length > 1
      ? `\n## Tim Staff (gunakan @Tag saat mention di grup)\n${buildTeamRoster(team)}`
      : "";

  const skillsInstallBlock = extras?.installedSkills?.trim()
    ? `\n## Installed Skills (from registry)\n${extras.installedSkills}`
    : "";

  const vaultBlock = extras?.vaultContext?.trim()
    ? `\n${extras.vaultContext}\n\nGunakan [[wikilink]] saat merujuk dokumen vault.`
    : "";

  return `${ARIES_SYSTEM_PROMPT}

---

# Identitas Agent: ${getDisplayName(agent)} (${agent.name})
${agent.soulMd}

## Skills
${skillsBlock}

## Memori (ringkas)
${memoryBlock}

## Schedule
${scheduleBlock}
${skillsInstallBlock}
${vaultBlock}
${teamBlock}

---

Kamu adalah bagian dari **AI Agents Staff** Lemorax. Jawab sebagai **${getDisplayName(agent)}** (${agent.role}).
Pertahankan persona dari soul.md. Format markdown ringkas.
Selalu panggil user **${PRINCIPAL_NAME}** — jangan sebut "owner".
Di grup Executive, kamu boleh @mention kolega jika perlu kolaborasi — ${PRINCIPAL_NAME} melihat percakapan A2A.`;
}

export function formatConversationHistory(
  messages: StaffMessage[],
  agentId: string,
  agents?: StaffAgent[],
  limit = 12
): string {
  const recent = messages.slice(-limit);
  return recent
    .map((m) => {
      if (m.senderType === "user") return `${PRINCIPAL_NAME}: ${m.content}`;
      const a = agents?.find((x) => x.id === m.senderAgentId);
      const label = a ? getDisplayName(a) : m.senderAgentId ?? "Agent";
      if (m.senderAgentId === agentId) return `${label}: ${m.content}`;
      return `[${label}]: ${m.content.slice(0, 400)}`;
    })
    .join("\n\n");
}
