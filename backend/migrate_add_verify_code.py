# =============================================================
#  migrate_add_verify_code.py
#  Run this ONCE to add the new verify_code columns to your
#  existing users table without losing any data.
#
#  Usage: python migrate_add_verify_code.py
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
        print("Running migration: adding verify_code columns to users table...")

        with db.engine.connect() as conn:
            # Add verify_code column if it doesn't exist
            try:
                conn.execute(text(
                    "ALTER TABLE users ADD COLUMN verify_code VARCHAR(6)"
                ))
                print("  ✓ Added column: verify_code")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print("  — Column verify_code already exists, skipping.")
                else:
                    print(f"  ✗ Error adding verify_code: {e}")

            # Add verify_code_expires column if it doesn't exist
            try:
                conn.execute(text(
                    "ALTER TABLE users ADD COLUMN verify_code_expires TIMESTAMP"
                ))
                print("  ✓ Added column: verify_code_expires")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print("  — Column verify_code_expires already exists, skipping.")
                else:
                    print(f"  ✗ Error adding verify_code_expires: {e}")

            conn.commit()

        print("\nMigration complete!")
        print("You can now run the app normally.")

if __name__ == '__main__':
    migrate()