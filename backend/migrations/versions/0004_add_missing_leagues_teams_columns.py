"""Add missing columns to leagues and teams tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-09 19:41:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade():
    """Add missing columns to leagues and teams tables"""
    
    # Update leagues table
    with op.batch_alter_table('leagues', schema=None) as batch_op:
        try:
            batch_op.add_column(sa.Column('sport_type', sa.String(length=50), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('country', sa.String(length=50), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('description', sa.Text(), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('created_by', sa.Integer(), nullable=True))
        except:
            pass
    
    # Update teams table
    with op.batch_alter_table('teams', schema=None) as batch_op:
        try:
            batch_op.add_column(sa.Column('league_id', sa.Integer(), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('department', sa.String(length=100), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('coach_id', sa.Integer(), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('home_city', sa.String(length=100), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('stadium', sa.String(length=100), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('founded', sa.Integer(), nullable=True))
        except:
            pass


def downgrade():
    """Remove added columns"""
    with op.batch_alter_table('teams', schema=None) as batch_op:
        batch_op.drop_column('founded')
        batch_op.drop_column('stadium')
        batch_op.drop_column('home_city')
        batch_op.drop_column('coach_id')
        batch_op.drop_column('department')
        batch_op.drop_column('league_id')
    
    with op.batch_alter_table('leagues', schema=None) as batch_op:
        batch_op.drop_column('created_by')
        batch_op.drop_column('description')
        batch_op.drop_column('country')
        batch_op.drop_column('sport_type')
