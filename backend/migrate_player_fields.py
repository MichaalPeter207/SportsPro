"""
migrate_player_fields.py
Run once to add height_cm and weight_kg columns to players table.

  cd C:\\sports_league_system\\backend
  python migrate_player_fields.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from extensions import db

app = create_app()

with app.app_context():
    conn = db.engine.connect()
    
    # Check and add height_cm
    try:
        conn.execute(db.text("ALTER TABLE players ADD COLUMN height_cm INTEGER"))
        print("✅ Added height_cm")
    except Exception as e:
        print(f"   height_cm already exists or error: {e}")

    # Check and add weight_kg
    try:
        conn.execute(db.text("ALTER TABLE players ADD COLUMN weight_kg INTEGER"))
        print("✅ Added weight_kg")
    except Exception as e:
        print(f"   weight_kg already exists or error: {e}")

    conn.close()
    print("\nDone. Restart backend.")