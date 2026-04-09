# =============================================================
#  routes/player.py
#  Handles player registration and stats retrieval.
#  Endpoints:
#    POST /api/players/           — add player (admin/coach)
#    GET  /api/players/           — list players
#    GET  /api/players/<id>       — get one player + stats
#    GET  /api/players/<id>/stats — get player career stats
# =============================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models.models import Player, PerformanceStat, User
from sqlalchemy import func

player_bp = Blueprint('player', __name__)


def get_current_user():
    return User.query.get(get_jwt_identity())


# -----------------------------------------------------------
# ADD PLAYER (Admin or Coach)
# -----------------------------------------------------------
@player_bp.route('/', methods=['POST'])
@jwt_required()
def add_player():
    user = get_current_user()
    if user.role not in ['admin', 'coach']:
        return jsonify({'error': 'Only admins or coaches can add players'}), 403

    data = request.get_json()
    required = ['team_id', 'first_name', 'last_name']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    player = Player(
        team_id       = data['team_id'],
        first_name    = data['first_name'],
        last_name     = data['last_name'],
        position      = data.get('position', ''),
        jersey_num    = data.get('jersey_num'),
        nationality   = data.get('nationality', ''),
        date_of_birth = data.get('date_of_birth'),
    )
    db.session.add(player)
    db.session.commit()

    return jsonify({'message': 'Player added', 'player': player.to_dict()}), 201


# -----------------------------------------------------------
# GET ALL PLAYERS (optionally filter by team)
# -----------------------------------------------------------
@player_bp.route('/', methods=['GET'])
def get_players():
    team_id = request.args.get('team_id')
    if team_id:
        players = Player.query.filter_by(team_id=team_id, is_active=True).all()
    else:
        players = Player.query.filter_by(is_active=True).all()
    return jsonify({'players': [p.to_dict() for p in players]}), 200


# -----------------------------------------------------------
# GET ONE PLAYER with career statistics
# -----------------------------------------------------------
@player_bp.route('/<int:player_id>', methods=['GET'])
def get_player(player_id):
    player = Player.query.get_or_404(player_id)

    # Aggregate career stats from performance_stats table
    career = db.session.query(
        func.sum(PerformanceStat.goals).label('total_goals'),
        func.sum(PerformanceStat.assists).label('total_assists'),
        func.count(PerformanceStat.stat_id).label('appearances'),
        func.avg(PerformanceStat.rating).label('avg_rating'),
        func.sum(PerformanceStat.yellow_cards).label('yellow_cards'),
        func.sum(PerformanceStat.red_cards).label('red_cards'),
    ).filter(PerformanceStat.player_id == player_id).first()

    data = player.to_dict()
    data['career_stats'] = {
        'total_goals':   int(career.total_goals or 0),
        'total_assists': int(career.total_assists or 0),
        'appearances':   int(career.appearances or 0),
        'avg_rating':    round(float(career.avg_rating or 0), 2),
        'yellow_cards':  int(career.yellow_cards or 0),
        'red_cards':     int(career.red_cards or 0),
    }

    return jsonify({'player': data}), 200


# -----------------------------------------------------------
# GET PLAYER MATCH-BY-MATCH STATS
# -----------------------------------------------------------
@player_bp.route('/<int:player_id>/stats', methods=['GET'])
def get_player_stats(player_id):
    stats = PerformanceStat.query.filter_by(player_id=player_id).all()
    return jsonify({'stats': [s.to_dict() for s in stats]}), 200