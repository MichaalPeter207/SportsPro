"""Consolidate teams user_id column

Revision ID: 0009
Revises: 0008
Create Date: 2026-04-09 19:52:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None


def upgrade():
    """Make teams.user_id nullable"""
    
    with op.batch_alter_table('teams', schema=None) as batch_op:
        batch_op.alter_column('user_id',
               existing_type=sa.INTEGER(),
               nullable=True,
               existing_nullable=False)


def downgrade():
    """Revert teams.user_id changes"""
    with op.batch_alter_table('teams', schema=None) as batch_op:
        batch_op.alter_column('user_id',
               existing_type=sa.INTEGER(),
               nullable=False,
               existing_nullable=True)
