# =============================================================
#  routes/team.py
#  - Coach can only edit their own teams/players
#  - Team name stored with original casing but matched case-insensitively
#  - coach_id auto-set on team creation
# =============================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, or_
from extensions import db
from models.models import Team, Player, User, UserRole, Match, TournamentTeam, PerformanceStat
from datetime import datetime
from utils.permissions import can_manage, is_admin

team_bp = Blueprint('team', __name__)


def get_current_user():
    uid = get_jwt_identity()
    if not uid: return None
    return db.session.get(User, int(uid))


# can_manage, is_admin imported from utils.permissions


def owns_team(user, team):
    if not user: return False
    if is_admin(user): return True
    return team.coach_id == user.user_id


def owns_player(user, player):
    if not user: return False
    if is_admin(user): return True
    team = db.session.get(Team, player.team_id)
    return team and team.coach_id == user.user_id


# -----------------------------------------------------------
# REGISTER TEAM
# POST /api/teams/
# -----------------------------------------------------------
@team_bp.route('/', methods=['POST'])
@jwt_required()
def create_team():
    user = get_current_user()
    if not can_manage(user):
        return jsonify({'error': 'Only coaches or admins can register teams'}), 403

    data = request.get_json()
    if not data.get('team_name') or not str(data['team_name']).strip():
        return jsonify({'error': 'team_name is required'}), 400

    league_id = data.get('league_id')
    if not league_id:
        from models.models import League, Season
        from datetime import datetime as dt
        league = League.query.first()
        if not league:
            # Auto-create a default league so coaches don't need admin help
            league = League(
                league_name='University Sports League',
                sport_type='Football',
                created_by=user.user_id,
            )
            db.session.add(league)
            db.session.flush()
            # Also auto-create a default season
            yr = dt.utcnow().year
            season = Season(
                league_id=league.league_id,
                season_name=f'Season {yr}',
                start_date=dt(yr, 1, 1).date(),
                end_date=dt(yr, 12, 31).date(),
            )
            db.session.add(season)
            db.session.flush()
        league_id = league.league_id

    team = Team(
        league_id  = league_id,
        team_name  = data['team_name'].strip(),
        department = (data.get('department') or '').strip(),
        home_city  = (data.get('home_city')  or '').strip(),
        stadium    = (data.get('stadium')    or '').strip(),
        founded    = data.get('founded'),
        # Admin can override coach_id; coaches always own their own teams
        coach_id   = data.get('coach_id') if is_admin(user) else user.user_id,
    )
    db.session.add(team)
    db.session.commit()
    return jsonify({'message': 'Team registered', 'team': team.to_dict()}), 201


# -----------------------------------------------------------
# GET ALL TEAMS
# GET /api/teams/
# -----------------------------------------------------------
@team_bp.route('/', methods=['GET'])
@jwt_required(optional=True)
def get_teams():
    from flask_jwt_extended import get_jwt_identity
    uid = get_jwt_identity()
    user = db.session.get(User, int(uid)) if uid else None

    league_id = request.args.get('league_id')

    if is_admin(user):
        # Admin sees all teams
        teams = Team.query.filter_by(league_id=int(league_id)).all() \
                if league_id else Team.query.all()
    elif user:
        # Coach sees only their own teams
        q = Team.query.filter_by(coach_id=user.user_id)
        if league_id:
            q = q.filter_by(league_id=int(league_id))
        teams = q.all()
    else:
        # Unauthenticated: no teams
        teams = []

    return jsonify({'teams': [t.to_dict() for t in teams]}), 200


# -----------------------------------------------------------
# GET ONE TEAM WITH PLAYERS
# GET /api/teams/<id>
# -----------------------------------------------------------
@team_bp.route('/<int:team_id>', methods=['GET'])
def get_team(team_id):
    team    = db.session.get(Team, team_id)
    if not team: return jsonify({'error': 'Team not found'}), 404
    players = Player.query.filter_by(team_id=team_id, is_active=True).all()
    data    = team.to_dict()
    data['players'] = [p.to_dict() for p in players]
    return jsonify({'team': data}), 200


# -----------------------------------------------------------
# UPDATE TEAM
# PUT /api/teams/<id>
# -----------------------------------------------------------
@team_bp.route('/<int:team_id>', methods=['PUT'])
@jwt_required()
def update_team(team_id):
    user = get_current_user()
    if not can_manage(user):
        return jsonify({'error': 'Permission denied'}), 403

    team = db.session.get(Team, team_id)
    if not team: return jsonify({'error': 'Team not found'}), 404

    if not owns_team(user, team):
        return jsonify({'error': 'You can only edit your own teams'}), 403

    data = request.get_json()
    if data.get('team_name'):  team.team_name  = data['team_name'].strip()
    if data.get('department') is not None: team.department = data['department'].strip()
    if data.get('home_city')  is not None: team.home_city  = data['home_city'].strip()
    if data.get('stadium')    is not None: team.stadium    = data['stadium'].strip()
    if data.get('founded'):    team.founded    = data['founded']
    db.session.commit()
    return jsonify({'message': 'Team updated', 'team': team.to_dict()}), 200


