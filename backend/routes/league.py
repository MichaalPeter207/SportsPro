# =============================================================
#  routes/league.py
#  Handles league and season management.
#  Endpoints:
#    POST /api/leagues/          — create league (admin only)
#    GET  /api/leagues/          — list all leagues
#    GET  /api/leagues/<id>      — get one league
#    POST /api/leagues/<id>/seasons — create a season
#    GET  /api/leagues/<id>/standings — get standings
# =============================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models.models import League, Season, User
from sqlalchemy import text

league_bp = Blueprint('league', __name__)


def get_current_user():
    user_id = get_jwt_identity()
    return User.query.get(user_id)


# -----------------------------------------------------------
# CREATE LEAGUE (Admin only)
# -----------------------------------------------------------
@league_bp.route('/', methods=['POST'])
@jwt_required()
def create_league():
    user = get_current_user()
    if user.role != 'admin':
        return jsonify({'error': 'Only admins can create leagues'}), 403

    data = request.get_json()
    if not data.get('league_name'):
        return jsonify({'error': 'League name is required'}), 400

    league = League(
        league_name = data['league_name'],
        sport_type  = data.get('sport_type', 'Football'),
        country     = data.get('country', ''),
        description = data.get('description', ''),
        created_by  = user.user_id,
    )
    db.session.add(league)
    db.session.commit()

    return jsonify({'message': 'League created', 'league': league.to_dict()}), 201


# -----------------------------------------------------------
# GET ALL LEAGUES
# -----------------------------------------------------------
@league_bp.route('/', methods=['GET'])
def get_leagues():
    leagues = League.query.all()
    return jsonify({'leagues': [l.to_dict() for l in leagues]}), 200


# -----------------------------------------------------------
# GET ONE LEAGUE
# -----------------------------------------------------------
@league_bp.route('/<int:league_id>', methods=['GET'])
def get_league(league_id):
    league = League.query.get_or_404(league_id)
    data = league.to_dict()
    data['teams'] = [t.to_dict() for t in league.teams]
    return jsonify({'league': data}), 200


# -----------------------------------------------------------
# CREATE SEASON (Admin only)
# -----------------------------------------------------------
@league_bp.route('/<int:league_id>/seasons', methods=['POST'])
@jwt_required()
def create_season(league_id):
    user = get_current_user()
    if user.role != 'admin':
        return jsonify({'error': 'Only admins can create seasons'}), 403

    data = request.get_json()
    required = ['season_name', 'start_date', 'end_date']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    season = Season(
        league_id   = league_id,
        season_name = data['season_name'],
        start_date  = data['start_date'],
        end_date    = data['end_date'],
    )
    db.session.add(season)
    db.session.commit()

    return jsonify({'message': 'Season created', 'season': season.to_dict()}), 201


# -----------------------------------------------------------
# GET LEAGUE STANDINGS
# Reads from the league_standings view in PostgreSQL
# -----------------------------------------------------------
@league_bp.route('/<int:league_id>/standings', methods=['GET'])
def get_standings(league_id):
    league = League.query.get_or_404(league_id)

    sql = text("""
        SELECT * FROM league_standings
        WHERE league_name = :name
        ORDER BY points DESC, goals_for DESC
    """)
    results = db.session.execute(sql, {'name': league.league_name}).fetchall()

    standings = []
    for row in results:
        standings.append({
            'team_id':       row.team_id,
            'team_name':     row.team_name,
            'played':        row.played,
            'wins':          row.wins,
            'draws':         row.draws,
            'losses':        row.losses,
            'goals_for':     row.goals_for,
            'goals_against': row.goals_against,
            'goal_diff':     row.goals_for - row.goals_against,
            'points':        row.points,
        })

    return jsonify({'standings': standings, 'league': league.league_name}), 200