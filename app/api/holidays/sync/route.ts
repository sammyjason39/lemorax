import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchIndonesianHolidays } from "@/lib/holidays/api-co-id";

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: "Missing Supabase credentials" }, { status: 500 });
    }

    const apiKey = process.env.INDONESIAN_HOLIDAYS_API_KEY || process.env.API_CO_ID_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing INDONESIAN_HOLIDAYS_API_KEY" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const years: number[] = body.years ?? [new Date().getFullYear(), new Date().getFullYear() + 1];

    const sb = createClient(url, key, { auth: { persistSession: false } });
    let upserted = 0;

    for (const year of years) {
      const holidays = await fetchIndonesianHolidays({ year, apiKey });
      const rows = holidays
        .filter((h) => h.is_holiday || h.is_joint_holiday)
        .map((h) => ({
          date: h.date,
          name: h.name,
          type: h.type,
          is_joint_holiday: h.is_joint_holiday,
          is_observance: h.is_observance,
          year,
          source: "api.co.id",
        }));

      if (!rows.length) continue;

      const { error } = await sb.from("indonesian_holidays").upsert(rows, { onConflict: "date" });
      if (error) {
        return NextResponse.json({ error: error.message, year }, { status: 500 });
      }
      upserted += rows.length;
    }

    return NextResponse.json({ ok: true, upserted, years });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
