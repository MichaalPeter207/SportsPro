# =============================================================
#  routes/match.py
# =============================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.models import Match, Team, Season, User, UserRole, Prediction, Tournament, TournamentCoach
from datetime import datetime, timedelta
from itertools import combinations
from utils.permissions import can_manage, is_admin

match_bp = Blueprint('match', __name__)


def get_current_user():
    uid = get_jwt_identity()
    if not uid: return None
    return db.session.get(User, int(uid))


def _can_manage_tournament_inline(user, tournament):
    if not user: return False
    if is_admin(user): return True
    if tournament.created_by == user.user_id: return True
    granted = TournamentCoach.query.filter_by(
        tournament_id=tournament.tournament_id, coach_id=user.user_id
    ).first()
    return granted is not None


def can_manage_match(user, match):
    """Admin: unlimited. Coach: only their own matches or tournaments they have access to."""
    if not user: return False
    if is_admin(user): return True
    if match.entered_by == user.user_id: return True
    if match.tournament_id:
        t = Tournament.query.get(match.tournament_id)
        if t:
            if t.created_by == user.user_id: return True
            granted = TournamentCoach.query.filter_by(
                tournament_id=t.tournament_id, coach_id=user.user_id
            ).first()
            if granted: return True
    return False


# -----------------------------------------------------------
# CREATE SINGLE MATCH (Coach / Admin)
# -----------------------------------------------------------
@match_bp.route('/create', methods=['POST'])
@jwt_required()
def create_match():
    user = get_current_user()
    if not can_manage(user):
        return jsonify({'error': 'Only coaches or admins can create matches'}), 403

    data = request.get_json()
    required = ['home_team_id', 'away_team_id', 'match_date']
    for f in required:
        if not data.get(f):
            return jsonify({'error': f'{f} is required'}), 400

    if data['home_team_id'] == data['away_team_id']:
        return jsonify({'error': 'Home and away teams must be different'}), 400

    from models.models import Season, League
    season_id = data.get('season_id')
    if not season_id:
        season = Season.query.first()
        if not season:
            league = League.query.first()
            if not league:
                league = League(
                    league_name='University Sports League',
                    sport_type='Football',
                    country='Nigeria',
                )
                db.session.add(league)
                db.session.flush()
            yr = datetime.utcnow().year
            season = Season(
                league_id=league.league_id,
                season_name=data.get('season_name') or f'Season {yr}',
                start_date=datetime(yr, 1, 1),
                end_date=datetime(yr, 12, 31),
            )
            db.session.add(season)
            db.session.flush()
        season_id = season.season_id

    tournament_id = data.get('tournament_id')
    if tournament_id:
        t = Tournament.query.get(tournament_id)
        if t and not _can_manage_tournament_inline(user, t):
            return jsonify({'error': 'You do not have access to that tournament'}), 403

    match = Match(
        season_id        = season_id,
        tournament_id    = tournament_id,
        home_team_id     = data['home_team_id'],
        away_team_id     = data['away_team_id'],
        match_date       = datetime.strptime(data['match_date'], '%Y-%m-%dT%H:%M')
                           if 'T' in data['match_date']
                           else datetime.strptime(data['match_date'], '%Y-%m-%d'),
        venue            = data.get('venue', ''),
        tournament_title = data.get('tournament_title', ''),
        round_number     = data.get('round_number', 1),
        status           = 'scheduled',
        entered_by       = user.user_id,
    )
    db.session.add(match)
    db.session.commit()

    _auto_predict(match)

    return jsonify({'message': 'Match created successfully', 'match': match.to_dict()}), 201


