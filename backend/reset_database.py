"""
reset_database.py
=================
Safely wipes data from the sports_league database so you can test fresh.

USAGE:
  cd C:\\sports_league_system\\backend

  # Option 1 — wipe only match/tournament/stats data (keep users & teams)
  python reset_database.py --mode=soft

  # Option 2 — wipe EVERYTHING except user accounts
  python reset_database.py --mode=hard

  # Option 3 — wipe ABSOLUTELY EVERYTHING (full factory reset)
  python reset_database.py --mode=nuke
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from extensions import db

app = create_app()

MODE = "soft"
for arg in sys.argv[1:]:
    if arg.startswith("--mode="):
        MODE = arg.split("=")[1].strip()

MODES = {
    "soft": "Match data, tournament data, stats, predictions (keep users & teams & players)",
    "hard": "Everything except user accounts",
    "nuke": "EVERYTHING — full factory reset",
}

if MODE not in MODES:
    print(f"Unknown mode: {MODE}. Use --mode=soft, --mode=hard, or --mode=nuke")
    sys.exit(1)

print(f"\n{'='*55}")
print(f"  SPORTS LEAGUE DATABASE RESET")
print(f"  Mode : {MODE.upper()}")
print(f"  Scope: {MODES[MODE]}")
print(f"{'='*55}\n")

confirm = input("Type YES to confirm: ").strip()
if confirm != "YES":
    print("Cancelled.")
    sys.exit(0)

# SQL statements ordered to respect foreign key constraints
SOFT = [
    "DELETE FROM performance_stats;",
    "DELETE FROM predictions;",
    "DELETE FROM tournament_coaches;",
    "UPDATE matches SET tournament_id = NULL;",
    "DELETE FROM matches;",
    "DELETE FROM tournaments;",
]

HARD = SOFT + [
    "DELETE FROM players;",
    "DELETE FROM teams;",
    "DELETE FROM seasons;",
    "DELETE FROM leagues;",
]

NUKE = HARD + [
    "DELETE FROM notifications;",
    "DELETE FROM user_roles;",
    "UPDATE users SET role = 'fan';",  # safety reset
    # re-apply admin roles after
    "DELETE FROM users;",
]

STATEMENTS = {"soft": SOFT, "hard": HARD, "nuke": NUKE}

with app.app_context():
    with db.engine.connect() as conn:
        # Disable FK checks temporarily for clean deletion
        conn.execute(db.text("SET session_replication_role = replica;"))
        conn.commit()

        errors = []
        for sql in STATEMENTS[MODE]:
            try:
                result = conn.execute(db.text(sql))
                conn.commit()
                rows = result.rowcount if result.rowcount >= 0 else "?"
                print(f"  ✅  {sql[:55]:<55}  ({rows} rows)")
            except Exception as e:
                conn.rollback()
                errors.append((sql, str(e)))
                print(f"  ❌  {sql[:55]:<55}  ERROR: {e}")

        # Re-enable FK checks
        conn.execute(db.text("SET session_replication_role = DEFAULT;"))
        conn.commit()

    print(f"\n{'='*55}")
    if errors:
        print(f"  ⚠️  Completed with {len(errors)} error(s).")
        for sql, err in errors:
            print(f"     {sql[:50]} → {err}")
    else:
        print(f"  ✅  Reset complete — {MODE.upper()} mode succeeded.")

    if MODE == "nuke":
        print("\n  ℹ️  All data wiped. Register a new admin account to get started.")
    elif MODE == "hard":
        print("\n  ℹ️  Match/team/tournament data wiped. User accounts preserved.")
        print("  ℹ️  You can now create leagues, seasons, teams and tournaments fresh.")
    else:
        print("\n  ℹ️  Match/tournament data wiped. Users, teams and players preserved.")
        print("  ℹ️  Create a new tournament and start adding matches.")

    print(f"{'='*55}\n")
    print("  Restart the backend: python app.py\n")