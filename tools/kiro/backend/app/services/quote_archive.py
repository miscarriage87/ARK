"""
Quote Archive Service for ARK Digital Calendar.

This service handles quote archiving, retrieval, and management operations
with comprehensive metadata preservation and search capabilities.
"""

import logging
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta

from app.models.quote import Quote
from app.repositories.quote_repository import QuoteRepository
from app.repositories.theme_repository import ThemeRepository

logger = logging.getLogger(__name__)


class QuoteArchiveError(Exception):
    """Exception raised when quote archive operations fail."""
    pass


class QuoteArchiveService:
    """
    Service for managing quote archives with comprehensive metadata preservation.
    
    Handles archiving, retrieval, search, and organization of user quotes
    with full theme context and personalization data preservation.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.quote_repo = QuoteRepository(db)
        self.theme_repo = ThemeRepository(db)
    
    def archive_quote(self, quote: Quote) -> bool:
        """
        Archive a quote with full metadata preservation.
        
        This method ensures that quotes are properly archived with all
        associated metadata including theme context, personalization data,
        and generation timestamps.
        
        Args:
            quote: Quote object to archive
            
        Returns:
            bool: True if archiving successful, False otherwise
            
        Raises:
            QuoteArchiveError: If archiving fails
        """
        try:
            # Verify quote has required metadata
            if not quote.user_id or not quote.content or not quote.date:
                raise QuoteArchiveError("Quote missing required fields for archiving")
            
            # Ensure personalization context is preserved
            if not quote.personalization_context:
                quote.personalization_context = {
                    'archived_at': datetime.utcnow().isoformat(),
                    'archive_version': '1.0'
                }
            else:
                # Add archive metadata to existing context
                quote.personalization_context.update({
                    'archived_at': datetime.utcnow().isoformat(),
                    'archive_version': '1.0'
                })
            
            # Save/update the quote in the database
            if quote.id:
                # Update existing quote with archive metadata
                update_data = {
                    'personalization_context': quote.personalization_context
                }
                updated_quote = self.quote_repo.update(quote.id, update_data)
                if not updated_quote:
                    raise QuoteArchiveError("Failed to update quote with archive metadata")
                quote = updated_quote
            else:
                # This shouldn't happen as quotes should already be saved
                # but handle it gracefully
                quote_data = {
                    'user_id': quote.user_id,
                    'content': quote.content,
                    'date': quote.date,
                    'theme_id': quote.theme_id,
                    'personalization_context': quote.personalization_context
                }
                quote = self.quote_repo.create(quote_data)
            
            logger.info(f"Successfully archived quote {quote.id} for user {quote.user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to archive quote: {str(e)}")
            raise QuoteArchiveError(f"Quote archiving failed: {str(e)}")
    
    def get_user_archive(
        self, 
        user_id: str, 
        skip: int = 0, 
        limit: int = 100,
        include_theme_data: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Retrieve user's complete quote archive with metadata.
        
        Args:
            user_id: User ID
            skip: Number of records to skip for pagination
            limit: Maximum number of records to return
            include_theme_data: Whether to include full theme information
            
        Returns:
            List of quote dictionaries with full metadata
        """
        try:
            quotes = self.quote_repo.get_user_quotes(user_id, skip, limit)
            
            archive_data = []
            for quote in quotes:
                quote_data = {
                    'id': quote.id,
                    'content': quote.content,
                    'date': quote.date.isoformat(),
                    'personalization_context': quote.personalization_context or {},
                    'created_at': quote.created_at.isoformat() if quote.created_at else None
                }
                
                # Include theme data if requested and available
                if include_theme_data and quote.theme:
                    quote_data['theme'] = {
                        'id': quote.theme.id,
                        'name': quote.theme.name,
                        'description': quote.theme.description,
                        'type': quote.theme.type.value if quote.theme.type else None,
                        'keywords': quote.theme.keywords or []
                    }
                elif quote.theme_id:
                    quote_data['theme_id'] = quote.theme_id
                
                archive_data.append(quote_data)
            
            logger.info(f"Retrieved {len(archive_data)} quotes from archive for user {user_id}")
            return archive_data
            
        except Exception as e:
            logger.error(f"Failed to retrieve user archive: {str(e)}")
            raise QuoteArchiveError(f"Archive retrieval failed: {str(e)}")
    
    def search_archive(
        self, 
        user_id: str, 
        search_term: str,
        theme_filter: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Search user's quote archive with advanced filtering.
        
        Args:
            user_id: User ID
            search_term: Text to search for in quote content
            theme_filter: Optional theme ID to filter by
            date_from: Optional start date for date range filtering
            date_to: Optional end date for date range filtering
            skip: Number of records to skip for pagination
            limit: Maximum number of records to return
            
        Returns:
            List of matching quote dictionaries with metadata
        """
        try:
            # Start with basic text search
            quotes = self.quote_repo.search_quotes(user_id, search_term, skip, limit)
            
            # Apply additional filters
            filtered_quotes = []
            for quote in quotes:
                # Theme filter
                if theme_filter and quote.theme_id != theme_filter:
                    continue
                
                # Date range filter
                if date_from and quote.date < date_from:
                    continue
                if date_to and quote.date > date_to:
                    continue
                
                filtered_quotes.append(quote)
            
            # Convert to archive format
            search_results = []
            for quote in filtered_quotes:
                quote_data = {
                    'id': quote.id,
                    'content': quote.content,
                    'date': quote.date.isoformat(),
                    'personalization_context': quote.personalization_context or {},
                    'relevance_score': self._calculate_relevance_score(quote, search_term)
                }
                
                if quote.theme:
                    quote_data['theme'] = {
                        'id': quote.theme.id,
                        'name': quote.theme.name,
                        'type': quote.theme.type.value if quote.theme.type else None
                    }
                
                search_results.append(quote_data)
            
            # Sort by relevance score
            search_results.sort(key=lambda x: x['relevance_score'], reverse=True)
            
            logger.info(f"Found {len(search_results)} quotes matching search for user {user_id}")
            return search_results
            
        except Exception as e:
            logger.error(f"Failed to search archive: {str(e)}")
            raise QuoteArchiveError(f"Archive search failed: {str(e)}")
    
    def get_archive_statistics(self, user_id: str) -> Dict[str, Any]:
        """
        Get comprehensive statistics about user's quote archive.
        
        Args:
            user_id: User ID
            
        Returns:
            Dictionary containing archive statistics
        """
        try:
            total_quotes = self.quote_repo.count_user_quotes(user_id)
            recent_quotes = len(self.quote_repo.get_recent_quotes(user_id, days=30))
            
            # Get theme distribution
            all_quotes = self.quote_repo.get_user_quotes(user_id, limit=1000)
            theme_distribution = {}
            earliest_date = None
            latest_date = None
            
            for quote in all_quotes:
                # Track date range
                if earliest_date is None or quote.date < earliest_date:
                    earliest_date = quote.date
                if latest_date is None or quote.date > latest_date:
                    latest_date = quote.date
                
                # Count themes
                if quote.theme:
                    theme_name = quote.theme.name
                    theme_distribution[theme_name] = theme_distribution.get(theme_name, 0) + 1
            
            statistics = {
                'total_quotes': total_quotes,
                'recent_quotes_30_days': recent_quotes,
                'earliest_quote_date': earliest_date.isoformat() if earliest_date else None,
                'latest_quote_date': latest_date.isoformat() if latest_date else None,
                'theme_distribution': theme_distribution,
                'archive_span_days': (latest_date - earliest_date).days if earliest_date and latest_date else 0,
                'average_quotes_per_month': round(total_quotes / max(1, ((latest_date - earliest_date).days / 30)), 2) if earliest_date and latest_date else 0
            }
            
            logger.info(f"Generated archive statistics for user {user_id}")
            return statistics
            
        except Exception as e:
            logger.error(f"Failed to generate archive statistics: {str(e)}")
            raise QuoteArchiveError(f"Statistics generation failed: {str(e)}")
    
    def export_user_archive(self, user_id: str) -> Dict[str, Any]:
        """
        Export complete user archive with all metadata for backup/portability.
        
        Args:
            user_id: User ID
            
        Returns:
            Complete archive export with metadata
        """
        try:
            # Get all quotes for the user
            all_quotes = self.quote_repo.get_user_quotes(user_id, limit=10000)
            
            export_data = {
                'export_metadata': {
                    'user_id': user_id,
                    'export_timestamp': datetime.utcnow().isoformat(),
                    'total_quotes': len(all_quotes),
                    'export_version': '1.0'
                },
                'quotes': []
            }
            
            for quote in all_quotes:
                quote_export = {
                    'id': quote.id,
                    'content': quote.content,
                    'date': quote.date.isoformat(),
                    'personalization_context': quote.personalization_context or {},
                    'created_at': quote.created_at.isoformat() if quote.created_at else None
                }
                
                # Include complete theme data
                if quote.theme:
                    quote_export['theme'] = {
                        'id': quote.theme.id,
                        'name': quote.theme.name,
                        'description': quote.theme.description,
                        'type': quote.theme.type.value if quote.theme.type else None,
                        'keywords': quote.theme.keywords or [],
                        'start_date': quote.theme.start_date.isoformat() if quote.theme.start_date else None,
                        'end_date': quote.theme.end_date.isoformat() if quote.theme.end_date else None
                    }
                
                export_data['quotes'].append(quote_export)
            
            logger.info(f"Exported complete archive for user {user_id} ({len(all_quotes)} quotes)")
            return export_data
            
        except Exception as e:
            logger.error(f"Failed to export user archive: {str(e)}")
            raise QuoteArchiveError(f"Archive export failed: {str(e)}")
    
    def _calculate_relevance_score(self, quote: Quote, search_term: str) -> float:
        """
        Calculate relevance score for search results.
        
        Args:
            quote: Quote object
            search_term: Search term used
            
        Returns:
            Relevance score between 0.0 and 1.0
        """
        try:
            content = quote.content.lower()
            term = search_term.lower()
            
            # Basic scoring based on term frequency and position
            score = 0.0
            
            # Exact match bonus
            if term in content:
                score += 0.5
            
            # Word match scoring
            content_words = content.split()
            term_words = term.split()
            
            matching_words = sum(1 for word in term_words if word in content_words)
            if term_words:
                score += (matching_words / len(term_words)) * 0.3
            
            # Position bonus (earlier matches score higher)
            if term in content:
                position = content.find(term)
                position_score = max(0, 1 - (position / len(content))) * 0.2
                score += position_score
            
            return min(1.0, score)
            
        except Exception:
            return 0.0