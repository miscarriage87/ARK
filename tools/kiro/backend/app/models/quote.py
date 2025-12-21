"""
Quote model for ARK Digital Calendar.

This module defines the Quote model and related database schema
for daily quotes, their metadata, and user associations.
"""

from sqlalchemy import Column, String, Text, Date, DateTime, ForeignKey, JSON, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database.database import Base

class Quote(Base):
    """
    Quote model representing a daily quote in the ARK system.
    
    Stores quote content, metadata, personalization context, and theme association.
    """
    __tablename__ = "quotes"
    
    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True
    )
    
    user_id = Column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        comment="User who received this quote"
    )
    
    content = Column(
        Text,
        nullable=False,
        comment="The actual quote text content"
    )
    
    author = Column(
        String(255),
        nullable=True,
        comment="Quote author (if applicable)"
    )
    
    date = Column(
        Date,
        nullable=False,
        index=True,
        comment="Date this quote was delivered"
    )
    
    theme_id = Column(
        String(36),
        ForeignKey("themes.id"),
        nullable=True,
        index=True,
        comment="Associated theme for this quote"
    )
    
    # Personalization context used when generating this quote
    personalization_context = Column(
        JSON,
        nullable=True,
        comment="Personalization data used for quote generation"
    )
    
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    
    # Relationships
    user = relationship("User", backref="quotes")
    theme = relationship("Theme", backref="quotes")
    
    # Table constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'date', name='unique_user_date_quote'),
    )
    
    def __repr__(self):
        return f"<Quote(id={self.id}, user_id={self.user_id}, date={self.date})>"

class Feedback(Base):
    """
    Feedback model for user ratings on quotes.
    
    Stores user feedback (like/neutral/dislike) for personalization learning.
    """
    __tablename__ = "feedback"
    
    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True
    )
    
    quote_id = Column(
        String(36),
        ForeignKey("quotes.id"),
        nullable=False,
        index=True,
        comment="Quote being rated"
    )
    
    user_id = Column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        comment="User providing feedback"
    )
    
    rating = Column(
        String(10),
        nullable=False,
        comment="User rating: like, neutral, or dislike"
    )
    
    # Table constraints
    __table_args__ = (
        CheckConstraint("rating IN ('like', 'neutral', 'dislike')", name='valid_rating'),
    )
    
    timestamp = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    
    # Additional feedback context
    context = Column(
        JSON,
        nullable=True,
        comment="Additional context about the feedback"
    )
    
    # Relationships
    quote = relationship("Quote", backref="feedback")
    user = relationship("User", backref="feedback_given")
    
    def __repr__(self):
        return f"<Feedback(id={self.id}, quote_id={self.quote_id}, rating={self.rating})>"