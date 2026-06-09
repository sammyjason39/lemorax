/**
 * Format number to Indonesian Rupiah with dot separator
 * e.g. 1234567 → "Rp 1.234.567"
 */
export function formatRupiah(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "Rp 0";
  return (
    "Rp " +
    Math.round(value)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  );
}

/**
 * Format to short rupiah (millions/billions/trillions)
 * e.g. 1234567890 → "Rp 1,23 M"
 */
export function formatRupiahShort(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "Rp 0";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000_000)
    return `${sign}Rp ${(abs / 1_000_000_000_000).toFixed(2).replace(".", ",")} T`;
  if (abs >= 1_000_000_000)
    return `${sign}Rp ${(abs / 1_000_000_000).toFixed(2).replace(".", ",")} M`;
  if (abs >= 1_000_000)
    return `${sign}Rp ${(abs / 1_000_000).toFixed(2).replace(".", ",")} Jt`;
  return formatRupiah(value);
}

/**
 * Format periode string: "2024-01" → "Jan 2024"
 */
export function formatPeriode(periode: string): string {
  if (!periode) return "";
  const [year, month] = periode.split("-");
  const months = [
    "Jan","Feb","Mar","Apr","Mei","Jun",
    "Jul","Agu","Sep","Okt","Nov","Des",
  ];
  return `${months[parseInt(month) - 1]} ${year}`;
}

/**
 * Format percentage with one decimal: 85.5 → "85,5%"
 */
export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "0,0%";
  return `${value.toFixed(1).replace(".", ",")}%`;
}

/**
 * Format Indonesian date: "2024-01-15" → "15 Januari 2024"
 */
export function formatDateID(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const months = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember",
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Get delta percentage between current and previous value
 */
export function calcDelta(current: number, previous: number): number {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Get color class for delta (positive = brand blue, negative = red)
 */
export function getDeltaColor(delta: number): string {
  if (delta > 0) return "text-[#1652F0]";
  if (delta < 0) return "text-red-500";
  return "text-slate-400";
}

/**
 * Get bg color class for delta
 */
export function getDeltaBgColor(delta: number): string {
  if (delta > 0) return "bg-[#DCE5FE] text-[#1652F0]";
  if (delta < 0) return "bg-red-400/10 text-red-500";
  return "bg-slate-400/10 text-slate-400";
}

/**
 * KPI status badge color
 */
export function getKPIStatusColor(status: string): string {
  const map: Record<string, string> = {
    Excellent: "bg-[#DCE5FE] text-[#1652F0] border-[#1652F0]/30",
    "On Track": "bg-[#DCE5FE]/60 text-[#3B5CB8] border-[#3B5CB8]/30",
    Warning: "bg-slate-100 text-[#6B7280] border-[#94A3B8]/40",
    "Below Target": "bg-slate-200 text-[#1E293B] border-[#475569]/40",
  };
  return map[status] || "bg-slate-100 text-slate-500 border-slate-300/40";
}

/**
 * CRM status badge color
 */
export function getCRMStatusColor(status: string): string {
  const map: Record<string, string> = {
    "Closed Won": "bg-[#DCE5FE] text-[#1652F0] border-[#1652F0]/30",
    "Closed Lost": "bg-slate-200 text-[#1E293B] border-[#475569]/40",
    Negotiation: "bg-[#DCE5FE]/60 text-[#3B5CB8] border-[#3B5CB8]/30",
    Proposal: "bg-slate-100 text-[#6B7280] border-[#94A3B8]/40",
    Prospecting: "bg-slate-50 text-[#94A3B8] border-[#CBD5E1]/60",
  };
  return map[status] || "bg-slate-100 text-slate-500 border-slate-300/40";
}

/**
 * Sales status badge color
 */
export function getSalesStatusColor(status: string): string {
  const map: Record<string, string> = {
    Closed: "bg-[#DCE5FE] text-[#1652F0] border-[#1652F0]/30",
    Pending: "bg-slate-100 text-[#6B7280] border-[#94A3B8]/40",
    Cancelled: "bg-slate-200 text-[#1E293B] border-[#475569]/40",
  };
  return map[status] || "bg-slate-100 text-slate-500 border-slate-300/40";
}

/**
 * Get initials from full name
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

/**
 * Get last N months as periode strings
 */
export function getLastNMonths(n: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return result;
}
