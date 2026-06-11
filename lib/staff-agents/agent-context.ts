import type { StaffAgent } from "@/lib/staff-agents/types";
import { getAgentSkillPromptBlock } from "@/lib/staff-agents/skills/registry";
import { retrieveVaultRAG } from "@/lib/vault/rag";

export type AgentPromptExtras = {
  installedSkills: string;
  vaultContext: string;
  vaultTitles: string[];
};

/** Shared context for all staff agent LLM paths (Qwen + Composio). */
export async function buildAgentPromptExtras(
  agent: StaffAgent,
  userMessage: string
): Promise<AgentPromptExtras> {
  const [installedSkills, vault] = await Promise.all([
    getAgentSkillPromptBlock(agent.id).catch(() => ""),
    retrieveVaultRAG(userMessage).catch(() => ({
      context: "",
      noteCount: 0,
      chunkCount: 0,
      titles: [] as string[],
    })),
  ]);

  return {
    installedSkills,
    vaultContext: vault.context,
    vaultTitles: vault.titles,
  };
}
