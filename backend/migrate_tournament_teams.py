"""
migrate_tournament_teams.py
Adds the tournament_teams table for registering teams to tournaments.

  cd C:\\sports_league_system\\backend
  python migrate_tournament_teams.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from app import create_app
from extensions import db

app = create_app()

SQL = [
    """
    CREATE TABLE IF NOT EXISTS tournament_teams (
        id            SERIAL PRIMARY KEY,
        tournament_id INTEGER NOT NULL REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
        team_id       INTEGER NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
        registered_at TIMESTAMP DEFAULT NOW(),
        registered_by INTEGER REFERENCES users(user_id),
        UNIQUE(tournament_id, team_id)
    );
    """,
]

with app.app_context():
    with db.engine.connect() as conn:
        for sql in SQL:
            try:
                conn.execute(db.text(sql))
                conn.commit()
                print(f"✅ {sql.strip()[:60]}...")
            except Exception as e:
                conn.rollback()
                print(f"   Already exists / skipped: {e}")
    print("\n✅ Done. Restart backend.")