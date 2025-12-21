"""
Property-based tests for quote generation system.

This module contains property-based tests that validate universal properties
of the quote generation system using Hypothesis.
"""

import pytest
from hypothesis import given, strategies as st, settings, assume, HealthCheck
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
import tempfile
import os
from datetime import date, datetime, timedelta
import uuid
import asyncio

from app.database.database import Base
from app.models.user import User
from app.models.quote import Quote
from app.models.theme import Theme, ThemeType
from app.repositories import UserRepository, QuoteRepository, ThemeRepository
from app.services.quote_generator import QuoteGenerator


def create_test_db():
    """Create a temporary test database."""
    # Create temporary database file
    db_fd, db_path = tempfile.mkstemp(suffix='.db')
    os.close(db_fd)
    
    # Create engine and session
    engine = create_engine(f"sqlite:///{db_path}", echo=False)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    
    return SessionLocal(), db_path, engine


def cleanup_test_db(db_path, engine):
    """Clean up test database."""
    try:
        engine.dispose()
        if os.path.exists(db_path):
            os.unlink(db_path)
    except Exception:
        pass  # Ignore cleanup errors


def create_sample_user(db_session):
    """Create a sample user for testing."""
    user_repo = UserRepository(db_session)
    user_data = {
        'id': str(uuid.uuid4()),
        'personality_data': {
            'categories': [
                {'category': 'spirituality', 'weight': 0.7, 'confidence': 0.8},
                {'category': 'philosophy', 'weight': 0.5, 'confidence': 0.6},
                {'category': 'health', 'weight': 0.3, 'confidence': 0.4}
            ]
        },
        'is_active': True
    }
    return user_repo.create(user_data)


def create_sample_theme(db_session):
    """Create a sample theme for testing."""
    theme_repo = ThemeRepository(db_session)
    theme_data = {
        'id': str(uuid.uuid4()),
        'name': 'Personal Growth',
        'description': 'Focus on personal development and self-improvement',
        'type': ThemeType.MONTHLY,  # Use enum value that matches the constraint
        'start_date': date(2024, 1, 1),
        'end_date': date(2024, 1, 31),
        'keywords': ['growth', 'development', 'improvement', 'progress'],
        'personality_alignment': {'spirituality': 0.8, 'philosophy': 0.6},
        'config': {'color': '#007bff', 'icon': 'default', 'priority': 1}
    }
    return theme_repo.create(theme_data)


# Hypothesis strategies for generating test data
date_strategy = st.dates(
    min_value=date(2024, 1, 1),
    max_value=date(2024, 12, 31)
)

quote_content_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Po', 'Zs')),
    min_size=10,
    max_size=200
).filter(lambda x: len(x.strip()) > 5)


