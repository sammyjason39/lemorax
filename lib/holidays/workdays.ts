import { createClient } from "@supabase/supabase-js";

export function isWeekend(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = d.getDay();
  return day === 0 || day === 6;
}

export async function fetchHolidayDates(
  sb: ReturnType<typeof createClient>,
  opts: { start: string; end: string }
): Promise<Set<string>> {
  const { data, error } = await sb
    .from("indonesian_holidays")
    .select("date")
    .gte("date", opts.start)
    .lte("date", opts.end);

  if (error) {
    console.error("Failed to fetch holidays:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((h: { date: string }) => h.date));
}

export function countWorkdays(
  start: string,
  end: string,
  holidays: Set<string>
): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  let count = 0;
  const cur = new Date(startDate);

  while (cur <= endDate) {
    const iso = cur.toISOString().split("T")[0];
    if (!isWeekend(cur) && !holidays.has(iso)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export async function getWorkdaysInMonth(
  sb: ReturnType<typeof createClient>,
  year: number,
  month: number
): Promise<{ total: number; holidays: string[] }> {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const holidaySet = await fetchHolidayDates(sb, { start, end });
  const holidays = Array.from(holidaySet).sort();
  const total = countWorkdays(start, end, holidaySet);
  return { total, holidays };
}
