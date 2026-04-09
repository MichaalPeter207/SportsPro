"""
migrate_v2.py
Adds tournament_title to matches and department to teams.
Safe to run multiple times (skips existing columns).
"""

import psycopg2

DB_URI = "postgresql://postgres:Ify??0000@localhost:5432/sports_league_db"

MIGRATIONS = [
    # matches table
    "ALTER TABLE matches ADD COLUMN IF NOT EXISTS tournament_title VARCHAR(150);",
    # teams table
    "ALTER TABLE teams ADD COLUMN IF NOT EXISTS department VARCHAR(100);",
]

def run():
    conn = psycopg2.connect(DB_URI)
    cur  = conn.cursor()
    for sql in MIGRATIONS:
        try:
            cur.execute(sql)
            conn.commit()
            print(f"✅ {sql.strip()[:60]}...")
        except Exception as e:
            conn.rollback()
            print(f"⚠️  Skipped (already exists or error): {e}")
    cur.close()
    conn.close()
    print("\n✅ Migration complete.")

if __name__ == "__main__":
    run()