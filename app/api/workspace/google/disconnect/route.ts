import { NextResponse } from "next/server";
import { deleteGoogleCalendarConnection } from "@/lib/workspace/google-store";

export const runtime = "nodejs";

export async function POST() {
  try {
    await deleteGoogleCalendarConnection();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Disconnect failed" },
      { status: 500 }
    );
  }
}