# -----------------------------------------------------------
# AUTO-GENERATE FIXTURES via Round Robin (Coach / Admin)
# -----------------------------------------------------------
@match_bp.route('/schedule', methods=['POST'])
@jwt_required()
def schedule_matches():
    user = get_current_user()
    if not can_manage(user):
        return jsonify({'error': 'Only coaches or admins can schedule matches'}), 403

    data             = request.get_json()
    season_id        = data.get('season_id')
    start_date       = data.get('start_date')
    tournament_title = data.get('tournament_title', '')

    if not season_id or not start_date:
        return jsonify({'error': 'season_id and start_date are required'}), 400

    season = Season.query.get_or_404(season_id)
    teams  = Team.query.filter_by(league_id=season.league_id).all()

    if len(teams) < 2:
        return jsonify({'error': 'Need at least 2 teams to schedule matches'}), 400

    Match.query.filter_by(season_id=season_id, status='scheduled').delete()

    match_date = datetime.strptime(start_date, '%Y-%m-%d')
    round_num  = 1
    total      = 0

    for home_team, away_team in combinations(teams, 2):
        m1 = Match(
            season_id        = season_id,
            home_team_id     = home_team.team_id,
            away_team_id     = away_team.team_id,
            match_date       = match_date,
            venue            = home_team.stadium or home_team.home_city or '',
            tournament_title = tournament_title,
            round_number     = round_num,
        )
        db.session.add(m1)
        match_date = match_date + timedelta(weeks=1)
        round_num += 1
        total += 1

        m2 = Match(
            season_id        = season_id,
            home_team_id     = away_team.team_id,
            away_team_id     = home_team.team_id,
            match_date       = match_date,
            venue            = away_team.stadium or away_team.home_city or '',
            tournament_title = tournament_title,
            round_number     = round_num,
        )
        db.session.add(m2)
        match_date = match_date + timedelta(weeks=1)
        round_num += 1
        total += 1

    db.session.commit()

    new_matches = Match.query.filter_by(season_id=season_id, status='scheduled').all()
    for m in new_matches:
        _auto_predict(m)

    return jsonify({
        'message':       f'{total} matches scheduled successfully',
        'season':        season.season_name,
        'tournament':    tournament_title,
        'total_matches': total,
    }), 201


# -----------------------------------------------------------
# GET ALL MATCHES
# -----------------------------------------------------------
@match_bp.route('/', methods=['GET'])
def get_matches():
    season_id = request.args.get('season_id')
    status    = request.args.get('status')

    query = Match.query
    if season_id:
        query = query.filter_by(season_id=int(season_id))
    if status:
        query = query.filter_by(status=status)

    matches = query.order_by(Match.match_date).all()

    # Ensure predictions exist for scheduled matches
    for m in matches:
        if m.status == 'scheduled' and not m.prediction:
            _auto_predict(m)

    result = []
    for m in matches:
        md = m.to_dict()
        if m.prediction:
            md['prediction'] = m.prediction.to_dict()
        result.append(md)

    return jsonify({'matches': result}), 200


# -----------------------------------------------------------
# GET MATCHES SCOPED TO CURRENT USER
# GET /api/matches/my-matches?tournament_id=X
# -----------------------------------------------------------
@match_bp.route('/my-matches', methods=['GET'])
@jwt_required()
def my_matches():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    tournament_id = request.args.get('tournament_id')

    if is_admin(user):
        q = Match.query
        if tournament_id:
            q = q.filter_by(tournament_id=int(tournament_id))
        matches = q.order_by(Match.match_date).all()
    else:
        from sqlalchemy import or_
        my_tournament_ids = [
            tc.tournament_id for tc in TournamentCoach.query.filter_by(coach_id=user.user_id).all()
        ]
        owned_t_ids = [
            t.tournament_id for t in Tournament.query.filter_by(created_by=user.user_id).all()
        ]
        accessible_t_ids = list(set(my_tournament_ids + owned_t_ids))

        q = Match.query.filter(
            or_(
                Match.entered_by == user.user_id,
                Match.tournament_id.in_(accessible_t_ids) if accessible_t_ids else Match.match_id == -1
            )
        )
        if tournament_id:
            q = q.filter_by(tournament_id=int(tournament_id))
        matches = q.order_by(Match.match_date).all()

    result = []
    for m in matches:
        if m.status == 'scheduled' and not m.prediction:
            _auto_predict(m)
        md = m.to_dict()
        if m.prediction:
            md['prediction'] = m.prediction.to_dict()
        result.append(md)

    return jsonify({'matches': result}), 200


