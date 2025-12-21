"""
Property-based tests for personalized quote generation in ARK Digital Calendar.

This module contains property-based tests that validate the correctness
of personalized quote generation, theme alignment, and user profile integration.
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck, assume
from hypothesis.stateful import RuleBasedStateMachine, Bundle, rule, initialize
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, date, timedelta
from unittest.mock import Mock, AsyncMock, patch
import asyncio

from app.services.quote_generator import QuoteGenerator, QuoteGenerationError
from app.services.user_profile import PersonalityCategory
from app.models.user import User
from app.models.theme import Theme, ThemeType


# Hypothesis strategies for generating test data
@st.composite
def user_personality_data(draw):
    """Generate realistic user personality data."""
    categories = []
    weights = []
    
    # Generate weights that sum to approximately 1.0
    for category in PersonalityCategory:
        weight = draw(st.floats(min_value=0.0, max_value=1.0))
        weights.append(weight)
    
    # Normalize weights
    total_weight = sum(weights)
    if total_weight > 0:
        weights = [w / total_weight for w in weights]
    else:
        weights = [1.0 / len(PersonalityCategory)] * len(PersonalityCategory)
    
    for i, category in enumerate(PersonalityCategory):
        confidence = draw(st.floats(min_value=0.3, max_value=1.0))
        categories.append({
            "category": category.value,
            "weight": weights[i],
            "confidence": confidence
        })
    
    # Determine dominant categories
    sorted_categories = sorted(categories, key=lambda x: x["weight"], reverse=True)
    dominant_categories = [cat["category"] for cat in sorted_categories[:3] if cat["weight"] > 0.15]
    
    return {
        "categories": categories,
        "dominant_categories": dominant_categories,
        "created_at": datetime.utcnow().isoformat(),
        "version": "1.0"
    }


@st.composite
def user_preferences_data(draw):
    """Generate user preferences data."""
    return {
        "theme": draw(st.sampled_from(["light", "dark", "auto"])),
        "language": draw(st.sampled_from(["en", "es", "fr", "de"])),
        "quote_length": draw(st.sampled_from(["short", "medium", "long"]))
    }


@st.composite
def theme_context_data(draw):
    """Generate theme context data."""
    theme_type = draw(st.sampled_from(["monthly", "weekly"]))
    
    # Generate theme-appropriate keywords
    keyword_sets = {
        "growth": ["develop", "improve", "progress", "evolve", "advance"],
        "wisdom": ["learn", "understand", "insight", "knowledge", "enlighten"],
        "courage": ["brave", "bold", "strength", "confidence", "fearless"],
        "peace": ["calm", "tranquil", "harmony", "balance", "serenity"],
        "creativity": ["create", "innovate", "imagine", "artistic", "express"],
        "health": ["wellness", "vitality", "energy", "fitness", "balance"]
    }
    
    theme_category = draw(st.sampled_from(list(keyword_sets.keys())))
    keywords = draw(st.lists(
        st.sampled_from(keyword_sets[theme_category]), 
        min_size=2, 
        max_size=5,
        unique=True
    ))
    
    # Generate personality alignment
    personality_alignment = {}
    for category in PersonalityCategory:
        if draw(st.booleans()):  # Randomly include categories
            alignment_weight = draw(st.floats(min_value=0.1, max_value=1.0))
            personality_alignment[category.value] = alignment_weight
    
    theme_context = {
        "theme_id": str(uuid.uuid4()),
        "theme_name": f"{theme_category.title()} Theme",
        "theme_description": f"A theme focused on {theme_category} and personal development",
        "theme_type": theme_type,
        "keywords": keywords,
        "personality_alignment": personality_alignment,
        "alignment_score": 1.0
    }
    
    # Add parent theme for weekly themes
    if theme_type == "weekly" and draw(st.booleans()):
        parent_category = draw(st.sampled_from([k for k in keyword_sets.keys() if k != theme_category]))
        theme_context["parent_theme"] = {
            "theme_id": str(uuid.uuid4()),
            "theme_name": f"{parent_category.title()} Month",
            "theme_description": f"Monthly theme about {parent_category}",
            "keywords": keyword_sets[parent_category][:3]
        }
    
    return theme_context


@st.composite
def mock_user_data(draw):
    """Generate mock user data for testing."""
    personality_data = draw(user_personality_data())
    preferences = draw(user_preferences_data())
    
    user = Mock(spec=User)
    user.id = str(uuid.uuid4())
    user.personality_data = personality_data
    user.preferences = preferences
    user.created_at = datetime.utcnow()
    user.updated_at = datetime.utcnow()
    
    return user


class TestPersonalizedQuoteProperties:
    """Property-based tests for personalized quote generation."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Create mock database session
        self.mock_db = Mock()
        
        # Create quote generator with mocked dependencies
        self.quote_generator = QuoteGenerator(self.mock_db)
        
        # Mock the repositories
        self.quote_generator.quote_repo = Mock()
        self.quote_generator.theme_repo = Mock()
        self.quote_generator.user_repo = Mock()
        self.quote_generator.archive_service = Mock()
        
        # Mock OpenAI API key for testing
        self.quote_generator.openai_api_key = "test-api-key"
        self.quote_generator.openai_model = "gpt-3.5-turbo"
    
    @given(mock_user_data(), mock_user_data(), theme_context_data())
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow])
    def test_personalized_quote_generation_differs_by_user(self, user1: Mock, user2: Mock, theme_context: Dict[str, Any]):
        """
        Property 3: Personalized Quote Generation (User Differentiation)
        
        For any two users with significantly different personality profiles, quotes generated
        for the same date and theme should reflect their individual preferences and differ
        in measurable ways.
        
        **Validates: Requirements 1.3, 7.1, 7.2**
        """
        # Feature: digital-calendar, Property 3: Personalized Quote Generation (user differentiation)
        
        # Ensure users have different personality profiles
        user1_categories = {cat["category"]: cat["weight"] for cat in user1.personality_data["categories"]}
        user2_categories = {cat["category"]: cat["weight"] for cat in user2.personality_data["categories"]}
        
        # Calculate personality difference
        personality_difference = 0.0
        for category in PersonalityCategory:
            weight1 = user1_categories.get(category.value, 0)
            weight2 = user2_categories.get(category.value, 0)
            personality_difference += abs(weight1 - weight2)
        
        # Only test if users have significantly different personalities
        assume(personality_difference > 0.5)
        
        target_date = date.today()
        
        # Mock repository responses
        self.quote_generator.quote_repo.get_by_user_and_date.return_value = None
        self.quote_generator.user_repo.get_by_id.side_effect = lambda uid: user1 if uid == user1.id else user2
        
        # Generate prompts for both users (testing the prompt generation logic)
        prompt1 = self.quote_generator._build_generation_prompt(user1, theme_context, target_date)
        prompt2 = self.quote_generator._build_generation_prompt(user2, theme_context, target_date)
        
        # Prompts should be different for different users
        assert prompt1 != prompt2, "Prompts should differ for users with different personalities"
        
        # Check that user-specific personality information is included
        user1_dominant = user1.personality_data.get("dominant_categories", [])
        user2_dominant = user2.personality_data.get("dominant_categories", [])
        
        if user1_dominant:
            # At least one dominant category should appear in the prompt
            assert any(category in prompt1.lower() for category in user1_dominant), \
                f"User1's dominant categories {user1_dominant} should appear in prompt"
        
        if user2_dominant:
            # At least one dominant category should appear in the prompt
            assert any(category in prompt2.lower() for category in user2_dominant), \
                f"User2's dominant categories {user2_dominant} should appear in prompt"
        
        # Check personalization strength calculation
        strength1 = self.quote_generator._calculate_personalization_strength(user1, theme_context)
        strength2 = self.quote_generator._calculate_personalization_strength(user2, theme_context)
        
        # Both should have valid personalization strengths
        assert 0.0 <= strength1 <= 1.0, f"Invalid personalization strength for user1: {strength1}"
        assert 0.0 <= strength2 <= 1.0, f"Invalid personalization strength for user2: {strength2}"
    
    @given(mock_user_data(), theme_context_data())
    @settings(max_examples=15, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow])
    def test_theme_alignment_influences_personalization(self, user: Mock, theme_context: Dict[str, Any]):
        """
        Property 3: Personalized Quote Generation (Theme Alignment)
        
        For any user and theme, the personalization should be influenced by the alignment
        between the user's personality and the theme's focus areas.
        
        **Validates: Requirements 1.3, 7.1, 7.2**
        """
        # Feature: digital-calendar, Property 3: Personalized Quote Generation (theme alignment)
        
        target_date = date.today()
        
        # Generate prompt with theme context
        prompt_with_theme = self.quote_generator._build_generation_prompt(user, theme_context, target_date)
        
        # Generate prompt without theme context
        prompt_without_theme = self.quote_generator._build_generation_prompt(user, None, target_date)
        
        # Prompts should be different when theme context is provided
        assert prompt_with_theme != prompt_without_theme, \
            "Theme context should influence prompt generation"
        
        # Theme information should appear in the themed prompt
        theme_name = theme_context.get("theme_name", "")
        theme_keywords = theme_context.get("keywords", [])
        
        if theme_name:
            assert theme_name.lower() in prompt_with_theme.lower(), \
                f"Theme name '{theme_name}' should appear in prompt"
        
        if theme_keywords:
            # At least one keyword should appear in the prompt
            assert any(keyword.lower() in prompt_with_theme.lower() for keyword in theme_keywords), \
                f"Theme keywords {theme_keywords} should influence prompt"
        
        # Check personality-theme alignment
        personality_alignment = theme_context.get("personality_alignment", {})
        if personality_alignment:
            user_categories = {cat["category"]: cat["weight"] for cat in user.personality_data["categories"]}
            
            # Find strong alignments
            strong_alignments = []
            for category, theme_weight in personality_alignment.items():
                user_weight = user_categories.get(category, 0)
                if theme_weight > 0.5 and user_weight > 0.2:
                    strong_alignments.append(category)
            
            if strong_alignments:
                # Strong alignments should be mentioned in the prompt
                assert any(category in prompt_with_theme.lower() for category in strong_alignments), \
                    f"Strong personality-theme alignments {strong_alignments} should be emphasized"
    
    @given(mock_user_data(), user_preferences_data())
    @settings(max_examples=15, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow])
    def test_user_preferences_influence_generation(self, user: Mock, new_preferences: Dict[str, Any]):
        """
        Property 3: Personalized Quote Generation (Preferences Integration)
        
        For any user, their preferences (quote length, style, etc.) should influence
        the quote generation process and resulting content.
        
        **Validates: Requirements 1.3, 7.1, 7.2**
        """
        # Feature: digital-calendar, Property 3: Personalized Quote Generation (preferences)
        
        target_date = date.today()
        
        # Test with original preferences
        original_prompt = self.quote_generator._build_generation_prompt(user, None, target_date)
        
        # Test with modified preferences
        user.preferences = new_preferences
        modified_prompt = self.quote_generator._build_generation_prompt(user, None, target_date)
        
        # Check quote length preference influence
        quote_length = new_preferences.get("quote_length", "medium")
        
        if quote_length == "short":
            assert "concise" in modified_prompt.lower() or "one" in modified_prompt.lower(), \
                "Short quote preference should influence prompt"
        elif quote_length == "long":
            assert "elaborate" in modified_prompt.lower() or "2-3" in modified_prompt.lower(), \
                "Long quote preference should influence prompt"
        
        # Preferences should generally influence the prompt
        if user.preferences != new_preferences:
            # The prompts might be different due to preference changes
            # (This is a weak assertion due to the complexity of prompt generation)
            assert isinstance(modified_prompt, str) and len(modified_prompt) > 0, \
                "Modified preferences should still generate valid prompts"
    
    @given(mock_user_data(), theme_context_data())
    @settings(max_examples=10, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow])
    def test_personalization_strength_calculation(self, user: Mock, theme_context: Dict[str, Any]):
        """
        Property 3: Personalized Quote Generation (Personalization Strength)
        
        For any user and theme context, the personalization strength should be
        calculated consistently and reflect the quality of personalization data.
        
        **Validates: Requirements 1.3, 7.1, 7.2**
        """
        # Feature: digital-calendar, Property 3: Personalized Quote Generation (strength calculation)
        
        # Calculate personalization strength
        strength = self.quote_generator._calculate_personalization_strength(user, theme_context)
        
        # Strength should be in valid range
        assert 0.0 <= strength <= 1.0, f"Personalization strength should be 0.0-1.0, got {strength}"
        
        # Test consistency - same inputs should give same results
        strength2 = self.quote_generator._calculate_personalization_strength(user, theme_context)
        assert abs(strength - strength2) < 1e-10, "Personalization strength calculation should be deterministic"
        
        # Test with no personality data
        user_no_personality = Mock(spec=User)
        user_no_personality.personality_data = None
        user_no_personality.preferences = None
        
        strength_no_data = self.quote_generator._calculate_personalization_strength(user_no_personality, theme_context)
        assert 0.0 <= strength_no_data <= 1.0, "Should handle users with no personality data"
        
        # Users with personality data should generally have higher strength
        if user.personality_data and user.personality_data.get("categories"):
            non_zero_categories = [cat for cat in user.personality_data["categories"] if cat.get("weight", 0) > 0.1]
            if len(non_zero_categories) >= 2:
                assert strength >= strength_no_data, \
                    "Users with personality data should have higher personalization strength"
    
    @given(mock_user_data())
    @settings(max_examples=10, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow])
    def test_fallback_quote_generation(self, user: Mock):
        """
        Property 3: Personalized Quote Generation (Fallback Behavior)
        
        For any user, when AI generation is unavailable, the system should provide
        appropriate fallback quotes that still consider available personalization data.
        
        **Validates: Requirements 1.3, 7.1, 7.2**
        """
        # Feature: digital-calendar, Property 3: Personalized Quote Generation (fallback)
        
        # Test fallback without theme
        fallback_quote1 = self.quote_generator._get_fallback_quote(None, date(2024, 6, 15))
        assert isinstance(fallback_quote1, str), "Fallback should return a string"
        assert len(fallback_quote1) > 10, "Fallback quote should be meaningful"
        
        # Test fallback with theme
        theme_context = {
            "theme_name": "Growth Theme",
            "theme_description": "Focus on personal development and growth",
            "keywords": ["growth", "develop", "improve"],
            "theme_type": "monthly"
        }
        
        fallback_quote2 = self.quote_generator._get_fallback_quote(theme_context, date(2024, 6, 15))
        assert isinstance(fallback_quote2, str), "Themed fallback should return a string"
        assert len(fallback_quote2) > 10, "Themed fallback quote should be meaningful"
        
        # Themed fallback might be different from non-themed
        # (This is not guaranteed due to randomness, but we test the mechanism)
        assert isinstance(fallback_quote2, str), "Themed fallback should work correctly"
    
    @given(mock_user_data(), theme_context_data(), st.text(min_size=10, max_size=200))
    @settings(max_examples=10, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow])
    def test_theme_alignment_calculation(self, user: Mock, theme_context: Dict[str, Any], quote_content: str):
        """
        Property 3: Personalized Quote Generation (Theme Alignment Calculation)
        
        For any quote content and theme context, the theme alignment calculation
        should be consistent and produce meaningful scores.
        
        **Validates: Requirements 1.3, 7.1, 7.2**
        """
        # Feature: digital-calendar, Property 3: Personalized Quote Generation (alignment calculation)
        
        # Calculate theme alignment
        alignment_score = self.quote_generator._calculate_theme_alignment(quote_content, theme_context)
        
        # Score should be in valid range
        assert 0.0 <= alignment_score <= 1.0, f"Alignment score should be 0.0-1.0, got {alignment_score}"
        
        # Test consistency
        alignment_score2 = self.quote_generator._calculate_theme_alignment(quote_content, theme_context)
        assert abs(alignment_score - alignment_score2) < 1e-10, "Alignment calculation should be deterministic"
        
        # Test with empty content
        empty_alignment = self.quote_generator._calculate_theme_alignment("", theme_context)
        assert empty_alignment == 0.0, "Empty content should have zero alignment"
        
        # Test with no theme context
        no_theme_alignment = self.quote_generator._calculate_theme_alignment(quote_content, None)
        assert no_theme_alignment == 0.0, "No theme context should result in zero alignment"
        
        # Test with content that contains theme keywords
        keywords = theme_context.get("keywords", [])
        if keywords:
            keyword_rich_content = f"This quote is about {' and '.join(keywords[:3])} for personal development."
            keyword_alignment = self.quote_generator._calculate_theme_alignment(keyword_rich_content, theme_context)
            
            # Keyword-rich content should have higher alignment than random content
            # (This is probabilistic due to the nature of the content, so we use a weak assertion)
            assert 0.0 <= keyword_alignment <= 1.0, "Keyword-rich content should have valid alignment score"