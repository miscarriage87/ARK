"""
User model for ARK Digital Calendar.

This module defines the User model and related database schema
for user profiles, preferences, and personalization data.
"""

from sqlalchemy import Column, String, DateTime, JSON, Boolean, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database.database import Base

class User(Base):
    """
    User model representing a user profile in the ARK system.
    
    Stores user preferences, personality data, and notification settings.
    """
    __tablename__ = "users"
    
    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True
    )
    
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    # Personality and preference data stored as JSON
    personality_data = Column(
        JSON,
        nullable=True,
        comment="Personality categories and weights from questionnaire"
    )
    
    # Notification settings
    notification_settings = Column(
        JSON,
        nullable=True,
        default={
            "enabled": False,
            "time": "09:00",
            "timezone": "UTC"
        },
        comment="Push notification preferences"
    )
    
    # Synchronization token for cross-device sync
    sync_token = Column(
        String(255),
        nullable=True,
        index=True,
        comment="Token for data synchronization across devices"
    )
    
    # User preferences
    preferences = Column(
        JSON,
        nullable=True,
        default={
            "theme": "light",
            "language": "en",
            "quote_length": "medium"
        },
        comment="User interface and content preferences"
    )
    
    # Account status
    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
        comment="Whether the user account is active"
    )
    
    def __repr__(self):
        return f"<User(id={self.id}, created_at={self.created_at})>"