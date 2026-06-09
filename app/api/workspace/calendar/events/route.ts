import { NextRequest, NextResponse } from "next/server";
import { listWorkspaceCalendarEvents } from "@/lib/workspace/calendar-service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const days = Number(req.nextUrl.searchParams.get("days") ?? "14");
    const safeDays = Number.isFinite(days) ? Math.min(Math.max(days, 1), 90) : 14;

    const timeMin = new Date();
    timeMin.setHours(0, 0, 0, 0);
    const timeMax = new Date(timeMin.getTime() + safeDays * 24 * 60 * 60 * 1000);

    const events = await listWorkspaceCalendarEvents({ timeMin, timeMax, maxResults: 100 });

    const todayKey = timeMin.toLocaleDateString("en-CA");
    const today = events.filter((e) => {
      const key = new Date(e.start).toLocaleDateString("en-CA");
      return key === todayKey;
    });

    return NextResponse.json({
      events,
      today,
      range: { from: timeMin.toISOString(), to: timeMax.toISOString(), days: safeDays },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load events";
    const status = message.includes("belum terhubung") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
