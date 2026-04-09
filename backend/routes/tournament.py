# routes/tournament.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.models import (Tournament, TournamentCoach, TournamentTeam, Season, League,
                            Match, Team, User, UserRole, Notification, Prediction, PerformanceStat)
from datetime import datetime
from utils.permissions import is_admin, is_coach

tournament_bp = Blueprint('tournament', __name__)


# ── Helpers ───────────────────────────────────────────────────

def _user():
    uid = get_jwt_identity()
    return db.session.get(User, int(uid)) if uid else None


# is_admin, is_coach imported from utils.permissions


def _can_manage_tournament(user, tournament):
    if not user:
        return False
    if is_admin(user):
        return True
    if tournament.created_by == user.user_id:
        return True
    granted = TournamentCoach.query.filter_by(
        tournament_id=tournament.tournament_id, coach_id=user.user_id
    ).first()
    return granted is not None


def _notify(user_id, title, message):
    db.session.add(Notification(user_id=user_id, title=title, message=message))


def _get_or_create_season(season_name, created_by):
    season = Season.query.filter_by(season_name=season_name).first()
    if not season:
        league = League.query.first()
        if not league:
            league = League(
                league_name='University Sports League',
                sport_type='Football',
                created_by=created_by,
            )
            db.session.add(league)
            db.session.flush()
        yr = datetime.utcnow().year
        season = Season(
            league_id=league.league_id,
            season_name=season_name,
            start_date=datetime(yr, 1, 1).date(),
            end_date=datetime(yr, 12, 31).date(),
        )
        db.session.add(season)
        db.session.flush()
    return season


def _ensure_predictions(matches):
    """Create predictions for matches missing them (scheduled fixtures)."""
    try:
        from utils.predictor import predict_match
        all_completed = Match.query.filter_by(status='completed').all()
        perf_stats    = PerformanceStat.query.all()
        created = 0
        for m in matches:
            if m.prediction:
                continue
            if m.status != 'scheduled':
                continue
            try:
                home_p, draw_p, away_p, outcome, version = predict_match(m, all_completed, perf_stats)
                pred = Prediction(
                    match_id=m.match_id,
                    home_win_prob=home_p,
                    away_win_prob=away_p,
                    draw_prob=draw_p,
                    predicted_outcome=outcome,
                    model_version=version,
                )
                db.session.add(pred)
                created += 1
            except Exception:
                pass
        if created:
            db.session.commit()
    except Exception:
        pass


# ── Routes ────────────────────────────────────────────────────

@tournament_bp.route('/', methods=['POST'])
@jwt_required()
def create_tournament():
    user = _user()
    if not is_coach(user):
        return jsonify({'error': 'Only coaches or admins can create tournaments'}), 403

    data = request.get_json() or {}
    if not data.get('title'):
        return jsonify({'error': 'Tournament title is required'}), 400

    season_name = data.get('season_name') or f'Season {datetime.utcnow().year}'
    season = _get_or_create_season(season_name, user.user_id)

    t = Tournament(
        title=data['title'].strip(),
        description=data.get('description', ''),
        season_id=season.season_id,
        created_by=user.user_id,
        status='active',
        start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else None,
        end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None,
    )
    db.session.add(t)
    db.session.commit()

    return jsonify({'message': 'Tournament created', 'tournament': t.to_dict(include_code=True)}), 201


@tournament_bp.route('/', methods=['GET'])
def list_active():
    tournaments = Tournament.query.filter_by(status='active').order_by(
        Tournament.created_at.desc()
    ).all()
    return jsonify({'tournaments': [t.to_dict() for t in tournaments]}), 200


@tournament_bp.route('/past', methods=['GET'])
def list_past():
    tournaments = Tournament.query.filter(
        Tournament.status.in_(['completed', 'archived'])
    ).order_by(Tournament.created_at.desc()).all()
    return jsonify({'tournaments': [t.to_dict() for t in tournaments]}), 200


