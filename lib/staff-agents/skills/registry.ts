import { createServerSupabaseClient } from "@/lib/supabase";
import { withSelfHealing } from "@/lib/staff-agents/healing";
import {
  githubUrlToRaw,
  parseSkillFrontmatter,
  slugifySkill,
} from "@/lib/staff-agents/skills/github";
import type { AgentInstalledSkill, SkillRegistryEntry } from "@/lib/staff-agents/skills/types";

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

type SkillRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  source_url: string;
  source_ref: string | null;
  content_md: string;
  tags: string[] | null;
  installed_at: string;
  updated_at: string;
};

function fromRow(row: SkillRow): SkillRegistryEntry {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    sourceUrl: row.source_url,
    sourceRef: row.source_ref ?? undefined,
    contentMd: row.content_md,
    tags: row.tags ?? [],
    installedAt: row.installed_at,
    updatedAt: row.updated_at,
  };
}

function toRow(skill: SkillRegistryEntry): SkillRow {
  return {
    id: skill.id,
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    source_url: skill.sourceUrl,
    source_ref: skill.sourceRef ?? null,
    content_md: skill.contentMd,
    tags: skill.tags,
    installed_at: skill.installedAt,
    updated_at: skill.updatedAt,
  };
}

export async function listSkillRegistry(): Promise<SkillRegistryEntry[]> {
  const sb = createServerSupabaseClient();
  const { data, error } = await sb
    .from("staff_skill_registry")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    if (error.message.includes("Could not find the table")) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((r) => fromRow(r as SkillRow));
}

export async function installSkillFromGithub(input: {
  url: string;
  slug?: string;
  sourceRef?: string;
}): Promise<SkillRegistryEntry> {
  const rawUrl = githubUrlToRaw(input.url);
  const fetchResult = await withSelfHealing(async () => {
    const res = await fetch(rawUrl, {
      headers: { Accept: "text/plain", "User-Agent": "Lemorax-Staff-Agent/1.0" },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`GitHub fetch ${res.status}: ${rawUrl}`);
    return res.text();
  }, { label: "skill fetch" });

  if (!fetchResult.ok) throw new Error(fetchResult.error);

  const md = fetchResult.value;
  const parsed = parseSkillFrontmatter(md);
  const now = new Date().toISOString();
  const slug = input.slug?.trim() || slugifySkill(parsed.name);

  const entry: SkillRegistryEntry = {
    id: newId("skill"),
    slug,
    name: parsed.name,
    description: parsed.description,
    sourceUrl: input.url.trim(),
    sourceRef: input.sourceRef,
    contentMd: md,
    tags: parsed.tags,
    installedAt: now,
    updatedAt: now,
  };

  const sb = createServerSupabaseClient();
  const { error } = await sb.from("staff_skill_registry").upsert(toRow(entry), { onConflict: "slug" });
  if (error) throw new Error(error.message);

  const { data } = await sb.from("staff_skill_registry").select("*").eq("slug", slug).single();
  return fromRow(data as SkillRow);
}

export async function deleteSkillFromRegistry(skillId: string): Promise<void> {
  const sb = createServerSupabaseClient();
  const { error } = await sb.from("staff_skill_registry").delete().eq("id", skillId);
  if (error) throw new Error(error.message);
}

export async function listAgentInstalledSkills(agentId: string): Promise<AgentInstalledSkill[]> {
  const sb = createServerSupabaseClient();
  const { data, error } = await sb
    .from("staff_agent_installed_skills")
    .select("*, staff_skill_registry(*)")
    .eq("agent_id", agentId);
  if (error) {
    if (error.message.includes("Could not find the table")) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const r = row as {
      agent_id: string;
      skill_id: string;
      enabled: boolean;
      config: Record<string, unknown>;
      installed_at: string;
      staff_skill_registry: SkillRow | null;
    };
    return {
      agentId: r.agent_id,
      skillId: r.skill_id,
      enabled: r.enabled ?? true,
      config: r.config ?? {},
      installedAt: r.installed_at,
      skill: r.staff_skill_registry ? fromRow(r.staff_skill_registry) : undefined,
    };
  });
}

export async function setAgentInstalledSkills(
  agentId: string,
  skillIds: string[]
): Promise<AgentInstalledSkill[]> {
  const sb = createServerSupabaseClient();
  await sb.from("staff_agent_installed_skills").delete().eq("agent_id", agentId);

  if (skillIds.length > 0) {
    const rows = skillIds.map((skillId) => ({
      agent_id: agentId,
      skill_id: skillId,
      enabled: true,
      config: {},
      installed_at: new Date().toISOString(),
    }));
    const { error } = await sb.from("staff_agent_installed_skills").insert(rows);
    if (error) throw new Error(error.message);
  }

  return listAgentInstalledSkills(agentId);
}

export async function getAgentSkillPromptBlock(agentId: string): Promise<string> {
  const installed = await listAgentInstalledSkills(agentId);
  const enabled = installed.filter((s) => s.enabled && s.skill);
  if (enabled.length === 0) return "";

  return enabled
    .map((s) => {
      const skill = s.skill!;
      const excerpt = skill.contentMd.slice(0, 2500);
      return `### Skill: ${skill.name}\n${skill.description}\n\n${excerpt}`;
    })
    .join("\n\n---\n\n");
}
