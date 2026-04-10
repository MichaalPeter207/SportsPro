import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from extensions import db

app = create_app()
with app.app_context():
    # Check alembic_version table
    with db.engine.connect() as conn:
        from sqlalchemy import text
        try:
            result = conn.execute(text("SELECT version_num FROM alembic_version"))
            versions = result.fetchall()
            print("Current versions in database:")
            for v in versions:
                print(f"  - {v[0]}")
            
            # Clear the table
            conn.execute(text("DELETE FROM alembic_version"))
            conn.commit()
            print("\nCleared alembic_version table")
            
            # Insert baseline
            conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('0001')"))
            conn.commit()
            print("Set version to 0001")
        except Exception as e:
            print(f"Error: {e}")
