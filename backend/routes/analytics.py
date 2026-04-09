# =============================================================
#  routes/analytics.py
#  Rich analytics endpoints for Chart.js visualizations
#  GET /api/analytics/overview      — summary KPIs
#  GET /api/analytics/team/<id>     — team deep-dive
#  GET /api/analytics/goals-trend   — goals per match over time
#  GET /api/analytics/top-scorers   — top N scorers
#  GET /api/analytics/prediction-accuracy — how accurate predictions were
# =============================================================

from flask import Blueprint, request, jsonify
from extensions import db
from models.models import Match, Team, Player, PerformanceStat, Prediction
from sqlalchemy import func

analytics_bp = Blueprint('analytics', __name__)


# -----------------------------------------------------------
# OVERVIEW — league-wide KPIs + goals trend + outcome split
# GET /api/analytics/overview
# -----------------------------------------------------------
@analytics_bp.route('/overview', methods=['GET'])
def overview():
    completed = Match.query.filter_by(status='completed').order_by(Match.match_date).all()
    scheduled = Match.query.filter_by(status='scheduled').count()
    teams      = Team.query.count()
    players    = Player.query.filter_by(is_active=True).count()

    total_goals = sum((m.home_score or 0) + (m.away_score or 0) for m in completed)
    home_wins   = sum(1 for m in completed if (m.home_score or 0) > (m.away_score or 0))
    away_wins   = sum(1 for m in completed if (m.home_score or 0) < (m.away_score or 0))
    draws       = sum(1 for m in completed if (m.home_score or 0) == (m.away_score or 0))

    # Goals per match over time (for line chart)
    goals_trend = []
    for m in completed:
        goals_trend.append({
            'match_id':  m.match_id,
            'label':     f"{m.home_team.team_name[:8]} v {m.away_team.team_name[:8]}",
            'date':      m.match_date.strftime('%d/%m') if m.match_date else '',
            'goals':     (m.home_score or 0) + (m.away_score or 0),
            'home_score': m.home_score or 0,
            'away_score': m.away_score or 0,
        })

    # Prediction accuracy
    correct = 0
    total_pred = 0
    for m in completed:
        if m.prediction:
            total_pred += 1
            pred = m.prediction.predicted_outcome
            hs, as_ = m.home_score or 0, m.away_score or 0
            actual = 'home' if hs > as_ else ('away' if hs < as_ else 'draw')
            if pred == actual:
                correct += 1

    pred_accuracy = round((correct / total_pred * 100), 1) if total_pred else 0

    return jsonify({
        'kpis': {
            'total_matches':   len(completed),
            'scheduled':       scheduled,
            'total_goals':     total_goals,
            'avg_goals_pm':    round(total_goals / max(len(completed), 1), 2),
            'total_teams':     teams,
            'total_players':   players,
            'prediction_accuracy': pred_accuracy,
        },
        'outcome_split': {
            'home_wins': home_wins,
            'away_wins': away_wins,
            'draws':     draws,
        },
        'goals_trend': goals_trend,
    }), 200


# -----------------------------------------------------------
# TEAM ANALYTICS — deep dive for one team
# GET /api/analytics/team/<team_id>
# -----------------------------------------------------------
@analytics_bp.route('/team/<int:team_id>', methods=['GET'])
def team_analytics(team_id):
    team = Team.query.get_or_404(team_id)

    home_matches = Match.query.filter_by(home_team_id=team_id, status='completed').all()
    away_matches = Match.query.filter_by(away_team_id=team_id, status='completed').all()
    all_matches  = home_matches + away_matches

    if not all_matches:
        return jsonify({'team': team.to_dict(), 'stats': {}, 'players': [], 'form': []}), 200

    wins = draws = losses = gf = ga = 0
    form = []
    for m in sorted(all_matches, key=lambda x: x.match_date):
        if m.home_team_id == team_id:
            mg, og = m.home_score or 0, m.away_score or 0
        else:
            mg, og = m.away_score or 0, m.home_score or 0
        gf += mg; ga += og
        if mg > og:   wins   += 1; form.append({'result':'W','gf':mg,'ga':og,'date':m.match_date.strftime('%d/%m'),'opponent':(m.away_team.team_name if m.home_team_id==team_id else m.home_team.team_name)})
        elif mg == og: draws += 1; form.append({'result':'D','gf':mg,'ga':og,'date':m.match_date.strftime('%d/%m'),'opponent':(m.away_team.team_name if m.home_team_id==team_id else m.home_team.team_name)})
        else:          losses+= 1; form.append({'result':'L','gf':mg,'ga':og,'date':m.match_date.strftime('%d/%m'),'opponent':(m.away_team.team_name if m.home_team_id==team_id else m.home_team.team_name)})

    n = len(all_matches)
    # Player stats for this team
    rows = (
        db.session.query(
            PerformanceStat.player_id,
            func.sum(PerformanceStat.goals).label('goals'),
            func.sum(PerformanceStat.assists).label('assists'),
            func.sum(PerformanceStat.minutes_played).label('minutes'),
            func.avg(PerformanceStat.rating).label('rating'),
            func.count(PerformanceStat.stat_id).label('apps'),
        )
        .filter(PerformanceStat.team_id == team_id)
        .group_by(PerformanceStat.player_id)
        .all()
    )
    players_data = []
    for r in rows:
        p = Player.query.get(r.player_id)
        if p:
            players_data.append({
                'name':    f"{p.first_name} {p.last_name}",
                'position': p.position or '',
                'goals':   int(r.goals or 0),
                'assists': int(r.assists or 0),
                'minutes': int(r.minutes or 0),
                'rating':  round(float(r.rating), 1) if r.rating else None,
                'apps':    int(r.apps),
            })
    players_data.sort(key=lambda x: x['goals'], reverse=True)

    return jsonify({
        'team': team.to_dict(),
        'stats': {
            'played': n, 'won': wins, 'drawn': draws, 'lost': losses,
            'goals_for': gf, 'goals_against': ga,
            'goal_diff': gf - ga,
            'points': wins * 3 + draws,
            'win_pct': round(wins / n * 100, 1),
            'goals_for_pg': round(gf / n, 2),
            'goals_against_pg': round(ga / n, 2),
        },
        'form':    form[-10:],   # last 10
        'players': players_data,
    }), 200


