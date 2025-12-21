"""
Property-based tests for data export functionality.

Tests the complete data export system to ensure all user data
is properly exported and validated.
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from hypothesis.stateful import RuleBasedStateMachine, Bundle, rule, initialize
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from typing import Dict, Any, List
import json

from app.database.database import get_db, engine
from app.models.user import User
from app.models.quote import Quote, Feedback
from app.models.theme import Theme
from app.repositories.user_repository import UserRepository
from app.repositories.quote_repository import QuoteRepository, FeedbackRepository
from app.repositories.theme_repository import ThemeRepository
from app.services.data_export import DataExportService


# Test data generators
@st.composite
def user_data(draw):
    """Generate realistic user data."""
    return {
        'personality_data': {
            'categories': {
                'spirituality': draw(st.floats(min_value=0.0, max_value=1.0)),
                'sport': draw(st.floats(min_value=0.0, max_value=1.0)),
                'education': draw(st.floats(min_value=0.0, max_value=1.0)),
                'health': draw(st.floats(min_value=0.0, max_value=1.0)),
                'humor': draw(st.floats(min_value=0.0, max_value=1.0)),
                'philosophy': draw(st.floats(min_value=0.0, max_value=1.0))
            },
            'confidence_scores': {
                'spirituality': draw(st.floats(min_value=0.1, max_value=1.0)),
                'sport': draw(st.floats(min_value=0.1, max_value=1.0)),
                'education': draw(st.floats(min_value=0.1, max_value=1.0)),
                'health': draw(st.floats(min_value=0.1, max_value=1.0)),
                'humor': draw(st.floats(min_value=0.1, max_value=1.0)),
                'philosophy': draw(st.floats(min_value=0.1, max_value=1.0))
            }
        },
        'notification_settings': {
            'enabled': draw(st.booleans()),
            'time': draw(st.sampled_from(['06:00', '07:00', '08:00', '09:00', '10:00'])),
            'timezone': draw(st.sampled_from(['UTC', 'America/New_York', 'Europe/London']))
        },
        'preferences': {
            'theme': draw(st.sampled_from(['light', 'dark', 'auto'])),
            'language': draw(st.sampled_from(['en', 'es', 'fr', 'de'])),
            'quote_length': draw(st.sampled_from(['short', 'medium', 'long']))
        }
    }


@st.composite
def quote_data(draw, user_id: str, theme_id: str = None):
    """Generate realistic quote data."""
    quote_date = draw(st.dates(
        min_value=date.today() - timedelta(days=365),
        max_value=date.today()
    ))
    
    return {
        'user_id': user_id,
        'content': draw(st.text(min_size=10, max_size=500)),
        'author': draw(st.one_of(st.none(), st.text(min_size=3, max_size=50))),
        'date': quote_date,
        'theme_id': theme_id,
        'personalization_context': {
            'dominant_categories': draw(st.lists(
                st.sampled_from(['spirituality', 'sport', 'education', 'health', 'humor', 'philosophy']),
                min_size=1, max_size=3, unique=True
            )),
            'theme_alignment': draw(st.floats(min_value=0.0, max_value=1.0))
        }
    }


@st.composite
def feedback_data(draw, quote_id: str, user_id: str):
    """Generate realistic feedback data."""
    return {
        'quote_id': quote_id,
        'user_id': user_id,
        'rating': draw(st.sampled_from(['like', 'neutral', 'dislike'])),
        'context': {
            'source': 'user_interaction',
            'confidence': draw(st.floats(min_value=0.1, max_value=1.0))
        }
    }


@st.composite
def theme_data(draw):
    """Generate realistic theme data."""
    start_date = draw(st.dates(
        min_value=date(2024, 1, 1),
        max_value=date(2024, 12, 31)
    ))
    
    return {
        'name': draw(st.text(min_size=5, max_size=50)),
        'description': draw(st.text(min_size=10, max_size=200)),
        'type': draw(st.sampled_from(['MONTHLY', 'WEEKLY'])),
        'start_date': start_date,
        'end_date': start_date + timedelta(days=draw(st.integers(min_value=7, max_value=31))),
        'keywords': draw(st.lists(st.text(min_size=3, max_size=20), min_size=1, max_size=10))
    }


class DataExportStateMachine(RuleBasedStateMachine):
    """
    Stateful testing for data export functionality.
    
    Tests various scenarios of user data creation and export
    to ensure completeness and consistency.
    """
    
    def __init__(self):
        super().__init__()
        self.db = next(get_db())
        self.export_service = DataExportService(self.db)
        self.user_repo = UserRepository(self.db)
        self.quote_repo = QuoteRepository(self.db)
        self.feedback_repo = FeedbackRepository(self.db)
        self.theme_repo = ThemeRepository(self.db)
        
        # Track created entities
        self.users = {}
        self.quotes = {}
        self.feedback = {}
        self.themes = {}
    
    users = Bundle('users')
    quotes = Bundle('quotes')
    themes = Bundle('themes')
    
    @rule(target=users, user_data=user_data())
    def create_user(self, user_data):
        """Create a user with generated data."""
        user = self.user_repo.create(user_data)
        assume(user is not None)
        
        self.users[user.id] = user
        return user.id
    
    @rule(target=themes, theme_data=theme_data())
    def create_theme(self, theme_data):
        """Create a theme with generated data."""
        theme = self.theme_repo.create(theme_data)
        assume(theme is not None)
        
        self.themes[theme.id] = theme
        return theme.id
    
    @rule(target=quotes, user_id=users, theme_id=themes)
    def create_quote(self, user_id, theme_id):
        """Create a quote for a user and theme."""
        # Generate quote data directly instead of using .example()
        quote_data_dict = {
            'user_id': user_id,
            'content': f'Test quote content for user {user_id}',
            'author': 'Test Author',
            'date': date.today() - timedelta(days=len(self.quotes)),  # Ensure unique dates
            'theme_id': theme_id,
            'personalization_context': {
                'dominant_categories': ['spirituality'],
                'theme_alignment': 0.8
            }
        }
        
        quote = self.quote_repo.create(quote_data_dict)
        assume(quote is not None)
        
        self.quotes[quote.id] = quote
        return quote.id
    
    @rule(user_id=users, quote_id=quotes)
    def create_feedback(self, user_id, quote_id):
        """Create feedback for a quote."""
        quote = self.quotes.get(quote_id)
        assume(quote is not None and quote.user_id == user_id)
        
        feedback_data_dict = {
            'quote_id': quote_id,
            'user_id': user_id,
            'rating': 'like',
            'context': {
                'source': 'user_interaction',
                'confidence': 0.8
            }
        }
        feedback = self.feedback_repo.create(feedback_data_dict)
        assume(feedback is not None)
        
        self.feedback[feedback.id] = feedback
    
    @rule(user_id=users)
    def test_complete_data_export(self, user_id):
        """
        Test complete data export for a user.
        
        **Feature: digital-calendar, Property 19: Complete Data Export**
        **Validates: Requirements 9.5**
        
        For any user requesting data export, the exported data should include
        all quotes, profile information, and feedback history in a structured format.
        """
        # Export user data
        export_data = self.export_service.export_user_data(user_id)
        
        # Verify export was successful
        assert export_data is not None, "Export should not be None"
        
        # Verify required sections exist
        required_sections = ["export_metadata", "user_profile", "quotes", "feedback", "themes"]
        for section in required_sections:
            assert section in export_data, f"Export should contain {section} section"
        
        # Verify metadata
        metadata = export_data["export_metadata"]
        assert metadata["user_id"] == user_id, "Metadata should contain correct user ID"
        assert "export_timestamp" in metadata, "Metadata should contain export timestamp"
        assert "export_version" in metadata, "Metadata should contain export version"
        
        # Verify user profile completeness
        profile = export_data["user_profile"]
        user = self.users[user_id]
        assert profile["id"] == user_id, "Profile should contain correct user ID"
        assert profile["personality_data"] == user.personality_data, "Profile should contain personality data"
        assert profile["notification_settings"] == user.notification_settings, "Profile should contain notification settings"
        assert profile["preferences"] == user.preferences, "Profile should contain preferences"
        
        # Verify quotes completeness
        user_quotes = [q for q in self.quotes.values() if q.user_id == user_id]
        exported_quotes = export_data["quotes"]
        
        assert len(exported_quotes) == len(user_quotes), "All user quotes should be exported"
        assert metadata["total_quotes"] == len(user_quotes), "Metadata should reflect correct quote count"
        
        # Verify each quote is properly serialized
        exported_quote_ids = {q["id"] for q in exported_quotes}
        actual_quote_ids = {q.id for q in user_quotes}
        assert exported_quote_ids == actual_quote_ids, "All quote IDs should match"
        
        # Verify feedback completeness
        user_feedback = [f for f in self.feedback.values() if f.user_id == user_id]
        exported_feedback = export_data["feedback"]
        
        assert len(exported_feedback) == len(user_feedback), "All user feedback should be exported"
        assert metadata["total_feedback"] == len(user_feedback), "Metadata should reflect correct feedback count"
        
        # Verify each feedback is properly serialized
        exported_feedback_ids = {f["id"] for f in exported_feedback}
        actual_feedback_ids = {f.id for f in user_feedback}
        assert exported_feedback_ids == actual_feedback_ids, "All feedback IDs should match"
        
        # Verify themes are included
        user_theme_ids = {q.theme_id for q in user_quotes if q.theme_id}
        exported_theme_ids = {t["id"] for t in export_data["themes"]}
        assert user_theme_ids.issubset(exported_theme_ids), "All user themes should be exported"
        
        # Verify export validation passes
        assert self.export_service.validate_export_completeness(user_id, export_data), "Export should pass validation"
        
        # Verify JSON serialization works
        json_export = self.export_service.export_user_data_json(user_id)
        assert json_export is not None, "JSON export should not be None"
        
        # Verify JSON can be parsed back (timestamps may differ, so check structure)
        parsed_data = json.loads(json_export)
        assert "export_metadata" in parsed_data, "JSON should contain export_metadata"
        assert "user_profile" in parsed_data, "JSON should contain user_profile"
        assert "quotes" in parsed_data, "JSON should contain quotes"
        assert "feedback" in parsed_data, "JSON should contain feedback"
        assert "themes" in parsed_data, "JSON should contain themes"


# Property-based tests
@given(user_data=user_data())
@settings(max_examples=50, deadline=None)
def test_export_empty_user_data(user_data):
    """
    Test data export for users with minimal data.
    
    **Feature: digital-calendar, Property 19: Complete Data Export**
    **Validates: Requirements 9.5**
    """
    db = next(get_db())
    try:
        export_service = DataExportService(db)
        user_repo = UserRepository(db)
        
        # Create user with minimal data
        user = user_repo.create(user_data)
        assume(user is not None)
        
        # Export data
        export_data = export_service.export_user_data(user.id)
        
        # Verify basic structure exists even with no quotes/feedback
        assert export_data is not None
        assert "export_metadata" in export_data
        assert "user_profile" in export_data
        assert "quotes" in export_data
        assert "feedback" in export_data
        assert "themes" in export_data
        
        # Verify empty collections
        assert export_data["quotes"] == []
        assert export_data["feedback"] == []
        assert export_data["themes"] == []
        
        # Verify metadata reflects empty state
        metadata = export_data["export_metadata"]
        assert metadata["total_quotes"] == 0
        assert metadata["total_feedback"] == 0
        
        # Verify validation passes for empty export
        assert export_service.validate_export_completeness(user.id, export_data)
        
    finally:
        db.rollback()
        db.close()


@given(
    user_data=user_data(),
    quote_count=st.integers(min_value=1, max_value=20),
    feedback_ratio=st.floats(min_value=0.0, max_value=1.0)
)
@settings(max_examples=30, deadline=None)
def test_export_data_consistency(user_data, quote_count, feedback_ratio):
    """
    Test that exported data maintains consistency with database.
    
    **Feature: digital-calendar, Property 19: Complete Data Export**
    **Validates: Requirements 9.5**
    """
    db = next(get_db())
    try:
        export_service = DataExportService(db)
        user_repo = UserRepository(db)
        quote_repo = QuoteRepository(db)
        feedback_repo = FeedbackRepository(db)
        theme_repo = ThemeRepository(db)
        
        # Create user
        user = user_repo.create(user_data)
        assume(user is not None)
        
        # Create theme
        theme_data_dict = {
            'name': 'Test Theme',
            'description': 'Test theme description',
            'type': 'MONTHLY',
            'start_date': date(2024, 1, 1),
            'end_date': date(2024, 1, 31),
            'keywords': ['test', 'example']
        }
        theme = theme_repo.create(theme_data_dict)
        assume(theme is not None)
        
        # Create quotes
        created_quotes = []
        for i in range(quote_count):
            quote_data_dict = {
                'user_id': user.id,
                'content': f'Test quote {i}',
                'author': 'Test Author',
                'date': date.today() - timedelta(days=i),  # Ensure unique dates
                'theme_id': theme.id,
                'personalization_context': {
                    'dominant_categories': ['spirituality'],
                    'theme_alignment': 0.8
                }
            }
            
            quote = quote_repo.create(quote_data_dict)
            if quote:
                created_quotes.append(quote)
        
        # Create feedback for some quotes
        feedback_count = int(len(created_quotes) * feedback_ratio)
        for i in range(min(feedback_count, len(created_quotes))):
            quote = created_quotes[i]
            feedback_data_dict = {
                'quote_id': quote.id,
                'user_id': user.id,
                'rating': 'like',
                'context': {
                    'source': 'user_interaction',
                    'confidence': 0.8
                }
            }
            feedback_repo.create(feedback_data_dict)
        
        # Export data
        export_data = export_service.export_user_data(user.id)
        assert export_data is not None
        
        # Verify counts match database
        db_quote_count = quote_repo.count_user_quotes(user.id)
        db_feedback_count = len(feedback_repo.get_user_feedback(user.id, limit=1000))
        
        assert export_data["export_metadata"]["total_quotes"] == db_quote_count
        assert export_data["export_metadata"]["total_feedback"] == db_feedback_count
        assert len(export_data["quotes"]) == db_quote_count
        assert len(export_data["feedback"]) == db_feedback_count
        
        # Verify data integrity
        assert export_service.validate_export_completeness(user.id, export_data)
        
    finally:
        db.rollback()
        db.close()


# Stateful test
TestDataExport = DataExportStateMachine.TestCase


if __name__ == "__main__":
    pytest.main([__file__])