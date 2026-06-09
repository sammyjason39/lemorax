import { NextResponse } from "next/server";
import { getCalendarStatus } from "@/lib/workspace/google-calendar";
import { isGoogleCalendarConfigured } from "@/lib/workspace/google-config";

export const runtime = "nodejs";

export async function GET() {
  try {
    const status = await getCalendarStatus();
    return NextResponse.json({
      configured: isGoogleCalendarConfigured(),
      ...status,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Status check failed", configured: isGoogleCalendarConfigured() },
      { status: 500 }
    );
  }
}
