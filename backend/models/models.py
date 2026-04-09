# =============================================================
#  models/models.py
# =============================================================

from extensions import db
from datetime import datetime
import secrets, string


def _gen_code(n=8):
    alpha = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alpha) for _ in range(n))


class User(db.Model):
    __tablename__ = 'users'

    user_id             = db.Column(db.Integer, primary_key=True)
    username            = db.Column(db.String(50),  unique=True, nullable=False)
    email               = db.Column(db.String(100), unique=True, nullable=False)
    password_hash       = db.Column(db.String(255), nullable=False)
    role                = db.Column(db.String(20),  nullable=False, default='fan')
    first_name          = db.Column(db.String(50))
    last_name           = db.Column(db.String(50))
    created_at          = db.Column(db.DateTime, default=datetime.utcnow)
    is_active           = db.Column(db.Boolean, default=True)
    is_verified         = db.Column(db.Boolean, default=False)
    verify_token        = db.Column(db.String(255))
    verify_code         = db.Column(db.String(6))
    verify_code_expires = db.Column(db.DateTime)

    def has_role(self, role):
        return UserRole.query.filter_by(user_id=self.user_id, role=role).first() is not None

    def get_roles(self):
        return [r.role for r in UserRole.query.filter_by(user_id=self.user_id).all()]

    def to_dict(self):
        return {
            'user_id':    self.user_id,
            'username':   self.username,
            'email':      self.email,
            'role':       self.role,
            'first_name': self.first_name,
            'last_name':  self.last_name,
            'is_verified': self.is_verified,
        }


class League(db.Model):
    __tablename__ = 'leagues'

    league_id   = db.Column(db.Integer, primary_key=True)
    league_name = db.Column(db.String(100), nullable=False)
    sport_type  = db.Column(db.String(50),  default='Football')
    country     = db.Column(db.String(50))
    description = db.Column(db.Text)
    created_by  = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    teams   = db.relationship('Team',   backref='league', lazy=True)
    seasons = db.relationship('Season', backref='league', lazy=True)

    def to_dict(self):
        return {
            'league_id':   self.league_id,
            'league_name': self.league_name,
            'sport_type':  self.sport_type,
            'country':     self.country,
            'description': self.description,
        }


class Season(db.Model):
    __tablename__ = 'seasons'

    season_id   = db.Column(db.Integer, primary_key=True)
    league_id   = db.Column(db.Integer, db.ForeignKey('leagues.league_id'), nullable=False)
    season_name = db.Column(db.String(50), nullable=False)
    start_date  = db.Column(db.Date, nullable=False)
    end_date    = db.Column(db.Date, nullable=False)
    is_active   = db.Column(db.Boolean, default=True)

    matches = db.relationship('Match', backref='season', lazy=True)

    def to_dict(self):
        return {
            'season_id':   self.season_id,
            'league_id':   self.league_id,
            'season_name': self.season_name,
            'start_date':  str(self.start_date),
            'end_date':    str(self.end_date),
            'is_active':   self.is_active,
        }


class Team(db.Model):
    __tablename__ = 'teams'

    team_id    = db.Column(db.Integer, primary_key=True)
    league_id  = db.Column(db.Integer, db.ForeignKey('leagues.league_id'), nullable=False)
    team_name  = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100))
    coach_id   = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    home_city  = db.Column(db.String(100))
    stadium    = db.Column(db.String(100))
    founded    = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    players = db.relationship('Player', backref='team', lazy=True)

    def to_dict(self):
        return {
            'team_id':    self.team_id,
            'league_id':  self.league_id,
            'team_name':  self.team_name,
            'department': self.department,
            'home_city':  self.home_city,
            'stadium':    self.stadium,
            'founded':    self.founded,
            'coach_id':   self.coach_id,
        }


class Player(db.Model):
    __tablename__ = 'players'

    player_id     = db.Column(db.Integer, primary_key=True)
    team_id       = db.Column(db.Integer, db.ForeignKey('teams.team_id'), nullable=False)
    first_name    = db.Column(db.String(50), nullable=False)
    last_name     = db.Column(db.String(50), nullable=False)
    position      = db.Column(db.String(30))
    jersey_num    = db.Column(db.Integer)
    nationality   = db.Column(db.String(50))
    date_of_birth = db.Column(db.Date)
    height_cm     = db.Column(db.Integer)
    weight_kg     = db.Column(db.Integer)
    is_active     = db.Column(db.Boolean, default=True)
    joined_at     = db.Column(db.DateTime, default=datetime.utcnow)

    stats = db.relationship('PerformanceStat', backref='player', lazy=True)

    def to_dict(self):
        return {
            'player_id':     self.player_id,
            'team_id':       self.team_id,
            'first_name':    self.first_name,
            'last_name':     self.last_name,
            'position':      self.position,
            'jersey_num':    self.jersey_num,
            'nationality':   self.nationality,
            'date_of_birth': str(self.date_of_birth) if self.date_of_birth else None,
            'height_cm':     self.height_cm,
            'weight_kg':     self.weight_kg,
        }


