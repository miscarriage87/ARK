"""
Theme API endpoints for ARK Digital Calendar.

This module provides REST API endpoints for theme management,
including CRUD operations and theme hierarchy management.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
import logging

from app.database.database import get_db
from app.services.theme_manager import ThemeManager
from app.services.theme_definitions import populate_year_themes, get_all_monthly_themes
from app.repositories.theme_repository import ThemeRepository
from app.models.theme import ThemeType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/themes", tags=["themes"])


@router.get("/current")
async def get_current_theme(
    target_date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get the current theme context for a specific date.
    
    Args:
        target_date: Optional date string (defaults to today)
        db: Database session
        
    Returns:
        Current theme context including monthly and weekly themes
    """
    try:
        theme_manager = ThemeManager(db)
        
        # Parse target date if provided
        parsed_date = None
        if target_date:
            try:
                parsed_date = date.fromisoformat(target_date)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        context = theme_manager.get_current_theme_context(parsed_date)
        
        if not context.get('active_theme'):
            raise HTTPException(status_code=404, detail="No active theme found for the specified date")
        
        return context
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current theme: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/calendar/{year}")
async def get_theme_calendar(
    year: int,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get the complete theme calendar for a specific year.
    
    Args:
        year: Year to get calendar for
        db: Database session
        
    Returns:
        Complete theme calendar structure
    """
    try:
        theme_manager = ThemeManager(db)
        calendar = theme_manager.get_theme_calendar(year)
        
        if not calendar:
            raise HTTPException(status_code=404, detail=f"No theme calendar found for year {year}")
        
        return calendar
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting theme calendar: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{theme_id}")
async def get_theme(
    theme_id: str,
    include_hierarchy: bool = Query(False, description="Include parent and child themes"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get a specific theme by ID.
    
    Args:
        theme_id: Theme ID
        include_hierarchy: Whether to include hierarchy information
        db: Database session
        
    Returns:
        Theme information with optional hierarchy
    """
    try:
        theme_manager = ThemeManager(db)
        
        if include_hierarchy:
            result = theme_manager.get_theme_hierarchy(theme_id)
            if not result:
                raise HTTPException(status_code=404, detail="Theme not found")
            return result
        else:
            theme_repo = ThemeRepository(db)
            theme = theme_repo.get_by_id(theme_id)
            if not theme:
                raise HTTPException(status_code=404, detail="Theme not found")
            
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
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting theme: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{theme_id}/validate")
async def validate_theme(
    theme_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Validate a theme's hierarchical structure and relationships.
    
    Args:
        theme_id: Theme ID to validate
        db: Database session
        
    Returns:
        Validation results
    """
    try:
        theme_manager = ThemeManager(db)
        validation_result = theme_manager.validate_theme_hierarchy(theme_id)
        
        if not validation_result:
            raise HTTPException(status_code=404, detail="Theme not found")
        
        return validation_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating theme: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/")
async def list_themes(
    theme_type: Optional[str] = Query(None, description="Filter by theme type (monthly/weekly)"),
    year: Optional[int] = Query(None, description="Filter by year"),
    parent_id: Optional[str] = Query(None, description="Filter by parent theme ID"),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    List themes with optional filtering.
    
    Args:
        theme_type: Optional theme type filter
        year: Optional year filter
        parent_id: Optional parent theme ID filter
        db: Database session
        
    Returns:
        List of themes matching the filters
    """
    try:
        theme_repo = ThemeRepository(db)
        
        if theme_type:
            if theme_type not in ['monthly', 'weekly']:
                raise HTTPException(status_code=400, detail="Invalid theme type. Use 'monthly' or 'weekly'")
            
            theme_type_enum = ThemeType.MONTHLY if theme_type == 'monthly' else ThemeType.WEEKLY
            themes = theme_repo.get_themes_by_type(theme_type_enum)
        elif year:
            themes = theme_repo.get_monthly_themes(year)
        elif parent_id:
            themes = theme_repo.get_weekly_themes_for_month(parent_id)
        else:
            themes = theme_repo.get_all()
        
        return [
            {
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
            for theme in themes
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing themes: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/populate/{year}")
async def populate_themes_for_year(
    year: int,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Populate predefined themes for a specific year.
    
    Args:
        year: Year to populate with themes
        db: Database session
        
    Returns:
        Results of the population operation
    """
    try:
        theme_manager = ThemeManager(db)
        results = populate_year_themes(theme_manager, year)
        
        # Commit the transaction
        db.commit()
        
        return results
        
    except Exception as e:
        logger.error(f"Error populating themes for year {year}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to populate themes: {str(e)}")


@router.get("/definitions/monthly")
async def get_monthly_theme_definitions() -> Dict[int, Dict[str, Any]]:
    """
    Get all predefined monthly theme definitions.
    
    Returns:
        Dictionary of monthly theme definitions
    """
    try:
        return get_all_monthly_themes()
        
    except Exception as e:
        logger.error(f"Error getting monthly theme definitions: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/monthly")
async def create_monthly_theme(
    theme_data: Dict[str, Any],
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Create a new monthly theme.
    
    Args:
        theme_data: Theme creation data
        db: Database session
        
    Returns:
        Created theme information
    """
    try:
        theme_manager = ThemeManager(db)
        
        # Validate required fields
        required_fields = ['name', 'description', 'year', 'month']
        for field in required_fields:
            if field not in theme_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        theme = theme_manager.create_monthly_theme(
            name=theme_data['name'],
            description=theme_data['description'],
            year=theme_data['year'],
            month=theme_data['month'],
            keywords=theme_data.get('keywords', []),
            personality_alignment=theme_data.get('personality_alignment', {}),
            config=theme_data.get('config', {})
        )
        
        if not theme:
            raise HTTPException(status_code=400, detail="Failed to create monthly theme")
        
        db.commit()
        
        return {
            'id': theme.id,
            'name': theme.name,
            'description': theme.description,
            'type': theme.type.value,
            'start_date': theme.start_date.isoformat(),
            'end_date': theme.end_date.isoformat(),
            'keywords': theme.keywords,
            'personality_alignment': theme.personality_alignment,
            'config': theme.config
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating monthly theme: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/weekly")
async def create_weekly_theme(
    theme_data: Dict[str, Any],
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Create a new weekly theme.
    
    Args:
        theme_data: Theme creation data
        db: Database session
        
    Returns:
        Created theme information
    """
    try:
        theme_manager = ThemeManager(db)
        
        # Validate required fields
        required_fields = ['name', 'description', 'parent_theme_id', 'week_number']
        for field in required_fields:
            if field not in theme_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        theme = theme_manager.create_weekly_theme(
            name=theme_data['name'],
            description=theme_data['description'],
            parent_theme_id=theme_data['parent_theme_id'],
            week_number=theme_data['week_number'],
            keywords=theme_data.get('keywords', []),
            personality_alignment=theme_data.get('personality_alignment', {}),
            config=theme_data.get('config', {})
        )
        
        if not theme:
            raise HTTPException(status_code=400, detail="Failed to create weekly theme")
        
        db.commit()
        
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
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating weekly theme: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")