# -----------------------------------------------------------
# GET ONE MATCH
# -----------------------------------------------------------
@match_bp.route('/<int:match_id>', methods=['GET'])
def get_match(match_id):
    match = Match.query.get_or_404(match_id)
    if match.status == 'scheduled' and not match.prediction:
        _auto_predict(match)
    data  = match.to_dict()
    if match.prediction:
        data['prediction'] = match.prediction.to_dict()
    return jsonify({'match': data}), 200


# -----------------------------------------------------------
# EDIT MATCH DETAILS (Coach / Admin)
# -----------------------------------------------------------
@match_bp.route("/<int:match_id>/edit", methods=["PUT"])
@jwt_required()
def edit_match(match_id):
    user = get_current_user()
    if not can_manage(user):
        return jsonify({"error": "Only coaches or admins can edit matches"}), 403
    data  = request.get_json()
    match = Match.query.get_or_404(match_id)
    if not can_manage_match(user, match):
        return jsonify({"error": "You can only edit matches you created or tournaments you have access to"}), 403
    if data.get("home_team_id"):  match.home_team_id     = int(data["home_team_id"])
    if data.get("away_team_id"):  match.away_team_id     = int(data["away_team_id"])
    if data.get("venue")          is not None: match.venue            = data["venue"]
    if data.get("tournament_title") is not None: match.tournament_title = data["tournament_title"]
    if data.get("round_number"):  match.round_number     = int(data["round_number"])
    if data.get("match_date"):
        for fmt in ["%Y-%m-%dT%H:%M", "%Y-%m-%d"]:
            try: match.match_date = datetime.strptime(data["match_date"], fmt); break
            except ValueError: pass
    db.session.commit()
    return jsonify({"message": "Match updated", "match": match.to_dict()}), 200


# -----------------------------------------------------------
# ENTER MATCH RESULT (Coach / Admin)
# After saving, refresh all predictions with new data
# -----------------------------------------------------------
@match_bp.route('/<int:match_id>/result', methods=['PUT'])
@jwt_required()
def enter_result(match_id):
    user = get_current_user()
    if not can_manage(user):
        return jsonify({'error': 'Only coaches or admins can enter match results'}), 403

    data = request.get_json()
    if data.get('home_score') is None or data.get('away_score') is None:
        return jsonify({'error': 'home_score and away_score are required'}), 400

    match = Match.query.get_or_404(match_id)
    if not can_manage_match(user, match):
        return jsonify({'error': 'You can only upload results for matches you created or tournaments you have access to'}), 403

    match.home_score = int(data['home_score'])
    match.away_score = int(data['away_score'])
    match.status     = 'completed'
    match.entered_by = user.user_id
    db.session.commit()

    # Re-generate predictions for all remaining scheduled matches using updated data
    try:
        from models.models import PerformanceStat
        all_completed  = Match.query.filter_by(status='completed').all()
        perf_stats     = PerformanceStat.query.all()
        for sm in Match.query.filter_by(status='scheduled').all():
            old_pred = Prediction.query.filter_by(match_id=sm.match_id).first()
            if old_pred:
                db.session.delete(old_pred)
                db.session.commit()
            _auto_predict(sm)
    except Exception as e:
        print(f"[Prediction refresh error] {e}")

    return jsonify({'message': 'Result entered successfully', 'match': match.to_dict()}), 200


