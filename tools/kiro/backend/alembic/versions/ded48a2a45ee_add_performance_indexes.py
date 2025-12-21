"""add_performance_indexes

Revision ID: ded48a2a45ee
Revises: 3521548e5573
Create Date: 2025-12-21 03:06:23.607865

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ded48a2a45ee'
down_revision = '3521548e5573'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add composite indexes for frequently used query patterns
    
    # Quotes table - most common queries
    # 1. User + Date queries (get_by_user_and_date, quote_exists_for_date)
    op.create_index('idx_quotes_user_date', 'quotes', ['user_id', 'date'])
    
    # 2. User + Date range queries (get_recent_quotes, archive browsing)
    op.create_index('idx_quotes_user_date_desc', 'quotes', ['user_id', 'date'], postgresql_ops={'date': 'DESC'})
    
    # 3. User + Theme queries (get_quotes_by_theme)
    op.create_index('idx_quotes_user_theme', 'quotes', ['user_id', 'theme_id'])
    
    # 4. Content search optimization (search_quotes)
    # Note: Full-text search index would be better, but this helps with LIKE queries
    op.create_index('idx_quotes_content_user', 'quotes', ['user_id', 'content'])
    
    # Themes table - date range queries are very common
    # 1. Date range queries (get_theme_for_date, get_current_theme)
    op.create_index('idx_themes_date_range', 'themes', ['start_date', 'end_date'])
    
    # 2. Type + Date queries (get_monthly_themes, get_weekly_themes_for_month)
    op.create_index('idx_themes_type_start_date', 'themes', ['type', 'start_date'])
    
    # 3. Parent theme queries (get_weekly_themes_for_month)
    op.create_index('idx_themes_parent_type', 'themes', ['parent_theme_id', 'type'])
    
    # Feedback table - user-centric queries
    # 1. User + Quote queries (get_by_quote_and_user)
    op.create_index('idx_feedback_user_quote', 'feedback', ['user_id', 'quote_id'])
    
    # 2. User + Rating queries (get_feedback_by_rating)
    op.create_index('idx_feedback_user_rating', 'feedback', ['user_id', 'rating'])
    
    # 3. User + Timestamp for chronological ordering
    op.create_index('idx_feedback_user_timestamp_desc', 'feedback', ['user_id', 'timestamp'], postgresql_ops={'timestamp': 'DESC'})
    
    # Users table - sync and status queries
    # 1. Active users queries (get_active_users, count_active_users)
    op.create_index('idx_users_active_created', 'users', ['is_active', 'created_at'])
    
    # 2. Sync token queries are already indexed, but add updated_at for sync operations
    op.create_index('idx_users_sync_updated', 'users', ['sync_token', 'updated_at'])


def downgrade() -> None:
    # Remove all the performance indexes
    op.drop_index('idx_users_sync_updated', table_name='users')
    op.drop_index('idx_users_active_created', table_name='users')
    op.drop_index('idx_feedback_user_timestamp_desc', table_name='feedback')
    op.drop_index('idx_feedback_user_rating', table_name='feedback')
    op.drop_index('idx_feedback_user_quote', table_name='feedback')
    op.drop_index('idx_themes_parent_type', table_name='themes')
    op.drop_index('idx_themes_type_start_date', table_name='themes')
    op.drop_index('idx_themes_date_range', table_name='themes')
    op.drop_index('idx_quotes_content_user', table_name='quotes')
    op.drop_index('idx_quotes_user_theme', table_name='quotes')
    op.drop_index('idx_quotes_user_date_desc', table_name='quotes')
    op.drop_index('idx_quotes_user_date', table_name='quotes')