# =============================================================
#  TOURNAMENT
#  status: 'active' | 'completed' | 'archived'
#  Every match belongs to a tournament.
#  Only the owner coach (or admin, or a coach with access code)
#  can manage a tournament's data.
# =============================================================
class Tournament(db.Model):
    __tablename__ = 'tournaments'

    tournament_id = db.Column(db.Integer, primary_key=True)
    title         = db.Column(db.String(150), nullable=False)
    description   = db.Column(db.Text)
    season_id     = db.Column(db.Integer, db.ForeignKey('seasons.season_id'), nullable=False)
    created_by    = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    status        = db.Column(db.String(20), default='active')   # active | completed | archived
    access_code   = db.Column(db.String(12), unique=True, nullable=False, default=_gen_code)
    start_date    = db.Column(db.Date)
    end_date      = db.Column(db.Date)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    archived_at   = db.Column(db.DateTime)
    archived_by   = db.Column(db.Integer, db.ForeignKey('users.user_id'))

    season       = db.relationship('Season', foreign_keys=[season_id])
    owner        = db.relationship('User',   foreign_keys=[created_by])
    archiver     = db.relationship('User',   foreign_keys=[archived_by])
    matches      = db.relationship('Match',  backref='tournament', lazy=True)
    coach_access  = db.relationship('TournamentCoach', backref='tournament',
                                    lazy=True, cascade='all, delete-orphan')
    teams         = db.relationship('TournamentTeam', backref='tournament',
                                    lazy=True, cascade='all, delete-orphan')

    def to_dict(self, include_code=False):
        d = {
            'tournament_id': self.tournament_id,
            'title':         self.title,
            'description':   self.description,
            'season_id':     self.season_id,
            'season_name':   self.season.season_name if self.season else '',
            'created_by':    self.created_by,
            'owner_name':    self.owner.username if self.owner else '',
            'status':        self.status,
            'start_date':    str(self.start_date) if self.start_date else None,
            'end_date':      str(self.end_date)   if self.end_date   else None,
            'created_at':    str(self.created_at),
            'archived_at':   str(self.archived_at) if self.archived_at else None,
            'match_count':   len(self.matches),
            'team_count':    len(self.teams),
        }
        if include_code:
            d['access_code'] = self.access_code
        return d


# =============================================================
#  TOURNAMENT COACH ACCESS
#  Coaches granted access via access code
# =============================================================
class TournamentCoach(db.Model):
    __tablename__ = 'tournament_coaches'

    id            = db.Column(db.Integer, primary_key=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey('tournaments.tournament_id'), nullable=False)
    coach_id      = db.Column(db.Integer, db.ForeignKey('users.user_id'),             nullable=False)
    granted_at    = db.Column(db.DateTime, default=datetime.utcnow)

    coach = db.relationship('User', foreign_keys=[coach_id])

    def to_dict(self):
        return {
            'tournament_id': self.tournament_id,
            'coach_id':      self.coach_id,
            'coach_name':    self.coach.username if self.coach else '',
            'granted_at':    str(self.granted_at),
        }



# =============================================================
#  TOURNAMENT TEAM
#  Teams registered to compete in a specific tournament
# =============================================================
class TournamentTeam(db.Model):
    __tablename__ = 'tournament_teams'

    id            = db.Column(db.Integer, primary_key=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey('tournaments.tournament_id'), nullable=False)
    team_id       = db.Column(db.Integer, db.ForeignKey('teams.team_id'),             nullable=False)
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    registered_by = db.Column(db.Integer, db.ForeignKey('users.user_id'))

    team      = db.relationship('Team', foreign_keys=[team_id])
    registrar = db.relationship('User', foreign_keys=[registered_by])

    def to_dict(self):
        return {
            'tournament_id': self.tournament_id,
            'team_id':       self.team_id,
            'team_name':     self.team.team_name if self.team else '',
            'registered_at': str(self.registered_at),
        }


