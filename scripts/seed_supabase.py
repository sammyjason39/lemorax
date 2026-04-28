"""
Lemorax Data Seeder
====================
Reads Lemorax_Data_Dummy.xlsx and seeds all 7 sheets into Supabase.

Usage:
  pip install openpyxl pandas supabase python-dotenv
  python scripts/seed_supabase.py

Place Lemorax_Data_Dummy.xlsx in ./data/ folder.
"""

import os
import sys
import math
import json
from datetime import datetime, date

import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv

# Load env from .env.local
load_dotenv(".env.local")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
XLSX_PATH = os.getenv("XLSX_PATH", "./data/Lemorax_Data_Dummy.xlsx")
BATCH_SIZE = 100

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local")
    sys.exit(1)

if SUPABASE_KEY == "your_service_role_key_here":
    print("❌ Please set your real SUPABASE_SERVICE_ROLE_KEY in .env.local")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def clean_value(v):
    """Convert pandas/datetime values to JSON-serializable types."""
    if v is None:
        return None
    # Handle pd.Timestamp first (before datetime check) because NaT is a Timestamp
    if isinstance(v, pd.Timestamp):
        if pd.isna(v):
            return None
        return v.isoformat()[:10]  # YYYY-MM-DD
    if isinstance(v, float) and math.isnan(v):
        return None
    if isinstance(v, (datetime, date)):
        return v.isoformat()[:10]
    if hasattr(v, 'item'):  # numpy scalar
        return v.item()
    # Catch string "NaT" or "nan" produced by edge cases
    if isinstance(v, str) and v.strip().lower() in ("nat", "nan", "none", "null", ""):
        return None
    return v


def clean_row(row: dict) -> dict:
    return {k: clean_value(v) for k, v in row.items() if clean_value(v) is not None}


def upsert_batch(table: str, rows: list, conflict_col: str = None):
    """Upsert a batch of rows. Returns (success_count, error_count)."""
    try:
        if conflict_col:
            result = supabase.table(table).upsert(rows, on_conflict=conflict_col).execute()
        else:
            result = supabase.table(table).upsert(rows).execute()
        return len(rows), 0
    except Exception as e:
        print(f"  ⚠️  Batch error: {str(e)[:120]}")
        return 0, len(rows)