@tournament_bp.route('/mine', methods=['GET'])
@jwt_required()
def list_mine():
    user = _user()
    if not user:
        return jsonify({'error': 'Unauthorised'}), 401

    if is_admin(user):
        tournaments = Tournament.query.order_by(Tournament.created_at.desc()).all()
    else:
        owned = Tournament.query.filter_by(created_by=user.user_id).all()
        granted_ids = [
            tc.tournament_id for tc in
            TournamentCoach.query.filter_by(coach_id=user.user_id).all()
        ]
        granted = Tournament.query.filter(
            Tournament.tournament_id.in_(granted_ids)
        ).all() if granted_ids else []

        seen = set()
        tournaments = []
        for t in owned + granted:
            if t.tournament_id not in seen:
                seen.add(t.tournament_id)
                tournaments.append(t)
        tournaments.sort(key=lambda x: x.created_at, reverse=True)

    return jsonify({'tournaments': [
        t.to_dict(include_code=_can_manage_tournament(user, t)) for t in tournaments
    ]}), 200


@tournament_bp.route('/join', methods=['POST'])
@jwt_required()
def join_tournament():
    user = _user()
    if not is_coach(user):
        return jsonify({'error': 'Only coaches can join tournaments via access code'}), 403

    code = (request.get_json() or {}).get('access_code', '').strip().upper()
    if not code:
        return jsonify({'error': 'access_code is required'}), 400

    t = Tournament.query.filter_by(access_code=code).first()
    if not t:
        return jsonify({'error': 'Invalid access code'}), 404
    if t.status == 'archived':
        return jsonify({'error': 'This tournament is archived'}), 400
    if t.created_by == user.user_id:
        return jsonify({'message': 'You already own this tournament', 'tournament': t.to_dict()}), 200

    existing = TournamentCoach.query.filter_by(
        tournament_id=t.tournament_id, coach_id=user.user_id
    ).first()
    if existing:
        return jsonify({'message': 'You already have access', 'tournament': t.to_dict()}), 200

    db.session.add(TournamentCoach(tournament_id=t.tournament_id, coach_id=user.user_id))
    _notify(t.created_by, 'Coach Joined Tournament',
            f'Coach {user.username} joined "{t.title}" via access code.')
    db.session.commit()

    return jsonify({'message': f'Access granted to "{t.title}"', 'tournament': t.to_dict()}), 200


@tournament_bp.route('/<int:tid>', methods=['GET'])
def get_tournament(tid):
    t = Tournament.query.get_or_404(tid)
    token = request.headers.get('Authorization', '')
    user = None
    if token:
        try:
            from flask_jwt_extended import decode_token
            data = decode_token(token.replace('Bearer ', ''))
            uid  = data.get('sub')
            user = db.session.get(User, int(uid)) if uid else None
        except Exception:
            pass
    include_code = _can_manage_tournament(user, t) if user else False
    return jsonify({'tournament': t.to_dict(include_code=include_code)}), 200


@tournament_bp.route('/<int:tid>', methods=['PUT'])
@jwt_required()
def edit_tournament(tid):
    user = _user()
    t    = Tournament.query.get_or_404(tid)
    if not _can_manage_tournament(user, t):
        return jsonify({'error': 'You do not have access to this tournament'}), 403
    if t.status == 'archived':
        return jsonify({'error': 'Cannot edit an archived tournament'}), 400

    data = request.get_json() or {}
    if data.get('title'):       t.title       = data['title'].strip()
    if data.get('description'): t.description = data['description']
    if data.get('start_date'):
        t.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
    if data.get('end_date'):
        t.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
    db.session.commit()
    return jsonify({'message': 'Tournament updated', 'tournament': t.to_dict()}), 200


@tournament_bp.route('/<int:tid>', methods=['DELETE'])
@jwt_required()
def delete_tournament(tid):
    user = _user()
    if not is_admin(user):
        return jsonify({'error': 'Only admins can delete tournaments'}), 403

    t = Tournament.query.get_or_404(tid)
    title = t.title

    from models.models import PerformanceStat, Prediction

    match_ids = [m.match_id for m in t.matches]
    if match_ids:
        PerformanceStat.query.filter(
            PerformanceStat.match_id.in_(match_ids)
        ).delete(synchronize_session=False)
        Prediction.query.filter(
            Prediction.match_id.in_(match_ids)
        ).delete(synchronize_session=False)
        for m in t.matches:
            m.tournament_id    = None
            m.tournament_title = None

    TournamentCoach.query.filter_by(tournament_id=tid).delete(synchronize_session=False)
    TournamentTeam.query.filter_by(tournament_id=tid).delete(synchronize_session=False)
    db.session.delete(t)
    db.session.commit()

    return jsonify({'message': f'Tournament "{title}" deleted successfully'}), 200


