"""
Quote API endpoints for ARK Digital Calendar.

This module provides REST API endpoints for quote management,
including daily quote retrieval, archive access, and feedback submission.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
from pydantic import BaseModel, Field, validator
import logging

from app.database.database import get_db
from app.models.quote import Quote, Feedback
from app.models.user import User
from app.repositories.quote_repository import QuoteRepository, FeedbackRepository
from app.repositories.user_repository import UserRepository
from app.services.feedback_analyzer import FeedbackAnalyzer
from app.services.quote_archive import QuoteArchiveService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/quotes", tags=["quotes"])


# Pydantic models for request/response
class FeedbackRequest(BaseModel):
    """Request model for submitting feedback."""
    quote_id: str = Field(..., description="Quote identifier")
    user_id: str = Field(..., description="User identifier")
    rating: str = Field(..., description="Rating: like, neutral, or dislike")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional feedback context")
    
    @validator('rating')
    def validate_rating(cls, v):
        """Validate rating value."""
        if v not in ['like', 'neutral', 'dislike']:
            raise ValueError("Rating must be 'like', 'neutral', or 'dislike'")
        return v


class FeedbackResponse(BaseModel):
    """Response model for feedback submission."""
    id: str
    quote_id: str
    user_id: str
    rating: str
    timestamp: str
    context: Optional[Dict[str, Any]]


class FeedbackStatsResponse(BaseModel):
    """Response model for feedback statistics."""
    user_id: str
    total_feedback: int
    rating_distribution: Dict[str, int]
    satisfaction_score: float
    recent_feedback_count: int


# Initialize services
feedback_analyzer = FeedbackAnalyzer()

@router.get("/today")
async def get_today_quote(
    user_id: str = Query(..., description="User ID"),
    target_date: Optional[str] = Query(None, description="Target date (YYYY-MM-DD), defaults to today"),
    db: Session = Depends(get_db)
):
    """
    Get today's quote for a user.
    
    Returns the daily quote for the current date, generating one if needed.
    Implements idempotent quote generation - same quote returned for same user/date.
    """
    try:
        from app.services.quote_generator import QuoteGenerator
        
        # Parse target date if provided, otherwise use today
        if target_date:
            try:
                parsed_date = date.fromisoformat(target_date)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid date format. Use YYYY-MM-DD"
                )
        else:
            parsed_date = date.today()
        
        # Verify user exists
        user_repo = UserRepository(db)
        user = user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Generate or retrieve quote
        quote_generator = QuoteGenerator(db)
        quote = await quote_generator.generate_daily_quote(user_id, parsed_date)
        
        if not quote:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate daily quote"
            )
        
        # Format response
        response_data = {
            "id": quote.id,
            "content": quote.content,
            "date": quote.date.isoformat(),
            "user_id": quote.user_id,
            "personalization_context": quote.personalization_context or {},
            "created_at": quote.created_at.isoformat() if quote.created_at else None
        }
        
        # Include theme information if available
        if quote.theme:
            response_data["theme"] = {
                "id": quote.theme.id,
                "name": quote.theme.name,
                "description": quote.theme.description,
                "type": quote.theme.type.value if quote.theme.type else None,
                "keywords": quote.theme.keywords or []
            }
        
        logger.info(f"Retrieved daily quote for user {user_id} on {parsed_date}")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving daily quote: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve daily quote"
        )

@router.get("/archive")
async def get_quote_archive(
    user_id: str = Query(..., description="User ID"),
    limit: int = Query(50, ge=1, le=100, description="Number of quotes to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    include_theme_data: bool = Query(True, description="Include theme information"),
    db: Session = Depends(get_db)
):
    """
    Get user's quote archive with pagination.
    
    Returns historical quotes in chronological order (newest first).
    Validates: Requirements 3.1 - chronological ordering
    """
    try:
        user_repo = UserRepository(db)
        
        # Verify user exists
        user = user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get archive data using the archive service
        archive_service = QuoteArchiveService(db)
        archive_data = archive_service.get_user_archive(
            user_id=user_id,
            skip=offset,
            limit=limit,
            include_theme_data=include_theme_data
        )
        
        # Get total count for pagination metadata
        quote_repo = QuoteRepository(db)
        total_count = quote_repo.count_user_quotes(user_id)
        
        response = {
            "quotes": archive_data,
            "pagination": {
                "total": total_count,
                "limit": limit,
                "offset": offset,
                "has_more": offset + limit < total_count
            },
            "user_id": user_id
        }
        
        logger.info(f"Retrieved {len(archive_data)} quotes from archive for user {user_id}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving quote archive: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve quote archive"
        )

@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    request: FeedbackRequest,
    db: Session = Depends(get_db)
):
    """
    Submit feedback for a quote.
    
    Accepts like/neutral/dislike ratings for personalization learning.
    Creates or updates existing feedback for the quote-user combination.
    
    Args:
        request: Feedback submission data
        db: Database session
        
    Returns:
        Created or updated feedback
    """
    try:
        feedback_repo = FeedbackRepository(db)
        quote_repo = QuoteRepository(db)
        user_repo = UserRepository(db)
        
        # Verify quote exists
        quote = quote_repo.get_by_id(request.quote_id)
        if not quote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quote not found"
            )
        
        # Verify user exists
        user = user_repo.get_by_id(request.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify user owns the quote
        if quote.user_id != request.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User can only provide feedback on their own quotes"
            )
        
        # Create or update feedback
        feedback = feedback_repo.update_or_create_feedback(
            quote_id=request.quote_id,
            user_id=request.user_id,
            rating=request.rating,
            context=request.context or {}
        )
        
        if not feedback:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to submit feedback"
            )
        
        logger.info(f"Feedback submitted: quote={request.quote_id}, user={request.user_id}, rating={request.rating}")
        
        return FeedbackResponse(
            id=feedback.id,
            quote_id=feedback.quote_id,
            user_id=feedback.user_id,
            rating=feedback.rating,
            timestamp=feedback.timestamp.isoformat(),
            context=feedback.context
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit feedback"
        )


@router.get("/feedback/{user_id}", response_model=List[FeedbackResponse])
async def get_user_feedback(
    user_id: str,
    limit: int = Query(50, ge=1, le=100, description="Number of feedback items to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    rating: Optional[str] = Query(None, description="Filter by rating: like, neutral, dislike"),
    db: Session = Depends(get_db)
):
    """
    Get user's feedback history.
    
    Args:
        user_id: User identifier
        limit: Maximum number of feedback items to return
        offset: Pagination offset
        rating: Optional rating filter
        db: Database session
        
    Returns:
        List of user's feedback items
    """
    try:
        user_repo = UserRepository(db)
        feedback_repo = FeedbackRepository(db)
        
        # Verify user exists
        user = user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get feedback based on filter
        if rating:
            if rating not in ['like', 'neutral', 'dislike']:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Rating must be 'like', 'neutral', or 'dislike'"
                )
            feedback_list = feedback_repo.get_feedback_by_rating(user_id, rating)
            # Apply pagination manually for filtered results
            feedback_list = feedback_list[offset:offset + limit]
        else:
            feedback_list = feedback_repo.get_user_feedback(user_id, skip=offset, limit=limit)
        
        return [
            FeedbackResponse(
                id=feedback.id,
                quote_id=feedback.quote_id,
                user_id=feedback.user_id,
                rating=feedback.rating,
                timestamp=feedback.timestamp.isoformat(),
                context=feedback.context
            )
            for feedback in feedback_list
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving user feedback: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve feedback"
        )


@router.get("/feedback/{user_id}/stats", response_model=FeedbackStatsResponse)
async def get_feedback_stats(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Get feedback statistics for a user.
    
    Args:
        user_id: User identifier
        db: Database session
        
    Returns:
        Feedback statistics including satisfaction score and distribution
    """
    try:
        user_repo = UserRepository(db)
        feedback_repo = FeedbackRepository(db)
        
        # Verify user exists
        user = user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get all feedback for user
        all_feedback = feedback_repo.get_user_feedback(user_id, limit=1000)
        
        # Get rating distribution
        rating_distribution = feedback_repo.get_feedback_stats(user_id)
        
        # Calculate satisfaction score
        satisfaction_score = feedback_analyzer.calculate_feedback_satisfaction_score(all_feedback)
        
        # Count recent feedback (last 30 days)
        recent_cutoff = datetime.utcnow() - timedelta(days=30)
        recent_feedback_count = len([
            f for f in all_feedback 
            if f.timestamp >= recent_cutoff
        ])
        
        return FeedbackStatsResponse(
            user_id=user_id,
            total_feedback=len(all_feedback),
            rating_distribution=rating_distribution,
            satisfaction_score=satisfaction_score,
            recent_feedback_count=recent_feedback_count
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving feedback stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve feedback statistics"
        )


