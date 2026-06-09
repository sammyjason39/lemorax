import { NextRequest, NextResponse } from "next/server";
import {
  isValidGoogleIcalUrl,
  listIcalCalendarEvents,
  normalizeIcalUrl,
} from "@/lib/workspace/ical-calendar";
import {
  deleteIcalCalendarConnection,
  saveIcalCalendarConnection,
} from "@/lib/workspace/ical-store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { icalUrl?: string; label?: string };
    const rawUrl = body.icalUrl?.trim();
    if (!rawUrl) {
      return NextResponse.json({ error: "Link iCal wajib diisi" }, { status: 400 });
    }
    if (!isValidGoogleIcalUrl(rawUrl)) {
      return NextResponse.json(
        {
          error:
            "Format link tidak valid. Gunakan Secret address in iCal format dari Google Calendar.",
        },
        { status: 400 }
      );
    }

    const icalUrl = normalizeIcalUrl(rawUrl);

    const conn = await saveIcalCalendarConnection({ icalUrl, label: body.label });
    try {
      await listIcalCalendarEvents({ maxResults: 1 });
    } catch (fetchErr) {
      await deleteIcalCalendarConnection();
      throw fetchErr;
    }
    return NextResponse.json({
      ok: true,
      label: conn.label,
      connectedAt: conn.connectedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan link iCal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await deleteIcalCalendarConnection();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memutus koneksi" },
      { status: 500 }
    );
  }
}
