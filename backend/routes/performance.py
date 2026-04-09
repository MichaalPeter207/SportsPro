# =============================================================
#  routes/performance.py
#  Player performance stats
#  Endpoints:
#    POST /api/performance/          — add stats for a player in a match
#    GET  /api/performance/top       — top players by goals/rating
#    GET  /api/performance/match/<id>— stats for a specific match
#    GET  /api/performance/player/<id>— career stats for a player
# =============================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.models import PerformanceStat, Player, Match, User, UserRole, Tournament, TournamentTeam
from sqlalchemy import func
from utils.permissions import can_manage, is_admin

perf_bp = Blueprint('performance', __name__)


def get_current_user():
    uid = get_jwt_identity()
    if not uid: return None
    return db.session.get(User, int(uid))


# can_manage imported from utils.permissions


# -----------------------------------------------------------
# ADD PERFORMANCE STATS (Coach / Admin)
# -----------------------------------------------------------
@perf_bp.route('/', methods=['POST'])
@jwt_required()
def add_stats():
    user = get_current_user()
    if not can_manage(user):
        return jsonify({'error': 'Only coaches or admins can add stats'}), 403

    data = request.get_json()
    required = ['match_id', 'player_id', 'team_id']
    for f in required:
        if not data.get(f):
            return jsonify({'error': f'{f} is required'}), 400

    # Update or create
    existing = PerformanceStat.query.filter_by(
        match_id=data['match_id'], player_id=data['player_id']
    ).first()

    if existing:
        stat = existing
    else:
        stat = PerformanceStat(
            match_id  = data['match_id'],
            player_id = data['player_id'],
            team_id   = data['team_id'],
        )
        db.session.add(stat)

    stat.goals          = data.get('goals',          stat.goals or 0)
    stat.assists        = data.get('assists',         stat.assists or 0)
    stat.yellow_cards   = data.get('yellow_cards',    stat.yellow_cards or 0)
    stat.red_cards      = data.get('red_cards',       stat.red_cards or 0)
    stat.minutes_played = data.get('minutes_played',  stat.minutes_played or 0)
    stat.rating         = data.get('rating',          stat.rating)

    # Best-effort: link match to a tournament if missing
    try:
        match = Match.query.get(data['match_id'])
        if match and not match.tournament_id:
            # 1) If match has tournament_title, try to resolve by title
            if match.tournament_title:
                t = Tournament.query.filter(
                    Tournament.title.ilike(f"%{match.tournament_title}%")
                ).first()
                if t:
                    match.tournament_id = t.tournament_id
            # 2) If still missing, try to resolve by registered teams
            if not match.tournament_id:
                team_ids = {match.home_team_id, match.away_team_id}
                if len(team_ids) == 2:
                    # Find tournaments where both teams are registered
                    tt = TournamentTeam.query.filter(
                        TournamentTeam.team_id.in_(list(team_ids))
                    ).all()
                    by_t = {}
                    for r in tt:
                        by_t.setdefault(r.tournament_id, set()).add(r.team_id)
                    candidates = [tid for tid, teams in by_t.items() if teams == team_ids]
                    if len(candidates) == 1:
                        match.tournament_id = candidates[0]
                        t = Tournament.query.get(candidates[0])
                        if t and not match.tournament_title:
                            match.tournament_title = t.title
    except Exception:
        pass

    db.session.commit()
    return jsonify({'message': 'Stats saved', 'stat': stat.to_dict()}), 201


# -----------------------------------------------------------
# TOP PLAYERS — by total goals, then assists, then rating
# -----------------------------------------------------------
@perf_bp.route('/top', methods=['GET'])
def top_players():
    limit = int(request.args.get('limit', 20))

    # Aggregate stats per player
    rows = (
        db.session.query(
            PerformanceStat.player_id,
            func.sum(PerformanceStat.goals).label('goals'),
            func.sum(PerformanceStat.assists).label('assists'),
            func.sum(PerformanceStat.yellow_cards).label('yellow_cards'),
            func.sum(PerformanceStat.red_cards).label('red_cards'),
            func.sum(PerformanceStat.minutes_played).label('minutes_played'),
            func.avg(PerformanceStat.rating).label('rating'),
        )
        .group_by(PerformanceStat.player_id)
        .order_by(
            func.sum(PerformanceStat.goals).desc(),
            func.sum(PerformanceStat.assists).desc(),
        )
        .limit(limit)
        .all()
    )

    result = []
    for row in rows:
        player = Player.query.get(row.player_id)
        if not player:
            continue
        result.append({
            'player_id':     player.player_id,
            'first_name':    player.first_name,
            'last_name':     player.last_name,
            'position':      player.position,
            'team_name':     player.team.team_name if player.team else '',
            'goals':         int(row.goals or 0),
            'assists':       int(row.assists or 0),
            'yellow_cards':  int(row.yellow_cards or 0),
            'red_cards':     int(row.red_cards or 0),
            'minutes_played': int(row.minutes_played or 0),
            'rating':        round(float(row.rating), 1) if row.rating else None,
        })

    return jsonify({'players': result}), 200


