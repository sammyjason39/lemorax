/** Lemorax visual tokens — semantic by meaning, not one brand color everywhere. */
export const brand = {
  ink: "#172033",
  slate: "#4B556B",
  violet: "#6C5CE7",
  violetHover: "#5947D6",
  violetSoft: "#EEEAFE",
  blue: "#2784E8",
  blueMid: "#5A73C7",
  blueSoft: "#E6F2FF",
  emerald: "#00A884",
  emeraldSoft: "#E5F7F1",
  tangerine: "#F0783C",
  tangerineSoft: "#FFF0E7",
  rose: "#D95D8C",
  roseSoft: "#FCEBF1",
  teal: "#1BA6A6",
  tealSoft: "#E5F7F7",
  amber: "#EAA42A",
  amberSoft: "#FFF6E3",
  danger: "#E05454",
  dangerSoft: "#FDEBEC",
  surface: "#FFFFFF",
  mist: "#F8FAFC",
  hairline: "#E2E8F0",
  hairline2: "#CBD5E1",
  muted: "#64748B",
  muted2: "#94A3B8",
  muted3: "#CBD5E1",
  success: "#00A884",
  warning: "#EAA42A",
} as const;

/** User utama Lemorax / ARIES. */
export const PRINCIPAL_NAME = "Pak Anjas";

export const domain = {
  sales: brand.violet,
  finance: brand.emerald,
  crm: brand.tangerine,
  people: brand.rose,
  marketing: brand.teal,
  ai: "#8B5CF6",
} as const;

/** Standard comparison: key business metric versus a deliberately quiet baseline. */
export const CHART_PRIMARY = domain.sales;
export const CHART_SECONDARY = brand.muted2;
export const CHART_MUTED = brand.muted2;
export const CHART_AXIS = brand.muted;
export const CHART_GRID = "var(--border)";

/** One series across ranks. Colour intensity encodes emphasis, not category. */
export const CHART_PALETTE = [
  "#6C5CE7", "#7B6EEB", "#8B80EC", "#9A91EA", "#AAA3E7", "#BAB4E1",
  "#C8C4DB", "#D4D1DF", "#DEDBE5", "#E7E5ED", "#EFEDF4", "#F5F3F8",
];

/** Categorical chart palette. Keep to six active series where possible. */
export const CHART_CATEGORICAL_PALETTE = [
  brand.violet,
  brand.teal,
  brand.tangerine,
  brand.rose,
  brand.blue,
  brand.amber,
  "#9B6BCE",
  "#5D8F74",
];

export function getChartColor(index: number, total?: number): string {
  if (total && total > 1) {
    const idx = Math.round((index / (total - 1)) * (CHART_PALETTE.length - 1));
    return CHART_PALETTE[Math.min(idx, CHART_PALETTE.length - 1)];
  }
  return CHART_PALETTE[index % CHART_PALETTE.length];
}

export function getCategoricalColor(index: number, total?: number): string {
  if (total && total > 1) {
    const idx = Math.round((index / (total - 1)) * (CHART_CATEGORICAL_PALETTE.length - 1));
    return CHART_CATEGORICAL_PALETTE[Math.min(idx, CHART_CATEGORICAL_PALETTE.length - 1)];
  }
  return CHART_CATEGORICAL_PALETTE[index % CHART_CATEGORICAL_PALETTE.length];
}

export function buildRankColorMap(items: Record<string, unknown>[], categoryKey: string, valueKey: string): Record<string, string> {
  const totals: Record<string, number> = {};
  for (const item of items) {
    const cat = String(item[categoryKey] ?? "");
    if (cat) totals[cat] = (totals[cat] || 0) + Number(item[valueKey] || 0);
  }
  const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  return Object.fromEntries(ranked.map(([cat], i) => [cat, getCategoricalColor(i, ranked.length)]));
}

export const CRM_STATUS_COLORS: Record<string, string> = {
  "Closed Won": brand.emerald,
  Negotiation: brand.violet,
  Proposal: brand.blue,
  Prospecting: brand.amber,
  "Closed Lost": brand.danger,
};

export const KPI_STATUS_COLORS: Record<string, string> = {
  Excellent: brand.emerald,
  "On Track": brand.teal,
  Warning: brand.amber,
  "Below Target": brand.danger,
};

export const ATTENDANCE_COLORS: Record<string, string> = {
  hadir: brand.emerald,
  sakit: brand.blue,
  izin: brand.amber,
  alfa: brand.danger,
};

export function getKehadiranBarColor(pct: number): string {
  if (pct >= 95) return brand.emerald;
  if (pct >= 90) return brand.teal;
  if (pct >= 85) return brand.blue;
  if (pct >= 80) return brand.violet;
  if (pct >= 75) return brand.amber;
  return brand.danger;
}

export function getHeatmapCellStyle(achievementPct: number): { background: string; color: string } {
  if (achievementPct <= 0) return { background: "transparent", color: "var(--text-muted)" };
  if (achievementPct < 75) return { background: "#FDEBEC", color: "#A13B3B" };
  if (achievementPct < 90) return { background: "#FFF0E7", color: "#A54A21" };
  if (achievementPct < 100) return { background: "#EEEAFE", color: "#4E3EBD" };
  if (achievementPct < 110) return { background: "#A094EE", color: "#FFFFFF" };
  return { background: "#5B4CCE", color: "#FFFFFF" };
}

export function getBucketColor(bucketIndex: number, totalBuckets: number): string {
  return getCategoricalColor(totalBuckets - 1 - bucketIndex, totalBuckets);
}
