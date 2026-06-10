import type { StaffAgentMemory } from "@/lib/staff-agents/types";
import { getAgent, updateAgent } from "@/lib/staff-agents/store";
import { withSelfHealing } from "@/lib/staff-agents/healing";

function isDuplicate(memory: StaffAgentMemory[], content: string): boolean {
  const normalized = content.trim().slice(0, 200);
  return memory.some((m) => m.content.trim().slice(0, 200) === normalized);
}

export async function appendAgentMemory(
  agentId: string,
  content: string,
  source: StaffAgentMemory["source"]
): Promise<void> {
  const trimmed = content.trim();
  if (!trimmed) return;

  const agent = await getAgent(agentId);
  if (!agent) return;
  if (isDuplicate(agent.memory, trimmed)) return;

  const entry: StaffAgentMemory = {
    id: `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    content: trimmed.slice(0, 500),
    createdAt: new Date().toISOString(),
    source,
  };

  const result = await withSelfHealing(
    () =>
      updateAgent(agentId, {
        memoryAppend: entry,
      }),
    { label: `memory write (${agentId})` }
  );

  if (!result.ok) {
    console.error("[staff-memory]", result.error);
  }
}
