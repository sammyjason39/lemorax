/** Integration with api.co.id Indonesian Holidays API (plain ESM, consumed by node scripts). */

/**
 * @typedef {Object} IndonesianHoliday
 * @property {number} [id]
 * @property {string} date  YYYY-MM-DD
 * @property {string} [date_formatted]
 * @property {string} [day_of_week]
 * @property {string} name
 * @property {string} type
 * @property {number} [year]
 * @property {boolean} [is_holiday]
 * @property {boolean} [is_joint_holiday]
 * @property {boolean} [is_observance]
 */

/**
 * @typedef {Object} HolidaysApiResponse
 * @property {boolean} is_success
 * @property {string} [message]
 * @property {IndonesianHoliday[]} data
 */

const BASE_URL = "https://use.api.co.id";

/** @returns {string | undefined} */
export function getHolidaysApiKey() {
  return process.env.INDONESIAN_HOLIDAYS_API_KEY ?? process.env.HOLIDAYS_API_KEY;
}

/**
 * @param {number} year
 * @param {string} [apiKey]
 * @returns {Promise<IndonesianHoliday[]>}
 */
export async function fetchIndonesianHolidays(year, apiKey) {
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

  /** @type {HolidaysApiResponse} */
  const json = await res.json();
  if (!json.is_success) {
    throw new Error(`Holidays API returned failure: ${json.message || "unknown"}`);
  }

  return json.data || [];
}

/**
 * @param {number[]} years
 * @param {string} [apiKey]
 * @returns {Promise<IndonesianHoliday[]>}
 */
export async function fetchIndonesianHolidayYears(years, apiKey) {
  /** @type {IndonesianHoliday[]} */
  const all = [];
  for (const year of years) {
    const rows = await fetchIndonesianHolidays(year, apiKey);
    all.push(...rows);
  }
  return all;
}
