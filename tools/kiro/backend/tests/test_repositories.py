"""
Unit tests for repository CRUD operations.

This module tests the basic CRUD functionality of all repository classes
to ensure they work correctly with the database.
"""

import pytest
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
import tempfile
import os
from datetime import date, datetime
import uuid

from app.database.database import Base
from app.models.user import User
from app.models.quote import Quote, Feedback
from app.models.theme import Theme, ThemeType
from app.repositories import UserRepository, QuoteRepository, FeedbackRepository, ThemeRepository


@pytest.fixture
def test_db():
    """Create a temporary test database for each test."""
    # Create temporary database file
    db_fd, db_path = tempfile.mkstemp(suffix='.db')
    os.close(db_fd)
    
    # Create engine and session
    engine = create_engine(f"sqlite:///{db_path}", echo=False)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    
    yield SessionLocal()
    
    # Cleanup
    engine.dispose()
    os.unlink(db_path)


class TestUserRepository:
    """Test UserRepository CRUD operations."""
    
    def test_create_user(self, test_db):
        """Test creating a new user."""
        repo = UserRepository(test_db)
        
        user_data = {
            'id': str(uuid.uuid4()),
            'personality_data': {'spirituality': 0.8, 'sport': 0.3},
            'notification_settings': {'enabled': True, 'time': '09:00'},
            'preferences': {'theme': 'light', 'language': 'en'},
            'is_active': True
        }
        
        user = repo.create(user_data)
        
        assert user is not None
        assert user.id == user_data['id']
        assert user.personality_data == user_data['personality_data']
        assert user.is_active == True
    
    def test_get_user_by_id(self, test_db):
        """Test retrieving a user by ID."""
        repo = UserRepository(test_db)
        
        user_data = {
            'id': str(uuid.uuid4()),
            'personality_data': {'spirituality': 0.5},
            'is_active': True
        }
        
        created_user = repo.create(user_data)
        retrieved_user = repo.get_by_id(created_user.id)
        
        assert retrieved_user is not None
        assert retrieved_user.id == created_user.id
        assert retrieved_user.personality_data == user_data['personality_data']
    
    def test_update_user(self, test_db):
        """Test updating a user."""
        repo = UserRepository(test_db)
        
        user_data = {
            'id': str(uuid.uuid4()),
            'personality_data': {'spirituality': 0.5},
            'is_active': True
        }
        
        user = repo.create(user_data)
        
        update_data = {
            'personality_data': {'spirituality': 0.8, 'sport': 0.6},
            'is_active': False
        }
        
        updated_user = repo.update(user.id, update_data)
        
        assert updated_user is not None
        assert updated_user.personality_data == update_data['personality_data']
        assert updated_user.is_active == False
    
    def test_delete_user(self, test_db):
        """Test deleting a user."""
        repo = UserRepository(test_db)
        
        user_data = {
            'id': str(uuid.uuid4()),
            'is_active': True
        }
        
        user = repo.create(user_data)
        user_id = user.id
        
        # Delete the user
        result = repo.delete(user_id)
        assert result == True
        
        # Verify user is deleted
        deleted_user = repo.get_by_id(user_id)
        assert deleted_user is None


class TestThemeRepository:
    """Test ThemeRepository CRUD operations."""
    
    def test_create_theme(self, test_db):
        """Test creating a new theme."""
        repo = ThemeRepository(test_db)
        
        theme_data = {
            'id': str(uuid.uuid4()),
            'name': 'Personal Growth',
            'description': 'Focus on personal development',
            'type': ThemeType.MONTHLY,
            'start_date': date(2024, 1, 1),
            'end_date': date(2024, 1, 31),
            'keywords': ['growth', 'development'],
            'personality_alignment': {'spirituality': 0.8},
            'config': {'color': '#007bff', 'priority': 1}
        }
        
        theme = repo.create(theme_data)
        
        assert theme is not None
        assert theme.name == theme_data['name']
        assert theme.type == ThemeType.MONTHLY
        assert theme.start_date == theme_data['start_date']
    
    def test_get_current_theme(self, test_db):
        """Test retrieving current theme."""
        repo = ThemeRepository(test_db)
        
        # Create a theme that includes today
        today = date.today()
        theme_data = {
            'id': str(uuid.uuid4()),
            'name': 'Current Theme',
            'type': ThemeType.MONTHLY,
            'start_date': today,
            'end_date': today,
            'keywords': ['current']
        }
        
        created_theme = repo.create(theme_data)
        current_theme = repo.get_current_theme(today)
        
        assert current_theme is not None
        assert current_theme.id == created_theme.id


