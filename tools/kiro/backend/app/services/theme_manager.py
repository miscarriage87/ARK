"""
Theme Manager Service for ARK Digital Calendar.

This module provides business logic for managing theme structures,
including monthly and weekly theme definitions and hierarchical relationships.
"""

from typing import Optional, List, Dict, Any, Tuple
from datetime import date, datetime, timedelta
from calendar import monthrange
import logging

from app.models.theme import Theme, ThemeType
from app.repositories.theme_repository import ThemeRepository
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class ThemeManager:
    """
    Service for managing theme structures and hierarchical relationships.
    
    Handles creation, validation, and management of monthly and weekly themes
    with proper hierarchical structure and date management.
    """
    
    def __init__(self, theme_repo_or_db):
        """Initialize ThemeManager with database session or theme repository."""
        if isinstance(theme_repo_or_db, ThemeRepository):
            # If passed a repository directly
            self.theme_repo = theme_repo_or_db
            self.db = theme_repo_or_db.db
        else:
            # If passed a database session
            self.db = theme_repo_or_db
            self.theme_repo = ThemeRepository(theme_repo_or_db)
    
    def create_monthly_theme(
        self,
        name: str,
        description: str,
        year: int,
        month: int,
        keywords: List[str] = None,
        personality_alignment: Dict[str, float] = None,
        config: Dict[str, Any] = None
    ) -> Optional[Theme]:
        """
        Create a new monthly theme for a specific month.
        
        Args:
            name: Theme name
            description: Theme description
            year: Year for the theme
            month: Month (1-12) for the theme
            keywords: List of keywords associated with the theme
            personality_alignment: Personality category alignments
            config: Theme configuration options
            
        Returns:
            Created Theme object or None if creation failed
        """
        try:
            # Calculate start and end dates for the month
            start_date = date(year, month, 1)
            _, last_day = monthrange(year, month)
            end_date = date(year, month, last_day)
            
            # Validate no overlapping monthly themes exist
            if not self._validate_theme_period(start_date, end_date, ThemeType.MONTHLY):
                logger.error(f"Monthly theme period {start_date} to {end_date} overlaps with existing theme")
                return None
            
            # Create theme data dictionary
            theme_data = {
                'name': name,
                'description': description,
                'type': ThemeType.MONTHLY,  # Use enum object directly
                'start_date': start_date,
                'end_date': end_date,
                'keywords': keywords or [],
                'personality_alignment': personality_alignment or {},
                'config': config or self._get_default_config()
            }
            
            return self.theme_repo.create(theme_data)
            
        except Exception as e:
            logger.error(f"Error creating monthly theme: {e}")
            return None
    
    def create_weekly_theme(
        self,
        name: str,
        description: str,
        parent_theme_id: str,
        week_number: int,
        keywords: List[str] = None,
        personality_alignment: Dict[str, float] = None,
        config: Dict[str, Any] = None
    ) -> Optional[Theme]:
        """
        Create a new weekly theme under a monthly parent theme.
        
        Args:
            name: Theme name
            description: Theme description
            parent_theme_id: ID of the parent monthly theme
            week_number: Week number within the month (1-5)
            keywords: List of keywords associated with the theme
            personality_alignment: Personality category alignments
            config: Theme configuration options
            
        Returns:
            Created Theme object or None if creation failed
        """
        try:
            # Get parent theme
            parent_theme = self.theme_repo.get_by_id(parent_theme_id)
            if not parent_theme or parent_theme.type != ThemeType.MONTHLY:
                logger.error(f"Invalid parent theme: {parent_theme_id}")
                return None
            
            # Calculate week dates within the parent month
            start_date, end_date = self._calculate_week_dates(
                parent_theme.start_date, 
                parent_theme.end_date, 
                week_number
            )
            
            if not start_date or not end_date:
                logger.error(f"Invalid week number {week_number} for parent theme")
                return None
            
            # Validate no overlapping weekly themes exist for this parent
            if not self._validate_weekly_theme_period(parent_theme_id, start_date, end_date):
                logger.error(f"Weekly theme period {start_date} to {end_date} overlaps with existing weekly theme")
                return None
            
            # Create theme data dictionary
            theme_data = {
                'name': name,
                'description': description,
                'type': ThemeType.WEEKLY,  # Use enum object directly
                'start_date': start_date,
                'end_date': end_date,
                'parent_theme_id': parent_theme_id,
                'keywords': keywords or [],
                'personality_alignment': personality_alignment or {},
                'config': config or self._get_default_config()
            }
            
            return self.theme_repo.create(theme_data)
            
        except Exception as e:
            logger.error(f"Error creating weekly theme: {e}")
            return None
    
    def get_theme_hierarchy(self, theme_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the complete hierarchy for a theme (parent and children).
        
        Args:
            theme_id: Theme ID to get hierarchy for
            
        Returns:
            Dictionary containing theme hierarchy information
        """
        try:
            theme = self.theme_repo.get_theme_with_subthemes(theme_id)
            if not theme:
                return None
            
            hierarchy = {
                'theme': self._theme_to_dict(theme),
                'parent': None,
                'children': []
            }
            
            # Get parent if this is a weekly theme
            if theme.parent_theme_id:
                parent = self.theme_repo.get_by_id(theme.parent_theme_id)
                if parent:
                    hierarchy['parent'] = self._theme_to_dict(parent)
            
            # Get children if this is a monthly theme
            if theme.type == ThemeType.MONTHLY:
                weekly_themes = self.theme_repo.get_weekly_themes_for_month(theme_id)
                hierarchy['children'] = [self._theme_to_dict(t) for t in weekly_themes]
            
            return hierarchy
            
        except Exception as e:
            logger.error(f"Error getting theme hierarchy: {e}")
            return None
    
    def get_current_theme(self, target_date: date = None) -> Optional[Theme]:
        """
        Get the current active theme for a specific date.
        
        Args:
            target_date: Date to get theme for (defaults to today)
            
        Returns:
            Active Theme object or None if no theme found
        """
        if target_date is None:
            target_date = date.today()
        
        try:
            # Get all themes for the date
            themes = self.theme_repo.get_themes_in_date_range(target_date, target_date)
            
            # Prefer weekly themes over monthly themes
            weekly_theme = None
            monthly_theme = None
            
            for theme in themes:
                if theme.type == ThemeType.WEEKLY:
                    weekly_theme = theme
                elif theme.type == ThemeType.MONTHLY:
                    monthly_theme = theme
            
            # Return weekly theme if available, otherwise monthly theme
            return weekly_theme or monthly_theme
            
        except Exception as e:
            logger.error(f"Error getting current theme: {e}")
            return None
    
    def get_current_theme_context(self, target_date: date = None) -> Dict[str, Any]:
        """
        Get the current theme context including monthly and weekly themes.
        
        Args:
            target_date: Date to get context for (defaults to today)
            
        Returns:
            Dictionary containing current theme context
        """
        if target_date is None:
            target_date = date.today()
        
        try:
            context = {
                'date': target_date,
                'monthly_theme': None,
                'weekly_theme': None,
                'active_theme': None
            }
            
            # Get all themes for the date
            themes = self.theme_repo.get_themes_in_date_range(target_date, target_date)
            
            for theme in themes:
                if theme.type == ThemeType.MONTHLY:
                    context['monthly_theme'] = self._theme_to_dict(theme)
                elif theme.type == ThemeType.WEEKLY:
                    context['weekly_theme'] = self._theme_to_dict(theme)
            
            # Determine active theme (prefer weekly over monthly)
            context['active_theme'] = context['weekly_theme'] or context['monthly_theme']
            
            return context
            
        except Exception as e:
            logger.error(f"Error getting current theme context: {e}")
            return {}
    
    def validate_theme_hierarchy(self, theme_id: str) -> Dict[str, Any]:
        """
        Validate the hierarchical structure of a theme and its relationships.
        
        Args:
            theme_id: Theme ID to validate
            
        Returns:
            Dictionary containing validation results
        """
        try:
            theme = self.theme_repo.get_by_id(theme_id)
            if not theme:
                return {'valid': False, 'errors': ['Theme not found']}
            
            errors = []
            warnings = []
            
            # Validate monthly theme structure
            if theme.type == ThemeType.MONTHLY:
                # Check for weekly sub-themes
                weekly_themes = self.theme_repo.get_weekly_themes_for_month(theme_id)
                
                # Validate weekly themes don't overlap
                for i, weekly in enumerate(weekly_themes):
                    for j, other_weekly in enumerate(weekly_themes[i+1:], i+1):
                        if self._dates_overlap(
                            weekly.start_date, weekly.end_date,
                            other_weekly.start_date, other_weekly.end_date
                        ):
                            errors.append(f"Weekly themes '{weekly.name}' and '{other_weekly.name}' overlap")
                
                # Check if weekly themes cover the full month
                if weekly_themes:
                    coverage = self._calculate_theme_coverage(theme, weekly_themes)
                    if coverage < 0.8:  # Less than 80% coverage
                        warnings.append(f"Weekly themes only cover {coverage:.1%} of the month")
            
            # Validate weekly theme structure
            elif theme.type == ThemeType.WEEKLY:
                if not theme.parent_theme_id:
                    errors.append("Weekly theme must have a parent monthly theme")
                else:
                    parent = self.theme_repo.get_by_id(theme.parent_theme_id)
                    if not parent:
                        errors.append("Parent theme not found")
                    elif parent.type != ThemeType.MONTHLY:
                        errors.append("Parent theme must be monthly")
                    elif not self._date_within_range(
                        theme.start_date, theme.end_date,
                        parent.start_date, parent.end_date
                    ):
                        errors.append("Weekly theme dates must be within parent monthly theme dates")
            
            # Validate theme keywords and alignment
            if not theme.keywords or len(theme.keywords) == 0:
                warnings.append("Theme has no keywords defined")
            
            if not theme.personality_alignment:
                warnings.append("Theme has no personality alignment defined")
            
            return {
                'valid': len(errors) == 0,
                'errors': errors,
                'warnings': warnings,
                'theme': self._theme_to_dict(theme)
            }
            
        except Exception as e:
            logger.error(f"Error validating theme hierarchy: {e}")
            return {'valid': False, 'errors': [f'Validation error: {str(e)}']}
    
    def get_theme_calendar(self, year: int) -> Dict[str, Any]:
        """
        Get a complete theme calendar for a year.
        
        Args:
            year: Year to get calendar for
            
        Returns:
            Dictionary containing the theme calendar structure
        """
        try:
            monthly_themes = self.theme_repo.get_monthly_themes(year)
            
            calendar = {
                'year': year,
                'months': {}
            }
            
            for month_theme in monthly_themes:
                month_num = month_theme.start_date.month
                weekly_themes = self.theme_repo.get_weekly_themes_for_month(month_theme.id)
                
                calendar['months'][month_num] = {
                    'monthly_theme': self._theme_to_dict(month_theme),
                    'weekly_themes': [self._theme_to_dict(t) for t in weekly_themes],
                    'coverage': self._calculate_theme_coverage(month_theme, weekly_themes)
                }
            
            return calendar
            
        except Exception as e:
            logger.error(f"Error getting theme calendar: {e}")
            return {}
    
    def _validate_theme_period(self, start_date: date, end_date: date, theme_type: ThemeType) -> bool:
        """Validate that a theme period doesn't overlap with existing themes of the same type."""
        existing_themes = self.theme_repo.get_themes_by_type(theme_type)
        
        for theme in existing_themes:
            if self._dates_overlap(start_date, end_date, theme.start_date, theme.end_date):
                return False
        
        return True
    
    def _validate_weekly_theme_period(self, parent_theme_id: str, start_date: date, end_date: date) -> bool:
        """Validate that a weekly theme period doesn't overlap with other weekly themes in the same month."""
        existing_weekly_themes = self.theme_repo.get_weekly_themes_for_month(parent_theme_id)
        
        for theme in existing_weekly_themes:
            if self._dates_overlap(start_date, end_date, theme.start_date, theme.end_date):
                return False
        
        return True
    
    def _calculate_week_dates(self, month_start: date, month_end: date, week_number: int) -> Tuple[Optional[date], Optional[date]]:
        """Calculate start and end dates for a specific week within a month."""
        if week_number < 1 or week_number > 5:
            return None, None
        
        # Calculate week boundaries
        current_date = month_start
        week_start = None
        week_end = None
        
        # Find the start of the requested week
        days_passed = 0
        while current_date <= month_end:
            if current_date.weekday() == 0:  # Monday
                if week_number == 1:
                    week_start = current_date
                    break
                week_number -= 1
            current_date += timedelta(days=1)
            days_passed += 1
            
            # Safety check to prevent infinite loop
            if days_passed > 35:
                break
        
        if not week_start:
            # If we didn't find a Monday, use the first day of the month for week 1
            if week_number == 1:
                week_start = month_start
            else:
                return None, None
        
        # Calculate week end (6 days after start, but not beyond month end)
        week_end = min(week_start + timedelta(days=6), month_end)
        
        return week_start, week_end
    
    def _dates_overlap(self, start1: date, end1: date, start2: date, end2: date) -> bool:
        """Check if two date ranges overlap."""
        return start1 <= end2 and start2 <= end1
    
    def _date_within_range(self, start: date, end: date, range_start: date, range_end: date) -> bool:
        """Check if a date range is within another date range."""
        return range_start <= start and end <= range_end
    
    def _calculate_theme_coverage(self, parent_theme: Theme, weekly_themes: List[Theme]) -> float:
        """Calculate what percentage of a monthly theme is covered by weekly themes."""
        if not weekly_themes:
            return 0.0
        
        total_days = (parent_theme.end_date - parent_theme.start_date).days + 1
        covered_days = 0
        
        for weekly in weekly_themes:
            # Ensure weekly theme is within parent bounds
            start = max(weekly.start_date, parent_theme.start_date)
            end = min(weekly.end_date, parent_theme.end_date)
            
            if start <= end:
                covered_days += (end - start).days + 1
        
        return covered_days / total_days if total_days > 0 else 0.0
    
    def _theme_to_dict(self, theme: Theme) -> Dict[str, Any]:
        """Convert a Theme object to a dictionary representation."""
        return {
            'id': theme.id,
            'name': theme.name,
            'description': theme.description,
            'type': theme.type.value,
            'start_date': theme.start_date.isoformat(),
            'end_date': theme.end_date.isoformat(),
            'parent_theme_id': theme.parent_theme_id,
            'keywords': theme.keywords,
            'personality_alignment': theme.personality_alignment,
            'config': theme.config
        }
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default theme configuration."""
        return {
            'color': '#007bff',
            'icon': 'default',
            'priority': 1
        }