def seed_table(df: pd.DataFrame, table: str, col_map: dict, conflict_col: str = None):
    """Rename columns, clean data, and upsert in batches."""
    df = df.rename(columns=col_map)
    # Only keep columns that exist in col_map values
    keep_cols = [c for c in col_map.values() if c in df.columns]
    df = df[keep_cols].copy()

    rows = [clean_row(r) for r in df.to_dict("records")]
    total = len(rows)
    success, errors = 0, 0

    for i in range(0, total, BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        s, e = upsert_batch(table, batch, conflict_col)
        success += s
        errors += e
        print(f"  → Batch {i//BATCH_SIZE + 1}/{math.ceil(total/BATCH_SIZE)}: {s}/{len(batch)} rows OK", end="\r")

    print(f"  ✅ {table}: {success}/{total} rows seeded ({errors} errors)          ")
    return success


def main():
    print(f"📂 Loading {XLSX_PATH}...")
    try:
        xl = pd.ExcelFile(XLSX_PATH)
    except FileNotFoundError:
        print(f"❌ File not found: {XLSX_PATH}")
        print(f"   Place your XLSX file at: {XLSX_PATH}")
        sys.exit(1)

    print(f"   Sheets found: {xl.sheet_names}\n")

    # ── EMPLOYEES ──────────────────────────────────────────────────
    if "Employees" in xl.sheet_names or "employees" in xl.sheet_names:
        sheet = "Employees" if "Employees" in xl.sheet_names else "employees"
        print(f"📋 Seeding employees...")
        df = xl.parse(sheet)
        col_map = {
            "Employee ID": "employee_id",
            "Nama Lengkap": "nama_lengkap",
            "Cabang": "cabang",
            "Departemen": "departemen",
            "Jabatan": "jabatan",
            "Tanggal Bergabung": "tanggal_bergabung",
            "No Telepon": "no_telepon",
            "No. Telepon": "no_telepon",
            "Email": "email",
            "Status": "status",
            "Gaji Pokok": "gaji_pokok",
            "Gaji Pokok (Rp)": "gaji_pokok",
        }
        seed_table(df, "employees", col_map, "employee_id")
    else:
        print("⚠️  Sheet 'Employees' not found, skipping...")

    # ── KPI ────────────────────────────────────────────────────────
    if "KPI" in xl.sheet_names or "kpi" in xl.sheet_names:
        sheet = "KPI" if "KPI" in xl.sheet_names else "kpi"
        print(f"\n📋 Seeding KPI...")
        df = xl.parse(sheet)
        col_map = {
            "Periode": "periode",
            "Employee ID": "employee_id",
            "Nama": "nama",
            "Cabang": "cabang",
            "Departemen": "departemen",
            "Jabatan": "jabatan",
            "Kategori KPI": "kategori_kpi",
            "Target": "target",
            "Actual": "actual",
            "Achievement (%)": "achievement_pct",
            "Achievement(%)": "achievement_pct",
            "Status": "status",
        }
        seed_table(df, "kpi", col_map)
    else:
        print("\n⚠️  Sheet 'KPI' not found, skipping...")

    # ── ABSENSI ────────────────────────────────────────────────────
    if "Absensi" in xl.sheet_names or "absensi" in xl.sheet_names:
        sheet = "Absensi" if "Absensi" in xl.sheet_names else "absensi"
        print(f"\n📋 Seeding absensi...")
        df = xl.parse(sheet)
        col_map = {
            "Periode": "periode",
            "Minggu Ke": "minggu_ke",
            "Minggu ke": "minggu_ke",
            "Employee ID": "employee_id",
            "Nama": "nama",
            "Cabang": "cabang",
            "Jabatan": "jabatan",
            "Hadir": "hadir",
            "Sakit": "sakit",
            "Izin": "izin",
            "Alfa": "alfa",
            "Terlambat": "terlambat",
            "WFH": "wfh",
            "Total Hari Kerja": "total_hari_kerja",
        }
        seed_table(df, "absensi", col_map)
    else:
        print("\n⚠️  Sheet 'Absensi' not found, skipping...")

    # ── SALES REPORT ───────────────────────────────────────────────
    for sheet_name in ["Sales Report", "Sales", "sales_report", "sales"]:
        if sheet_name in xl.sheet_names:
            print(f"\n📋 Seeding sales_report...")
            df = xl.parse(sheet_name)
            col_map = {
                "Transaction ID": "transaction_id",
                "Periode": "periode",
                "Tanggal": "tanggal",
                "Employee ID": "employee_id",
                "Sales Name": "sales_name",
                "Nama Sales": "sales_name",
                "Cabang": "cabang",
                "Tipe": "tipe",
                "Produk": "produk",
                "Qty": "qty",
                "Harga Satuan (Rp)": "harga_satuan",
                "Harga Satuan": "harga_satuan",
                "Total (Rp)": "total",
                "Total": "total",
                "Status": "status",
                "Channel": "channel",
            }
            seed_table(df, "sales_report", col_map, "transaction_id")
            break
    else:
        print("\n⚠️  Sheet 'Sales Report' not found, skipping...")

    # ── CRM ────────────────────────────────────────────────────────
    if "CRM" in xl.sheet_names or "crm" in xl.sheet_names:
        sheet = "CRM" if "CRM" in xl.sheet_names else "crm"
        print(f"\n📋 Seeding CRM...")
        df = xl.parse(sheet)
        col_map = {
            "Deal ID": "deal_id",
            "Periode": "periode",
            "Nama Perusahaan": "nama_perusahaan",
            "Tipe Bisnis": "tipe_bisnis",
            "Kota": "kota",
            "Cabang Handler": "cabang_handler",
            "Account Manager": "account_manager",
            "AM Employee ID": "am_employee_id",
            "Nama Owner": "nama_owner",
            "Jabatan Owner": "jabatan_owner",
            "No HP Owner": "no_hp_owner",
            "No. HP Owner": "no_hp_owner",
            "Email Owner": "email_owner",
            "Tanggal Lahir Owner": "tanggal_lahir_owner",
            "Nilai Deal": "nilai_deal",
            "Nilai Deal (Rp)": "nilai_deal",
            "Status": "status",
            "Produk Utama": "produk_utama",
            "Frekuensi Order": "frekuensi_order",
            "Last Follow Up": "last_follow_up",
            "Last Follow-Up": "last_follow_up",
            "Tanggal Closed": "tanggal_closed",
            "Notes": "notes",
        }
        seed_table(df, "crm", col_map, "deal_id")
    else:
        print("\n⚠️  Sheet 'CRM' not found, skipping...")

    # ── FINANCE ────────────────────────────────────────────────────
    if "Finance" in xl.sheet_names or "finance" in xl.sheet_names:
        sheet = "Finance" if "Finance" in xl.sheet_names else "finance"
        print(f"\n📋 Seeding finance...")
        df = xl.parse(sheet)
        col_map = {
            "Periode": "periode",
            "Cabang": "cabang",
            "Tipe": "tipe",
            "Kategori": "kategori",
            "Keterangan": "keterangan",
            "Jumlah (Rp)": "jumlah",
            "Jumlah": "jumlah",
            "Metode Pembayaran": "metode_pembayaran",
            "Referensi": "referensi",
        }
        seed_table(df, "finance", col_map)
    else:
        print("\n⚠️  Sheet 'Finance' not found, skipping...")

    # ── MARKETING ──────────────────────────────────────────────────
    if "Marketing" in xl.sheet_names or "marketing" in xl.sheet_names:
        sheet = "Marketing" if "Marketing" in xl.sheet_names else "marketing"
        print(f"\n📋 Seeding marketing...")
        df = xl.parse(sheet)
        col_map = {
            "Periode": "periode",
            "Campaign Name": "campaign_name",
            "Nama Campaign": "campaign_name",
            "Channel": "channel",
            "Target Audience": "target_audience",
            "Budget": "budget",
            "Budget (Rp)": "budget",
            "Spend": "spend",
            "Spend (Rp)": "spend",
            "Impressions": "impressions",
            "Clicks": "clicks",
            "CTR (%)": "ctr_pct",
            "CTR(%)": "ctr_pct",
            "Conversions": "conversions",
            "Conv. Rate (%)": "conv_rate_pct",
            "Conv.Rate(%)": "conv_rate_pct",
            "Revenue Generated (Rp)": "revenue_generated",
            "Revenue Generated": "revenue_generated",
            "ROAS": "roas",
            "CPL (Rp)": "cpl",
            "CPL": "cpl",
            "Status": "status",
        }
        seed_table(df, "marketing", col_map)
    else:
        print("\n⚠️  Sheet 'Marketing' not found, skipping...")

    print("\n🎉 Seeding selesai!")


if __name__ == "__main__":
    main()