@router.delete("/feedback/{feedback_id}")
async def delete_feedback(
    feedback_id: str,
    user_id: str = Query(..., description="User ID for authorization"),
    db: Session = Depends(get_db)
):
    """
    Delete a feedback item.
    
    Args:
        feedback_id: Feedback identifier
        user_id: User identifier for authorization
        db: Database session
        
    Returns:
        Success confirmation
    """
    try:
        feedback_repo = FeedbackRepository(db)
        
        # Get feedback to verify ownership
        feedback = feedback_repo.get_by_id(feedback_id)
        if not feedback:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Feedback not found"
            )
        
        # Verify user owns the feedback
        if feedback.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User can only delete their own feedback"
            )
        
        # Delete feedback
        success = feedback_repo.delete(feedback_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete feedback"
            )
        
        logger.info(f"Feedback deleted: {feedback_id} by user {user_id}")
        
        return {"message": "Feedback deleted successfully", "feedback_id": feedback_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting feedback: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete feedback"
        )

@router.get("/search")
async def search_quotes(
    user_id: str = Query(..., description="User ID"),
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=50, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    theme_filter: Optional[str] = Query(None, description="Filter by theme ID"),
    date_from: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Search user's quote archive.
    
    Returns quotes matching the search query in content or theme.
    Implements relevance scoring for search results.
    Validates: Requirements 3.2, 3.3 - search functionality
    """
    try:
        user_repo = UserRepository(db)
        
        # Verify user exists
        user = user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Parse date filters if provided
        parsed_date_from = None
        parsed_date_to = None
        
        if date_from:
            try:
                parsed_date_from = date.fromisoformat(date_from)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid date_from format. Use YYYY-MM-DD"
                )
        
        if date_to:
            try:
                parsed_date_to = date.fromisoformat(date_to)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid date_to format. Use YYYY-MM-DD"
                )
        
        # Validate date range
        if parsed_date_from and parsed_date_to and parsed_date_from > parsed_date_to:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="date_from must be before or equal to date_to"
            )
        
        # Perform search using archive service
        archive_service = QuoteArchiveService(db)
        search_results = archive_service.search_archive(
            user_id=user_id,
            search_term=q,
            theme_filter=theme_filter,
            date_from=parsed_date_from,
            date_to=parsed_date_to,
            skip=offset,
            limit=limit
        )
        
        # Get total count for the search (without pagination)
        # This is a simplified count - in production you might want to optimize this
        all_results = archive_service.search_archive(
            user_id=user_id,
            search_term=q,
            theme_filter=theme_filter,
            date_from=parsed_date_from,
            date_to=parsed_date_to,
            skip=0,
            limit=1000  # Large limit to get total count
        )
        total_count = len(all_results)
        
        response = {
            "results": search_results,
            "search_metadata": {
                "query": q,
                "total_results": total_count,
                "limit": limit,
                "offset": offset,
                "has_more": offset + limit < total_count,
                "filters": {
                    "theme_filter": theme_filter,
                    "date_from": date_from,
                    "date_to": date_to
                }
            },
            "user_id": user_id
        }
        
        logger.info(f"Search completed for user {user_id}: query='{q}', results={len(search_results)}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching quotes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search quotes"
        )

@router.get("/archive/stats")
async def get_archive_statistics(
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive statistics about user's quote archive.
    
    Returns archive statistics including theme distribution, date ranges,
    and usage patterns for analytics and insights.
    """
    try:
        user_repo = UserRepository(db)
        
        # Verify user exists
        user = user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get archive statistics using the archive service
        archive_service = QuoteArchiveService(db)
        statistics = archive_service.get_archive_statistics(user_id)
        
        logger.info(f"Retrieved archive statistics for user {user_id}")
        return statistics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving archive statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve archive statistics"
        )