# -----------------------------------------------------------
# STATS FOR A SPECIFIC MATCH
# -----------------------------------------------------------
@perf_bp.route('/match/<int:match_id>', methods=['GET'])
def match_stats(match_id):
    stats = PerformanceStat.query.filter_by(match_id=match_id).all()
    result = []
    for s in stats:
        d = s.to_dict()
        p = Player.query.get(s.player_id)
        if p:
            d['player_name'] = f"{p.first_name} {p.last_name}"
            d['position']    = p.position
        result.append(d)
    return jsonify({'stats': result}), 200


# -----------------------------------------------------------
# CAREER STATS FOR A PLAYER
# -----------------------------------------------------------
@perf_bp.route('/player/<int:player_id>', methods=['GET'])
def player_stats(player_id):
    player = Player.query.get_or_404(player_id)
    stats  = PerformanceStat.query.filter_by(player_id=player_id).all()

    totals = {
        'player':        player.to_dict(),
        'appearances':   len(stats),
        'goals':         sum(s.goals or 0 for s in stats),
        'assists':       sum(s.assists or 0 for s in stats),
        'yellow_cards':  sum(s.yellow_cards or 0 for s in stats),
        'red_cards':     sum(s.red_cards or 0 for s in stats),
        'minutes_played': sum(s.minutes_played or 0 for s in stats),
        'avg_rating':    round(sum(float(s.rating) for s in stats if s.rating) / max(len([s for s in stats if s.rating]), 1), 1),
        'match_stats':   [s.to_dict() for s in stats],
    }
    return jsonify(totals), 200


# -----------------------------------------------------------
# TOURNAMENT STATS — aggregate player stats for a tournament
# GET /api/performance/tournament/<tournament_id>
# -----------------------------------------------------------
@perf_bp.route('/tournament/<int:tournament_id>', methods=['GET'])
def tournament_stats(tournament_id):
    from models.models import Tournament, Team, TournamentTeam, Match as MatchModel
    from sqlalchemy import or_
    from datetime import datetime, timedelta
    t = Tournament.query.get_or_404(tournament_id)
    # Linked by FK
    linked_ids = {m.match_id for m in t.matches}
    # Also by title
    if t.title:
        title_matches = MatchModel.query.filter(
            MatchModel.tournament_title.ilike(f'%{t.title}%')
        ).all()
        for m in title_matches:
            linked_ids.add(m.match_id)

    # Fallback: include matches involving registered teams in the same season/date range
    team_ids = [tt.team_id for tt in TournamentTeam.query.filter_by(tournament_id=tournament_id).all()]
    if team_ids:
        q = MatchModel.query.filter(
            MatchModel.season_id == t.season_id,
            or_(MatchModel.home_team_id.in_(team_ids), MatchModel.away_team_id.in_(team_ids))
        )
        if t.start_date:
            q = q.filter(MatchModel.match_date >= datetime.combine(t.start_date, datetime.min.time()))
        if t.end_date:
            q = q.filter(MatchModel.match_date <= datetime.combine(t.end_date, datetime.max.time()))
        for m in q.all():
            linked_ids.add(m.match_id)

    match_ids = list(linked_ids)
    if not match_ids:
        return jsonify({'players': []}), 200

    stats = PerformanceStat.query.filter(
        PerformanceStat.match_id.in_(match_ids)
    ).all()

    # Aggregate by player
    agg = {}
    for s in stats:
        pid = s.player_id
        if pid not in agg:
            p    = db.session.get(Player, pid)
            team = db.session.get(Team, s.team_id)
            agg[pid] = {
                'player_id':     pid,
                'player_name':   f"{p.first_name} {p.last_name}" if p else f"Player {pid}",
                'position':      p.position if p else "",
                'team_name':     team.team_name if team else "",
                'goals':         0, 'assists': 0, 'yellow_cards': 0,
                'red_cards':     0, 'minutes_played': 0,
                'rating_sum':    0.0, 'rating_count': 0,
            }
        agg[pid]['goals']          += s.goals or 0
        agg[pid]['assists']        += s.assists or 0
        agg[pid]['yellow_cards']   += s.yellow_cards or 0
        agg[pid]['red_cards']      += s.red_cards or 0
        agg[pid]['minutes_played'] += s.minutes_played or 0
        if s.rating:
            agg[pid]['rating_sum']   += float(s.rating)
            agg[pid]['rating_count'] += 1

    result = []
    for r in agg.values():
        r['rating'] = round(r['rating_sum'] / r['rating_count'], 1) if r['rating_count'] else None
        del r['rating_sum'], r['rating_count']
        result.append(r)

    result.sort(key=lambda x: (-x['goals'], -x['assists']))
    return jsonify({'players': result}), 200
