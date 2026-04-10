"""Migrate leagues table from user_id to created_by

Revision ID: 0008
Revises: 0007
Create Date: 2026-04-09 19:51:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None


def upgrade():
    """Migrate leagues table: consolidate user_id and created_by"""
    
    with op.batch_alter_table('leagues', schema=None) as batch_op:
        # Copy user_id values to created_by for existing records
        op.execute("""
            UPDATE leagues 
            SET created_by = user_id 
            WHERE created_by IS NULL AND user_id IS NOT NULL
        """)
        
        # Now make user_id nullable (or drop it)
        batch_op.alter_column('user_id',
               existing_type=sa.INTEGER(),
               nullable=True,
               existing_nullable=False)


def downgrade():
    """Revert user_id changes"""
    with op.batch_alter_table('leagues', schema=None) as batch_op:
        batch_op.alter_column('user_id',
               existing_type=sa.INTEGER(),
               nullable=False,
               existing_nullable=True)
