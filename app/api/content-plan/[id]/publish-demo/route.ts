import { NextResponse } from "next/server";
import { publishDemo } from "@/lib/content-plan/store";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function POST(_req: Request, { params }: Ctx) {
  try {
    const item = await publishDemo(params.id, "user");
    return NextResponse.json({
      ok: true,
      item,
      message: `Published (demo) — @anjas_maradita`,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Publish failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
