/** Integration with api.co.id Indonesian Holidays API. */

export type IndonesianHoliday = {
  id?: number;
  date: string; // YYYY-MM-DD
  date_formatted?: string;
  day_of_week?: string;
  name: string;
  type: string;
  year?: number;
  is_holiday?: boolean;
  is_joint_holiday?: boolean;
  is_observance?: boolean;
};

export type HolidaysApiResponse = {
  is_success: boolean;
  message?: string;
  data: IndonesianHoliday[];
};

const BASE_URL = "https://use.api.co.id";

export function getHolidaysApiKey(): string | undefined {
  return process.env.INDONESIAN_HOLIDAYS_API_KEY ?? process.env.HOLIDAYS_API_KEY;
}

export async function fetchIndonesianHolidays(
  year: number,
  apiKey?: string
): Promise<IndonesianHoliday[]> {
  const key = apiKey || getHolidaysApiKey();
  if (!key) {
    throw new Error("Missing Indonesian Holidays API key (INDONESIAN_HOLIDAYS_API_KEY)");
  }

  const res = await fetch(`${BASE_URL}/holidays/indonesia?year=${year}`, {
    headers: { "x-api-co-id": key },
  });

  if (!res.ok) {
    throw new Error(`Holidays API error ${res.status}: ${await res.text()}`);
  }

  const json: HolidaysApiResponse = await res.json();
  if (!json.is_success) {
    throw new Error(`Holidays API returned failure: ${json.message || "unknown"}`);
  }

  return json.data || [];
}

export async function fetchIndonesianHolidayYears(
  years: number[],
  apiKey?: string
): Promise<IndonesianHoliday[]> {
  const all: IndonesianHoliday[] = [];
  for (const year of years) {
    const rows = await fetchIndonesianHolidays(year, apiKey);
    all.push(...rows);
  }
  return all;
}
