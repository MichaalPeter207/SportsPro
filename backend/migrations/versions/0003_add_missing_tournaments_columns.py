"""Add missing columns to tournaments table

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-09 19:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade():
    """Add missing columns to tournaments table"""
    with op.batch_alter_table('tournaments', schema=None) as batch_op:
        # Add description
        try:
            batch_op.add_column(sa.Column('description', sa.Text(), nullable=True))
        except:
            pass
        
        # Add season_id
        try:
            batch_op.add_column(sa.Column('season_id', sa.Integer(), nullable=True))
        except:
            pass
        
        # Add created_by
        try:
            batch_op.add_column(sa.Column('created_by', sa.Integer(), nullable=True))
        except:
            pass
        
        # Add status
        try:
            batch_op.add_column(sa.Column('status', sa.String(length=20), nullable=True))
        except:
            pass
        
        # Add access_code
        try:
            batch_op.add_column(sa.Column('access_code', sa.String(length=12), nullable=True))
        except:
            pass
        
        # Add archived_at
        try:
            batch_op.add_column(sa.Column('archived_at', sa.DateTime(), nullable=True))
        except:
            pass
        
        # Add archived_by
        try:
            batch_op.add_column(sa.Column('archived_by', sa.Integer(), nullable=True))
        except:
            pass


def downgrade():
    """Remove added columns"""
    with op.batch_alter_table('tournaments', schema=None) as batch_op:
        batch_op.drop_column('archived_by')
        batch_op.drop_column('archived_at')
        batch_op.drop_column('access_code')
        batch_op.drop_column('status')
        batch_op.drop_column('created_by')
        batch_op.drop_column('season_id')
        batch_op.drop_column('description')
