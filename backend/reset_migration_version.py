import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from extensions import db
from sqlalchemy import text

def reset_migration():
    app = create_app()
    with app.app_context():
        print("Resetting migration version...")

        with db.engine.connect() as conn:
            # Check if alembic_version table exists
            try:
                result = conn.execute(text("""
                    SELECT version_num FROM alembic_version
                """))
                current_version = result.scalar()
                print(f"Current version in DB: {current_version}")
                
                # Delete old version
                conn.execute(text("DELETE FROM alembic_version"))
                
                # Insert new baseline version
                conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('0001')"))
                conn.commit()
                print("Reset to version 0001")
            except Exception as e:
                print(f"Error: {e}")
                # Table might not exist, that's ok

if __name__ == '__main__':
    reset_migration()