@router.get("/search/advanced")
async def advanced_search_quotes(
    user_id: str = Query(..., description="User ID"),
    content_query: Optional[str] = Query(None, description="Search in quote content"),
    theme_keywords: Optional[str] = Query(None, description="Search in theme keywords (comma-separated)"),
    personality_category: Optional[str] = Query(None, description="Filter by personality category"),
    date_from: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)"),
    min_relevance: float = Query(0.0, ge=0.0, le=1.0, description="Minimum relevance score"),
    limit: int = Query(20, ge=1, le=50, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db)
):
    """
    Advanced search with multiple criteria and relevance scoring.
    
    Provides comprehensive search capabilities across content, themes,
    and personalization context with relevance scoring.
    Validates: Requirements 3.2, 3.3 - advanced search functionality
    """
    try:
        user_repo = UserRepository(db)
        quote_repo = QuoteRepository(db)
        
        # Verify user exists
        user = user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Parse date filters if provided
        parsed_date_from = None
        parsed_date_to = None
        
        if date_from:
            try:
                parsed_date_from = date.fromisoformat(date_from)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid date_from format. Use YYYY-MM-DD"
                )
        
        if date_to:
            try:
                parsed_date_to = date.fromisoformat(date_to)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid date_to format. Use YYYY-MM-DD"
                )
        
        # Start with all user quotes
        all_quotes = quote_repo.get_user_quotes(user_id, limit=1000)
        
        # Apply filters
        filtered_quotes = []
        for quote in all_quotes:
            # Date range filter
            if parsed_date_from and quote.date < parsed_date_from:
                continue
            if parsed_date_to and quote.date > parsed_date_to:
                continue
            
            # Content search filter
            if content_query:
                if content_query.lower() not in quote.content.lower():
                    continue
            
            # Theme keywords filter
            if theme_keywords and quote.theme:
                theme_keyword_list = [kw.strip().lower() for kw in theme_keywords.split(',')]
                quote_keywords = [kw.lower() for kw in (quote.theme.keywords or [])]
                if not any(kw in quote_keywords for kw in theme_keyword_list):
                    continue
            
            # Personality category filter
            if personality_category and quote.personalization_context:
                categories = quote.personalization_context.get('personality_categories', [])
                category_names = [cat.get('category', '').lower() for cat in categories]
                if personality_category.lower() not in category_names:
                    continue
            
            # Calculate relevance score
            relevance_score = _calculate_advanced_relevance_score(
                quote, content_query, theme_keywords, personality_category
            )
            
            # Apply minimum relevance filter
            if relevance_score >= min_relevance:
                filtered_quotes.append((quote, relevance_score))
        
        # Sort by relevance score
        filtered_quotes.sort(key=lambda x: x[1], reverse=True)
        
        # Apply pagination
        paginated_quotes = filtered_quotes[offset:offset + limit]
        
        # Format results
        search_results = []
        for quote, relevance_score in paginated_quotes:
            quote_data = {
                'id': quote.id,
                'content': quote.content,
                'date': quote.date.isoformat(),
                'personalization_context': quote.personalization_context or {},
                'relevance_score': relevance_score,
                'created_at': quote.created_at.isoformat() if quote.created_at else None
            }
            
            if quote.theme:
                quote_data['theme'] = {
                    'id': quote.theme.id,
                    'name': quote.theme.name,
                    'type': quote.theme.type.value if quote.theme.type else None,
                    'keywords': quote.theme.keywords or []
                }
            
            search_results.append(quote_data)
        
        response = {
            "results": search_results,
            "search_metadata": {
                "total_results": len(filtered_quotes),
                "limit": limit,
                "offset": offset,
                "has_more": offset + limit < len(filtered_quotes),
                "filters": {
                    "content_query": content_query,
                    "theme_keywords": theme_keywords,
                    "personality_category": personality_category,
                    "date_from": date_from,
                    "date_to": date_to,
                    "min_relevance": min_relevance
                },
                "average_relevance": sum(score for _, score in filtered_quotes) / len(filtered_quotes) if filtered_quotes else 0.0
            },
            "user_id": user_id
        }
        
        logger.info(f"Advanced search completed for user {user_id}: {len(search_results)} results")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in advanced search: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform advanced search"
        )


