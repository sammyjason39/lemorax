export const CURRENT_PERIODE_VALUE = "current";
export const DEFAULT_PERIODE_START = "2024-01";

/** Current month as YYYY-MM */
export function getCurrentPeriode(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Resolve "current" sentinel to actual YYYY-MM */
export function resolvePeriode(value: string): string {
  if (!value || value === CURRENT_PERIODE_VALUE) return getCurrentPeriode();
  return value;
}

/** All months from start through current month (inclusive) */
export function generatePeriodeMonths(start = DEFAULT_PERIODE_START): string[] {
  const [sy, sm] = start.split("-").map(Number);
  const end = getCurrentPeriode();
  const [ey, em] = end.split("-").map(Number);

  const months: string[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

/** Label for filter UI — "current" shows as "Saat Ini (Jun 2026)" */
export function formatPeriodeFilter(
  value: string,
  lang: "id" | "en" = "id"
): string {
  if (value === CURRENT_PERIODE_VALUE) {
    const current = getCurrentPeriode();
    const [year, month] = current.split("-");
    const monthsId = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
    ];
    const monthsEn = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const label = lang === "id" ? "Saat Ini" : "Current";
    const months = lang === "id" ? monthsId : monthsEn;
    return `${label} (${months[parseInt(month) - 1]} ${year})`;
  }
  const [year, month] = value.split("-");
  const monthsId = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  const monthsEn = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const months = lang === "id" ? monthsId : monthsEn;
  return `${months[parseInt(month) - 1]} ${year}`;
}