class Match(db.Model):
    __tablename__ = 'matches'

    match_id         = db.Column(db.Integer, primary_key=True)
    season_id        = db.Column(db.Integer, db.ForeignKey('seasons.season_id'), nullable=False)
    tournament_id    = db.Column(db.Integer, db.ForeignKey('tournaments.tournament_id'))
    home_team_id     = db.Column(db.Integer, db.ForeignKey('teams.team_id'), nullable=False)
    away_team_id     = db.Column(db.Integer, db.ForeignKey('teams.team_id'), nullable=False)
    match_date       = db.Column(db.DateTime, nullable=False)
    venue            = db.Column(db.String(100))
    tournament_title = db.Column(db.String(150))
    home_score       = db.Column(db.Integer)
    away_score       = db.Column(db.Integer)
    status           = db.Column(db.String(20), default='scheduled')
    round_number     = db.Column(db.Integer)
    entered_by       = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    created_at       = db.Column(db.DateTime, default=datetime.utcnow)

    home_team  = db.relationship('Team', foreign_keys=[home_team_id])
    away_team  = db.relationship('Team', foreign_keys=[away_team_id])
    stats      = db.relationship('PerformanceStat', backref='match', lazy=True)
    prediction = db.relationship('Prediction', backref='match', uselist=False)

    def to_dict(self):
        return {
            'match_id':         self.match_id,
            'season_id':        self.season_id,
            'tournament_id':    self.tournament_id,
            'home_team':        self.home_team.team_name if self.home_team else None,
            'away_team':        self.away_team.team_name if self.away_team else None,
            'home_team_id':     self.home_team_id,
            'away_team_id':     self.away_team_id,
            'match_date':       str(self.match_date),
            'venue':            self.venue,
            'tournament_title': self.tournament_title,
            'home_score':       self.home_score,
            'away_score':       self.away_score,
            'status':           self.status,
            'round_number':     self.round_number,
            'entered_by':       self.entered_by,
        }


class PerformanceStat(db.Model):
    __tablename__ = 'performance_stats'

    stat_id        = db.Column(db.Integer, primary_key=True)
    match_id       = db.Column(db.Integer, db.ForeignKey('matches.match_id'), nullable=False)
    player_id      = db.Column(db.Integer, db.ForeignKey('players.player_id'), nullable=False)
    team_id        = db.Column(db.Integer, db.ForeignKey('teams.team_id'), nullable=False)
    goals          = db.Column(db.Integer, default=0)
    assists        = db.Column(db.Integer, default=0)
    yellow_cards   = db.Column(db.Integer, default=0)
    red_cards      = db.Column(db.Integer, default=0)
    minutes_played = db.Column(db.Integer, default=0)
    rating         = db.Column(db.Numeric(3, 1))

    def to_dict(self):
        return {
            'stat_id':        self.stat_id,
            'match_id':       self.match_id,
            'player_id':      self.player_id,
            'team_id':        self.team_id,
            'goals':          self.goals,
            'assists':        self.assists,
            'yellow_cards':   self.yellow_cards,
            'red_cards':      self.red_cards,
            'minutes_played': self.minutes_played,
            'rating':         float(self.rating) if self.rating else None,
        }


PlayerPerformance = PerformanceStat


class Prediction(db.Model):
    __tablename__ = 'predictions'

    prediction_id     = db.Column(db.Integer, primary_key=True)
    match_id          = db.Column(db.Integer, db.ForeignKey('matches.match_id'), nullable=False, unique=True)
    home_win_prob     = db.Column(db.Numeric(5, 4), nullable=False)
    away_win_prob     = db.Column(db.Numeric(5, 4), nullable=False)
    draw_prob         = db.Column(db.Numeric(5, 4), nullable=False)
    predicted_outcome = db.Column(db.String(10))
    model_version     = db.Column(db.String(20), default='xgb_v1')
    predicted_at      = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'prediction_id':     self.prediction_id,
            'match_id':          self.match_id,
            'home_win_prob':     float(self.home_win_prob),
            'away_win_prob':     float(self.away_win_prob),
            'draw_prob':         float(self.draw_prob),
            'predicted_outcome': self.predicted_outcome,
            'model_version':     self.model_version,
            'predicted_at':      str(self.predicted_at),
        }


class UserRole(db.Model):
    __tablename__ = 'user_roles'

    id          = db.Column(db.Integer, primary_key=True)
    user_id     = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    role        = db.Column(db.String(20), nullable=False)
    assigned_by = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'user_id':     self.user_id,
            'role':        self.role,
            'assigned_at': str(self.assigned_at),
        }


class Notification(db.Model):
    __tablename__ = 'notifications'

    notification_id = db.Column(db.Integer, primary_key=True)
    user_id         = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    title           = db.Column(db.String(100), nullable=False)
    message         = db.Column(db.Text, nullable=False)
    is_read         = db.Column(db.Boolean, default=False)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'notification_id': self.notification_id,
            'user_id':         self.user_id,
            'title':           self.title,
            'message':         self.message,
            'is_read':         self.is_read,
            'created_at':      str(self.created_at),
        }


class Feedback(db.Model):
    __tablename__ = 'feedback'

    feedback_id = db.Column(db.Integer, primary_key=True)
    user_id     = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    rating      = db.Column(db.Integer, nullable=False)
    message     = db.Column(db.Text)
    page        = db.Column(db.String(100))
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', foreign_keys=[user_id])

    def to_dict(self):
        return {
            'feedback_id': self.feedback_id,
            'user_id':     self.user_id,
            'rating':      self.rating,
            'message':     self.message,
            'page':        self.page,
            'created_at':  str(self.created_at),
        }
