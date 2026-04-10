"""Consolidate tournaments user_id column

Revision ID: 0010
Revises: 0009
Create Date: 2026-04-09 19:53:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0010'
down_revision = '0009'
branch_labels = None
depends_on = None


def upgrade():
    """Consolidate tournaments table"""
    
    with op.batch_alter_table('tournaments', schema=None) as batch_op:
        # Copy user_id values to created_by for existing records
        op.execute("""
            UPDATE tournaments 
            SET created_by = user_id 
            WHERE created_by IS NULL AND user_id IS NOT NULL
        """)
        
        # Make user_id nullable
        batch_op.alter_column('user_id',
               existing_type=sa.INTEGER(),
               nullable=True,
               existing_nullable=False)


def downgrade():
    """Revert tournaments changes"""
    with op.batch_alter_table('tournaments', schema=None) as batch_op:
        batch_op.alter_column('user_id',
               existing_type=sa.INTEGER(),
               nullable=False,
               existing_nullable=True)
