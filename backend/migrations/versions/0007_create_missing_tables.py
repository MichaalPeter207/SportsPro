"""Create missing seasons and tournament_coaches tables

Revision ID: 0007
Revises: 0006
Create Date: 2026-04-09 19:47:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade():
    """Create missing tables"""
    
    # Create seasons table
    op.create_table('seasons',
    sa.Column('season_id', sa.Integer(), nullable=False),
    sa.Column('league_id', sa.Integer(), nullable=False),
    sa.Column('season_name', sa.String(length=50), nullable=False),
    sa.Column('start_date', sa.Date(), nullable=False),
    sa.Column('end_date', sa.Date(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.ForeignKeyConstraint(['league_id'], ['leagues.league_id'], ),
    sa.PrimaryKeyConstraint('season_id')
    )
    
    # Create tournament_coaches table
    op.create_table('tournament_coaches',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tournament_id', sa.Integer(), nullable=False),
    sa.Column('coach_id', sa.Integer(), nullable=False),
    sa.Column('granted_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['coach_id'], ['users.user_id'], ),
    sa.ForeignKeyConstraint(['tournament_id'], ['tournaments.tournament_id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    
    # Create performance_stats table (if it doesn't exist as player_performance)
    try:
        op.create_table('performance_stats',
        sa.Column('stat_id', sa.Integer(), nullable=False),
        sa.Column('match_id', sa.Integer(), nullable=False),
        sa.Column('player_id', sa.Integer(), nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.Column('goals', sa.Integer(), nullable=True),
        sa.Column('assists', sa.Integer(), nullable=True),
        sa.Column('yellow_cards', sa.Integer(), nullable=True),
        sa.Column('red_cards', sa.Integer(), nullable=True),
        sa.Column('minutes_played', sa.Integer(), nullable=True),
        sa.Column('rating', sa.Numeric(precision=3, scale=1), nullable=True),
        sa.ForeignKeyConstraint(['match_id'], ['matches.match_id'], ),
        sa.ForeignKeyConstraint(['player_id'], ['players.player_id'], ),
        sa.ForeignKeyConstraint(['team_id'], ['teams.team_id'], ),
        sa.PrimaryKeyConstraint('stat_id')
        )
    except:
        pass


def downgrade():
    """Drop created tables"""
    op.drop_table('performance_stats')
    op.drop_table('tournament_coaches')
    op.drop_table('seasons')
