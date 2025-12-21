"""
Property-based tests for data persistence across sessions.

This module tests Property 17: Data Persistence Across Sessions
**Validates: Requirements 9.1**
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
import tempfile
import os
from datetime import date, datetime
import uuid
from contextlib import contextmanager

from app.database.database import Base
from app.models.user import User
from app.models.quote import Quote, Feedback
from app.models.theme import Theme, ThemeType


@contextmanager
def test_database():
    """Create a temporary test database context manager."""
    # Create temporary database file
    db_fd, db_path = tempfile.mkstemp(suffix='.db')
    os.close(db_fd)
    
    try:
        # Create engine and session
        engine = create_engine(f"sqlite:///{db_path}", echo=False)
        Base.metadata.create_all(engine)
        SessionLocal = sessionmaker(bind=engine)
        
        yield SessionLocal, engine
    finally:
        # Cleanup
        engine.dispose()
        if os.path.exists(db_path):
            os.unlink(db_path)


# Hypothesis strategies for generating test data
@st.composite
def user_data(draw):
    """Generate valid user data."""
    return {
        'id': str(uuid.uuid4()),
        'personality_data': {
            'spirituality': draw(st.floats(min_value=0.0, max_value=1.0)),
            'sport': draw(st.floats(min_value=0.0, max_value=1.0)),
            'education': draw(st.floats(min_value=0.0, max_value=1.0)),
        },
        'notification_settings': {
            'enabled': draw(st.booleans()),
            'time': draw(st.sampled_from(['09:00', '12:00', '18:00'])),
            'timezone': 'UTC'
        },
        'preferences': {
            'theme': draw(st.sampled_from(['light', 'dark'])),
            'language': 'en',
            'quote_length': draw(st.sampled_from(['short', 'medium', 'long']))
        },
        'is_active': draw(st.booleans())
    }


@st.composite
def theme_data(draw):
    """Generate valid theme data."""
    start_date = draw(st.dates(min_value=date(2024, 1, 1), max_value=date(2024, 12, 31)))
    end_date = draw(st.dates(min_value=start_date, max_value=date(2025, 12, 31)))
    
    return {
        'id': str(uuid.uuid4()),
        'name': draw(st.text(min_size=1, max_size=100, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc', 'Pd', 'Zs')))),
        'description': draw(st.text(min_size=0, max_size=500, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc', 'Pd', 'Zs')))),
        'type': draw(st.sampled_from([ThemeType.MONTHLY, ThemeType.WEEKLY])),
        'start_date': start_date,
        'end_date': end_date,
        'keywords': draw(st.lists(st.text(min_size=1, max_size=20), min_size=0, max_size=10)),
        'personality_alignment': {
            'spirituality': draw(st.floats(min_value=0.0, max_value=1.0)),
            'sport': draw(st.floats(min_value=0.0, max_value=1.0)),
        },
        'config': {
            'color': draw(st.sampled_from(['#007bff', '#28a745', '#dc3545'])),
            'icon': 'default',
            'priority': draw(st.integers(min_value=1, max_value=10))
        }
    }


@st.composite
def quote_data(draw, user_id, theme_id=None):
    """Generate valid quote data."""
    return {
        'id': str(uuid.uuid4()),
        'user_id': user_id,
        'content': draw(st.text(min_size=10, max_size=500, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc', 'Pd', 'Zs')))),
        'author': draw(st.one_of(st.none(), st.text(min_size=1, max_size=100))),
        'date': draw(st.dates(min_value=date(2024, 1, 1), max_value=date(2024, 12, 31))),
        'theme_id': theme_id,
        'personalization_context': {
            'dominant_categories': ['spirituality', 'education'],
            'theme_alignment': draw(st.floats(min_value=0.0, max_value=1.0))
        }
    }


@st.composite
def feedback_data(draw, user_id, quote_id):
    """Generate valid feedback data."""
    return {
        'id': str(uuid.uuid4()),
        'quote_id': quote_id,
        'user_id': user_id,
        'rating': draw(st.sampled_from(['like', 'neutral', 'dislike'])),
        'context': {
            'source': 'user_interaction',
            'confidence': draw(st.floats(min_value=0.0, max_value=1.0))
        }
    }


class TestDataPersistence:
    """
    Property-based tests for data persistence across sessions.
    
    Feature: digital-calendar, Property 17: Data Persistence Across Sessions
    **Validates: Requirements 9.1**
    """

    @given(user_data())
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_user_data_persistence_across_sessions(self, user_data_dict):
        """
        Property 17: Data Persistence Across Sessions
        
        For any user profile data, it should persist across application sessions
        and be available after restart.
        
        **Validates: Requirements 9.1**
        """
        with test_database() as (SessionLocal, engine):
            # Session 1: Create and save user
            session1 = SessionLocal()
            try:
                user = User(**user_data_dict)
                session1.add(user)
                session1.commit()
                user_id = user.id
            finally:
                session1.close()
            
            # Session 2: Retrieve user data (simulating application restart)
            session2 = SessionLocal()
            try:
                retrieved_user = session2.query(User).filter(User.id == user_id).first()
                
                # Verify all data persisted correctly
                assert retrieved_user is not None
                assert retrieved_user.id == user_data_dict['id']
                assert retrieved_user.personality_data == user_data_dict['personality_data']
                assert retrieved_user.notification_settings == user_data_dict['notification_settings']
                assert retrieved_user.preferences == user_data_dict['preferences']
                assert retrieved_user.is_active == user_data_dict['is_active']
            finally:
                session2.close()

    @given(theme_data())
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_theme_data_persistence_across_sessions(self, theme_data_dict):
        """
        Property 17: Data Persistence Across Sessions (Theme variant)
        
        For any theme data, it should persist across application sessions
        and be available after restart.
        
        **Validates: Requirements 9.1**
        """
        with test_database() as (SessionLocal, engine):
            # Session 1: Create and save theme
            session1 = SessionLocal()
            try:
                theme = Theme(**theme_data_dict)
                session1.add(theme)
                session1.commit()
                theme_id = theme.id
            finally:
                session1.close()
            
            # Session 2: Retrieve theme data (simulating application restart)
            session2 = SessionLocal()
            try:
                retrieved_theme = session2.query(Theme).filter(Theme.id == theme_id).first()
                
                # Verify all data persisted correctly
                assert retrieved_theme is not None
                assert retrieved_theme.id == theme_data_dict['id']
                assert retrieved_theme.name == theme_data_dict['name']
                assert retrieved_theme.description == theme_data_dict['description']
                assert retrieved_theme.type == theme_data_dict['type']
                assert retrieved_theme.start_date == theme_data_dict['start_date']
                assert retrieved_theme.end_date == theme_data_dict['end_date']
                assert retrieved_theme.keywords == theme_data_dict['keywords']
                assert retrieved_theme.personality_alignment == theme_data_dict['personality_alignment']
                assert retrieved_theme.config == theme_data_dict['config']
            finally:
                session2.close()

    @given(user_data(), theme_data())
    @settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_quote_data_persistence_across_sessions(self, user_data_dict, theme_data_dict):
        """
        Property 17: Data Persistence Across Sessions (Quote variant)
        
        For any quote data with relationships, it should persist across application sessions
        and be available after restart with all relationships intact.
        
        **Validates: Requirements 9.1**
        """
        with test_database() as (SessionLocal, engine):
            # Session 1: Create user, theme, and quote
            session1 = SessionLocal()
            try:
                user = User(**user_data_dict)
                theme = Theme(**theme_data_dict)
                session1.add(user)
                session1.add(theme)
                session1.commit()
                
                quote_data_dict = quote_data(user.id, theme.id).example()
                quote = Quote(**quote_data_dict)
                session1.add(quote)
                session1.commit()
                
                quote_id = quote.id
                user_id = user.id
                theme_id = theme.id
            finally:
                session1.close()
            
            # Session 2: Retrieve quote data with relationships (simulating application restart)
            session2 = SessionLocal()
            try:
                retrieved_quote = session2.query(Quote).filter(Quote.id == quote_id).first()
                
                # Verify quote data persisted correctly
                assert retrieved_quote is not None
                assert retrieved_quote.id == quote_data_dict['id']
                assert retrieved_quote.user_id == user_id
                assert retrieved_quote.theme_id == theme_id
                assert retrieved_quote.content == quote_data_dict['content']
                assert retrieved_quote.author == quote_data_dict['author']
                assert retrieved_quote.date == quote_data_dict['date']
                assert retrieved_quote.personalization_context == quote_data_dict['personalization_context']
                
                # Verify relationships are intact
                assert retrieved_quote.user is not None
                assert retrieved_quote.user.id == user_id
                assert retrieved_quote.theme is not None
                assert retrieved_quote.theme.id == theme_id
            finally:
                session2.close()

    @given(user_data(), theme_data())
    @settings(max_examples=30, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_feedback_data_persistence_across_sessions(self, user_data_dict, theme_data_dict):
        """
        Property 17: Data Persistence Across Sessions (Feedback variant)
        
        For any feedback data with relationships, it should persist across application sessions
        and be available after restart with all relationships intact.
        
        **Validates: Requirements 9.1**
        """
        with test_database() as (SessionLocal, engine):
            # Session 1: Create user, theme, quote, and feedback
            session1 = SessionLocal()
            try:
                user = User(**user_data_dict)
                theme = Theme(**theme_data_dict)
                session1.add(user)
                session1.add(theme)
                session1.commit()
                
                quote_data_dict = quote_data(user.id, theme.id).example()
                quote = Quote(**quote_data_dict)
                session1.add(quote)
                session1.commit()
                
                feedback_data_dict = feedback_data(user.id, quote.id).example()
                feedback = Feedback(**feedback_data_dict)
                session1.add(feedback)
                session1.commit()
                
                feedback_id = feedback.id
                user_id = user.id
                quote_id = quote.id
            finally:
                session1.close()
            
            # Session 2: Retrieve feedback data with relationships (simulating application restart)
            session2 = SessionLocal()
            try:
                retrieved_feedback = session2.query(Feedback).filter(Feedback.id == feedback_id).first()
                
                # Verify feedback data persisted correctly
                assert retrieved_feedback is not None
                assert retrieved_feedback.id == feedback_data_dict['id']
                assert retrieved_feedback.user_id == user_id
                assert retrieved_feedback.quote_id == quote_id
                assert retrieved_feedback.rating == feedback_data_dict['rating']
                assert retrieved_feedback.context == feedback_data_dict['context']
                
                # Verify relationships are intact
                assert retrieved_feedback.user is not None
                assert retrieved_feedback.user.id == user_id
                assert retrieved_feedback.quote is not None
                assert retrieved_feedback.quote.id == quote_id
            finally:
                session2.close()

    @given(st.lists(user_data(), min_size=1, max_size=10))
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_multiple_users_data_persistence(self, users_data_list):
        """
        Property 17: Data Persistence Across Sessions (Multiple users variant)
        
        For any collection of user data, all users should persist across application sessions
        and be available after restart.
        
        **Validates: Requirements 9.1**
        """
        with test_database() as (SessionLocal, engine):
            # Session 1: Create and save multiple users
            session1 = SessionLocal()
            user_ids = []
            try:
                for user_data_dict in users_data_list:
                    user = User(**user_data_dict)
                    session1.add(user)
                    user_ids.append(user.id)
                session1.commit()
            finally:
                session1.close()
            
            # Session 2: Retrieve all users (simulating application restart)
            session2 = SessionLocal()
            try:
                retrieved_users = session2.query(User).filter(User.id.in_(user_ids)).all()
                
                # Verify all users persisted correctly
                assert len(retrieved_users) == len(users_data_list)
                
                # Create lookup for verification
                retrieved_by_id = {user.id: user for user in retrieved_users}
                
                for original_data in users_data_list:
                    retrieved_user = retrieved_by_id[original_data['id']]
                    assert retrieved_user.personality_data == original_data['personality_data']
                    assert retrieved_user.notification_settings == original_data['notification_settings']
                    assert retrieved_user.preferences == original_data['preferences']
                    assert retrieved_user.is_active == original_data['is_active']
            finally:
                session2.close()