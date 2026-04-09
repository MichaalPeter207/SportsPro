# =============================================================
#  machine_learning/predict.py
#  Standalone Prediction Script
#
#  Uses the trained XGBoost model to predict a match outcome.
#  This is also used by the Flask backend API.
#
#  Run: python predict.py
# =============================================================

import os
import joblib
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'saved_models', 'xgboost_model.pkl')


def load_model():
    """Load the trained model from disk."""
    if not os.path.exists(MODEL_PATH):
        print("ERROR: Model not found. Run train_model.py first.")
        return None
    return joblib.load(MODEL_PATH)


def predict_match(home_form, home_goal_diff, home_rating,
                  away_form, away_goal_diff, away_rating):
    """
    Predict the outcome of a match given team features.

    Parameters:
    -----------
    home_form       : float (0-1)  Recent win rate of home team
    home_goal_diff  : float        Average goal difference of home team
    home_rating     : float (1-10) Average player rating of home team
    away_form       : float (0-1)  Recent win rate of away team
    away_goal_diff  : float        Average goal difference of away team
    away_rating     : float (1-10) Average player rating of away team

    Returns:
    --------
    dict with probabilities and predicted outcome
    """
    model = load_model()
    if model is None:
        # Return fallback prediction if model not available
        return {
            'home_win_prob':     0.45,
            'draw_prob':         0.25,
            'away_win_prob':     0.30,
            'predicted_outcome': 'home',
            'model_used':        'fallback'
        }

    # Build feature array (must match training order)
    features = np.array([[
        home_form,
        home_goal_diff,
        home_rating,
        away_form,
        away_goal_diff,
        away_rating,
        1.0,   # home_advantage — always 1 for the home team
    ]])

    # Get probability for each outcome
    # Classes: 0=away win, 1=draw, 2=home win
    probs = model.predict_proba(features)[0]

    away_prob = float(probs[0])
    draw_prob  = float(probs[1])
    home_prob  = float(probs[2])

    # Determine predicted outcome
    max_prob = max(home_prob, draw_prob, away_prob)
    if max_prob == home_prob:
        outcome = 'home'
    elif max_prob == away_prob:
        outcome = 'away'
    else:
        outcome = 'draw'

    return {
        'home_win_prob':     round(home_prob, 4),
        'draw_prob':         round(draw_prob, 4),
        'away_win_prob':     round(away_prob, 4),
        'predicted_outcome': outcome,
        'model_used':        'xgboost'
    }


if __name__ == '__main__':
    print("=" * 50)
    print("  MATCH OUTCOME PREDICTION TEST")
    print("=" * 50)

    # Example 1: Strong home team vs weak away team
    print("\nExample 1: Strong home team vs weak away team")
    result = predict_match(
        home_form=0.8, home_goal_diff=1.5, home_rating=8.0,
        away_form=0.3, away_goal_diff=-0.5, away_rating=6.5
    )
    print(f"  Home Win:  {result['home_win_prob']*100:.1f}%")
    print(f"  Draw:      {result['draw_prob']*100:.1f}%")
    print(f"  Away Win:  {result['away_win_prob']*100:.1f}%")
    print(f"  Prediction: {result['predicted_outcome'].upper()} WIN")

    # Example 2: Evenly matched teams
    print("\nExample 2: Evenly matched teams")
    result = predict_match(
        home_form=0.5, home_goal_diff=0.2, home_rating=7.0,
        away_form=0.5, away_goal_diff=0.1, away_rating=7.1
    )
    print(f"  Home Win:  {result['home_win_prob']*100:.1f}%")
    print(f"  Draw:      {result['draw_prob']*100:.1f}%")
    print(f"  Away Win:  {result['away_win_prob']*100:.1f}%")
    print(f"  Prediction: {result['predicted_outcome'].upper()}")

    # Example 3: Strong away team
    print("\nExample 3: Strong away team")
    result = predict_match(
        home_form=0.3, home_goal_diff=-1.0, home_rating=6.0,
        away_form=0.9, away_goal_diff=2.0, away_rating=9.0
    )
    print(f"  Home Win:  {result['home_win_prob']*100:.1f}%")
    print(f"  Draw:      {result['draw_prob']*100:.1f}%")
    print(f"  Away Win:  {result['away_win_prob']*100:.1f}%")
    print(f"  Prediction: {result['predicted_outcome'].upper()} WIN")