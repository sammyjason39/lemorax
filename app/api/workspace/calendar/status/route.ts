import { NextResponse } from "next/server";
import { getWorkspaceCalendarStatus } from "@/lib/workspace/calendar-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const status = await getWorkspaceCalendarStatus();
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Status check failed" },
      { status: 500 }
    );
  }
}