# -----------------------------------------------------------
# ALL TEAMS ANALYTICS — for comparison bar charts
# GET /api/analytics/teams
# -----------------------------------------------------------
@analytics_bp.route('/teams', methods=['GET'])
def all_teams_analytics():
    teams = Team.query.all()
    result = []
    for team in teams:
        home = Match.query.filter_by(home_team_id=team.team_id, status='completed').all()
        away = Match.query.filter_by(away_team_id=team.team_id, status='completed').all()
        all_m = home + away
        if not all_m:
            result.append({'team_id': team.team_id, 'team_name': team.team_name,
                           'played':0,'won':0,'drawn':0,'lost':0,'goals_for':0,
                           'goals_against':0,'points':0,'win_pct':0})
            continue
        wins=draws=losses=gf=ga=0
        for m in all_m:
            mg = (m.home_score if m.home_team_id==team.team_id else m.away_score) or 0
            og = (m.away_score if m.home_team_id==team.team_id else m.home_score) or 0
            gf+=mg; ga+=og
            if mg>og: wins+=1
            elif mg==og: draws+=1
            else: losses+=1
        n = len(all_m)
        result.append({
            'team_id': team.team_id, 'team_name': team.team_name,
            'played': n, 'won': wins, 'drawn': draws, 'lost': losses,
            'goals_for': gf, 'goals_against': ga, 'goal_diff': gf-ga,
            'points': wins*3+draws,
            'win_pct': round(wins/n*100,1),
            'goals_for_pg': round(gf/n,2),
        })
    result.sort(key=lambda x: -x['points'])
    return jsonify({'teams': result}), 200


# -----------------------------------------------------------
# TOP SCORERS with full stats
# GET /api/analytics/top-scorers?limit=10
# -----------------------------------------------------------
@analytics_bp.route('/top-scorers', methods=['GET'])
def top_scorers():
    limit = int(request.args.get('limit', 10))
    rows = (
        db.session.query(
            PerformanceStat.player_id,
            func.sum(PerformanceStat.goals).label('goals'),
            func.sum(PerformanceStat.assists).label('assists'),
            func.sum(PerformanceStat.minutes_played).label('minutes'),
            func.sum(PerformanceStat.yellow_cards).label('yellows'),
            func.sum(PerformanceStat.red_cards).label('reds'),
            func.avg(PerformanceStat.rating).label('rating'),
            func.count(PerformanceStat.stat_id).label('apps'),
        )
        .group_by(PerformanceStat.player_id)
        .order_by(func.sum(PerformanceStat.goals).desc())
        .limit(limit)
        .all()
    )
    result = []
    for r in rows:
        p = Player.query.get(r.player_id)
        if not p: continue
        result.append({
            'player_id': p.player_id,
            'name':      f"{p.first_name} {p.last_name}",
            'position':  p.position or '',
            'team':      p.team.team_name if p.team else '',
            'goals':     int(r.goals or 0),
            'assists':   int(r.assists or 0),
            'minutes':   int(r.minutes or 0),
            'yellows':   int(r.yellows or 0),
            'reds':      int(r.reds or 0),
            'rating':    round(float(r.rating), 1) if r.rating else None,
            'apps':      int(r.apps),
            'goals_per_game': round(int(r.goals or 0)/max(int(r.apps),1), 2),
        })
    return jsonify({'scorers': result}), 200


# -----------------------------------------------------------
# PREDICTION ACCURACY over time
# GET /api/analytics/prediction-accuracy
# -----------------------------------------------------------
@analytics_bp.route('/prediction-accuracy', methods=['GET'])
def prediction_accuracy():
    completed = Match.query.filter_by(status='completed').order_by(Match.match_date).all()
    records = []
    correct_running = 0
    total_running   = 0

    for m in completed:
        if not m.prediction: continue
        hs, as_ = m.home_score or 0, m.away_score or 0
        actual  = 'home' if hs > as_ else ('away' if hs < as_ else 'draw')
        pred    = m.prediction.predicted_outcome
        hit     = pred == actual
        total_running   += 1
        correct_running += int(hit)
        records.append({
            'match':    f"{m.home_team.team_name[:6]} v {m.away_team.team_name[:6]}",
            'date':     m.match_date.strftime('%d/%m'),
            'predicted': pred,
            'actual':    actual,
            'correct':   hit,
            'running_accuracy': round(correct_running / total_running * 100, 1),
            'home_prob': float(m.prediction.home_win_prob),
            'draw_prob': float(m.prediction.draw_prob),
            'away_prob': float(m.prediction.away_win_prob),
            'model':     m.prediction.model_version,
        })

    overall = round(correct_running / max(total_running, 1) * 100, 1)
    return jsonify({'records': records, 'overall_accuracy': overall, 'total': total_running}), 200