# -----------------------------------------------------------
# DELETE TEAM
# DELETE /api/teams/<id>
# -----------------------------------------------------------
@team_bp.route('/<int:team_id>', methods=['DELETE'])
@jwt_required()
def delete_team(team_id):
    user = get_current_user()
    if not can_manage(user):
        return jsonify({'error': 'Permission denied'}), 403

    team = db.session.get(Team, team_id)
    if not team:
        return jsonify({'error': 'Team not found'}), 404

    if not owns_team(user, team):
        return jsonify({'error': 'You can only delete your own teams'}), 403

    # Prevent delete if matches exist
    has_matches = Match.query.filter(
        or_(Match.home_team_id == team_id, Match.away_team_id == team_id)
    ).count()
    if has_matches:
        return jsonify({'error': 'Cannot delete a team that already has matches'}), 409

    # Clean related records
    TournamentTeam.query.filter_by(team_id=team_id).delete(synchronize_session=False)
    PerformanceStat.query.filter_by(team_id=team_id).delete(synchronize_session=False)
    Player.query.filter_by(team_id=team_id).delete(synchronize_session=False)

    db.session.delete(team)
    db.session.commit()

    return jsonify({'message': f'Team "{team.team_name}" deleted'}), 200


# -----------------------------------------------------------
# REGISTER PLAYER
# POST /api/teams/<id>/players
# -----------------------------------------------------------
@team_bp.route('/<int:team_id>/players', methods=['POST'])
@jwt_required()
def add_player(team_id):
    user = get_current_user()
    if not can_manage(user):
        return jsonify({'error': 'Only coaches or admins can register players'}), 403

    team = db.session.get(Team, team_id)
    if not team: return jsonify({'error': 'Team not found'}), 404

    if not owns_team(user, team):
        return jsonify({'error': 'You can only register players to your own teams'}), 403

    data = request.get_json()
    if not data.get('first_name') or not data.get('last_name'):
        return jsonify({'error': 'first_name and last_name are required'}), 400

    def _to_int_or_none(v):
        if v is None:
            return None
        if isinstance(v, str) and not v.strip():
            return None
        try:
            return int(v)
        except (TypeError, ValueError):
            return None

    dob = None
    if data.get('date_of_birth'):
        try: dob = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
        except ValueError: pass

    player = Player(
        team_id       = team_id,
        first_name    = data['first_name'].strip(),
        last_name     = data['last_name'].strip(),
        position      = (data.get('position') or '').strip(),
        jersey_num    = _to_int_or_none(data.get('jersey_num')),
        nationality   = (data.get('nationality') or '').strip(),
        date_of_birth = dob,
        height_cm     = _to_int_or_none(data.get('height_cm')),
        weight_kg     = _to_int_or_none(data.get('weight_kg')),
    )
    db.session.add(player)
    db.session.commit()
    return jsonify({'message': 'Player registered', 'player': player.to_dict()}), 201


# -----------------------------------------------------------
# GET PLAYERS FOR TEAM
# GET /api/teams/<id>/players
# -----------------------------------------------------------
@team_bp.route('/<int:team_id>/players', methods=['GET'])
@jwt_required(optional=True)
def get_players(team_id):
    from flask_jwt_extended import get_jwt_identity
    uid  = get_jwt_identity()
    user = db.session.get(User, int(uid)) if uid else None
    team = db.session.get(Team, team_id)
    if not team:
        return jsonify({'players': []}), 200
    # Only team owner or admin can see players
    if user and (is_admin(user) or team.coach_id == user.user_id):
        players = Player.query.filter_by(team_id=team_id, is_active=True).all()
    else:
        players = []
    return jsonify({'players': [p.to_dict() for p in players]}), 200


# -----------------------------------------------------------
# UPDATE PLAYER
# PUT /api/teams/<id>/players/<pid>
# -----------------------------------------------------------
@team_bp.route('/<int:team_id>/players/<int:player_id>', methods=['PUT'])
@jwt_required()
def update_player(team_id, player_id):
    user = get_current_user()
    if not can_manage(user):
        return jsonify({'error': 'Permission denied'}), 403

    player = Player.query.filter_by(player_id=player_id, team_id=team_id).first_or_404()
    if not owns_player(user, player):
        return jsonify({'error': 'You can only edit players in your own teams'}), 403

    data = request.get_json()
    if data.get('first_name'):  player.first_name  = data['first_name'].strip()
    if data.get('last_name'):   player.last_name   = data['last_name'].strip()
    if data.get('position') is not None:   player.position    = data['position'].strip()
    if data.get('jersey_num') is not None: player.jersey_num  = data['jersey_num']
    if data.get('nationality') is not None: player.nationality = data['nationality'].strip()
    if data.get('height_cm') is not None:  player.height_cm   = data['height_cm']
    if data.get('weight_kg') is not None:  player.weight_kg   = data['weight_kg']
    if data.get('date_of_birth'):
        try: player.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
        except ValueError: pass
    db.session.commit()
    return jsonify({'message': 'Player updated', 'player': player.to_dict()}), 200


# -----------------------------------------------------------
# DEACTIVATE PLAYER
# DELETE /api/teams/<id>/players/<pid>
# -----------------------------------------------------------
@team_bp.route('/<int:team_id>/players/<int:player_id>', methods=['DELETE'])
@jwt_required()
def remove_player(team_id, player_id):
    user = get_current_user()
    if not can_manage(user):
        return jsonify({'error': 'Permission denied'}), 403

    player = Player.query.filter_by(player_id=player_id, team_id=team_id).first_or_404()
    if not owns_player(user, player):
        return jsonify({'error': 'You can only remove players from your own teams'}), 403

    player.is_active = False
    db.session.commit()
    return jsonify({'message': 'Player removed from team'}), 200
