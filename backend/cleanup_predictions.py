#!/usr/bin/env python3
"""Clean up corrupted predictions from the database"""
import sys
from app import create_app, db
from models.models import Prediction, Match

app = create_app()

with app.app_context():
    try:
        print("Deleting all predictions to allow regeneration with fixed code...")
        
        # Delete all predictions
        count = Prediction.query.delete()
        db.session.commit()
        print(f"✓ Deleted {count} predictions")
        
        # Verify deletion
        remaining = Prediction.query.count()
        print(f"✓ Remaining predictions: {remaining}")
        
        if remaining == 0:
            print("\n✓ Database cleaned successfully!")
            sys.exit(0)
        else:
            print("\n✗ Some predictions remain - cleanup may have failed")
            sys.exit(1)
            
    except Exception as e:
        print(f"✗ Error during cleanup: {e}")
        db.session.rollback()
        sys.exit(1)
