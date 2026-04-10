"""Add missing columns to matches and predictions tables

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-09 19:42:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade():
    """Add missing columns to matches and predictions tables"""
    
    # Update matches table
    with op.batch_alter_table('matches', schema=None) as batch_op:
        try:
            batch_op.add_column(sa.Column('season_id', sa.Integer(), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('venue', sa.String(length=100), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('tournament_title', sa.String(length=150), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('round_number', sa.Integer(), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('entered_by', sa.Integer(), nullable=True))
        except:
            pass
    
    # Update predictions table
    with op.batch_alter_table('predictions', schema=None) as batch_op:
        try:
            batch_op.add_column(sa.Column('home_win_prob', sa.Numeric(precision=5, scale=4), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('away_win_prob', sa.Numeric(precision=5, scale=4), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('draw_prob', sa.Numeric(precision=5, scale=4), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('predicted_outcome', sa.String(length=10), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('model_version', sa.String(length=20), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('predicted_at', sa.DateTime(), nullable=True))
        except:
            pass


def downgrade():
    """Remove added columns"""
    with op.batch_alter_table('predictions', schema=None) as batch_op:
        batch_op.drop_column('predicted_at')
        batch_op.drop_column('model_version')
        batch_op.drop_column('predicted_outcome')
        batch_op.drop_column('draw_prob')
        batch_op.drop_column('away_win_prob')
        batch_op.drop_column('home_win_prob')
    
    with op.batch_alter_table('matches', schema=None) as batch_op:
        batch_op.drop_column('entered_by')
        batch_op.drop_column('round_number')
        batch_op.drop_column('tournament_title')
        batch_op.drop_column('venue')
        batch_op.drop_column('season_id')
