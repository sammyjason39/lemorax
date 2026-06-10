import { NextResponse } from "next/server";
import { listAgents } from "@/lib/staff-agents/store";
import { listSkillRegistry } from "@/lib/staff-agents/skills/registry";
import { listVaultNotes } from "@/lib/vault/store";
import { isComposioConfigured } from "@/lib/composio/config";
import { getStoredComposioSessionId } from "@/lib/composio/session-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  try {
    const agents = await listAgents();
    checks.agents = { ok: agents.length > 0, detail: `${agents.length} agents` };
  } catch (e) {
    checks.agents = { ok: false, detail: e instanceof Error ? e.message : "fail" };
  }

  try {
    const skills = await listSkillRegistry();
    checks.skillRegistry = { ok: true, detail: `${skills.length} skills` };
  } catch (e) {
    checks.skillRegistry = {
      ok: false,
      detail: e instanceof Error ? e.message : "table missing — run migration 009",
    };
  }

  try {
    const notes = await listVaultNotes();
    checks.vault = { ok: true, detail: `${notes.length} notes` };
  } catch (e) {
    checks.vault = {
      ok: false,
      detail: e instanceof Error ? e.message : "table missing — run migration 009",
    };
  }

  checks.composio = {
    ok: isComposioConfigured(),
    detail: isComposioConfigured() ? "configured" : "COMPOSIO_API_KEY missing",
  };

  if (isComposioConfigured()) {
    const sessionId = await getStoredComposioSessionId();
    checks.composioSession = { ok: Boolean(sessionId), detail: sessionId ?? "no session" };
  }

  const healthy = Object.values(checks).every((c) => c.ok);
  return NextResponse.json({ healthy, checks, at: new Date().toISOString() });
}
