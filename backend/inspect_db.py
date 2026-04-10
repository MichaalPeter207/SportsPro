import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from extensions import db
from sqlalchemy import text

def inspect_database():
    app = create_app()
    with app.app_context():
        print("Inspecting Neon Database Schema...")
        print("=" * 50)

        with db.engine.connect() as conn:
            # Get all tables
            result = conn.execute(text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
            """))
            tables = [row[0] for row in result]

            print(f"Tables found: {len(tables)}")
            print("Tables:", ", ".join(tables))
            print()

            # For each table, get columns
            for table in tables:
                print(f"Table: {table}")
                print("-" * 20)

                columns_result = conn.execute(text("""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_name = :table AND table_schema = 'public'
                    ORDER BY ordinal_position
                """), {"table": table})

                for col in columns_result:
                    nullable = "NULL" if col[2] == 'YES' else "NOT NULL"
                    default = f" DEFAULT {col[3]}" if col[3] else ""
                    print(f"  {col[0]} {col[1]} {nullable}{default}")

                print()

if __name__ == '__main__':
    inspect_database()