class TestQuoteUniquenessProperties:
    """Property-based tests for quote uniqueness validation."""
    
    @given(st.lists(date_strategy, min_size=2, max_size=5, unique=True))
    @settings(
        max_examples=50, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_daily_quote_uniqueness_property(self, dates):
        """
        Feature: digital-calendar, Property 1: Daily Quote Uniqueness
        
        For any user and any two different dates within a 365-day period,
        the generated quotes should be unique and not repeated.
        
        **Validates: Requirements 1.1, 1.4**
        """
        # Create test database
        db_session, db_path, engine = create_test_db()
        
        try:
            # Filter dates to be within 365-day period
            base_date = min(dates)
            filtered_dates = [d for d in dates if (d - base_date).days <= 365]
            assume(len(filtered_dates) >= 2)
            
            # Create sample user
            sample_user = create_sample_user(db_session)
            
            quote_generator = QuoteGenerator(db_session)
            generated_quotes = []
            
            # Generate quotes for each date
            for quote_date in filtered_dates:
                try:
                    # Use fallback generation to avoid API calls in tests
                    quote_content = quote_generator._get_fallback_quote(None, quote_date)
                    
                    # Create quote data dictionary for repository
                    quote_data = {
                        'id': str(uuid.uuid4()),
                        'user_id': sample_user.id,
                        'content': quote_content,
                        'date': quote_date,
                        'personalization_context': {'test': True}
                    }
                    
                    quote_repo = QuoteRepository(db_session)
                    saved_quote = quote_repo.create(quote_data)
                    if saved_quote:
                        generated_quotes.append(saved_quote)
                    
                except Exception as e:
                    pytest.fail(f"Quote generation failed for date {quote_date}: {e}")
            
            # Verify uniqueness: no two quotes should have identical content
            quote_contents = [q.content for q in generated_quotes]
            unique_contents = set(quote_contents)
            
            # Property: All quotes should be unique
            assert len(quote_contents) == len(unique_contents), \
                f"Found duplicate quotes: {[c for c in quote_contents if quote_contents.count(c) > 1]}"
            
            # Property: Each quote should be associated with correct date and user
            for quote in generated_quotes:
                assert quote.user_id == sample_user.id
                assert quote.date in filtered_dates
                assert len(quote.content.strip()) > 0
                
        finally:
            cleanup_test_db(db_path, engine)
    
    @given(quote_content_strategy)
    @settings(
        max_examples=30, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_quote_uniqueness_validation_property(self, quote_content):
        """
        Property test for quote uniqueness validation logic.
        
        For any quote content, the uniqueness validation should correctly
        identify duplicates within the user's recent quote history.
        """
        # Create test database
        db_session, db_path, engine = create_test_db()
        
        try:
            sample_user = create_sample_user(db_session)
            quote_generator = QuoteGenerator(db_session)
            quote_repo = QuoteRepository(db_session)
            
            # First, the quote should be considered unique (no existing quotes)
            is_unique_initially = asyncio.run(
                quote_generator.validate_quote_uniqueness(sample_user.id, quote_content)
            )
            assert is_unique_initially == True, "New quote should be considered unique"
            
            # Create a quote with this content
            quote_data = {
                'id': str(uuid.uuid4()),
                'user_id': sample_user.id,
                'content': quote_content,
                'date': date.today(),
                'personalization_context': {'test': True}
            }
            existing_quote = quote_repo.create(quote_data)
            
            # Now the same content should be considered not unique
            is_unique_after = asyncio.run(
                quote_generator.validate_quote_uniqueness(sample_user.id, quote_content)
            )
            assert is_unique_after == False, "Duplicate quote should not be considered unique"
            
            # Slightly different content should still be unique
            modified_content = quote_content + " (modified)"
            is_modified_unique = asyncio.run(
                quote_generator.validate_quote_uniqueness(sample_user.id, modified_content)
            )
            assert is_modified_unique == True, "Modified quote should be considered unique"
            
        finally:
            cleanup_test_db(db_path, engine)


class TestQuoteGenerationIdempotence:
    """Property-based tests for quote generation idempotence."""
    
    @given(date_strategy)
    @settings(
        max_examples=30, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_quote_generation_idempotence_property(self, target_date):
        """
        Feature: digital-calendar, Property 2: Quote Generation Idempotence
        
        For any user and specific date, requesting the daily quote multiple times
        should return the same quote without generating new content.
        
        **Validates: Requirements 1.2**
        """
        # Create test database
        db_session, db_path, engine = create_test_db()
        
        try:
            sample_user = create_sample_user(db_session)
            sample_theme = create_sample_theme(db_session)
            quote_generator = QuoteGenerator(db_session)
            
            # Generate quote for the first time
            first_quote = asyncio.run(
                quote_generator.generate_daily_quote(sample_user.id, target_date)
            )
            
            assert first_quote is not None
            assert first_quote.user_id == sample_user.id
            assert first_quote.date == target_date
            assert len(first_quote.content.strip()) > 0
            
            # Generate quote for the same date again
            second_quote = asyncio.run(
                quote_generator.generate_daily_quote(sample_user.id, target_date)
            )
            
            # Property: Should return the exact same quote (idempotent)
            assert second_quote is not None
            assert second_quote.id == first_quote.id, "Should return same quote ID"
            assert second_quote.content == first_quote.content, "Should return same content"
            assert second_quote.date == first_quote.date, "Should return same date"
            assert second_quote.user_id == first_quote.user_id, "Should return same user ID"
            
            # Generate quote multiple times to ensure consistency
            for _ in range(3):
                nth_quote = asyncio.run(
                    quote_generator.generate_daily_quote(sample_user.id, target_date)
                )
                assert nth_quote.id == first_quote.id, "All requests should return same quote"
                assert nth_quote.content == first_quote.content, "Content should remain consistent"
                
        finally:
            cleanup_test_db(db_path, engine)


class TestQuoteArchiveRoundTrip:
    """Property-based tests for quote archive round-trip functionality."""
    
    @given(quote_content_strategy)
    @settings(
        max_examples=20, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_quote_archive_round_trip_property(self, quote_content):
        """
        Feature: digital-calendar, Property 4: Quote Archive Round-trip
        
        For any generated daily quote, it should be immediately available in the 
        user's quote archive with all original metadata preserved.
        
        **Validates: Requirements 1.5, 3.5**
        """
        # Create test database
        db_session, db_path, engine = create_test_db()
        
        try:
            sample_user = create_sample_user(db_session)
            sample_theme = create_sample_theme(db_session)
            
            from app.services.quote_archive import QuoteArchiveService
            archive_service = QuoteArchiveService(db_session)
            quote_generator = QuoteGenerator(db_session)
            
            target_date = date(2024, 6, 15)
            
            # Generate a quote (this should automatically archive it)
            generated_quote = asyncio.run(
                quote_generator.generate_daily_quote(sample_user.id, target_date)
            )
            
            assert generated_quote is not None
            assert generated_quote.content is not None
            assert len(generated_quote.content.strip()) > 0
            
            # Retrieve from archive
            archive_data = archive_service.get_user_archive(
                sample_user.id, 
                skip=0, 
                limit=10,
                include_theme_data=True
            )
            
            # Property: Quote should be immediately available in archive
            assert len(archive_data) >= 1, "Generated quote should be available in archive"
            
            # Find the generated quote in archive
            archived_quote = None
            for quote_data in archive_data:
                if quote_data['date'] == target_date.isoformat():
                    archived_quote = quote_data
                    break
            
            assert archived_quote is not None, "Generated quote should be found in archive"
            
            # Property: All original metadata should be preserved
            assert archived_quote['id'] == generated_quote.id, "Quote ID should be preserved"
            assert archived_quote['content'] == generated_quote.content, "Quote content should be preserved"
            assert archived_quote['date'] == target_date.isoformat(), "Quote date should be preserved"
            
            # Property: Personalization context should be preserved
            assert 'personalization_context' in archived_quote, "Personalization context should be preserved"
            original_context = generated_quote.personalization_context or {}
            archived_context = archived_quote['personalization_context']
            
            # Check that key personalization data is preserved
            if 'personality_categories' in original_context:
                assert 'personality_categories' in archived_context, "Personality categories should be preserved"
            if 'theme_alignment' in original_context:
                assert 'theme_alignment' in archived_context, "Theme alignment should be preserved"
            if 'generation_timestamp' in original_context:
                assert 'generation_timestamp' in archived_context, "Generation timestamp should be preserved"
            
            # Property: Theme context should be preserved if present
            if generated_quote.theme_id:
                assert 'theme' in archived_quote or 'theme_id' in archived_quote, "Theme information should be preserved"
                if 'theme' in archived_quote:
                    assert archived_quote['theme']['id'] == generated_quote.theme_id, "Theme ID should match"
            
            # Property: Archive metadata should be added
            assert 'archived_at' in archived_context, "Archive timestamp should be added"
            assert 'archive_version' in archived_context, "Archive version should be added"
            
            # Property: Round-trip search should work
            if len(generated_quote.content) > 10:
                search_term = generated_quote.content.split()[0]  # Use first word
                search_results = archive_service.search_archive(
                    sample_user.id, 
                    search_term,
                    skip=0,
                    limit=10
                )
                
                # Should find the quote in search results
                found_in_search = any(
                    result['id'] == generated_quote.id 
                    for result in search_results
                )
                assert found_in_search, "Quote should be findable through archive search"
            
        finally:
            cleanup_test_db(db_path, engine)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])