# -----------------------------------------------------------
# STANDINGS
# -----------------------------------------------------------
@match_bp.route('/standings', methods=['GET'])
def get_standings():
    season_id = request.args.get('season_id')

    query = Match.query.filter_by(status='completed')
    if season_id:
        query = query.filter_by(season_id=int(season_id))

    completed = query.all()
    table = {}

    def _ensure(team):
        if team.team_id not in table:
            table[team.team_id] = {
                'team_id':    team.team_id,
                'team_name':  team.team_name,
                'department': team.department or '',
                'played':     0, 'won': 0, 'drawn': 0, 'lost': 0,
                'goals_for':  0, 'goals_against': 0, 'goal_diff': 0, 'points': 0,
            }

    for m in completed:
        home = m.home_team
        away = m.away_team
        _ensure(home)
        _ensure(away)
        hs, as_ = m.home_score, m.away_score
        table[home.team_id]['played']        += 1
        table[away.team_id]['played']        += 1
        table[home.team_id]['goals_for']     += hs
        table[home.team_id]['goals_against'] += as_
        table[away.team_id]['goals_for']     += as_
        table[away.team_id]['goals_against'] += hs
        if hs > as_:
            table[home.team_id]['won']    += 1
            table[home.team_id]['points'] += 3
            table[away.team_id]['lost']   += 1
        elif hs < as_:
            table[away.team_id]['won']    += 1
            table[away.team_id]['points'] += 3
            table[home.team_id]['lost']   += 1
        else:
            table[home.team_id]['drawn']  += 1
            table[home.team_id]['points'] += 1
            table[away.team_id]['drawn']  += 1
            table[away.team_id]['points'] += 1

    standings = list(table.values())
    for row in standings:
        row['goal_diff'] = row['goals_for'] - row['goals_against']
    standings.sort(key=lambda x: (-x['points'], -x['goal_diff'], -x['goals_for']))
    for i, row in enumerate(standings, 1):
        row['position'] = i

    return jsonify({'standings': standings}), 200


# -----------------------------------------------------------
# ACTIVE TOURNAMENT INFO
# -----------------------------------------------------------
@match_bp.route('/tournament', methods=['GET'])
def get_tournament():
    latest = (
        Match.query
        .filter(Match.tournament_title != None, Match.tournament_title != '')
        .order_by(Match.created_at.desc())
        .first()
    )
    if not latest:
        return jsonify({'tournament': None}), 200

    season = latest.season
    return jsonify({
        'tournament': {
            'title':       latest.tournament_title,
            'season_name': season.season_name if season else '',
            'season_id':   latest.season_id,
        }
    }), 200


# -----------------------------------------------------------
# INTERNAL: auto-generate a prediction
# -----------------------------------------------------------
def _auto_predict(match):
    try:
        from utils.predictor import predict_match
        from models.models import PerformanceStat

        if Prediction.query.filter_by(match_id=match.match_id).first():
            return

        all_completed = Match.query.filter_by(status='completed').all()
        perf_stats    = PerformanceStat.query.all()

        home_p, draw_p, away_p, outcome, version = predict_match(
            match, all_completed, perf_stats
        )

        pred = Prediction(
            match_id          = match.match_id,
            home_win_prob     = float(home_p),
            away_win_prob     = float(away_p),
            draw_prob         = float(draw_p),
            predicted_outcome = outcome,
            model_version     = version,
        )
        db.session.add(pred)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"[Prediction error] {e}")


# -----------------------------------------------------------
# REFRESH ALL PREDICTIONS
# -----------------------------------------------------------
@match_bp.route('/refresh-predictions', methods=['POST'])
@jwt_required()
def refresh_predictions():
    user = get_current_user()
    if not can_manage(user):
        return jsonify({'error': 'Permission denied'}), 403

    scheduled = Match.query.filter_by(status='scheduled').all()
    updated = 0
    for m in scheduled:
        old = Prediction.query.filter_by(match_id=m.match_id).first()
        if old:
            db.session.delete(old)
            db.session.commit()
        _auto_predict(m)
        updated += 1

    return jsonify({'message': f'Refreshed predictions for {updated} matches'}), 200
