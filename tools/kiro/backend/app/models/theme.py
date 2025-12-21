"""
Theme model for ARK Digital Calendar.

This module defines the Theme model and related database schema
for organizing quotes by monthly and weekly themes.
"""

from sqlalchemy import Column, String, Text, Date, ForeignKey, JSON, Enum, CheckConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
import uuid
import enum
from app.database.database import Base

class ThemeType(enum.Enum):
    """Enumeration for theme types."""
    MONTHLY = "MONTHLY"
    WEEKLY = "WEEKLY"

class Theme(Base):
    """
    Theme model representing content themes in the ARK system.
    
    Organizes quotes into monthly and weekly themes with hierarchical structure.
    """
    __tablename__ = "themes"
    
    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True
    )
    
    name = Column(
        String(255),
        nullable=False,
        comment="Theme name (e.g., 'Personal Growth', 'Mindfulness')"
    )
    
    description = Column(
        Text,
        nullable=True,
        comment="Detailed description of the theme"
    )
    
    type = Column(
        Enum(ThemeType),
        nullable=False,
        index=True,
        comment="Whether this is a monthly or weekly theme"
    )
    
    start_date = Column(
        Date,
        nullable=False,
        index=True,
        comment="Start date for this theme period"
    )
    
    end_date = Column(
        Date,
        nullable=False,
        index=True,
        comment="End date for this theme period"
    )
    
    parent_theme_id = Column(
        String(36),
        ForeignKey("themes.id"),
        nullable=True,
        index=True,
        comment="Parent theme (for weekly themes under monthly themes)"
    )
    
    # Keywords for content generation and search (stored as JSON for SQLite compatibility)
    keywords = Column(
        JSON,
        nullable=True,
        comment="Keywords associated with this theme"
    )
    
    # Personality alignment data
    personality_alignment = Column(
        JSON,
        nullable=True,
        comment="How this theme aligns with different personality categories"
    )
    
    # Theme configuration
    config = Column(
        JSON,
        nullable=True,
        default={
            "color": "#007bff",
            "icon": "default",
            "priority": 1
        },
        comment="Theme display and behavior configuration"
    )
    
    # Relationships
    parent_theme = relationship("Theme", remote_side=[id], backref="sub_themes")
    
    # Table constraints
    __table_args__ = (
        CheckConstraint("type IN ('MONTHLY', 'WEEKLY')", name='valid_theme_type'),
        CheckConstraint("start_date <= end_date", name='valid_date_range'),
    )
    
    def __repr__(self):
        return f"<Theme(id={self.id}, name={self.name}, type={self.type})>"