export type Employee = {
  id: number;
  employee_id: string;
  nama_lengkap: string;
  cabang: string;
  departemen: string;
  jabatan: string;
  tanggal_bergabung: string | null;
  no_telepon: string | null;
  email: string | null;
  status: string;
  gaji_pokok: number | null;
  created_at: string;
};

export type KPI = {
  id: number;
  periode: string;
  employee_id: string;
  nama: string;
  cabang: string;
  departemen: string;
  jabatan: string;
  kategori_kpi: string;
  target: number;
  actual: number;
  achievement_pct: number;
  status: string;
  created_at: string;
};

export type Absensi = {
  id: number;
  periode: string;
  minggu_ke: string;
  employee_id: string;
  nama: string;
  cabang: string;
  jabatan: string;
  hadir: number;
  sakit: number;
  izin: number;
  alfa: number;
  terlambat: number;
  wfh: number;
  total_hari_kerja: number;
  created_at: string;
};

export type SalesReport = {
  id: number;
  transaction_id: string;
  periode: string;
  tanggal: string;
  employee_id: string;
  sales_name: string;
  cabang: string;
  tipe: string;
  produk: string;
  qty: number;
  harga_satuan: number;
  total: number;
  status: string;
  channel: string;
  created_at: string;
};

export type CRM = {
  id: number;
  deal_id: string;
  periode: string;
  nama_perusahaan: string;
  tipe_bisnis: string;
  kota: string;
  cabang_handler: string;
  account_manager: string;
  am_employee_id: string;
  nama_owner: string;
  jabatan_owner: string;
  no_hp_owner: string;
  email_owner: string;
  tanggal_lahir_owner: string | null;
  nilai_deal: number;
  status: string;
  produk_utama: string;
  frekuensi_order: string;
  last_follow_up: string | null;
  tanggal_closed: string | null;
  notes: string | null;
  created_at: string;
};

export type Finance = {
  id: number;
  periode: string;
  cabang: string;
  tipe: string;
  kategori: string;
  keterangan: string;
  jumlah: number;
  metode_pembayaran: string;
  referensi: string;
  created_at: string;
};

export type Marketing = {
  id: number;
  periode: string;
  campaign_name: string;
  channel: string;
  target_audience: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr_pct: number;
  conversions: number;
  conv_rate_pct: number;
  revenue_generated: number;
  roas: number;
  cpl: number;
  status: string;
  created_at: string;
};

export type MetricCardData = {
  title: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  sparklineData?: number[];
  icon?: React.ReactNode;
  prefix?: string;
  suffix?: string;
  colorScheme?: "default" | "teal" | "amber" | "red" | "purple";
};

export type FilterState = {
  periodeStart: string;
  periodeEnd: string;
  cabang: string[];
};

export type OverviewData = {
  revenue: number;
  revenuePrev: number;
  revenueSparkline: number[];
  expense: number;
  expensePrev: number;
  expenseSparkline: number[];
  netProfit: number;
  netProfitPrev: number;
  totalTransactions: number;
  totalTransactionsPrev: number;
  kpiAchievement: number;
  kpiAchievementPrev: number;
  activeDeals: number;
  activeDealsPrev: number;
  topSales: TopSalesItem[];
  pipelineDistribution: PipelineItem[];
  kpiDistribution: KPIDistributionItem[];
  alerts: AlertItem[];
  revenueVsExpense: MonthlyFinance[];
  revenueByCabang: CabangRevenue[];
};

export type TopSalesItem = {
  employee_id: string;
  sales_name: string;
  cabang: string;
  total_sales: number;
  achievement: number;
};

export type PipelineItem = {
  status: string;
  count: number;
  value: number;
};

export type KPIDistributionItem = {
  status: string;
  count: number;
};

export type AlertItem = {
  type: "critical" | "warning";
  category: string;
  message: string;
  detail: string;
};

export type MonthlyFinance = {
  periode: string;
  revenue: number;
  expense: number;
  net: number;
};

export type CabangRevenue = {
  cabang: string;
  revenue: number;
};

export const CABANG_LIST = [
  "Medan",
  "Palembang",
  "Tangerang",
  "Jakarta Pusat",
  "Jakarta Selatan",
  "Bandung",
  "Bekasi",
  "Semarang",
  "Yogyakarta",
  "Surabaya",
  "Bali",
  "Makassar",
];
