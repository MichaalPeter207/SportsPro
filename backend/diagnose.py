#!/usr/bin/env python3
"""Diagnostic script to check database state"""
import sys
from app import create_app, db
from models.models import Match, Prediction, Tournament

app = create_app()

with app.app_context():
    try:
        print("Database Diagnostics")
        print("=" * 60)
        
        # Check tournaments
        tourns = Tournament.query.all()
        print(f"\nTournaments: {len(tourns)}")
        for t in tourns[:3]:
            print(f"  - ID {t.tournament_id}: {t.title}")
        
        # Check matches
        matches = Match.query.all()
        print(f"\nMatches: {len(matches)}")
        if matches:
            print(f"  First 3 matches:")
            for m in matches[:3]:
                try:
                    print(f"    - ID {m.match_id}: {m.home_team.team_name} vs {m.away_team.team_name}")
                except Exception as e:
                    print(f"    - ID {m.match_id}: Error accessing teams - {e}")
        
        # Check predictions
        preds = Prediction.query.all()
        print(f"\nPredictions: {len(preds)}")
        if preds:
            print(f"  First 3 predictions:")
            for p in preds[:3]:
                print(f"    - ID {p.prediction_id}: Match {p.match_id}, "
                      f"Home P={p.home_win_prob} (type: {type(p.home_win_prob).__name__}), "
                      f"Away P={p.away_win_prob}, Draw P={p.draw_prob}")
        
        # Try to serialize a match to see if to_dict works
        print(f"\nTesting match serialization:")
        if matches:
            m = matches[0]
            try:
                md = m.to_dict()
                print(f"✓ Successfully serialized match {m.match_id}")
            except Exception as e:
                print(f"✗ Error serializing match {m.match_id}: {e}")
                import traceback
                traceback.print_exc()
        
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
