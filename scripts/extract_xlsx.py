"""
Lemorax Direct Seeder — generates SQL INSERT statements from XLSX
Outputs data as JSON files for MCP-based seeding
"""
import os
import sys
import math
import json
from datetime import datetime, date

import pandas as pd

XLSX_PATH = "./data/Lemorax_Data_Dummy.xlsx"
OUTPUT_DIR = "./data/seed_json"

os.makedirs(OUTPUT_DIR, exist_ok=True)


def clean_value(v):
    if v is None:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    if isinstance(v, (datetime, date)):
        return str(v)[:10]
    if isinstance(v, pd.Timestamp):
        return str(v)[:10]
    if hasattr(v, 'item'):
        return v.item()
    if isinstance(v, (int, float)):
        return v
    return str(v) if v is not None else None


def clean_row(row):
    return {k: clean_value(v) for k, v in row.items() if clean_value(v) is not None}


print(f"Loading {XLSX_PATH}...")
xl = pd.ExcelFile(XLSX_PATH)
print(f"Sheets: {xl.sheet_names}\n")

# ── EMPLOYEES ──────────────────────────────────────────────────
sheet = next((s for s in xl.sheet_names if s.lower() in ["employees","employee"]), None)
if sheet:
    df = xl.parse(sheet)
    col_map = {
        "Employee ID": "employee_id", "Nama Lengkap": "nama_lengkap",
        "Cabang": "cabang", "Departemen": "departemen", "Jabatan": "jabatan",
        "Tanggal Bergabung": "tanggal_bergabung", "No Telepon": "no_telepon",
        "No. Telepon": "no_telepon", "Email": "email", "Status": "status",
        "Gaji Pokok": "gaji_pokok", "Gaji Pokok (Rp)": "gaji_pokok",
    }
    df = df.rename(columns=col_map)
    keep = [c for c in col_map.values() if c in df.columns]
    rows = [clean_row(r) for r in df[keep].to_dict("records")]
    with open(f"{OUTPUT_DIR}/employees.json", "w") as f:
        json.dump(rows, f)
    print(f"✅ employees: {len(rows)} rows")

# ── KPI ──────────────────────────────────────────────────────────
sheet = next((s for s in xl.sheet_names if s.lower() == "kpi"), None)
if sheet:
    df = xl.parse(sheet)
    col_map = {
        "Periode": "periode", "Employee ID": "employee_id", "Nama": "nama",
        "Cabang": "cabang", "Departemen": "departemen", "Jabatan": "jabatan",
        "Kategori KPI": "kategori_kpi", "Target": "target", "Actual": "actual",
        "Achievement (%)": "achievement_pct", "Achievement(%)": "achievement_pct",
        "Status": "status",
    }
    df = df.rename(columns=col_map)
    keep = [c for c in col_map.values() if c in df.columns]
    rows = [clean_row(r) for r in df[keep].to_dict("records")]
    with open(f"{OUTPUT_DIR}/kpi.json", "w") as f:
        json.dump(rows, f)
    print(f"✅ kpi: {len(rows)} rows")

# ── ABSENSI ────────────────────────────────────────────────────
sheet = next((s for s in xl.sheet_names if s.lower() in ["absensi","absensi "]), None)
if sheet:
    df = xl.parse(sheet)
    col_map = {
        "Periode": "periode", "Minggu Ke": "minggu_ke", "Minggu ke": "minggu_ke",
        "Employee ID": "employee_id", "Nama": "nama", "Cabang": "cabang",
        "Jabatan": "jabatan", "Hadir": "hadir", "Sakit": "sakit",
        "Izin": "izin", "Alfa": "alfa", "Terlambat": "terlambat",
        "WFH": "wfh", "Total Hari Kerja": "total_hari_kerja",
    }
    df = df.rename(columns=col_map)
    keep = [c for c in col_map.values() if c in df.columns]
    rows = [clean_row(r) for r in df[keep].to_dict("records")]
    with open(f"{OUTPUT_DIR}/absensi.json", "w") as f:
        json.dump(rows, f)
    print(f"✅ absensi: {len(rows)} rows")

