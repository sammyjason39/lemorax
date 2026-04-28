"""
Generate SQL batch files for all 7 tables.
Run: python3 scripts/gen_sql.py
"""
import json, os

OUTPUT = "data/seed_json"

def rows_to_sql(rows, table, conflict_col=None):
    if not rows:
        return []
    
    batches = []
    batch_size = 50
    
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i+batch_size]
        cols = list(batch[0].keys())
        vals_list = []
        for r in batch:
            vals = []
            for c in cols:
                v = r.get(c)
                if v is None:
                    vals.append('NULL')
                elif isinstance(v, (int, float)):
                    vals.append(str(int(v)) if isinstance(v, float) and v == int(v) else str(v))
                else:
                    escaped = str(v).replace("'", "''")
                    vals.append(f"'{escaped}'")
            vals_list.append('(' + ','.join(vals) + ')')
        
        conflict = f" ON CONFLICT ({conflict_col}) DO NOTHING" if conflict_col else " ON CONFLICT DO NOTHING"
        sql = f'INSERT INTO {table} ({",".join(cols)}) VALUES {",".join(vals_list)}{conflict}'
        batches.append(sql)
    
    return batches

tables = [
    ("employees", "employee_id"),
    ("kpi", None),
    ("absensi", None),
    ("sales_report", "transaction_id"),
    ("crm", "deal_id"),
    ("finance", None),
    ("marketing", None),
]

for table, conflict_col in tables:
    path = f"{OUTPUT}/{table}.json"
    if not os.path.exists(path):
        print(f"⚠️  {path} not found, skipping")
        continue
    
    with open(path) as f:
        rows = json.load(f)
    
    batches = rows_to_sql(rows, table, conflict_col)
    
    out_path = f"{OUTPUT}/{table}_sql.json"
    with open(out_path, "w") as f:
        json.dump(batches, f)
    
    print(f"✅ {table}: {len(rows)} rows → {len(batches)} batches → {out_path}")

print("\nDone! SQL files ready.")
