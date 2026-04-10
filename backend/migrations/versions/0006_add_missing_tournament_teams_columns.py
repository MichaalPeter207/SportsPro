"""Add missing columns to tournament_teams table

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-09 19:43:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade():
    """Add missing columns to tournament_teams table"""
    
    with op.batch_alter_table('tournament_teams', schema=None) as batch_op:
        try:
            batch_op.add_column(sa.Column('registered_at', sa.DateTime(), nullable=True))
        except:
            pass
        try:
            batch_op.add_column(sa.Column('registered_by', sa.Integer(), nullable=True))
        except:
            pass


def downgrade():
    """Remove added columns"""
    with op.batch_alter_table('tournament_teams', schema=None) as batch_op:
        batch_op.drop_column('registered_by')
        batch_op.drop_column('registered_at')