# ── SALES ──────────────────────────────────────────────────────
sheet = next((s for s in xl.sheet_names if "sales" in s.lower()), None)
if sheet:
    df = xl.parse(sheet)
    col_map = {
        "Transaction ID": "transaction_id", "Periode": "periode", "Tanggal": "tanggal",
        "Employee ID": "employee_id", "Sales Name": "sales_name", "Nama Sales": "sales_name",
        "Cabang": "cabang", "Tipe": "tipe", "Produk": "produk", "Qty": "qty",
        "Harga Satuan (Rp)": "harga_satuan", "Harga Satuan": "harga_satuan",
        "Total (Rp)": "total", "Total": "total", "Status": "status", "Channel": "channel",
    }
    df = df.rename(columns=col_map)
    keep = [c for c in col_map.values() if c in df.columns]
    rows = [clean_row(r) for r in df[keep].to_dict("records")]
    with open(f"{OUTPUT_DIR}/sales_report.json", "w") as f:
        json.dump(rows, f)
    print(f"✅ sales_report: {len(rows)} rows")

# ── CRM ────────────────────────────────────────────────────────
sheet = next((s for s in xl.sheet_names if s.lower() == "crm"), None)
if sheet:
    df = xl.parse(sheet)
    col_map = {
        "Deal ID": "deal_id", "Periode": "periode", "Nama Perusahaan": "nama_perusahaan",
        "Tipe Bisnis": "tipe_bisnis", "Kota": "kota", "Cabang Handler": "cabang_handler",
        "Account Manager": "account_manager", "AM Employee ID": "am_employee_id",
        "Nama Owner": "nama_owner", "Jabatan Owner": "jabatan_owner",
        "No HP Owner": "no_hp_owner", "No. HP Owner": "no_hp_owner",
        "Email Owner": "email_owner", "Tanggal Lahir Owner": "tanggal_lahir_owner",
        "Nilai Deal": "nilai_deal", "Nilai Deal (Rp)": "nilai_deal",
        "Status": "status", "Produk Utama": "produk_utama",
        "Frekuensi Order": "frekuensi_order", "Last Follow Up": "last_follow_up",
        "Last Follow-Up": "last_follow_up", "Tanggal Closed": "tanggal_closed", "Notes": "notes",
    }
    df = df.rename(columns=col_map)
    keep = [c for c in col_map.values() if c in df.columns]
    rows = [clean_row(r) for r in df[keep].to_dict("records")]
    with open(f"{OUTPUT_DIR}/crm.json", "w") as f:
        json.dump(rows, f)
    print(f"✅ crm: {len(rows)} rows")

# ── FINANCE ────────────────────────────────────────────────────
sheet = next((s for s in xl.sheet_names if s.lower() == "finance"), None)
if sheet:
    df = xl.parse(sheet)
    col_map = {
        "Periode": "periode", "Cabang": "cabang", "Tipe": "tipe",
        "Kategori": "kategori", "Keterangan": "keterangan",
        "Jumlah (Rp)": "jumlah", "Jumlah": "jumlah",
        "Metode Pembayaran": "metode_pembayaran", "Referensi": "referensi",
    }
    df = df.rename(columns=col_map)
    keep = [c for c in col_map.values() if c in df.columns]
    rows = [clean_row(r) for r in df[keep].to_dict("records")]
    with open(f"{OUTPUT_DIR}/finance.json", "w") as f:
        json.dump(rows, f)
    print(f"✅ finance: {len(rows)} rows")

# ── MARKETING ──────────────────────────────────────────────────
sheet = next((s for s in xl.sheet_names if s.lower() == "marketing"), None)
if sheet:
    df = xl.parse(sheet)
    col_map = {
        "Periode": "periode", "Campaign Name": "campaign_name", "Nama Campaign": "campaign_name",
        "Channel": "channel", "Target Audience": "target_audience",
        "Budget": "budget", "Budget (Rp)": "budget",
        "Spend": "spend", "Spend (Rp)": "spend",
        "Impressions": "impressions", "Clicks": "clicks",
        "CTR (%)": "ctr_pct", "CTR(%)": "ctr_pct",
        "Conversions": "conversions", "Conv. Rate (%)": "conv_rate_pct",
        "Revenue Generated (Rp)": "revenue_generated", "Revenue Generated": "revenue_generated",
        "ROAS": "roas", "CPL (Rp)": "cpl", "CPL": "cpl", "Status": "status",
    }
    df = df.rename(columns=col_map)
    keep = [c for c in col_map.values() if c in df.columns]
    rows = [clean_row(r) for r in df[keep].to_dict("records")]
    with open(f"{OUTPUT_DIR}/marketing.json", "w") as f:
        json.dump(rows, f)
    print(f"✅ marketing: {len(rows)} rows")

print("\n🎉 JSON files generated in ./data/seed_json/")