class TestQuoteRepository:
    """Test QuoteRepository CRUD operations."""
    
    def test_create_quote(self, test_db):
        """Test creating a new quote."""
        # First create a user
        user_repo = UserRepository(test_db)
        user_data = {
            'id': str(uuid.uuid4()),
            'is_active': True
        }
        user = user_repo.create(user_data)
        
        # Create quote
        quote_repo = QuoteRepository(test_db)
        quote_data = {
            'id': str(uuid.uuid4()),
            'user_id': user.id,
            'content': 'Test quote content',
            'date': date.today(),
            'personalization_context': {'theme_alignment': 0.8}
        }
        
        quote = quote_repo.create(quote_data)
        
        assert quote is not None
        assert quote.content == quote_data['content']
        assert quote.user_id == user.id
    
    def test_get_user_quotes(self, test_db):
        """Test retrieving quotes for a user."""
        # Create user
        user_repo = UserRepository(test_db)
        user_data = {
            'id': str(uuid.uuid4()),
            'is_active': True
        }
        user = user_repo.create(user_data)
        
        # Create quotes
        quote_repo = QuoteRepository(test_db)
        for i in range(3):
            quote_data = {
                'id': str(uuid.uuid4()),
                'user_id': user.id,
                'content': f'Quote {i}',
                'date': date.today(),
            }
            quote_repo.create(quote_data)
        
        # Retrieve user quotes
        quotes = quote_repo.get_user_quotes(user.id)
        
        assert len(quotes) == 3
        assert all(quote.user_id == user.id for quote in quotes)


class TestFeedbackRepository:
    """Test FeedbackRepository CRUD operations."""
    
    def test_create_feedback(self, test_db):
        """Test creating feedback."""
        # Create user and quote first
        user_repo = UserRepository(test_db)
        user_data = {
            'id': str(uuid.uuid4()),
            'is_active': True
        }
        user = user_repo.create(user_data)
        
        quote_repo = QuoteRepository(test_db)
        quote_data = {
            'id': str(uuid.uuid4()),
            'user_id': user.id,
            'content': 'Test quote',
            'date': date.today(),
        }
        quote = quote_repo.create(quote_data)
        
        # Create feedback
        feedback_repo = FeedbackRepository(test_db)
        feedback_data = {
            'id': str(uuid.uuid4()),
            'quote_id': quote.id,
            'user_id': user.id,
            'rating': 'like',
            'context': {'source': 'test'}
        }
        
        feedback = feedback_repo.create(feedback_data)
        
        assert feedback is not None
        assert feedback.rating == 'like'
        assert feedback.quote_id == quote.id
        assert feedback.user_id == user.id
    
    def test_update_or_create_feedback(self, test_db):
        """Test updating or creating feedback."""
        # Create user and quote first
        user_repo = UserRepository(test_db)
        user_data = {
            'id': str(uuid.uuid4()),
            'is_active': True
        }
        user = user_repo.create(user_data)
        
        quote_repo = QuoteRepository(test_db)
        quote_data = {
            'id': str(uuid.uuid4()),
            'user_id': user.id,
            'content': 'Test quote',
            'date': date.today(),
        }
        quote = quote_repo.create(quote_data)
        
        feedback_repo = FeedbackRepository(test_db)
        
        # Create new feedback
        feedback1 = feedback_repo.update_or_create_feedback(
            quote.id, user.id, 'like', {'source': 'test'}
        )
        assert feedback1 is not None
        assert feedback1.rating == 'like'
        
        # Update existing feedback
        feedback2 = feedback_repo.update_or_create_feedback(
            quote.id, user.id, 'dislike', {'source': 'updated'}
        )
        assert feedback2 is not None
        assert feedback2.id == feedback1.id  # Same feedback object
        assert feedback2.rating == 'dislike'  # Updated rating