@tournament_bp.route('/<int:tid>/complete', methods=['POST'])
@jwt_required()
def complete_tournament(tid):
    user = _user()
    t    = Tournament.query.get_or_404(tid)
    if not _can_manage_tournament(user, t):
        return jsonify({'error': 'Access denied'}), 403
    if t.status == 'archived':
        return jsonify({'error': 'Tournament is already archived'}), 400
    t.status = 'completed'
    db.session.commit()
    return jsonify({'message': 'Tournament marked as completed', 'tournament': t.to_dict()}), 200


@tournament_bp.route('/<int:tid>/archive', methods=['POST'])
@jwt_required()
def archive_tournament(tid):
    user = _user()
    if not is_admin(user):
        return jsonify({'error': 'Only admins can archive tournaments'}), 403
    t = Tournament.query.get_or_404(tid)
    if t.status == 'archived':
        return jsonify({'error': 'Already archived'}), 400
    t.status      = 'archived'
    t.archived_at = datetime.utcnow()
    t.archived_by = user.user_id
    if t.created_by != user.user_id:
        _notify(t.created_by, 'Tournament Archived',
                f'Your tournament "{t.title}" has been archived by an admin.')
    db.session.commit()
    return jsonify({'message': f'Tournament "{t.title}" archived', 'tournament': t.to_dict()}), 200


@tournament_bp.route('/<int:tid>/code', methods=['GET'])
@jwt_required()
def get_code(tid):
    user = _user()
    t    = Tournament.query.get_or_404(tid)
    if not (t.created_by == user.user_id or is_admin(user)):
        return jsonify({'error': 'Only the owner or admin can view the access code'}), 403
    return jsonify({'access_code': t.access_code, 'tournament_id': t.tournament_id}), 200


@tournament_bp.route('/<int:tid>/coaches', methods=['GET'])
@jwt_required()
def list_coaches(tid):
    user = _user()
    t    = Tournament.query.get_or_404(tid)
    if not _can_manage_tournament(user, t):
        return jsonify({'error': 'Access denied'}), 403
    coaches = [tc.to_dict() for tc in t.coach_access]
    return jsonify({'coaches': coaches, 'owner': t.owner.username if t.owner else ''}), 200


@tournament_bp.route('/<int:tid>/coaches/<int:coach_id>', methods=['DELETE'])
@jwt_required()
def revoke_coach(tid, coach_id):
    user = _user()
    t    = Tournament.query.get_or_404(tid)
    if not (t.created_by == user.user_id or is_admin(user)):
        return jsonify({'error': 'Only the owner or admin can revoke access'}), 403
    tc = TournamentCoach.query.filter_by(tournament_id=tid, coach_id=coach_id).first()
    if not tc:
        return jsonify({'error': 'That coach does not have access'}), 404
    db.session.delete(tc)
    db.session.commit()
    return jsonify({'message': 'Access revoked'}), 200


# -----------------------------------------------------------
# REGISTER TEAM TO TOURNAMENT
# POST /api/tournaments/<id>/teams   body: { team_id }
# -----------------------------------------------------------
@tournament_bp.route('/<int:tid>/teams', methods=['POST'])
@jwt_required()
def register_team(tid):
    user = _user()
    t    = Tournament.query.get_or_404(tid)
    if not _can_manage_tournament(user, t):
        return jsonify({'error': 'Access denied'}), 403
    if t.status == 'archived':
        return jsonify({'error': 'Cannot add teams to an archived tournament'}), 400

    data    = request.get_json() or {}
    team_id = data.get('team_id')
    if not team_id:
        return jsonify({'error': 'team_id is required'}), 400

    team = Team.query.get(team_id)
    if not team:
        return jsonify({'error': 'Team not found'}), 404

    # Coach can only register their own teams
    if not is_admin(user) and team.coach_id != user.user_id:
        return jsonify({'error': 'You can only register teams you own'}), 403

    existing = TournamentTeam.query.filter_by(tournament_id=tid, team_id=team_id).first()
    if existing:
        return jsonify({'error': f'{team.team_name} is already registered'}), 400

    db.session.add(TournamentTeam(tournament_id=tid, team_id=team_id, registered_by=user.user_id))
    db.session.commit()
    return jsonify({'message': f'{team.team_name} registered to tournament', 'team': team.to_dict()}), 201


