"""Add missing columns to users table

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-09 19:24:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade():
    """Add missing columns to users table"""
    with op.batch_alter_table('users', schema=None) as batch_op:
        # Add first_name and last_name if they don't exist
        try:
            batch_op.add_column(sa.Column('first_name', sa.String(length=50), nullable=True))
        except:
            pass
        
        try:
            batch_op.add_column(sa.Column('last_name', sa.String(length=50), nullable=True))
        except:
            pass
        
        # Add is_active if it doesn't exist
        try:
            batch_op.add_column(sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'))
        except:
            pass
        
        # Add verify_code if it doesn't exist
        try:
            batch_op.add_column(sa.Column('verify_code', sa.String(length=6), nullable=True))
        except:
            pass
        
        # Add verify_code_expires if it doesn't exist
        try:
            batch_op.add_column(sa.Column('verify_code_expires', sa.DateTime(), nullable=True))
        except:
            pass
        
        # Add phone_number if it doesn't exist
        try:
            batch_op.add_column(sa.Column('phone_number', sa.String(length=20), nullable=True))
        except:
            pass


def downgrade():
    """Remove added columns"""
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('phone_number')
        batch_op.drop_column('verify_code_expires')
        batch_op.drop_column('verify_code')
        batch_op.drop_column('is_active')
        batch_op.drop_column('last_name')
        batch_op.drop_column('first_name')
