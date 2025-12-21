"""
Quote repository for ARK Digital Calendar.

This module provides database operations specific to Quote and Feedback entities
with additional business logic and validation.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import and_, desc, func
from datetime import date, datetime, timedelta, timezone
import logging

from app.models.quote import Quote, Feedback
from app.repositories.base import BaseRepository
from app.core.cache import cached_query, invalidate_user_cache

logger = logging.getLogger(__name__)


class QuoteRepository(BaseRepository[Quote]):
    """
    Repository for Quote entity operations.
    
    Provides CRUD operations and business-specific queries for quotes.
    """
    
    def __init__(self, db: Session):
        """Initialize QuoteRepository with database session."""
        super().__init__(Quote, db)
    
    def create(self, obj_data: Dict[str, Any]) -> Optional[Quote]:
        """
        Create a new quote and invalidate related caches.
        
        Args:
            obj_data: Dictionary containing quote data
            
        Returns:
            Created quote or None if creation failed
        """
        result = super().create(obj_data)
        if result and 'user_id' in obj_data:
            # Invalidate user-specific caches when new quote is created
            invalidate_user_cache(obj_data['user_id'])
        return result
    """
    Repository for Quote entity operations.
    
    Provides CRUD operations and business-specific queries for quotes.
    """
    
    def __init__(self, db: Session):
        """Initialize QuoteRepository with database session."""
        super().__init__(Quote, db)
    
    def get_by_user_and_date(self, user_id: str, quote_date: date) -> Optional[Quote]:
        """
        Retrieve a quote for a specific user and date.
        
        Args:
            user_id: User ID
            quote_date: Date of the quote
            
        Returns:
            Quote if found, None otherwise
        """
        try:
            return (self.db.query(Quote)
                   .filter(and_(Quote.user_id == user_id, Quote.date == quote_date))
                   .first())
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving quote by user and date: {e}")
            return None
    
    @cached_query(ttl=3600)  # Cache for 1 hour - quotes don't change often
    def get_user_quotes(self, user_id: str, skip: int = 0, limit: int = 100) -> List[Quote]:
        """
        Retrieve all quotes for a specific user.
        
        Args:
            user_id: User ID
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of quotes ordered by date (newest first)
        """
        try:
            return (self.db.query(Quote)
                   .filter(Quote.user_id == user_id)
                   .options(joinedload(Quote.theme))
                   .order_by(desc(Quote.date))
                   .offset(skip)
                   .limit(limit)
                   .all())
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving user quotes: {e}")
            return []
    
    def search_quotes(self, user_id: str, search_term: str, skip: int = 0, limit: int = 50) -> List[Quote]:
        """
        Search quotes by content for a specific user.
        
        Args:
            user_id: User ID
            search_term: Search term to match in quote content
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of matching quotes
        """
        try:
            return (self.db.query(Quote)
                   .filter(and_(
                       Quote.user_id == user_id,
                       Quote.content.contains(search_term)
                   ))
                   .options(joinedload(Quote.theme))
                   .order_by(desc(Quote.date))
                   .offset(skip)
                   .limit(limit)
                   .all())
        except SQLAlchemyError as e:
            logger.error(f"Database error searching quotes: {e}")
            return []
    
    def get_quotes_by_theme(self, user_id: str, theme_id: str, skip: int = 0, limit: int = 100) -> List[Quote]:
        """
        Retrieve quotes for a specific user and theme.
        
        Args:
            user_id: User ID
            theme_id: Theme ID
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of quotes for the theme
        """
        try:
            return (self.db.query(Quote)
                   .filter(and_(Quote.user_id == user_id, Quote.theme_id == theme_id))
                   .options(joinedload(Quote.theme))
                   .order_by(desc(Quote.date))
                   .offset(skip)
                   .limit(limit)
                   .all())
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving quotes by theme: {e}")
            return []
    
    @cached_query(ttl=1800)  # Cache for 30 minutes
    def get_recent_quotes(self, user_id: str, days: int = 30) -> List[Quote]:
        """
        Retrieve recent quotes for a user within specified days.
        
        Args:
            user_id: User ID
            days: Number of days to look back
            
        Returns:
            List of recent quotes
        """
        try:
            cutoff_date = date.today() - timedelta(days=days)
            return (self.db.query(Quote)
                   .filter(and_(
                       Quote.user_id == user_id,
                       Quote.date >= cutoff_date
                   ))
                   .options(joinedload(Quote.theme))
                   .order_by(desc(Quote.date))
                   .all())
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving recent quotes: {e}")
            return []
    
    @cached_query(ttl=600)  # Cache for 10 minutes
    def count_user_quotes(self, user_id: str) -> int:
        """
        Count total number of quotes for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            Total count of user's quotes
        """
        try:
            return self.db.query(Quote).filter(Quote.user_id == user_id).count()
        except SQLAlchemyError as e:
            logger.error(f"Database error counting user quotes: {e}")
            return 0
    
    def quote_exists_for_date(self, user_id: str, quote_date: date) -> bool:
        """
        Check if a quote exists for a user on a specific date.
        
        Args:
            user_id: User ID
            quote_date: Date to check
            
        Returns:
            True if quote exists, False otherwise
        """
        try:
            return (self.db.query(Quote)
                   .filter(and_(Quote.user_id == user_id, Quote.date == quote_date))
                   .first() is not None)
        except SQLAlchemyError as e:
            logger.error(f"Database error checking quote existence: {e}")
            return False


class FeedbackRepository(BaseRepository[Feedback]):
    """
    Repository for Feedback entity operations.
    
    Provides CRUD operations and business-specific queries for feedback.
    """
    
    def __init__(self, db: Session):
        """Initialize FeedbackRepository with database session."""
        super().__init__(Feedback, db)
    
    def get_by_quote_and_user(self, quote_id: str, user_id: str) -> Optional[Feedback]:
        """
        Retrieve feedback for a specific quote and user.
        
        Args:
            quote_id: Quote ID
            user_id: User ID
            
        Returns:
            Feedback if found, None otherwise
        """
        try:
            return (self.db.query(Feedback)
                   .filter(and_(Feedback.quote_id == quote_id, Feedback.user_id == user_id))
                   .first())
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving feedback by quote and user: {e}")
            return None
    
    def get_user_feedback(self, user_id: str, skip: int = 0, limit: int = 100) -> List[Feedback]:
        """
        Retrieve all feedback for a specific user.
        
        Args:
            user_id: User ID
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of feedback ordered by timestamp (newest first)
        """
        try:
            return (self.db.query(Feedback)
                   .filter(Feedback.user_id == user_id)
                   .options(joinedload(Feedback.quote))
                   .order_by(desc(Feedback.timestamp))
                   .offset(skip)
                   .limit(limit)
                   .all())
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving user feedback: {e}")
            return []
    
    def get_feedback_by_rating(self, user_id: str, rating: str) -> List[Feedback]:
        """
        Retrieve feedback by rating for a specific user.
        
        Args:
            user_id: User ID
            rating: Rating value ('like', 'neutral', 'dislike')
            
        Returns:
            List of feedback with the specified rating
        """
        try:
            return (self.db.query(Feedback)
                   .filter(and_(Feedback.user_id == user_id, Feedback.rating == rating))
                   .options(joinedload(Feedback.quote))
                   .order_by(desc(Feedback.timestamp))
                   .all())
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving feedback by rating: {e}")
            return []
    
    def get_feedback_stats(self, user_id: str) -> Dict[str, int]:
        """
        Get feedback statistics for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            Dictionary with feedback counts by rating
        """
        try:
            stats = (self.db.query(Feedback.rating, func.count(Feedback.id))
                    .filter(Feedback.user_id == user_id)
                    .group_by(Feedback.rating)
                    .all())
            
            return {rating: count for rating, count in stats}
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving feedback stats: {e}")
            return {}
    
    def update_or_create_feedback(self, quote_id: str, user_id: str, rating: str, context: Dict[str, Any] = None) -> Optional[Feedback]:
        """
        Update existing feedback or create new feedback.
        
        Args:
            quote_id: Quote ID
            user_id: User ID
            rating: Rating value
            context: Additional context data
            
        Returns:
            Feedback object or None if operation failed
        """
        try:
            existing_feedback = self.get_by_quote_and_user(quote_id, user_id)
            
            if existing_feedback:
                # Update existing feedback
                existing_feedback.rating = rating
                existing_feedback.context = context or {}
                existing_feedback.timestamp = datetime.now(timezone.utc)
                
                self.db.commit()
                self.db.refresh(existing_feedback)
                logger.info(f"Updated feedback for quote {quote_id} by user {user_id}")
                return existing_feedback
            else:
                # Create new feedback
                feedback_data = {
                    'quote_id': quote_id,
                    'user_id': user_id,
                    'rating': rating,
                    'context': context or {}
                }
                return self.create(feedback_data)
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error updating/creating feedback: {e}")
            return None