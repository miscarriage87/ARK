"""
Services package for ARK Digital Calendar.

This package contains business logic services that orchestrate
operations between repositories and external services.
"""

from .quote_generator import QuoteGenerator
from .theme_manager import ThemeManager
from .theme_definitions import (
    get_monthly_theme_definition,
    get_all_monthly_themes,
    get_weekly_themes_for_month,
    populate_year_themes
)

__all__ = [
    'QuoteGenerator',
    'ThemeManager',
    'get_monthly_theme_definition',
    'get_all_monthly_themes',
    'get_weekly_themes_for_month',
    'populate_year_themes'
]