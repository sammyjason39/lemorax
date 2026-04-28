-- Lemorax Dashboard Schema
-- Run this in Supabase SQL Editor or apply via MCP
-- (Already applied via migration, this file is for reference)

-- EMPLOYEES
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(10) UNIQUE NOT NULL,
  nama_lengkap VARCHAR(100) NOT NULL,
  cabang VARCHAR(50) NOT NULL,
  departemen VARCHAR(50) NOT NULL,
  jabatan VARCHAR(60) NOT NULL,
  tanggal_bergabung DATE,
  no_telepon VARCHAR(20),
  email VARCHAR(100),
  status VARCHAR(20) DEFAULT 'Aktif',
  gaji_pokok BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- KPI
CREATE TABLE IF NOT EXISTS kpi (
  id SERIAL PRIMARY KEY,
  periode VARCHAR(7) NOT NULL,
  employee_id VARCHAR(10) REFERENCES employees(employee_id),
  nama VARCHAR(100),
  cabang VARCHAR(50),
  departemen VARCHAR(50),
  jabatan VARCHAR(60),
  kategori_kpi VARCHAR(50),
  target NUMERIC,
  actual NUMERIC,
  achievement_pct NUMERIC,
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ABSENSI
CREATE TABLE IF NOT EXISTS absensi (
  id SERIAL PRIMARY KEY,
  periode VARCHAR(7) NOT NULL,
  minggu_ke VARCHAR(10),
  employee_id VARCHAR(10) REFERENCES employees(employee_id),
  nama VARCHAR(100),
  cabang VARCHAR(50),
  jabatan VARCHAR(60),
  hadir INT DEFAULT 0,
  sakit INT DEFAULT 0,
  izin INT DEFAULT 0,
  alfa INT DEFAULT 0,
  terlambat INT DEFAULT 0,
  wfh INT DEFAULT 0,
  total_hari_kerja INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- SALES REPORT
CREATE TABLE IF NOT EXISTS sales_report (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(12) UNIQUE NOT NULL,
  periode VARCHAR(7),
  tanggal DATE,
  employee_id VARCHAR(10) REFERENCES employees(employee_id),
  sales_name VARCHAR(100),
  cabang VARCHAR(50),
  tipe VARCHAR(5),
  produk VARCHAR(100),
  qty INT,
  harga_satuan BIGINT,
  total BIGINT,
  status VARCHAR(20),
  channel VARCHAR(30),
  created_at TIMESTAMP DEFAULT NOW()
);

-- CRM
CREATE TABLE IF NOT EXISTS crm (
  id SERIAL PRIMARY KEY,
  deal_id VARCHAR(10) UNIQUE NOT NULL,
  periode VARCHAR(7),
  nama_perusahaan VARCHAR(100),
  tipe_bisnis VARCHAR(30),
  kota VARCHAR(50),
  cabang_handler VARCHAR(50),
  account_manager VARCHAR(100),
  am_employee_id VARCHAR(10),
  nama_owner VARCHAR(100),
  jabatan_owner VARCHAR(60),
  no_hp_owner VARCHAR(20),
  email_owner VARCHAR(100),
  tanggal_lahir_owner DATE,
  nilai_deal BIGINT,
  status VARCHAR(30),
  produk_utama VARCHAR(100),
  frekuensi_order VARCHAR(20),
  last_follow_up DATE,
  tanggal_closed DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- FINANCE
CREATE TABLE IF NOT EXISTS finance (
  id SERIAL PRIMARY KEY,
  periode VARCHAR(7) NOT NULL,
  cabang VARCHAR(50),
  tipe VARCHAR(15),
  kategori VARCHAR(50),
  keterangan TEXT,
  jumlah BIGINT,
  metode_pembayaran VARCHAR(30),
  referensi VARCHAR(15),
  created_at TIMESTAMP DEFAULT NOW()
);

-- MARKETING
CREATE TABLE IF NOT EXISTS marketing (
  id SERIAL PRIMARY KEY,
  periode VARCHAR(7) NOT NULL,
  campaign_name VARCHAR(100),
  channel VARCHAR(30),
  target_audience VARCHAR(30),
  budget BIGINT,
  spend BIGINT,
  impressions INT,
  clicks INT,
  ctr_pct NUMERIC,
  conversions INT,
  conv_rate_pct NUMERIC,
  revenue_generated BIGINT,
  roas NUMERIC,
  cpl BIGINT,
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_kpi_periode ON kpi(periode);
CREATE INDEX IF NOT EXISTS idx_kpi_cabang ON kpi(cabang);
CREATE INDEX IF NOT EXISTS idx_kpi_employee ON kpi(employee_id);
CREATE INDEX IF NOT EXISTS idx_sales_periode ON sales_report(periode);
CREATE INDEX IF NOT EXISTS idx_sales_cabang ON sales_report(cabang);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales_report(status);
CREATE INDEX IF NOT EXISTS idx_absensi_periode ON absensi(periode);
CREATE INDEX IF NOT EXISTS idx_absensi_employee ON absensi(employee_id);
CREATE INDEX IF NOT EXISTS idx_crm_status ON crm(status);
CREATE INDEX IF NOT EXISTS idx_crm_cabang ON crm(cabang_handler);
CREATE INDEX IF NOT EXISTS idx_finance_periode ON finance(periode);
CREATE INDEX IF NOT EXISTS idx_finance_tipe ON finance(tipe);
CREATE INDEX IF NOT EXISTS idx_marketing_periode ON marketing(periode);
