export type Language = "id" | "en";

export const translations = {
  id: {
    "global.live": "Langsung",
    "global.all_branches": "Semua Cabang",
    "global.branches": "Cabang",
    "global.reset": "Reset",
    "global.filter": "Filter Global",
    "global.period": "Periode",
    "global.main_menu": "Menu Utama",
    "global.switch_lang": "Switch to English",

    "menu.overview": "Overview",
    "menu.sales": "Sales & Revenue",
    "menu.kpi": "KPI Karyawan",
    "menu.hr": "HR & Absensi",
    "menu.crm": "CRM & Deals",
    "menu.finance": "Finance",
    "menu.marketing": "Marketing",
    "menu.ai": "AI Analyst",
    "menu.ai_staff": "AI Agents Staff",

    "dash.title": "Executive Overview",
    "dash.subtitle": "Ringkasan kondisi bisnis PT Lemorax · ARIES",
    "dash.revenue": "Total Revenue",
    "dash.expense": "Total Pengeluaran",
    "dash.profit": "Net Profit",
    "dash.transactions": "Total Transaksi",
    "dash.kpi": "KPI Achievement",
    "dash.deals": "Active Deals",
    "dash.vs_last_month": "vs bln lalu",

    "chart.rev_vs_exp": "Revenue vs Pengeluaran",
    "chart.rev_per_branch": "Revenue per Cabang",
  },
  en: {
    "global.live": "Live",
    "global.all_branches": "All Branches",
    "global.branches": "Branches",
    "global.reset": "Reset",
    "global.filter": "Global Filters",
    "global.period": "Period",
    "global.main_menu": "Main Menu",
    "global.switch_lang": "Ganti ke Bahasa",

    "menu.overview": "Overview",
    "menu.sales": "Sales & Revenue",
    "menu.kpi": "Employee KPI",
    "menu.hr": "HR & Attendance",
    "menu.crm": "CRM & Deals",
    "menu.finance": "Finance",
    "menu.marketing": "Marketing",
    "menu.ai": "AI Analyst",
    "menu.ai_staff": "AI Agents Staff",

    "dash.title": "Executive Overview",
    "dash.subtitle": "PT Lemorax Business Summary · ARIES",
    "dash.revenue": "Total Revenue",
    "dash.expense": "Total Expenses",
    "dash.profit": "Net Profit",
    "dash.transactions": "Total Transactions",
    "dash.kpi": "KPI Achievement",
    "dash.deals": "Active Deals",
    "dash.vs_last_month": "vs last mo",

    "chart.rev_vs_exp": "Revenue vs Expenses",
    "chart.rev_per_branch": "Revenue per Branch",
  },
};

export type TranslationKey = keyof typeof translations.id;
