export type SkillRegistryEntry = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sourceUrl: string;
  sourceRef?: string;
  contentMd: string;
  tags: string[];
  installedAt: string;
  updatedAt: string;
};

export type AgentInstalledSkill = {
  agentId: string;
  skillId: string;
  enabled: boolean;
  config: Record<string, unknown>;
  installedAt: string;
  skill?: SkillRegistryEntry;
};
