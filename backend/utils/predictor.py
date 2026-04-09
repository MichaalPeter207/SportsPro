# =============================================================
#  utils/predictor.py
#  XGBoost-based match outcome predictor
#  Features used:
#    - Home/away historical win rate
#    - Home/away goals scored & conceded per game
#    - Head-to-head record
#    - Home advantage factor
#    - Recent form (last 5 matches)
#    - Goal difference per game
#    - Player performance ratings (avg team rating)
# =============================================================

import numpy as np

try:
    import xgboost as xgb
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False

# ── Feature extraction ────────────────────────────────────────

def _team_stats(team_id, all_completed, last_n=None):
    """Compute stats for a team from completed matches."""
    matches = [
        m for m in all_completed
        if m.home_team_id == team_id or m.away_team_id == team_id
    ]
    if last_n:
        matches = sorted(matches, key=lambda m: m.match_date, reverse=True)[:last_n]

    if not matches:
        return {
            'win_rate': 0.33, 'draw_rate': 0.33, 'loss_rate': 0.34,
            'goals_for_pg': 1.0, 'goals_against_pg': 1.0,
            'goal_diff_pg': 0.0, 'played': 0,
        }

    wins = draws = losses = goals_for = goals_against = 0
    for m in matches:
        if m.home_team_id == team_id:
            gf, ga = m.home_score or 0, m.away_score or 0
        else:
            gf, ga = m.away_score or 0, m.home_score or 0

        goals_for      += gf
        goals_against  += ga
        if gf > ga:   wins   += 1
        elif gf == ga: draws += 1
        else:          losses += 1

    n = len(matches)
    return {
        'win_rate':        wins   / n,
        'draw_rate':       draws  / n,
        'loss_rate':       losses / n,
        'goals_for_pg':    goals_for    / n,
        'goals_against_pg': goals_against / n,
        'goal_diff_pg':    (goals_for - goals_against) / n,
        'played':          n,
    }


def _h2h_stats(home_team_id, away_team_id, all_completed):
    """Head-to-head record between two specific teams."""
    h2h = [
        m for m in all_completed
        if (m.home_team_id == home_team_id and m.away_team_id == away_team_id) or
           (m.home_team_id == away_team_id and m.away_team_id == home_team_id)
    ]
    if not h2h:
        return {'home_h2h_wins': 0.33, 'away_h2h_wins': 0.33, 'h2h_draws': 0.34}

    home_wins = away_wins = draws = 0
    for m in h2h:
        hs, as_ = m.home_score or 0, m.away_score or 0
        if m.home_team_id == home_team_id:
            if hs > as_:   home_wins += 1
            elif hs < as_: away_wins += 1
            else:          draws     += 1
        else:
            if as_ > hs:   home_wins += 1
            elif as_ < hs: away_wins += 1
            else:          draws     += 1

    n = len(h2h)
    return {
        'home_h2h_wins': home_wins / n,
        'away_h2h_wins': away_wins / n,
        'h2h_draws':     draws / n,
    }


def _avg_team_rating(team_id, perf_stats):
    """Average player rating for a team from PerformanceStat records."""
    ratings = [
        float(s.rating) for s in perf_stats
        if s.team_id == team_id and s.rating is not None
    ]
    if not ratings:
        return 6.5  # neutral default
    return sum(ratings) / len(ratings)


def build_features(home_team_id, away_team_id, all_completed, perf_stats):
    """Build a feature vector for XGBoost prediction."""
    home_all    = _team_stats(home_team_id, all_completed)
    away_all    = _team_stats(away_team_id, all_completed)
    home_form   = _team_stats(home_team_id, all_completed, last_n=5)
    away_form   = _team_stats(away_team_id, all_completed, last_n=5)
    h2h         = _h2h_stats(home_team_id, away_team_id, all_completed)
    home_rating = _avg_team_rating(home_team_id, perf_stats)
    away_rating = _avg_team_rating(away_team_id, perf_stats)

    features = [
        # Overall stats
        home_all['win_rate'],
        away_all['win_rate'],
        home_all['goals_for_pg'],
        away_all['goals_for_pg'],
        home_all['goals_against_pg'],
        away_all['goals_against_pg'],
        home_all['goal_diff_pg'],
        away_all['goal_diff_pg'],

        # Recent form (last 5)
        home_form['win_rate'],
        away_form['win_rate'],
        home_form['goals_for_pg'],
        away_form['goals_for_pg'],
        home_form['goal_diff_pg'],
        away_form['goal_diff_pg'],

        # Head to head
        h2h['home_h2h_wins'],
        h2h['away_h2h_wins'],
        h2h['h2h_draws'],

        # Performance ratings
        home_rating,
        away_rating,
        home_rating - away_rating,

        # Home advantage (always 1 — included as a constant feature)
        1.0,

        # Experience (matches played)
        min(home_all['played'] / 10.0, 1.0),
        min(away_all['played'] / 10.0, 1.0),
    ]
    return np.array(features, dtype=np.float32).reshape(1, -1)


