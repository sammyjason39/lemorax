import { NextResponse } from "next/server";
import { listMessages } from "@/lib/staff-agents/store";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const messages = await listMessages(params.id);
  return NextResponse.json({ messages });
}
