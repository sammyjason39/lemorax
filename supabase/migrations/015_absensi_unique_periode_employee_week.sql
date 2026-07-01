-- Prevent duplicate weekly absensi rows per employee
CREATE UNIQUE INDEX IF NOT EXISTS idx_absensi_periode_employee_week
  ON absensi (periode, employee_id, minggu_ke);
