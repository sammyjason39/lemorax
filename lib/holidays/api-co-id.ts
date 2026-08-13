export interface IndonesianHoliday {
  id?: number;
  date: string;
  date_formatted?: string;
  day_of_week?: string;
  name: string;
  type: string;
  year?: number;
  is_today?: boolean;
  is_upcoming?: boolean;
  is_holiday: boolean;
  is_joint_holiday: boolean;
  is_observance: boolean;
}

export interface ApiCoIdHolidayResponse {
  is_success: boolean;
  message?: string;
  data: IndonesianHoliday[];
}

export async function fetchIndonesianHolidays({
  year,
  apiKey,
  baseUrl = "https://use.api.co.id",
}: {
  year: number;
  apiKey: string;
  baseUrl?: string;
}): Promise<IndonesianHoliday[]> {
  const url = new URL(`${baseUrl}/holidays/indonesia`);
  url.searchParams.set("year", String(year));

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "x-api-co-id": apiKey,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`api.co.id holidays ${year} failed: ${res.status} ${text}`);
  }

  const json: ApiCoIdHolidayResponse = await res.json();
  if (!json.is_success) {
    throw new Error(`api.co.id holidays ${year} not successful: ${json.message ?? "unknown"}`);
  }
  return json.data ?? [];
}
