import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    with db.engine.connect() as conn:
        # Check leagues table structure
        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'leagues' AND table_schema = 'public'
            ORDER BY ordinal_position
        """))
        
        print("Leagues table structure:")
        for row in result:
            nullable = "NULL" if row[2] == "YES" else "NOT NULL"
            print(f"  {row[0]}: {row[1]} {nullable}")
