/** ConextLab brand tokens — used by ARIES dashboard */
export const brand = {
  ink: "#0A0A0A",
  slate: "#1E293B",
  blue: "#1652F0",
  blueMid: "#3B5CB8",
  blueLight: "#7C9AE8",
  blueSoft: "#DCE5FE",
  surface: "#FFFFFF",
  mist: "#F8FAFC",
  hairline: "#E5E7EB",
  hairline2: "#D1D5DB",
  muted: "#6B7280",
  muted2: "#94A3B8",
  muted3: "#CBD5E1",
  success: "#1652F0",
  warning: "#F59E0B",
  danger: "#EF4444",
} as const;

/** User utama Lemorax / ARIES — selalu panggil Pak Anjas, bukan "owner" */
export const PRINCIPAL_NAME = "Pak Anjas";

/** Dual-series charts: primary vs secondary (e.g. revenue vs expense, B2B vs B2C) */
export const CHART_PRIMARY = brand.blue;
export const CHART_SECONDARY = brand.muted2;
export const CHART_MUTED = brand.muted2;
export const CHART_AXIS = brand.muted;
export const CHART_GRID = "var(--border)";

/**
 * Single-metric ranked palette — subtle blue (high) → grey (low).
 * For one KPI across many rows (revenue per branch, top products).
 */
export const CHART_PALETTE = [
  "#1652F0",
  "#2B5CE6",
  "#4166CC",
  "#5771B3",
  "#6D7B99",
  "#6B7280",
  "#8290A3",
  "#94A3B8",
  "#A8B4C4",
  "#BBC5D4",
  "#CED6E4",
  "#DCE5FE",
];

/**
 * Multi-category palette — high contrast, still on-brand.
 * Index 0 = brightest (assign to highest value). Alternates vivid blue / slate for slice separation.
 */
export const CHART_CATEGORICAL_PALETTE = [
  "#1652F0",
  "#1E293B",
  "#60A5FA",
  "#64748B",
  "#0A0A0A",
  "#93C5FD",
  "#475569",
  "#3B5CB8",
  "#94A3B8",
  "#7C9AE8",
  "#CBD5E1",
  "#2B5CE6",
];

export function getChartColor(index: number, total?: number): string {
  if (total && total > 1) {
    const idx = Math.round((index / (total - 1)) * (CHART_PALETTE.length - 1));
    return CHART_PALETTE[Math.min(idx, CHART_PALETTE.length - 1)];
  }
  return CHART_PALETTE[index % CHART_PALETTE.length];
}

/** Brightest first — for pie slices, channel bars, scatter groups (rank 0 = highest value). */
export function getCategoricalColor(index: number, total?: number): string {
  if (total && total > 1) {
    const idx = Math.round((index / (total - 1)) * (CHART_CATEGORICAL_PALETTE.length - 1));
    return CHART_CATEGORICAL_PALETTE[Math.min(idx, CHART_CATEGORICAL_PALETTE.length - 1)];
  }
  return CHART_CATEGORICAL_PALETTE[index % CHART_CATEGORICAL_PALETTE.length];
}

/** Map category → color by total value (highest total = brightest). */
export function buildRankColorMap(
  items: Record<string, unknown>[],
  categoryKey: string,
  valueKey: string
): Record<string, string> {
  const totals: Record<string, number> = {};
  for (const item of items) {
    const cat = String(item[categoryKey] ?? "");
    if (!cat) continue;
    totals[cat] = (totals[cat] || 0) + Number(item[valueKey] || 0);
  }
  const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const map: Record<string, string> = {};
  ranked.forEach(([cat], i) => {
    map[cat] = getCategoricalColor(i, ranked.length);
  });
  return map;
}

/** Pie / status charts — blue-grey scale only */
export const CRM_STATUS_COLORS: Record<string, string> = {
  "Closed Won": brand.blue,
  "Closed Lost": brand.slate,
  Negotiation: brand.blueMid,
  Proposal: brand.muted,
  Prospecting: brand.muted2,
};

export const KPI_STATUS_COLORS: Record<string, string> = {
  Excellent: brand.blue,
  "On Track": brand.blueMid,
  Warning: brand.muted2,
  "Below Target": brand.slate,
};

/** Attendance series — categorical contrast; hadir = primary (highest emphasis) */
export const ATTENDANCE_COLORS: Record<string, string> = {
  hadir: CHART_CATEGORICAL_PALETTE[0],
  sakit: CHART_CATEGORICAL_PALETTE[2],
  izin: CHART_CATEGORICAL_PALETTE[3],
  alfa: CHART_CATEGORICAL_PALETTE[1],
};

/** KPI heatmap cell — solid colors, higher achievement = more saturated blue */
export function getHeatmapCellStyle(achievementPct: number): {
  background: string;
  color: string;
} {
  if (achievementPct <= 0) {
    return { background: "transparent", color: "var(--text-muted)" };
  }
  if (achievementPct < 75) {
    return { background: "#E2E8F0", color: "#475569" };
  }
  if (achievementPct < 90) {
    return { background: "#94A3B8", color: "#1E293B" };
  }
  if (achievementPct < 100) {
    return { background: "#7C9AE8", color: "#0A0A0A" };
  }
  if (achievementPct < 110) {
    return { background: "#1652F0", color: "#FFFFFF" };
  }
  return { background: "#0A0A0A", color: "#FFFFFF" };
}

/** Distribution bucket colors — ranked categorical, low bucket = muted, high = bright */
export function getBucketColor(bucketIndex: number, totalBuckets: number): string {
  const rankFromHigh = totalBuckets - 1 - bucketIndex;
  return getCategoricalColor(rankFromHigh, totalBuckets);
}
