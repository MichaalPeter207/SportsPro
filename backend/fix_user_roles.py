"""
fix_user_roles.py
=================
Run this once to repair the user_roles table.

Problem: Some users have a role in the `users.role` column
but NO matching row in `user_roles`. This causes can_manage()
to return False even for coaches/admins.

Fix: For every user, make sure user_roles has at least one row
matching their users.role value.

Usage:
  cd C:\\sports_league_system\\backend
  python fix_user_roles.py
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from extensions import db
from models.models import User, UserRole

app = create_app()

with app.app_context():
    users = User.query.all()
    fixed = 0

    for user in users:
        # Get all roles currently in user_roles table
        existing_roles = [r.role for r in UserRole.query.filter_by(user_id=user.user_id).all()]

        if not existing_roles:
            # No rows at all — add from users.role column
            db.session.add(UserRole(user_id=user.user_id, role=user.role))
            print(f"  Fixed {user.username}: added role '{user.role}'")
            fixed += 1
        elif user.role not in existing_roles:
            # Primary role missing from user_roles — add it
            db.session.add(UserRole(user_id=user.user_id, role=user.role))
            print(f"  Fixed {user.username}: synced primary role '{user.role}'")
            fixed += 1
        else:
            print(f"  OK    {user.username}: {existing_roles}")

    db.session.commit()
    print(f"\n✅ Done. Fixed {fixed} user(s).")
    print("\nCurrent state:")
    for user in users:
        roles = [r.role for r in UserRole.query.filter_by(user_id=user.user_id).all()]
        print(f"  {user.username} ({user.role}) → user_roles: {roles}")