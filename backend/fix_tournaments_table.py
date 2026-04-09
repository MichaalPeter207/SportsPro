"""
fix_tournaments_table.py
Drops and recreates the tournaments and tournament_coaches tables cleanly.

  cd C:\\sports_league_system\\backend
  python fix_tournaments_table.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from extensions import db

app = create_app()

SQL = [
    "DROP TABLE IF EXISTS tournament_coaches CASCADE;",
    "DROP TABLE IF EXISTS tournaments CASCADE;",

    """CREATE TABLE tournaments (
        tournament_id SERIAL PRIMARY KEY,
        title         VARCHAR(150) NOT NULL,
        description   TEXT,
        season_id     INTEGER NOT NULL REFERENCES seasons(season_id),
        created_by    INTEGER NOT NULL REFERENCES users(user_id),
        status        VARCHAR(20) DEFAULT 'active',
        access_code   VARCHAR(12) UNIQUE NOT NULL,
        start_date    DATE,
        end_date      DATE,
        created_at    TIMESTAMP DEFAULT NOW(),
        archived_at   TIMESTAMP,
        archived_by   INTEGER REFERENCES users(user_id)
    );""",

    """CREATE TABLE tournament_coaches (
        id            SERIAL PRIMARY KEY,
        tournament_id INTEGER NOT NULL REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
        coach_id      INTEGER NOT NULL REFERENCES users(user_id),
        granted_at    TIMESTAMP DEFAULT NOW()
    );""",

    """DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='matches' AND column_name='tournament_id'
        ) THEN
            ALTER TABLE matches ADD COLUMN tournament_id INTEGER REFERENCES tournaments(tournament_id);
        END IF;
    END$$;""",
]

with app.app_context():
    with db.engine.connect() as conn:
        for sql in SQL:
            try:
                conn.execute(db.text(sql))
                conn.commit()
                print(f"OK: {sql.strip()[:55]}...")
            except Exception as e:
                conn.rollback()
                print(f"ERROR: {e}")
    print("\nDone. Restart backend then try creating a tournament.")