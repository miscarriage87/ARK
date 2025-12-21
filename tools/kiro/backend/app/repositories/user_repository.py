"""
User repository for ARK Digital Calendar.

This module provides database operations specific to User entities
with additional business logic and validation.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timezone
import logging

from app.models.user import User
from app.repositories.base import BaseRepository

logger = logging.getLogger(__name__)


class UserRepository(BaseRepository[User]):
    """
    Repository for User entity operations.
    
    Provides CRUD operations and business-specific queries for users.
    """
    
    def __init__(self, db: Session):
        """Initialize UserRepository with database session."""
        super().__init__(User, db)
    
    def get_by_sync_token(self, sync_token: str) -> Optional[User]:
        """
        Retrieve a user by their sync token.
        
        Args:
            sync_token: User's synchronization token
            
        Returns:
            User if found, None otherwise
        """
        try:
            return self.db.query(User).filter(User.sync_token == sync_token).first()
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving user by sync token: {e}")
            return None
    
    def get_active_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        """
        Retrieve all active users.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of active users
        """
        try:
            return (self.db.query(User)
                   .filter(User.is_active == True)
                   .offset(skip)
                   .limit(limit)
                   .all())
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving active users: {e}")
            return []
    
    def update_personality_data(self, user_id: str, personality_data: Dict[str, Any]) -> Optional[User]:
        """
        Update user's personality data.
        
        Args:
            user_id: User ID
            personality_data: New personality data
            
        Returns:
            Updated user or None if update failed
        """
        try:
            user = self.get_by_id(user_id)
            if not user:
                return None
            
            user.personality_data = personality_data
            user.updated_at = datetime.now(timezone.utc)
            
            self.db.commit()
            self.db.refresh(user)
            logger.info(f"Updated personality data for user: {user_id}")
            return user
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error updating personality data: {e}")
            return None
    
    def update_notification_settings(self, user_id: str, notification_settings: Dict[str, Any]) -> Optional[User]:
        """
        Update user's notification settings.
        
        Args:
            user_id: User ID
            notification_settings: New notification settings
            
        Returns:
            Updated user or None if update failed
        """
        try:
            user = self.get_by_id(user_id)
            if not user:
                return None
            
            user.notification_settings = notification_settings
            user.updated_at = datetime.now(timezone.utc)
            
            self.db.commit()
            self.db.refresh(user)
            logger.info(f"Updated notification settings for user: {user_id}")
            return user
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error updating notification settings: {e}")
            return None
    
    def deactivate_user(self, user_id: str) -> bool:
        """
        Deactivate a user account.
        
        Args:
            user_id: User ID
            
        Returns:
            True if deactivation was successful, False otherwise
        """
        try:
            user = self.get_by_id(user_id)
            if not user:
                return False
            
            user.is_active = False
            user.updated_at = datetime.now(timezone.utc)
            
            self.db.commit()
            logger.info(f"Deactivated user: {user_id}")
            return True
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error deactivating user: {e}")
            return False
    
    def activate_user(self, user_id: str) -> bool:
        """
        Activate a user account.
        
        Args:
            user_id: User ID
            
        Returns:
            True if activation was successful, False otherwise
        """
        try:
            user = self.get_by_id(user_id)
            if not user:
                return False
            
            user.is_active = True
            user.updated_at = datetime.now(timezone.utc)
            
            self.db.commit()
            logger.info(f"Activated user: {user_id}")
            return True
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error activating user: {e}")
            return False
    
    def count_active_users(self) -> int:
        """
        Count total number of active users.
        
        Returns:
            Total count of active users
        """
        try:
            return self.db.query(User).filter(User.is_active == True).count()
        except SQLAlchemyError as e:
            logger.error(f"Database error counting active users: {e}")
            return 0