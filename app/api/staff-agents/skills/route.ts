import { NextRequest, NextResponse } from "next/server";
import {
  deleteSkillFromRegistry,
  installSkillFromGithub,
  listSkillRegistry,
} from "@/lib/staff-agents/skills/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const skills = await listSkillRegistry();
    return NextResponse.json({ skills });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list skills" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { url?: string; slug?: string; sourceRef?: string };
    if (!body.url?.trim()) {
      return NextResponse.json({ error: "url wajib (GitHub SKILL.md)" }, { status: 400 });
    }
    const skill = await installSkillFromGithub({
      url: body.url,
      slug: body.slug,
      sourceRef: body.sourceRef,
    });
    return NextResponse.json({ skill }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Install failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await deleteSkillFromRegistry(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 }
    );
  }
}
