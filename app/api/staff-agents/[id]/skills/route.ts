import { NextRequest, NextResponse } from "next/server";
import {
  listAgentInstalledSkills,
  setAgentInstalledSkills,
} from "@/lib/staff-agents/skills/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const skills = await listAgentInstalledSkills(params.id);
    return NextResponse.json({ skills });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load agent skills" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const body = (await req.json()) as { skillIds?: string[] };
    if (!Array.isArray(body.skillIds)) {
      return NextResponse.json({ error: "skillIds array required" }, { status: 400 });
    }
    const skills = await setAgentInstalledSkills(params.id, body.skillIds);
    return NextResponse.json({ skills });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update agent skills" },
      { status: 500 }
    );
  }
}
