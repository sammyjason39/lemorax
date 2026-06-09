import { NextRequest, NextResponse } from "next/server";
import { createAgent, listAgents, syncAgentMetadataFromSeed } from "@/lib/staff-agents/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    await syncAgentMetadataFromSeed();
    const agents = await listAgents();
    return NextResponse.json({ agents });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load agents" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name?.trim() || !body.role?.trim()) {
      return NextResponse.json({ error: "name and role required" }, { status: 400 });
    }

    const agent = await createAgent({
      name: body.name.trim(),
      role: body.role.trim(),
      description: body.description?.trim() || "",
      avatarColor: body.avatarColor || "#1652F0",
      emoji: body.emoji || "🤖",
      soulMd: body.soulMd?.trim() || `# ${body.name}\n\nAgent baru Lemorax.`,
      skills: body.skills || [],
      schedule: body.schedule || {
        enabled: false,
        label: "",
        weekday: "*",
        time: "09:00",
        action: "",
      },
      status: "online",
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create agent" },
      { status: 500 }
    );
  }
}
