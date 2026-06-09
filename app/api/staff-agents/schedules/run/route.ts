import { NextRequest, NextResponse } from "next/server";
import { runAllAgentSchedules, runDueAgentSchedules } from "@/lib/staff-agents/schedule";

export const runtime = "nodejs";
export const maxDuration = 300;

/** POST — run schedules. Body: { force?: boolean, agentId?: string, mode?: "due" | "all" } */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const force = body.force === true;
    const agentId = typeof body.agentId === "string" ? body.agentId : undefined;

    const results =
      body.mode === "due" && !force
        ? await runDueAgentSchedules()
        : await runAllAgentSchedules({ force: force || body.mode === "all", agentId });

    const ran = results.filter((r) => r.ok);
    const skipped = results.filter((r) => r.skipped);
    const failed = results.filter((r) => !r.ok && !r.skipped);

    return NextResponse.json({
      summary: {
        total: results.length,
        ran: ran.length,
        skipped: skipped.length,
        failed: failed.length,
      },
      results,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Schedule run failed" },
      { status: 500 }
    );
  }
}

/** GET — check due schedules without running (dry info) */
export async function GET() {
  const { listAgents } = await import("@/lib/staff-agents/store");
  const { isScheduleDue } = await import("@/lib/staff-agents/schedule");
  const agents = await listAgents();

  return NextResponse.json({
    now: new Date().toISOString(),
    timezone: "Asia/Jakarta",
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      schedule: a.schedule,
      due: isScheduleDue(a.schedule),
    })),
  });
}
