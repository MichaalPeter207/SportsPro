# =============================================================
#  create_admin.py
#  Run this ONCE to create the first admin account.
#  Usage: python create_admin.py
# =============================================================

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db, bcrypt
from models.models import User

def create_admin():
    app = create_app()

    with app.app_context():
        print("=" * 45)
        print("  SPORTSPRO — ADMIN ACCOUNT SETUP")
        print("=" * 45)

        # Check if admin already exists
        existing = User.query.filter_by(username='admin').first()
        if existing:
            print("\nAdmin account already exists!")
            print(f"Username: admin")
            print(f"Role:     {existing.role}")
            print("\nIf you forgot your password, delete the")
            print("admin row in the database and run this again.")
            return

        # Get admin details
        print("\nEnter details for the admin account:\n")
        first_name = input("First Name: ").strip() or "System"
        last_name  = input("Last Name:  ").strip() or "Admin"
        email      = input("Email:      ").strip() or "admin@sportsleague.com"
        password   = input("Password:   ").strip()

        if not password:
            print("\nERROR: Password cannot be empty.")
            return

        # Hash the password
        hashed = bcrypt.generate_password_hash(password).decode('utf-8')

        admin = User(
            username      = 'admin',
            email         = email,
            password_hash = hashed,
            role          = 'admin',
            first_name    = first_name,
            last_name     = last_name,
        )

        db.session.add(admin)
        db.session.commit()

        print("\n" + "=" * 45)
        print("  ADMIN ACCOUNT CREATED SUCCESSFULLY!")
        print("=" * 45)
        print(f"\n  Username: admin")
        print(f"  Role:     admin")
        print(f"\n  You can now log in at http://localhost:3000")
        print("=" * 45)

if __name__ == '__main__':
    create_admin()