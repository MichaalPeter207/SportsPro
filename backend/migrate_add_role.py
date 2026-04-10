# =============================================================
#  migrate_add_role.py
#  Run this ONCE to add the role column to your
#  existing users table without losing any data.
#
#  Usage: python migrate_add_role.py
# =============================================================

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from extensions import db
from sqlalchemy import text

def migrate():
    app = create_app()
    with app.app_context():
        print("Running migration: adding role column to users table...")

        with db.engine.connect() as conn:
            # Add role column if it doesn't exist
            try:
                conn.execute(text(
                    "ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'fan'"
                ))
                print("  ✓ Added column: role")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print("  — Column role already exists, skipping.")
                else:
                    print(f"  ✗ Error adding role: {e}")

            conn.commit()

        print("\nMigration complete!")
        print("You can now run the app normally.")

if __name__ == '__main__':
    migrate()