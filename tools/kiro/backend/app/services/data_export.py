"""
Data export service for ARK Digital Calendar.

This module provides functionality to export complete user data
including quotes, profile, and feedback history in JSON format.
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, date, timezone
import json
import logging

from app.repositories.user_repository import UserRepository
from app.repositories.quote_repository import QuoteRepository, FeedbackRepository
from app.repositories.theme_repository import ThemeRepository

logger = logging.getLogger(__name__)


class DataExportService:
    """
    Service for exporting complete user data.
    
    Provides functionality to export all user data including:
    - User profile and preferences
    - Complete quote archive
    - All feedback history
    - Theme associations
    """
    
    def __init__(self, db: Session):
        """Initialize DataExportService with database session."""
        self.db = db
        self.user_repo = UserRepository(db)
        self.quote_repo = QuoteRepository(db)
        self.feedback_repo = FeedbackRepository(db)
        self.theme_repo = ThemeRepository(db)
    
    def export_user_data(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Export complete user data in JSON format.
        
        Args:
            user_id: User ID to export data for
            
        Returns:
            Dictionary containing all user data or None if user not found
        """
        try:
            # Get user profile
            user = self.user_repo.get_by_id(user_id)
            if not user:
                logger.error(f"User not found for export: {user_id}")
                return None
            
            # Get all user quotes
            quotes = self.quote_repo.get_user_quotes(user_id, skip=0, limit=10000)  # Get all quotes
            
            # Get all user feedback
            feedback = self.feedback_repo.get_user_feedback(user_id, skip=0, limit=10000)  # Get all feedback
            
            # Build export data structure
            export_data = {
                "export_metadata": {
                    "user_id": user_id,
                    "export_date": datetime.now(timezone.utc).isoformat(),
                    "export_timestamp": datetime.now(timezone.utc).isoformat(),
                    "version": "1.0",
                    "export_version": "1.0",
                    "total_quotes": len(quotes),
                    "total_feedback": len(feedback)
                },
                "user_profile": self._serialize_user_profile(user),
                "quotes": [self._serialize_quote(quote) for quote in quotes],
                "feedback": [self._serialize_feedback(fb) for fb in feedback],
                "themes": self._get_user_themes(quotes)
            }
            
            logger.info(f"Successfully exported data for user: {user_id}")
            return export_data
            
        except Exception as e:
            logger.error(f"Error exporting user data: {e}")
            return None
    
    def _serialize_user_profile(self, user) -> Dict[str, Any]:
        """
        Serialize user profile data.
        
        Args:
            user: User model instance
            
        Returns:
            Serialized user profile data
        """
        return {
            "id": user.id,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            "personality_data": user.personality_data or {},
            "notification_settings": user.notification_settings or {},
            "preferences": user.preferences or {},
            "sync_token": user.sync_token,
            "is_active": user.is_active
        }
    
    def _serialize_quote(self, quote) -> Dict[str, Any]:
        """
        Serialize quote data.
        
        Args:
            quote: Quote model instance
            
        Returns:
            Serialized quote data
        """
        return {
            "id": quote.id,
            "content": quote.content,
            "author": quote.author,
            "date": quote.date.isoformat() if quote.date else None,
            "theme_id": quote.theme_id,
            "theme_name": quote.theme.name if quote.theme else None,
            "personalization_context": quote.personalization_context or {},
            "created_at": quote.created_at.isoformat() if quote.created_at else None
        }
    
    def _serialize_feedback(self, feedback) -> Dict[str, Any]:
        """
        Serialize feedback data.
        
        Args:
            feedback: Feedback model instance
            
        Returns:
            Serialized feedback data
        """
        return {
            "id": feedback.id,
            "quote_id": feedback.quote_id,
            "user_id": feedback.user_id,
            "rating": feedback.rating,
            "timestamp": feedback.timestamp.isoformat() if feedback.timestamp else None,
            "context": feedback.context or {},
            "quote_content": feedback.quote.content if feedback.quote else None,
            "quote_date": feedback.quote.date.isoformat() if feedback.quote and feedback.quote.date else None
        }
    
    def _get_user_themes(self, quotes: List) -> List[Dict[str, Any]]:
        """
        Get unique themes associated with user's quotes.
        
        Args:
            quotes: List of quote objects
            
        Returns:
            List of unique themes used in user's quotes
        """
        theme_ids = set()
        themes_data = []
        
        for quote in quotes:
            if quote.theme_id and quote.theme_id not in theme_ids:
                theme_ids.add(quote.theme_id)
                if quote.theme:
                    themes_data.append({
                        "id": quote.theme.id,
                        "name": quote.theme.name,
                        "description": quote.theme.description,
                        "type": quote.theme.type.value if quote.theme.type else None,
                        "start_date": quote.theme.start_date.isoformat() if quote.theme.start_date else None,
                        "end_date": quote.theme.end_date.isoformat() if quote.theme.end_date else None,
                        "keywords": quote.theme.keywords or []
                    })
        
        return themes_data
    
    def export_user_data_json(self, user_id: str) -> Optional[str]:
        """
        Export user data as JSON string.
        
        Args:
            user_id: User ID to export data for
            
        Returns:
            JSON string containing all user data or None if export failed
        """
        try:
            export_data = self.export_user_data(user_id)
            if export_data:
                return json.dumps(export_data, indent=2, ensure_ascii=False)
            return None
        except Exception as e:
            logger.error(f"Error serializing user data to JSON: {e}")
            return None
    
    def validate_export_completeness(self, user_id: str, export_data: Dict[str, Any]) -> bool:
        """
        Validate that export contains all expected user data.
        
        Args:
            user_id: User ID
            export_data: Exported data to validate
            
        Returns:
            True if export is complete, False otherwise
        """
        try:
            # Check required sections exist
            required_sections = ["export_metadata", "user_profile", "quotes", "feedback", "themes"]
            for section in required_sections:
                if section not in export_data:
                    logger.error(f"Missing required section in export: {section}")
                    return False
            
            # Validate metadata
            metadata = export_data["export_metadata"]
            if metadata.get("user_id") != user_id:
                logger.error("User ID mismatch in export metadata")
                return False
            
            # Validate user profile
            profile = export_data["user_profile"]
            if profile.get("id") != user_id:
                logger.error("User ID mismatch in profile data")
                return False
            
            # Validate quote count matches metadata
            actual_quote_count = len(export_data["quotes"])
            expected_quote_count = metadata.get("total_quotes", 0)
            if actual_quote_count != expected_quote_count:
                logger.error(f"Quote count mismatch: expected {expected_quote_count}, got {actual_quote_count}")
                return False
            
            # Validate feedback count matches metadata
            actual_feedback_count = len(export_data["feedback"])
            expected_feedback_count = metadata.get("total_feedback", 0)
            if actual_feedback_count != expected_feedback_count:
                logger.error(f"Feedback count mismatch: expected {expected_feedback_count}, got {actual_feedback_count}")
                return False
            
            logger.info(f"Export validation successful for user: {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error validating export completeness: {e}")
            return False
    
    def import_user_data(self, import_data: Dict[str, Any]) -> bool:
        """
        Import user data from export format.
        
        Args:
            import_data: Data to import in export format
            
        Returns:
            True if import successful, False otherwise
        """
        try:
            # Validate import data structure
            if not self.validate_import_data_structure(import_data):
                logger.error("Invalid import data structure")
                return False
            
            user_id = import_data["export_metadata"]["user_id"]
            
            # Check if user already exists
            existing_user = self.user_repo.get_by_id(user_id)
            if existing_user:
                logger.warning(f"User already exists, skipping import: {user_id}")
                return False
            
            # Import user profile
            profile_data = import_data["user_profile"]
            user_data = {
                "id": profile_data["id"],
                "personality_data": profile_data.get("personality_data", {}),
                "notification_settings": profile_data.get("notification_settings", {}),
                "preferences": profile_data.get("preferences", {}),
                "sync_token": profile_data.get("sync_token"),
                "is_active": profile_data.get("is_active", True)
            }
            
            user = self.user_repo.create(user_data)
            
            # Import quotes
            for quote_data in import_data["quotes"]:
                quote_import_data = {
                    "id": quote_data["id"],
                    "user_id": user.id,
                    "content": quote_data["content"],
                    "author": quote_data.get("author"),
                    "date": datetime.fromisoformat(quote_data["date"]).date() if quote_data.get("date") else None,
                    "theme_id": quote_data.get("theme_id"),
                    "personalization_context": quote_data.get("personalization_context", {})
                }
                self.quote_repo.create(quote_import_data)
            
            # Import feedback
            for feedback_data in import_data["feedback"]:
                feedback_import_data = {
                    "id": feedback_data["id"],
                    "quote_id": feedback_data["quote_id"],
                    "user_id": feedback_data["user_id"],
                    "rating": feedback_data["rating"],
                    "timestamp": datetime.fromisoformat(feedback_data["timestamp"]) if feedback_data.get("timestamp") else None,
                    "context": feedback_data.get("context", {})
                }
                self.feedback_repo.create(feedback_import_data)
            
            logger.info(f"Successfully imported data for user: {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error importing user data: {e}")
            return False
    
    def validate_import_data_structure(self, import_data: Dict[str, Any]) -> bool:
        """
        Validate that import data has the correct structure.
        
        Args:
            import_data: Data to validate
            
        Returns:
            True if structure is valid, False otherwise
        """
        try:
            required_sections = ["export_metadata", "user_profile", "quotes", "feedback", "themes"]
            for section in required_sections:
                if section not in import_data:
                    logger.error(f"Missing required section in import data: {section}")
                    return False
            
            # Validate metadata has required fields
            metadata = import_data["export_metadata"]
            required_metadata_fields = ["user_id", "export_timestamp", "export_version"]
            for field in required_metadata_fields:
                if field not in metadata:
                    logger.error(f"Missing required metadata field: {field}")
                    return False
            
            # Validate user profile has required fields
            profile = import_data["user_profile"]
            if "id" not in profile:
                logger.error("Missing user ID in profile data")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating import data structure: {e}")
            return False