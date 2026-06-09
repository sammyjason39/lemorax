export {
  listAgents,
  getAgent,
  updateAgent,
  createAgent,
  listConversations,
  getConversation,
  createConversation,
  listMessages,
  appendMessage,
  syncAgentMetadataFromSeed,
} from "@/lib/staff-agents/db/supabase-store";

/** Always Supabase after migration — use scripts/import-staff-to-supabase.mjs for one-time file import */
export async function getStaffBackend(): Promise<"supabase"> {
  return "supabase";
}