def _calculate_advanced_relevance_score(
    quote: Quote, 
    content_query: Optional[str], 
    theme_keywords: Optional[str], 
    personality_category: Optional[str]
) -> float:
    """
    Calculate advanced relevance score for search results.
    
    Args:
        quote: Quote object
        content_query: Content search term
        theme_keywords: Theme keywords search
        personality_category: Personality category filter
        
    Returns:
        Relevance score between 0.0 and 1.0
    """
    try:
        score = 0.0
        total_weight = 0.0
        
        # Content relevance (40% weight)
        if content_query:
            content = quote.content.lower()
            query = content_query.lower()
            
            # Exact phrase match bonus
            if query in content:
                score += 0.4
            else:
                # Word-based matching
                content_words = set(content.split())
                query_words = set(query.split())
                
                if query_words:
                    word_matches = len(query_words.intersection(content_words))
                    word_score = (word_matches / len(query_words)) * 0.4
                    score += word_score
            
            total_weight += 0.4
        
        # Theme relevance (30% weight)
        if theme_keywords and quote.theme:
            theme_keyword_list = [kw.strip().lower() for kw in theme_keywords.split(',')]
            quote_keywords = [kw.lower() for kw in (quote.theme.keywords or [])]
            
            if theme_keyword_list:
                keyword_matches = sum(1 for kw in theme_keyword_list if kw in quote_keywords)
                theme_score = (keyword_matches / len(theme_keyword_list)) * 0.3
                score += theme_score
            
            total_weight += 0.3
        
        # Personality alignment (20% weight)
        if personality_category and quote.personalization_context:
            categories = quote.personalization_context.get('personality_categories', [])
            for cat in categories:
                if cat.get('category', '').lower() == personality_category.lower():
                    # Weight by the category strength
                    weight = cat.get('weight', 0.0)
                    personality_score = weight * 0.2
                    score += personality_score
                    break
            
            total_weight += 0.2
        
        # Date recency bonus (10% weight)
        if quote.date:
            days_ago = (date.today() - quote.date).days
            # More recent quotes get higher scores
            recency_score = max(0, 1 - (days_ago / 365)) * 0.1  # Normalize by year
            score += recency_score
            total_weight += 0.1
        
        # Normalize score
        if total_weight > 0:
            return min(1.0, score / total_weight)
        else:
            return 0.5  # Default neutral score
        
    except Exception:
        return 0.0


@router.post("/archive/export")
async def export_user_archive(
    user_id: str = Query(..., description="User ID"),
    format: str = Query("json", description="Export format (json)"),
    db: Session = Depends(get_db)
):
    """
    Export complete user archive for backup/portability.
    
    Provides complete data export with all metadata for user data portability.
    Validates: Requirements 9.5 - data export functionality
    """
    try:
        user_repo = UserRepository(db)
        
        # Verify user exists
        user = user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if format.lower() != "json":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only JSON format is currently supported"
            )
        
        # Export archive using the archive service
        archive_service = QuoteArchiveService(db)
        export_data = archive_service.export_user_archive(user_id)
        
        logger.info(f"Exported archive for user {user_id}: {export_data['export_metadata']['total_quotes']} quotes")
        return export_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting user archive: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export user archive"
        )