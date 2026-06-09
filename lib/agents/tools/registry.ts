import type { AgentToolName } from "@/lib/agents/planner";

export type AgentToolDefinition = {
  name: AgentToolName;
  description: string;
  /** Future: JSON schema for LLM tool-calling */
};

/** Registered tools — add new entries as capabilities grow */
export const AGENT_TOOLS: AgentToolDefinition[] = [
  {
    name: "query_business_data",
    description: "Generate safe read-only SQL and query Lemorax Supabase business data",
  },
  {
    name: "direct_answer",
    description: "Answer general questions without database access (greetings, help, concepts)",
  },
];

export function listAgentTools(): AgentToolDefinition[] {
  return AGENT_TOOLS;
}

export function getAgentTool(name: AgentToolName): AgentToolDefinition | undefined {
  return AGENT_TOOLS.find((t) => t.name === name);
}