# ── XGBoost model (trained on-the-fly from historical data) ──

def _train_model(all_completed, perf_stats):
    """Train an XGBoost classifier from all completed match data."""
    X, y = [], []
    for m in all_completed:
        if m.home_score is None or m.away_score is None:
            continue
        # Exclude this match from its own training set (leave-one-out style)
        rest = [x for x in all_completed if x.match_id != m.match_id]
        feat = build_features(m.home_team_id, m.away_team_id, rest, perf_stats)
        X.append(feat[0])
        if m.home_score > m.away_score:   y.append(0)  # home win
        elif m.home_score < m.away_score: y.append(2)  # away win
        else:                              y.append(1)  # draw

    if len(X) < 3 or len(set(y)) < 2:
        return None  # not enough data to train

    X = np.array(X, dtype=np.float32)
    y = np.array(y)

    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        use_label_encoder=False,
        eval_metric='mlogloss',
        verbosity=0,
        num_class=3,
        objective='multi:softprob',
    )
    model.fit(X, y)
    return model


# ── Main prediction function ──────────────────────────────────

def predict_match(match, all_completed, perf_stats):
    """
    Returns (home_prob, draw_prob, away_prob, outcome, model_version).
    Falls back to statistical model if XGBoost is unavailable or not enough data.
    """
    features = build_features(
        match.home_team_id, match.away_team_id, all_completed, perf_stats
    )

    # Try XGBoost if available and enough data
    if XGB_AVAILABLE and len(all_completed) >= 3:
        try:
            model = _train_model(all_completed, perf_stats)
            if model is not None:
                probs = model.predict_proba(features)[0]  # [home, draw, away]
                home_p = round(float(probs[0]), 4)
                draw_p = round(float(probs[1]), 4)
                away_p = round(float(probs[2]), 4)
                # Normalize
                total  = home_p + draw_p + away_p
                home_p = round(home_p / total, 4)
                draw_p = round(draw_p / total, 4)
                away_p = round(1 - home_p - draw_p, 4)

                if home_p >= draw_p and home_p >= away_p:   outcome = 'home'
                elif away_p >= home_p and away_p >= draw_p: outcome = 'away'
                else:                                        outcome = 'draw'

                return home_p, draw_p, away_p, outcome, 'xgboost_v1'
        except Exception:
            pass  # fall through to statistical fallback

    # ── Statistical fallback ─────────────────────────────────
    f = features[0]
    home_wr  = f[0]   # overall home win rate
    away_wr  = f[1]   # overall away win rate
    home_frm = f[8]   # recent form
    away_frm = f[9]
    h2h_home = f[14]
    h2h_away = f[15]
    home_rat = f[17]
    away_rat = f[18]

    # Weighted score
    home_score = (home_wr * 0.3) + (home_frm * 0.3) + (h2h_home * 0.2) + ((home_rat / 10) * 0.2) + 0.05
    away_score = (away_wr * 0.3) + (away_frm * 0.3) + (h2h_away * 0.2) + ((away_rat / 10) * 0.2)
    draw_score = 0.25  # base draw probability

    total  = home_score + away_score + draw_score
    home_p = round(home_score / total, 4)
    away_p = round(away_score / total, 4)
    draw_p = round(1 - home_p - away_p, 4)

    if home_p >= away_p and home_p >= draw_p:   outcome = 'home'
    elif away_p >= home_p and away_p >= draw_p: outcome = 'away'
    else:                                        outcome = 'draw'

    version = 'stats_v2' if not XGB_AVAILABLE else 'stats_v2_fallback'
    return home_p, draw_p, away_p, outcome, version