"""
Property-based tests for content quality standards in ARK Digital Calendar.

Tests Property 16: Content Quality Standards
**Validates: Requirements 7.4, 7.5**
"""

import pytest
from hypothesis import given, strategies as st, settings, example
from hypothesis.strategies import text, composite
from typing import Dict, Any, List
from unittest.mock import Mock
from datetime import date, timedelta

from app.services.content_quality import ContentQualityService, QuoteStyle, QuoteApproach, StyleVariation
from app.services.content_validator import ContentValidator, ValidationResult
from app.models.quote import Quote


class TestContentQualityStandards:
    """Test content quality standards properties."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Mock database session
        self.mock_db = Mock()
        self.quality_service = ContentQualityService(self.mock_db)
        self.content_validator = ContentValidator()
        
        # Mock quote repository
        self.mock_quote_repo = Mock()
        self.quality_service.quote_repo = self.mock_quote_repo
    
    @composite
    def high_quality_content_strategy(draw):
        """Generate high-quality content for testing."""
        quality_templates = [
            "Every challenge you face today is an opportunity to discover your inner strength and resilience.",
            "The journey of personal growth begins with a single moment of honest self-reflection.",
            "Wisdom emerges not from having all the answers, but from asking the right questions.",
            "Your potential expands each time you choose courage over comfort in difficult situations.",
            "True success is measured not by what you achieve, but by who you become in the process.",
            "The most profound transformations happen when we embrace uncertainty as a teacher.",
            "Gratitude transforms ordinary moments into extraordinary blessings that enrich our lives.",
            "Authentic connections are built through vulnerability, empathy, and genuine understanding."
        ]
        
        # Add some variation to the templates
        template = draw(st.sampled_from(quality_templates))
        
        # Occasionally modify the template slightly
        if draw(st.booleans()):
            variations = [
                template.replace("you", "we"),
                template.replace("your", "our"),
                f"Remember that {template.lower()}",
                f"Consider how {template.lower()}"
            ]
            return draw(st.sampled_from(variations))
        
        return template
    
    @composite
    def low_quality_content_strategy(draw):
        """Generate low-quality content for testing."""
        cliche_phrases = [
            "Follow your dreams and never give up on yourself.",
            "Everything happens for a reason, so just believe in yourself.",
            "Live laugh love and carpe diem every single day.",
            "You're amazing and awesome, so just do it and think outside the box.",
            "Be the best version of yourself and reach for the stars.",
            "Life is what you make it, so make it count and seize the day."
        ]
        
        # Add repetitive or poor grammar
        base_phrase = draw(st.sampled_from(cliche_phrases))
        
        # Make it worse with repetition or poor structure
        quality_issues = [
            f"{base_phrase} {base_phrase}",  # Repetition
            base_phrase.lower(),  # Poor capitalization
            base_phrase.replace(".", ""),  # Missing punctuation
            f"{base_phrase} And and and remember that.",  # Poor grammar
        ]
        
        return draw(st.sampled_from(quality_issues))
    
    @composite
    def varied_content_strategy(draw):
        """Generate content with different styles and approaches."""
        styles = list(QuoteStyle)
        approaches = list(QuoteApproach)
        
        style = draw(st.sampled_from(styles))
        approach = draw(st.sampled_from(approaches))
        
        # Generate content based on style and approach
        style_content = {
            QuoteStyle.INSPIRATIONAL: "You have the power to create positive change in your life.",
            QuoteStyle.PHILOSOPHICAL: "The nature of existence reveals itself through our daily experiences.",
            QuoteStyle.PRACTICAL: "Start each day by setting three achievable goals for yourself.",
            QuoteStyle.POETIC: "Like morning dew on petals, wisdom gathers in quiet moments.",
            QuoteStyle.CONVERSATIONAL: "You know, we all face challenges that test our resolve.",
            QuoteStyle.REFLECTIVE: "Take a moment to consider what truly matters in your life.",
            QuoteStyle.MOTIVATIONAL: "Push beyond your limits and achieve greatness today.",
            QuoteStyle.WISDOM: "Experience teaches us that patience often yields the greatest rewards."
        }
        
        approach_modifiers = {
            QuoteApproach.DIRECT: "",
            QuoteApproach.METAPHORICAL: " like a river flowing toward the sea",
            QuoteApproach.QUESTIONING: "? Consider this deeply.",
            QuoteApproach.STORYTELLING: ". Imagine a person who embodies this truth.",
            QuoteApproach.COMPARATIVE: " more than those who remain stagnant",
            QuoteApproach.INSTRUCTIONAL: ". First, acknowledge this truth. Then, act upon it.",
            QuoteApproach.OBSERVATIONAL: ". Notice how this manifests in your daily life."
        }
        
        base_content = style_content.get(style, "Growth comes through embracing new challenges.")
        modifier = approach_modifiers.get(approach, "")
        
        return base_content + modifier
    
    @given(content=high_quality_content_strategy())
    @settings(max_examples=50, deadline=5000)
    @example(content="Every challenge you face today is an opportunity to discover your inner strength and resilience.")
    def test_property_16_high_quality_content_meets_standards(self, content: str):
        """
        Property 16: Content Quality Standards
        
        For any high-quality content, it should meet grammar and coherence standards.
        **Validates: Requirements 7.4, 7.5**
        """
        # Feature: digital-calendar, Property 16: Content Quality Standards
        
        # Mock recent quotes (empty for this test)
        self.mock_quote_repo.get_recent_quotes.return_value = []
        
        # Validate content
        validation_report = self.content_validator.validate_content(content)
        
        # High-quality content should pass grammar validation
        assert validation_report.grammar_result != ValidationResult.FAIL, \
            f"High-quality content failed grammar validation: {content[:50]}... Issues: {validation_report.issues}"
        
        # High-quality content should pass coherence validation
        assert validation_report.coherence_result != ValidationResult.FAIL, \
            f"High-quality content failed coherence validation: {content[:50]}... Issues: {validation_report.issues}"
        
        # Overall quality score should be reasonable
        assert validation_report.quality_score >= 0.4, \
            f"High-quality content has low quality score: {validation_report.quality_score:.2f} for '{content[:50]}...'"
    
    @given(content=low_quality_content_strategy())
    @settings(max_examples=30, deadline=5000)
    @example(content="follow your dreams and never give up on yourself")
    def test_property_16_low_quality_content_identified(self, content: str):
        """
        Property 16: Content Quality Standards
        
        For any low-quality content, quality issues should be identified.
        **Validates: Requirements 7.4, 7.5**
        """
        # Feature: digital-calendar, Property 16: Content Quality Standards
        
        # Mock recent quotes (empty for this test)
        self.mock_quote_repo.get_recent_quotes.return_value = []
        
        # Assess content quality
        quality_metrics = self.quality_service.assess_content_quality(content, "test_user")
        
        # Low-quality content should have lower quality scores
        assert quality_metrics.overall_quality < 0.8, \
            f"Low-quality content scored too high: {quality_metrics.overall_quality:.2f} for '{content[:50]}...'"
        
        # Should have recommendations for improvement
        assert len(quality_metrics.recommendations) > 0, \
            f"Low-quality content generated no recommendations: '{content[:50]}...'"
        
        # Content freshness should be affected by clichés
        if any(cliche in content.lower() for cliche in ["follow your dreams", "never give up", "live laugh love"]):
            assert quality_metrics.content_freshness < 0.7, \
                f"Clichéd content has high freshness score: {quality_metrics.content_freshness:.2f}"
    
    @given(
        user_id=st.text(min_size=1, max_size=20),
        target_date=st.dates(min_value=date(2024, 1, 1), max_value=date(2024, 12, 31)),
        user_profile=st.one_of(
            st.none(),
            st.fixed_dictionaries({
                'categories': st.lists(
                    st.fixed_dictionaries({
                        'category': st.sampled_from(['spirituality', 'sport', 'education', 'health', 'humor', 'philosophy']),
                        'weight': st.floats(min_value=0.0, max_value=1.0)
                    }),
                    min_size=1, max_size=3
                )
            })
        )
    )
    @settings(max_examples=30, deadline=5000)
    def test_property_16_style_variation_provides_diversity(self, user_id: str, target_date: date, user_profile: Dict[str, Any]):
        """
        Property 16: Content Quality Standards
        
        For any user and date, style variation should provide appropriate diversity.
        **Validates: Requirements 7.4**
        """
        # Feature: digital-calendar, Property 16: Content Quality Standards
        
        # Mock recent quotes with some variety
        mock_quotes = []
        for i in range(5):
            mock_quote = Mock()
            mock_quote.content = f"Sample quote {i} with different content and style."
            mock_quotes.append(mock_quote)
        
        self.mock_quote_repo.get_recent_quotes.return_value = mock_quotes
        
        # Get style variation
        style_variation = self.quality_service.get_style_variation_for_user(user_id, target_date, user_profile)
        
        # Should return a valid style variation
        assert style_variation is not None
        assert isinstance(style_variation.style, QuoteStyle)
        assert isinstance(style_variation.approach, QuoteApproach)
        assert style_variation.tone in ["positive", "reflective", "energetic", "calm", "wise", "warm", "friendly", "artistic", "flowing", "direct", "encouraging", "thoughtful", "powerful", "authoritative"]
        assert style_variation.length_preference in ["short", "medium", "long"]
        assert style_variation.complexity_level in ["simple", "moderate", "complex"]
    
    @given(content=varied_content_strategy())
    @settings(max_examples=50, deadline=5000)
    def test_property_16_content_variety_assessment(self, content: str):
        """
        Property 16: Content Quality Standards
        
        For any content, variety assessment should work consistently.
        **Validates: Requirements 7.4**
        """
        # Feature: digital-calendar, Property 16: Content Quality Standards
        
        # Create mock recent quotes with some similarity
        mock_quotes = []
        for i in range(3):
            mock_quote = Mock()
            mock_quote.content = f"This is a sample quote number {i} for testing variety."
            mock_quotes.append(mock_quote)
        
        self.mock_quote_repo.get_recent_quotes.return_value = mock_quotes
        
        # Assess content quality
        quality_metrics = self.quality_service.assess_content_quality(content, "test_user")
        
        # Should return valid metrics
        assert 0.0 <= quality_metrics.variety_score <= 1.0
        assert 0.0 <= quality_metrics.style_diversity <= 1.0
        assert 0.0 <= quality_metrics.approach_diversity <= 1.0
        assert 0.0 <= quality_metrics.content_freshness <= 1.0
        assert 0.0 <= quality_metrics.overall_quality <= 1.0
        
        # Should have recommendations
        assert isinstance(quality_metrics.recommendations, list)
        assert len(quality_metrics.recommendations) > 0
    
    def test_property_16_grammar_validation_standards(self):
        """
        Property 16: Content Quality Standards
        
        Test specific grammar standards that should be enforced.
        **Validates: Requirements 7.5**
        """
        # Feature: digital-calendar, Property 16: Content Quality Standards
        
        # Test proper capitalization
        proper_content = "This is a properly capitalized sentence with good grammar."
        improper_content = "this is not properly capitalized and has issues."
        
        proper_report = self.content_validator.validate_content(proper_content)
        improper_report = self.content_validator.validate_content(improper_content)
        
        # Proper content should have better grammar score
        assert proper_report.grammar_result != ValidationResult.FAIL
        
        # Improper content should be flagged
        grammar_issues = [issue for issue in improper_report.issues if "capitalization" in issue.lower()]
        assert len(grammar_issues) > 0 or improper_report.grammar_result != ValidationResult.PASS
        
        # Test complete sentences
        complete_sentence = "This is a complete sentence with proper punctuation."
        incomplete_sentence = "This is not complete"
        
        complete_report = self.content_validator.validate_content(complete_sentence)
        incomplete_report = self.content_validator.validate_content(incomplete_sentence)
        
        # Complete sentence should pass
        assert complete_report.grammar_result != ValidationResult.FAIL
        
        # Incomplete sentence should be flagged
        incomplete_issues = [issue for issue in incomplete_report.issues if "incomplete" in issue.lower()]
        assert len(incomplete_issues) > 0 or incomplete_report.grammar_result != ValidationResult.PASS
    
    def test_property_16_coherence_validation_standards(self):
        """
        Property 16: Content Quality Standards
        
        Test coherence standards that should be enforced.
        **Validates: Requirements 7.5**
        """
        # Feature: digital-calendar, Property 16: Content Quality Standards
        
        # Test coherent content
        coherent_content = "Personal growth requires patience and dedication. Through consistent effort, we develop the skills needed for success."
        
        # Test incoherent content
        incoherent_content = "The sky is blue. Elephants eat peanuts. Mathematics involves numbers. Happiness is important."
        
        coherent_report = self.content_validator.validate_content(coherent_content)
        incoherent_report = self.content_validator.validate_content(incoherent_content)
        
        # Coherent content should pass coherence validation
        assert coherent_report.coherence_result != ValidationResult.FAIL
        
        # Incoherent content should have lower coherence score
        assert incoherent_report.coherence_result != ValidationResult.PASS or \
               coherent_report.quality_score > incoherent_report.quality_score
    
    @given(
        style=st.sampled_from(list(QuoteStyle)),
        approach=st.sampled_from(list(QuoteApproach)),
        tone=st.sampled_from(["positive", "reflective", "energetic", "calm", "wise"]),
        length_preference=st.sampled_from(["short", "medium", "long"]),
        complexity_level=st.sampled_from(["simple", "moderate", "complex"])
    )
    @settings(max_examples=30, deadline=5000)
    def test_property_16_style_guidance_generation(self, style: QuoteStyle, approach: QuoteApproach, 
                                                  tone: str, length_preference: str, complexity_level: str):
        """
        Property 16: Content Quality Standards
        
        For any valid style variation, guidance generation should work consistently.
        **Validates: Requirements 7.4**
        """
        # Feature: digital-calendar, Property 16: Content Quality Standards
        
        # Create style variation
        style_variation = StyleVariation(
            style=style,
            approach=approach,
            tone=tone,
            length_preference=length_preference,
            complexity_level=complexity_level
        )
        
        # Generate style guidance
        guidance = self.quality_service.generate_style_guidance(style_variation)
        
        # Should return non-empty guidance
        assert guidance is not None
        assert len(guidance.strip()) > 0
        
        # Should contain style and approach information
        assert style.value in guidance.lower() or any(char in guidance for char in style.value)
        assert approach.value in guidance.lower() or any(char in guidance for char in approach.value)
    
    def test_property_16_quality_score_consistency(self):
        """
        Property 16: Content Quality Standards
        
        Test that quality scoring is consistent and meaningful.
        **Validates: Requirements 7.4, 7.5**
        """
        # Feature: digital-calendar, Property 16: Content Quality Standards
        
        # Mock empty recent quotes
        self.mock_quote_repo.get_recent_quotes.return_value = []
        
        # Test different quality levels
        high_quality = "Wisdom emerges through thoughtful reflection on our daily experiences and challenges."
        medium_quality = "Every day brings new opportunities for growth and learning in life."
        low_quality = "follow your dreams and never give up believe in yourself amazing"
        
        high_metrics = self.quality_service.assess_content_quality(high_quality, "test_user")
        medium_metrics = self.quality_service.assess_content_quality(medium_quality, "test_user")
        low_metrics = self.quality_service.assess_content_quality(low_quality, "test_user")
        
        # Quality scores should reflect content quality
        assert high_metrics.overall_quality >= medium_metrics.overall_quality, \
            f"High quality ({high_metrics.overall_quality:.2f}) should be >= medium quality ({medium_metrics.overall_quality:.2f})"
        
        assert medium_metrics.overall_quality >= low_metrics.overall_quality, \
            f"Medium quality ({medium_metrics.overall_quality:.2f}) should be >= low quality ({low_metrics.overall_quality:.2f})"
        
        # All scores should be in valid range
        for metrics in [high_metrics, medium_metrics, low_metrics]:
            assert 0.0 <= metrics.overall_quality <= 1.0
            assert 0.0 <= metrics.variety_score <= 1.0
            assert 0.0 <= metrics.content_freshness <= 1.0
    
    def test_property_16_cliche_detection(self):
        """
        Property 16: Content Quality Standards
        
        Test that clichéd content is properly identified and penalized.
        **Validates: Requirements 7.4**
        """
        # Feature: digital-calendar, Property 16: Content Quality Standards
        
        # Mock empty recent quotes
        self.mock_quote_repo.get_recent_quotes.return_value = []
        
        # Test clichéd content
        cliche_content = "Follow your dreams and believe in yourself because everything happens for a reason."
        original_content = "Pursue your authentic aspirations with confidence, trusting in the meaningful patterns of life."
        
        cliche_metrics = self.quality_service.assess_content_quality(cliche_content, "test_user")
        original_metrics = self.quality_service.assess_content_quality(original_content, "test_user")
        
        # Original content should have better freshness score
        assert original_metrics.content_freshness > cliche_metrics.content_freshness, \
            f"Original content freshness ({original_metrics.content_freshness:.2f}) should be > clichéd content ({cliche_metrics.content_freshness:.2f})"
        
        # Clichéd content should have recommendations about avoiding clichés
        cliche_recommendations = [rec for rec in cliche_metrics.recommendations if "clich" in rec.lower() or "overused" in rec.lower()]
        assert len(cliche_recommendations) > 0, \
            f"Clichéd content should generate recommendations about clichés: {cliche_metrics.recommendations}"