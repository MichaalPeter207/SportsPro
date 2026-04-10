# =============================================================
#  routes/prediction.py
#  Connects the XGBoost ML model to the REST API.
#  Endpoints:
#    POST /api/predictions/predict  — predict a match outcome
#    GET  /api/predictions/match/<id> — get stored prediction
#    GET  /api/predictions/          — list all predictions
# =============================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models.models import Prediction, Match, PerformanceStat, User
import joblib
import numpy as np
import os

prediction_bp = Blueprint('prediction', __name__)

# Path to the saved XGBoost model
MODEL_PATH = os.path.join(os.path.dirname(__file__), '../../machine_learning/saved_models/xgboost_model.pkl')


def get_current_user():
    return User.query.get(get_jwt_identity())


def load_model():
    """Load the trained XGBoost model from disk"""
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return None


def compute_team_features(team_id, season_id):
    """
    Calculate prediction features for a team:
    - Recent form (last 5 matches)
    - Average goals scored and conceded
    - Average player rating
    """
    from models.models import Match as MatchModel
    from sqlalchemy import or_

    # Get last 5 completed matches for this team
    recent = MatchModel.query.filter(
        MatchModel.season_id == season_id,
        MatchModel.status == 'completed',
        or_(MatchModel.home_team_id == team_id, MatchModel.away_team_id == team_id)
    ).order_by(MatchModel.match_date.desc()).limit(5).all()

    wins = draws = losses = goals_for = goals_against = 0

    for m in recent:
        if m.home_team_id == team_id:
            gf, ga = m.home_score, m.away_score
        else:
            gf, ga = m.away_score, m.home_score

        goals_for     += gf
        goals_against += ga

        if gf > ga:   wins   += 1
        elif gf == ga: draws  += 1
        else:          losses += 1

    n = len(recent) or 1  # Avoid division by zero
    form_score = (wins * 3 + draws * 1) / (n * 3)  # Normalized 0-1

    # Average player rating for this team
    avg_rating_result = db.session.query(
        db.func.avg(PerformanceStat.rating)
    ).filter(PerformanceStat.team_id == team_id).scalar()

    avg_rating = float(avg_rating_result or 7.0)

    return {
        'form':           form_score,
        'avg_goals_for':  goals_for / n,
        'avg_goals_agst': goals_against / n,
        'goal_diff':      (goals_for - goals_against) / n,
        'avg_rating':     avg_rating,
    }


# -----------------------------------------------------------
# PREDICT MATCH OUTCOME (Analyst or Admin)
# -----------------------------------------------------------
@prediction_bp.route('/predict', methods=['POST'])
@jwt_required()
def predict_match():
    user = get_current_user()
    if user.role not in ['analyst', 'admin']:
        return jsonify({'error': 'Only analysts can generate predictions'}), 403

    data     = request.get_json()
    match_id = data.get('match_id')
    if not match_id:
        return jsonify({'error': 'match_id is required'}), 400

    match = Match.query.get_or_404(match_id)

    # Compute features for home and away teams
    home_f = compute_team_features(match.home_team_id, match.season_id)
    away_f = compute_team_features(match.away_team_id, match.season_id)

    # Build feature vector for the model
    # Features: home_form, home_goal_diff, home_rating, away_form, away_goal_diff, away_rating, home_advantage
    features = np.array([[
        home_f['form'],
        home_f['goal_diff'],
        home_f['avg_rating'],
        away_f['form'],
        away_f['goal_diff'],
        away_f['avg_rating'],
        1.0,  # Home advantage (home team always gets 1)
    ]])

    model = load_model()

    if model:
        # Use the trained XGBoost model
        probs = model.predict_proba(features)[0]
        # Model classes: 0=away_win, 1=draw, 2=home_win
        away_prob = float(probs[0])
        draw_prob  = float(probs[1])
        home_prob  = float(probs[2])
    else:
        # Fallback: rule-based prediction if model not yet trained
        total = home_f['form'] + away_f['form'] + 0.1
        home_prob  = (home_f['form'] + 0.1) / (total + 0.1)
        away_prob  = away_f['form'] / (total + 0.1)
        draw_prob  = 1 - home_prob - away_prob
        draw_prob  = max(draw_prob, 0.05)

    # Normalize so probabilities sum to 1
    total_prob = home_prob + away_prob + draw_prob
    home_prob /= total_prob
    away_prob /= total_prob
    draw_prob /= total_prob

    # Determine most likely outcome
    if home_prob >= away_prob and home_prob >= draw_prob:
        outcome = 'home'
    elif away_prob >= home_prob and away_prob >= draw_prob:
        outcome = 'away'
    else:
        outcome = 'draw'

    # Save or update prediction in database
    existing = Prediction.query.filter_by(match_id=match_id).first()
    if existing:
        existing.home_win_prob     = float(round(home_prob, 4))
        existing.away_win_prob     = float(round(away_prob, 4))
        existing.draw_prob         = float(round(draw_prob, 4))
        existing.predicted_outcome = outcome
        pred = existing
    else:
        pred = Prediction(
            match_id          = match_id,
            home_win_prob     = float(round(home_prob, 4)),
            away_win_prob     = float(round(away_prob, 4)),
            draw_prob         = float(round(draw_prob, 4)),
            predicted_outcome = outcome,
        )
        db.session.add(pred)

    db.session.commit()

    return jsonify({
        'message':    'Prediction generated',
        'prediction': pred.to_dict(),
        'home_team':  match.home_team.team_name,
        'away_team':  match.away_team.team_name,
    }), 200


# -----------------------------------------------------------
# GET PREDICTION FOR A MATCH
# -----------------------------------------------------------
@prediction_bp.route('/match/<int:match_id>', methods=['GET'])
def get_prediction(match_id):
    pred = Prediction.query.filter_by(match_id=match_id).first()
    if not pred:
        return jsonify({'error': 'No prediction found for this match'}), 404
    return jsonify({'prediction': pred.to_dict()}), 200


# -----------------------------------------------------------
# GET ALL PREDICTIONS
# -----------------------------------------------------------
@prediction_bp.route('/', methods=['GET'])
def get_all_predictions():
    preds = Prediction.query.order_by(Prediction.predicted_at.desc()).all()
    return jsonify({'predictions': [p.to_dict() for p in preds]}), 200