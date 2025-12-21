"""fix_theme_type_constraint

Revision ID: 3521548e5573
Revises: 392d37558c6b
Create Date: 2025-12-20 19:01:45.259547

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3521548e5573'
down_revision = '392d37558c6b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use batch mode for SQLite compatibility
    with op.batch_alter_table('themes') as batch_op:
        # Drop the old constraint
        batch_op.drop_constraint('valid_theme_type', type_='check')
        
        # Add the new constraint with uppercase enum values
        batch_op.create_check_constraint(
            'valid_theme_type',
            "type IN ('MONTHLY', 'WEEKLY')"
        )


def downgrade() -> None:
    # Use batch mode for SQLite compatibility
    with op.batch_alter_table('themes') as batch_op:
        # Drop the new constraint
        batch_op.drop_constraint('valid_theme_type', type_='check')
        
        # Restore the old constraint with lowercase values
        batch_op.create_check_constraint(
            'valid_theme_type',
            "type IN ('monthly', 'weekly')"
        )