# -----------------------------------------------------------
# REMOVE TEAM FROM TOURNAMENT
# DELETE /api/tournaments/<id>/teams/<team_id>
# -----------------------------------------------------------
@tournament_bp.route('/<int:tid>/teams/<int:team_id>', methods=['DELETE'])
@jwt_required()
def remove_team(tid, team_id):
    user = _user()
    t    = Tournament.query.get_or_404(tid)
    if not _can_manage_tournament(user, t):
        return jsonify({'error': 'Access denied'}), 403

    tt = TournamentTeam.query.filter_by(tournament_id=tid, team_id=team_id).first()
    if not tt:
        return jsonify({'error': 'Team not registered to this tournament'}), 404

    # Don't remove if matches already generated
    match_count = Match.query.filter_by(tournament_id=tid, status='scheduled').count()
    if match_count > 0:
        return jsonify({'error': 'Cannot remove team after fixtures have been generated'}), 400

    db.session.delete(tt)
    db.session.commit()
    return jsonify({'message': 'Team removed from tournament'}), 200


# -----------------------------------------------------------
# GET TOURNAMENT TEAMS  — scoped to coach's own teams
# GET /api/tournaments/<id>/teams
# -----------------------------------------------------------
@tournament_bp.route('/<int:tid>/teams', methods=['GET'])
@jwt_required()
def get_tournament_teams(tid):
    user  = _user()
    t     = Tournament.query.get_or_404(tid)
    teams = TournamentTeam.query.filter_by(tournament_id=tid).all()
    registered_ids = {tt.team_id for tt in teams}

    # Available: admin sees all teams, coach sees only their own
    if is_admin(user):
        all_teams = Team.query.all()
    else:
        all_teams = Team.query.filter_by(coach_id=user.user_id).all()

    return jsonify({
        'registered':  [tt.to_dict() for tt in teams],
        'available':   [tm.to_dict() for tm in all_teams if tm.team_id not in registered_ids],
        'team_count':  len(teams),
    }), 200


# -----------------------------------------------------------
# GENERATE ROUND-ROBIN FIXTURES
# POST /api/tournaments/<id>/generate-fixtures
# body: { start_date, days_between_rounds, venue }
# -----------------------------------------------------------
@tournament_bp.route('/<int:tid>/generate-fixtures', methods=['POST'])
@jwt_required()
def generate_fixtures(tid):
    user = _user()
    t    = Tournament.query.get_or_404(tid)
    if not _can_manage_tournament(user, t):
        return jsonify({'error': 'Access denied'}), 403
    if t.status == 'archived':
        return jsonify({'error': 'Cannot generate fixtures for an archived tournament'}), 400

    teams = TournamentTeam.query.filter_by(tournament_id=tid).all()
    if len(teams) < 2:
        return jsonify({'error': f'Need at least 2 teams. Currently {len(teams)} registered.'}), 400

    # Delete only scheduled (not completed) matches for this tournament
    Match.query.filter_by(tournament_id=tid, status='scheduled').delete()
    db.session.flush()

    data             = request.get_json() or {}
    start_date_str   = data.get('start_date', str(datetime.utcnow().date()))
    days_between     = int(data.get('days_between_rounds', 7))
    venue            = data.get('venue', '')
    start_round      = int(data.get('start_round', 1))

    try:
        base_date = datetime.strptime(start_date_str, '%Y-%m-%d')
    except ValueError:
        base_date = datetime.utcnow()

    # Build round-robin schedule using circle method
    team_objs = [tt.team for tt in teams]
    n         = len(team_objs)
    rounds    = []

    if n % 2 == 1:
        team_objs.append(None)  # bye for odd numbers
        n += 1

    half     = n // 2
    rotation = list(range(1, n))

    for rnd in range(n - 1):
        pairs  = []
        circle = [0] + rotation
        for i in range(half):
            home = team_objs[circle[i]]
            away = team_objs[circle[n - 1 - i]]
            if home and away:
                pairs.append((home, away))
        rounds.append(pairs)
        rotation = [rotation[-1]] + rotation[:-1]

    # Persist matches
    import datetime as dt_mod
    created = []
    for rnd_idx, pairs in enumerate(rounds):
        round_num  = start_round + rnd_idx
        match_date = base_date + dt_mod.timedelta(days=days_between * rnd_idx)

        for home, away in pairs:
            from models.models import Season as SeasonModel, League as LeagueModel
            season = SeasonModel.query.first()
            if not season:
                league = LeagueModel.query.first()
                if not league:
                    league = LeagueModel(league_name='University Sports League',
                                         sport_type='Football', created_by=user.user_id)
                    db.session.add(league)
                    db.session.flush()
                yr = datetime.utcnow().year
                season = SeasonModel(league_id=league.league_id, season_name=f'Season {yr}',
                                     start_date=datetime(yr,1,1).date(),
                                     end_date=datetime(yr,12,31).date())
                db.session.add(season)
                db.session.flush()

            m = Match(
                season_id        = season.season_id,
                tournament_id    = tid,
                home_team_id     = home.team_id,
                away_team_id     = away.team_id,
                match_date       = match_date,
                venue            = venue or (t.title + ' Venue'),
                tournament_title = t.title,
                round_number     = round_num,
                status           = 'scheduled',
                entered_by       = user.user_id,
            )
            db.session.add(m)
            db.session.flush()
            created.append(m)

    db.session.commit()

    # Generate predictions for all created matches
    try:
        from utils.predictor import predict_match
        from models.models import PerformanceStat
        all_completed = Match.query.filter_by(status='completed').all()
        perf_stats    = PerformanceStat.query.all()
        for m in created:
            try:
                home_p, draw_p, away_p, outcome, version = predict_match(m, all_completed, perf_stats)
                pred = Prediction(
                    match_id=m.match_id, home_win_prob=home_p,
                    away_win_prob=away_p, draw_prob=draw_p,
                    predicted_outcome=outcome, model_version=version,
                )
                db.session.add(pred)
            except Exception:
                pass
        db.session.commit()
    except Exception:
        pass

    total_rounds = len(rounds)
    import datetime as dt_mod2
    return jsonify({
        'message':         f'Generated {len(created)} fixtures across {total_rounds} rounds',
        'matches_created': len(created),
        'rounds':          total_rounds,
        'first_match':     str(base_date.date()),
        'last_match':      str((base_date + dt_mod2.timedelta(days=days_between*(total_rounds-1))).date()),
    }), 201


