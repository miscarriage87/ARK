"""
Theme repository for ARK Digital Calendar.

This module provides database operations specific to Theme entities
with additional business logic and validation.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import and_, or_, desc, asc
from datetime import date, datetime, timedelta
import logging

from app.models.theme import Theme, ThemeType
from app.repositories.base import BaseRepository
from app.core.cache import cached_query, invalidate_theme_cache

logger = logging.getLogger(__name__)


class ThemeRepository(BaseRepository[Theme]):
    """
    Repository for Theme entity operations.
    
    Provides CRUD operations and business-specific queries for themes.
    """
    
    def __init__(self, db: Session):
        """Initialize ThemeRepository with database session."""
        super().__init__(Theme, db)
    
    def create(self, obj_data: Dict[str, Any]) -> Optional[Theme]:
        """
        Create a new theme and invalidate theme caches.
        
        Args:
            obj_data: Dictionary containing theme data
            
        Returns:
            Created theme or None if creation failed
        """
        result = super().create(obj_data)
        if result:
            # Invalidate theme caches when new theme is created
            invalidate_theme_cache()
        return result
    
    def get_theme_for_date(self, target_date: date) -> Optional[Theme]:
        """
        Retrieve the theme for a specific date.
        
        Args:
            target_date: Date to get theme for
            
        Returns:
            Theme if found, None otherwise
        """
        try:
            return (self.db.query(Theme)
                   .filter(and_(
                       Theme.start_date <= target_date,
                       Theme.end_date >= target_date
                   ))
                   .order_by(Theme.type.desc())  # Prefer weekly over monthly
                   .first())
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving theme for date: {e}")
            return None
    
    @cached_query(ttl=3600)  # Cache for 1 hour - themes change infrequently
    def get_current_theme(self, current_date: date = None) -> Optional[Theme]:
        """
        Retrieve the current active theme for a given date.
        
        Args:
            current_date: Date to check (defaults to today)
            
        Returns:
            Current theme if found, None otherwise
        """
        if current_date is None:
            current_date = date.today()
        
        try:
            return (self.db.query(Theme)
                   .filter(and_(
                       Theme.start_date <= current_date,
                       Theme.end_date >= current_date
                   ))
                   .order_by(Theme.type.desc())  # Prefer weekly over monthly
                   .first())
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving current theme: {e}")
            return None
    
    def get_themes_by_type(self, theme_type: ThemeType) -> List[Theme]:
        """
        Retrieve all themes of a specific type.
        
        Args:
            theme_type: Type of theme (MONTHLY or WEEKLY)
            
        Returns:
            List of themes of the specified type
        """
        try:
            return (self.db.query(Theme)
                   .filter(Theme.type == theme_type)
                   .order_by(asc(Theme.start_date))
                   .all())
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving themes by type: {e}")
            return []
    
    @cached_query(ttl=7200)  # Cache for 2 hours - monthly themes are very stable
    def get_monthly_themes(self, year: int = None) -> List[Theme]:
        """
        Retrieve all monthly themes for a specific year.
        
        Args:
            year: Year to filter by (defaults to current year)
            
        Returns:
            List of monthly themes
        """
        if year is None:
            year = date.today().year
        
        try:
            start_of_year = date(year, 1, 1)
            end_of_year = date(year, 12, 31)
            
            return (self.db.query(Theme)
                   .filter(and_(
                       Theme.type == ThemeType.MONTHLY,
                       Theme.start_date >= start_of_year,
                       Theme.start_date <= end_of_year
                   ))
                   .order_by(asc(Theme.start_date))
                   .all())
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving monthly themes: {e}")
            return []
    
    def get_weekly_themes_for_month(self, parent_theme_id: str) -> List[Theme]:
        """
        Retrieve all weekly themes for a specific monthly theme.
        
        Args:
            parent_theme_id: ID of the parent monthly theme
            
        Returns:
            List of weekly themes
        """
        try:
            return (self.db.query(Theme)
                   .filter(and_(
                       Theme.type == ThemeType.WEEKLY,
                       Theme.parent_theme_id == parent_theme_id
                   ))
                   .order_by(asc(Theme.start_date))
                   .all())
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving weekly themes: {e}")
            return []
    
    def get_themes_in_date_range(self, start_date: date, end_date: date) -> List[Theme]:
        """
        Retrieve themes that overlap with a specific date range.
        
        Args:
            start_date: Start of the date range
            end_date: End of the date range
            
        Returns:
            List of themes in the date range
        """
        try:
            return (self.db.query(Theme)
                   .filter(or_(
                       and_(Theme.start_date <= end_date, Theme.end_date >= start_date)
                   ))
                   .order_by(asc(Theme.start_date))
                   .all())
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving themes in date range: {e}")
            return []
    
    def search_themes_by_keyword(self, keyword: str) -> List[Theme]:
        """
        Search themes by keyword in their keywords list.
        
        Args:
            keyword: Keyword to search for
            
        Returns:
            List of matching themes
        """
        try:
            # For SQLite, we need to search in JSON field differently
            return (self.db.query(Theme)
                   .filter(Theme.keywords.contains(f'"{keyword}"'))
                   .order_by(asc(Theme.start_date))
                   .all())
        except SQLAlchemyError as e:
            logger.error(f"Database error searching themes by keyword: {e}")
            return []
    
    def get_theme_with_subthemes(self, theme_id: str) -> Optional[Theme]:
        """
        Retrieve a theme with all its sub-themes loaded.
        
        Args:
            theme_id: Theme ID
            
        Returns:
            Theme with sub-themes loaded, None if not found
        """
        try:
            return (self.db.query(Theme)
                   .options(joinedload(Theme.sub_themes))
                   .filter(Theme.id == theme_id)
                   .first())
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving theme with subthemes: {e}")
            return None
    
    def get_upcoming_themes(self, days_ahead: int = 30) -> List[Theme]:
        """
        Retrieve themes that will be active in the next specified days.
        
        Args:
            days_ahead: Number of days to look ahead
            
        Returns:
            List of upcoming themes
        """
        try:
            today = date.today()
            future_date = today + timedelta(days=days_ahead)
            
            return (self.db.query(Theme)
                   .filter(and_(
                       Theme.start_date >= today,
                       Theme.start_date <= future_date
                   ))
                   .order_by(asc(Theme.start_date))
                   .all())
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving upcoming themes: {e}")
            return []
    
    def validate_theme_dates(self, start_date: date, end_date: date, theme_id: str = None) -> bool:
        """
        Validate that theme dates don't overlap with existing themes of the same type.
        
        Args:
            start_date: Proposed start date
            end_date: Proposed end date
            theme_id: ID of theme being updated (to exclude from overlap check)
            
        Returns:
            True if dates are valid, False if there's an overlap
        """
        try:
            query = self.db.query(Theme).filter(or_(
                and_(Theme.start_date <= end_date, Theme.end_date >= start_date)
            ))
            
            if theme_id:
                query = query.filter(Theme.id != theme_id)
            
            overlapping_themes = query.all()
            return len(overlapping_themes) == 0
        except SQLAlchemyError as e:
            logger.error(f"Database error validating theme dates: {e}")
            return False
    
    def get_theme_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about themes in the database.
        
        Returns:
            Dictionary with theme statistics
        """
        try:
            total_themes = self.count()
            monthly_count = self.db.query(Theme).filter(Theme.type == ThemeType.MONTHLY).count()
            weekly_count = self.db.query(Theme).filter(Theme.type == ThemeType.WEEKLY).count()
            
            return {
                'total_themes': total_themes,
                'monthly_themes': monthly_count,
                'weekly_themes': weekly_count
            }
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving theme statistics: {e}")
            return {}