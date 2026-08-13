-- Indonesian public holidays table, synced from api.co.id
CREATE TABLE IF NOT EXISTS indonesian_holidays (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL,
  is_joint_holiday BOOLEAN DEFAULT FALSE,
  is_observance BOOLEAN DEFAULT FALSE,
  year INT NOT NULL,
  source VARCHAR(50) DEFAULT 'api.co.id',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_indonesian_holidays_date ON indonesian_holidays(date);
CREATE INDEX IF NOT EXISTS idx_indonesian_holidays_year ON indonesian_holidays(year);