# -----------------------------------------------------------
# GET ROUND STATUS
# GET /api/tournaments/<id>/rounds
# -----------------------------------------------------------
@tournament_bp.route('/<int:tid>/rounds', methods=['GET'])
def get_rounds(tid):
    t = Tournament.query.get_or_404(tid)
    matches = Match.query.filter_by(tournament_id=tid).order_by(
        Match.round_number, Match.match_date
    ).all()

    if not matches:
        return jsonify({'rounds': [], 'current_round': 0, 'total_rounds': 0}), 200

    rounds = {}
    for m in matches:
        r = m.round_number or 1
        if r not in rounds:
            rounds[r] = {'round': r, 'total': 0, 'completed': 0, 'scheduled': 0, 'matches': []}
        rounds[r]['total'] += 1
        rounds[r][m.status if m.status in ('completed', 'scheduled') else 'scheduled'] += 1
        rounds[r]['matches'].append(m.to_dict())

    rounds_list = sorted(rounds.values(), key=lambda x: x['round'])

    current = next((r['round'] for r in rounds_list if r['scheduled'] > 0), 0)
    if current == 0 and rounds_list:
        current = rounds_list[-1]['round']

    for r in rounds_list:
        if r['completed'] == r['total']:
            r['status'] = 'completed'
        elif r['completed'] > 0:
            r['status'] = 'in_progress'
        else:
            r['status'] = 'upcoming'

    return jsonify({
        'rounds':        rounds_list,
        'current_round': current,
        'total_rounds':  len(rounds_list),
        'all_complete':  all(r['status'] == 'completed' for r in rounds_list),
    }), 200


# -----------------------------------------------------------
# GET MATCHES FOR A TOURNAMENT
# GET /api/tournaments/<id>/matches
# -----------------------------------------------------------
@tournament_bp.route('/<int:tid>/matches', methods=['GET'])
def tournament_matches(tid):
    t = Tournament.query.get_or_404(tid)

    # Primary: matches linked by tournament_id FK
    linked = {m.match_id: m for m in t.matches}

    # Fallback: also include matches with matching tournament_title
    if t.title:
        title_matches = Match.query.filter(
            Match.tournament_title.ilike(f'%{t.title}%')
        ).all()
        for m in title_matches:
            if m.match_id not in linked:
                linked[m.match_id] = m

    matches = sorted(linked.values(), key=lambda x: x.match_date)
    _ensure_predictions(matches)

    result = []
    for m in matches:
        md = m.to_dict()
        if m.prediction:
            md['prediction'] = m.prediction.to_dict()
        result.append(md)

    return jsonify({'tournament': t.to_dict(), 'matches': result}), 200
