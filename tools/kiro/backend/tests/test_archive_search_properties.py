"""
Property-based tests for archive search functionality.

This module contains property-based tests that validate the archive search
relevance scoring and result ordering properties.

Feature: digital-calendar, Property 8: Archive Search Relevance
**Validates: Requirements 3.3**
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
from typing import List, Dict, Any

from app.database.database import Base
from app.models.user import User
from app.models.quote import Quote
from app.models.theme import Theme, ThemeType
from app.repositories.user_repository import UserRepository
from app.repositories.quote_repository import QuoteRepository
from app.repositories.theme_repository import ThemeRepository
from app.services.quote_archive import QuoteArchiveService


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


def create_sample_user(db_session) -> User:
    """Create a sample user for testing."""
    user_repo = UserRepository(db_session)
    user_data = {
        'personality_data': {
            'categories': [
                {'category': 'spirituality', 'weight': 0.3, 'confidence': 0.8},
                {'category': 'health', 'weight': 0.4, 'confidence': 0.7},
                {'category': 'education', 'weight': 0.3, 'confidence': 0.6}
            ],
            'dominant_categories': ['health', 'spirituality']
        },
        'notification_settings': {'enabled': True, 'time': '09:00'},
        'preferences': {'theme': 'light', 'language': 'en'}
    }
    return user_repo.create(user_data)


def create_sample_theme(db_session, name: str, keywords: List[str]) -> Theme:
    """Create a sample theme for testing."""
    theme_repo = ThemeRepository(db_session)
    theme_data = {
        'name': name,
        'description': f'Test theme for {name}',
        'type': ThemeType.MONTHLY,
        'start_date': date(2024, 1, 1),
        'end_date': date(2024, 1, 31),
        'keywords': keywords,
        'personality_alignment': {'health': 0.6, 'spirituality': 0.4}
    }
    return theme_repo.create(theme_data)


def create_sample_quote(
    db_session, 
    user: User, 
    content: str, 
    theme: Theme = None,
    quote_date: date = None
) -> Quote:
    """Create a sample quote for testing."""
    quote_repo = QuoteRepository(db_session)
    quote_data = {
        'user_id': user.id,
        'content': content,
        'date': quote_date or date.today(),
        'theme_id': theme.id if theme else None,
        'personalization_context': {
            'personality_categories': user.personality_data.get('categories', []),
            'theme_alignment': 0.8 if theme else 0.0
        }
    }
    return quote_repo.create(quote_data)


# Hypothesis strategies for generating test data
search_term_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc', 'Pd', 'Zs')),
    min_size=1,
    max_size=50
).filter(lambda x: x.strip() and len(x.strip()) > 0)

quote_content_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc', 'Pd', 'Zs', 'Po')),
    min_size=10,
    max_size=200
).filter(lambda x: x.strip() and len(x.strip()) >= 10)

theme_keywords_strategy = st.lists(
    st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll')),
        min_size=3,
        max_size=15
    ).filter(lambda x: x.strip()),
    min_size=1,
    max_size=5
)


class TestArchiveSearchRelevance:
    """Test class for archive search relevance properties."""
    
    @given(
        search_terms=st.lists(search_term_strategy, min_size=1, max_size=3),
        quote_contents=st.lists(quote_content_strategy, min_size=2, max_size=10),
        theme_keywords_list=st.lists(theme_keywords_strategy, min_size=1, max_size=3)
    )
    @settings(
        max_examples=100,
        deadline=30000,  # 30 seconds
        suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture]
    )
    def test_search_results_contain_search_terms(
        self, 
        search_terms: List[str], 
        quote_contents: List[str],
        theme_keywords_list: List[List[str]]
    ):
        """
        Property 8: Archive Search Relevance
        
        For any search query in the archive, returned results should contain 
        the search terms in either content or theme metadata.
        
        **Validates: Requirements 3.3**
        """
        # Create test database
        db_session, db_path, engine = create_test_db()
        
        try:
            # Create test user
            user = create_sample_user(db_session)
            
            # Create themes with keywords
            themes = []
            for i, keywords in enumerate(theme_keywords_list):
                theme = create_sample_theme(db_session, f"TestTheme{i}", keywords)
                themes.append(theme)
            
            # Create quotes with varying content and themes
            quotes = []
            for i, content in enumerate(quote_contents):
                theme = themes[i % len(themes)] if themes else None
                
                # Inject search terms into some quotes to ensure matches
                if i < len(search_terms):
                    search_term = search_terms[i]
                    # Embed search term in content
                    modified_content = f"{content} {search_term} additional content"
                else:
                    modified_content = content
                
                quote = create_sample_quote(
                    db_session, 
                    user, 
                    modified_content, 
                    theme,
                    date.today() - timedelta(days=i)
                )
                quotes.append(quote)
            
            db_session.commit()
            
            # Test search functionality
            archive_service = QuoteArchiveService(db_session)
            
            for search_term in search_terms:
                # Perform search
                search_results = archive_service.search_archive(
                    user_id=user.id,
                    search_term=search_term,
                    limit=50
                )
                
                # Property: All returned results should contain the search term
                # either in content or in theme keywords
                for result in search_results:
                    content = result['content'].lower()
                    search_lower = search_term.lower()
                    
                    # Check if search term is in content
                    content_match = search_lower in content
                    
                    # Check if search term is in theme keywords
                    theme_match = False
                    if 'theme' in result and result['theme']:
                        theme_keywords = result['theme'].get('keywords', [])
                        theme_match = any(
                            search_lower in keyword.lower() 
                            for keyword in theme_keywords
                        )
                    
                    # At least one match should be found
                    assert content_match or theme_match, (
                        f"Search result does not contain search term '{search_term}'. "
                        f"Content: '{result['content'][:100]}...', "
                        f"Theme keywords: {result.get('theme', {}).get('keywords', [])}"
                    )
                
                # Property: Results should be ordered by relevance (descending)
                if len(search_results) > 1:
                    relevance_scores = [result.get('relevance_score', 0.0) for result in search_results]
                    
                    # Check that scores are in descending order
                    for i in range(len(relevance_scores) - 1):
                        assert relevance_scores[i] >= relevance_scores[i + 1], (
                            f"Search results not ordered by relevance. "
                            f"Score at position {i}: {relevance_scores[i]}, "
                            f"Score at position {i+1}: {relevance_scores[i+1]}"
                        )
        
        finally:
            db_session.close()
            cleanup_test_db(db_path, engine)
    
    @given(
        search_term=search_term_strategy,
        exact_match_content=quote_content_strategy,
        partial_match_content=quote_content_strategy,
        no_match_content=quote_content_strategy
    )
    @settings(
        max_examples=50,
        deadline=20000,
        suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture]
    )
    def test_search_relevance_scoring_accuracy(
        self,
        search_term: str,
        exact_match_content: str,
        partial_match_content: str,
        no_match_content: str
    ):
        """
        Property 8: Archive Search Relevance Scoring
        
        For any search term, quotes with exact matches should have higher 
        relevance scores than partial matches, which should have higher 
        scores than no matches.
        
        **Validates: Requirements 3.3**
        """
        # Ensure the contents are different and don't accidentally contain search terms
        assume(search_term.lower() not in no_match_content.lower())
        assume(len(search_term.strip()) >= 2)
        assume(len(exact_match_content.strip()) >= 10)
        assume(len(partial_match_content.strip()) >= 10)
        assume(len(no_match_content.strip()) >= 10)
        
        # Create test database
        db_session, db_path, engine = create_test_db()
        
        try:
            # Create test user
            user = create_sample_user(db_session)
            
            # Create quotes with different levels of matching
            # Exact match: search term appears exactly in content
            exact_match_quote = create_sample_quote(
                db_session,
                user,
                f"{exact_match_content} {search_term} more content",
                quote_date=date.today() - timedelta(days=1)
            )
            
            # Partial match: some words from search term appear
            search_words = search_term.split()
            if len(search_words) > 1:
                partial_word = search_words[0]
                partial_match_quote = create_sample_quote(
                    db_session,
                    user,
                    f"{partial_match_content} {partial_word} additional text",
                    quote_date=date.today() - timedelta(days=2)
                )
            else:
                # If single word, create a quote with similar but not exact content
                partial_match_quote = create_sample_quote(
                    db_session,
                    user,
                    f"{partial_match_content} similar content",
                    quote_date=date.today() - timedelta(days=2)
                )
            
            # No match: search term doesn't appear
            no_match_quote = create_sample_quote(
                db_session,
                user,
                no_match_content,
                quote_date=date.today() - timedelta(days=3)
            )
            
            db_session.commit()
            
            # Perform search
            archive_service = QuoteArchiveService(db_session)
            search_results = archive_service.search_archive(
                user_id=user.id,
                search_term=search_term,
                limit=10
            )
            
            # Find the quotes in results
            exact_match_result = None
            partial_match_result = None
            no_match_result = None
            
            for result in search_results:
                if result['id'] == exact_match_quote.id:
                    exact_match_result = result
                elif result['id'] == partial_match_quote.id:
                    partial_match_result = result
                elif result['id'] == no_match_quote.id:
                    no_match_result = result
            
            # Property: Exact match should have highest relevance score
            if exact_match_result:
                exact_score = exact_match_result.get('relevance_score', 0.0)
                
                # Should be higher than partial match
                if partial_match_result:
                    partial_score = partial_match_result.get('relevance_score', 0.0)
                    assert exact_score >= partial_score, (
                        f"Exact match score ({exact_score}) should be >= partial match score ({partial_score})"
                    )
                
                # Should be higher than no match (if no match appears in results)
                if no_match_result:
                    no_match_score = no_match_result.get('relevance_score', 0.0)
                    assert exact_score >= no_match_score, (
                        f"Exact match score ({exact_score}) should be >= no match score ({no_match_score})"
                    )
                
                # Exact match should have meaningful score (> 0.1)
                assert exact_score > 0.1, (
                    f"Exact match should have meaningful relevance score, got {exact_score}"
                )
        
        finally:
            db_session.close()
            cleanup_test_db(db_path, engine)
    
    @given(
        search_term=search_term_strategy,
        num_quotes=st.integers(min_value=5, max_value=20)
    )
    @settings(
        max_examples=30,
        deadline=25000,
        suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture]
    )
    def test_search_returns_only_relevant_results(
        self,
        search_term: str,
        num_quotes: int
    ):
        """
        Property 8: Search Result Relevance Filter
        
        For any search query, the system should only return quotes that 
        actually contain the search term or related theme keywords.
        
        **Validates: Requirements 3.3**
        """
        assume(len(search_term.strip()) >= 2)
        
        # Create test database
        db_session, db_path, engine = create_test_db()
        
        try:
            # Create test user
            user = create_sample_user(db_session)
            
            # Create theme with search term in keywords
            theme_with_search_term = create_sample_theme(
                db_session, 
                "SearchTheme", 
                [search_term, "related", "keywords"]
            )
            
            # Create theme without search term
            theme_without_search_term = create_sample_theme(
                db_session,
                "OtherTheme",
                ["unrelated", "different", "words"]
            )
            
            # Create quotes - some matching, some not
            matching_quotes = []
            non_matching_quotes = []
            
            for i in range(num_quotes):
                if i % 3 == 0:
                    # Content match
                    content = f"This quote contains {search_term} in the content"
                    quote = create_sample_quote(
                        db_session, user, content, 
                        theme_without_search_term,  # Theme doesn't match, but content does
                        date.today() - timedelta(days=i)
                    )
                    matching_quotes.append(quote)
                elif i % 3 == 1:
                    # Theme match
                    content = f"This quote has unrelated content number {i}"
                    quote = create_sample_quote(
                        db_session, user, content,
                        theme_with_search_term,  # Theme matches, but content doesn't
                        date.today() - timedelta(days=i)
                    )
                    matching_quotes.append(quote)
                else:
                    # No match
                    content = f"This quote has completely different content number {i}"
                    quote = create_sample_quote(
                        db_session, user, content,
                        theme_without_search_term,  # Neither theme nor content matches
                        date.today() - timedelta(days=i)
                    )
                    non_matching_quotes.append(quote)
            
            db_session.commit()
            
            # Perform search
            archive_service = QuoteArchiveService(db_session)
            search_results = archive_service.search_archive(
                user_id=user.id,
                search_term=search_term,
                limit=50
            )
            
            # Property: All returned results should be from matching quotes
            returned_quote_ids = {result['id'] for result in search_results}
            expected_matching_ids = {quote.id for quote in matching_quotes}
            non_matching_ids = {quote.id for quote in non_matching_quotes}
            
            # No non-matching quotes should be in results
            unexpected_results = returned_quote_ids.intersection(non_matching_ids)
            assert len(unexpected_results) == 0, (
                f"Search returned {len(unexpected_results)} non-matching quotes: {unexpected_results}"
            )
            
            # All matching quotes should be in results (or at least some if there are many)
            found_matching = returned_quote_ids.intersection(expected_matching_ids)
            assert len(found_matching) > 0, (
                f"Search should return at least some matching quotes. "
                f"Expected: {len(expected_matching_ids)}, Found: {len(found_matching)}"
            )
            
            # Property: Each result should have a positive relevance score
            for result in search_results:
                relevance_score = result.get('relevance_score', 0.0)
                assert relevance_score > 0.0, (
                    f"All search results should have positive relevance scores, "
                    f"got {relevance_score} for quote: {result['content'][:50]}..."
                )
        
        finally:
            db_session.close()
            cleanup_test_db(db_path, engine)


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v"])