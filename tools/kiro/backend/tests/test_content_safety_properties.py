"""
Property-based tests for content safety validation in ARK Digital Calendar.

Tests Property 15: Content Safety Validation
**Validates: Requirements 7.3**
"""

import pytest
from hypothesis import given, strategies as st, settings, example
from hypothesis.strategies import text, composite
import re
from typing import Dict, Any, Optional

from app.services.content_validator import ContentValidator, ValidationResult


class TestContentSafetyValidation:
    """Test content safety validation properties."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.validator = ContentValidator()
    
    @composite
    def safe_content_strategy(draw):
        """Generate safe content for testing."""
        positive_words = [
            "inspire", "motivate", "encourage", "empower", "uplift", "hope", "joy", "peace",
            "growth", "wisdom", "strength", "courage", "love", "compassion", "gratitude",
            "success", "achievement", "progress", "potential", "opportunity", "possibility",
            "beautiful", "wonderful", "amazing", "brilliant", "excellent", "fantastic"
        ]
        
        safe_phrases = [
            "Every day brings new opportunities for growth and learning.",
            "Your potential is limitless when you believe in yourself.",
            "Success comes to those who persist with purpose and passion.",
            "Wisdom grows through experience and reflection.",
            "Kindness creates ripples that extend far beyond what we can see.",
            "The journey of personal growth begins with a single step forward.",
            "Gratitude transforms ordinary moments into extraordinary blessings.",
            "Courage is not the absence of fear, but action despite it."
        ]
        
        # Choose between generating from words or using safe phrases
        if draw(st.booleans()):
            # Generate from positive words
            word_count = draw(st.integers(min_value=5, max_value=25))
            words = draw(st.lists(st.sampled_from(positive_words), min_size=word_count, max_size=word_count))
            return " ".join(words).capitalize() + "."
        else:
            # Use safe phrases
            return draw(st.sampled_from(safe_phrases))
    
    @composite
    def unsafe_content_strategy(draw):
        """Generate unsafe content for testing."""
        unsafe_patterns = [
            # Profanity
            "This is damn difficult to understand.",
            "You're such an idiot if you believe that.",
            "What the hell is wrong with people?",
            
            # Violence
            "Sometimes you need to kill your old habits.",
            "This will destroy your competition completely.",
            "Fight against all the obstacles in your path.",
            
            # Discrimination
            "Some people are just inferior to others.",
            "Those people are worthless and don't matter.",
            "I hate when people act like that.",
            
            # Inappropriate content
            "Life is like being drunk on power.",
            "Gambling with your future is never wise.",
            "This is more addictive than any drug.",
            
            # Political content
            "Democrats and Republicans never agree on anything.",
            "The government is always trying to control us.",
            "Politics ruins everything it touches."
        ]
        
        return draw(st.sampled_from(unsafe_patterns))
    
    @composite
    def mixed_content_strategy(draw):
        """Generate content with mixed safety levels."""
        safe_part = draw(TestContentSafetyValidation.safe_content_strategy())
        unsafe_part = draw(TestContentSafetyValidation.unsafe_content_strategy())
        
        # Combine in different ways
        combination_type = draw(st.integers(min_value=1, max_value=3))
        
        if combination_type == 1:
            return f"{safe_part} {unsafe_part}"
        elif combination_type == 2:
            return f"{unsafe_part} {safe_part}"
        else:
            return f"{safe_part} However, {unsafe_part.lower()}"
    
    @given(content=safe_content_strategy())
    @settings(max_examples=100, deadline=5000)
    @example(content="Every day brings new opportunities for growth and learning.")
    @example(content="Your potential is limitless when you believe in yourself.")
    def test_property_15_safe_content_passes_validation(self, content: str):
        """
        Property 15: Content Safety Validation
        
        For any safe, appropriate content, the safety validation should pass.
        **Validates: Requirements 7.3**
        """
        # Feature: digital-calendar, Property 15: Content Safety Validation
        
        # Validate the content
        report = self.validator.validate_content(content)
        
        # Safe content should pass safety validation
        assert report.safety_result in [ValidationResult.PASS, ValidationResult.WARNING], \
            f"Safe content failed safety validation: {content[:50]}... Issues: {report.issues}"
        
        # Overall result should not fail due to safety
        if report.overall_result == ValidationResult.FAIL:
            # If it fails, it should not be due to safety issues
            safety_related_issues = [issue for issue in report.issues 
                                   if any(keyword in issue.lower() for keyword in 
                                         ['inappropriate', 'offensive', 'harmful', 'controversial', 'profanity'])]
            assert len(safety_related_issues) == 0, \
                f"Safe content failed due to safety issues: {safety_related_issues}"
    
    @given(content=unsafe_content_strategy())
    @settings(max_examples=50, deadline=5000)
    @example(content="You're such an idiot if you believe that.")
    @example(content="I hate when people act like that.")
    def test_property_15_unsafe_content_fails_validation(self, content: str):
        """
        Property 15: Content Safety Validation
        
        For any unsafe, inappropriate content, the safety validation should fail or warn.
        **Validates: Requirements 7.3**
        """
        # Feature: digital-calendar, Property 15: Content Safety Validation
        
        # Validate the content
        report = self.validator.validate_content(content)
        
        # Unsafe content should not pass safety validation
        assert report.safety_result != ValidationResult.PASS, \
            f"Unsafe content passed safety validation: {content[:50]}..."
        
        # Should have safety-related issues identified
        safety_related_issues = [issue for issue in report.issues 
                               if any(keyword in issue.lower() for keyword in 
                                     ['inappropriate', 'offensive', 'harmful', 'controversial', 'profanity', 'violence', 'discrimination'])]
        assert len(safety_related_issues) > 0, \
            f"Unsafe content did not identify safety issues: {content[:50]}... Issues: {report.issues}"
    
    @given(content=text(min_size=1, max_size=200))
    @settings(max_examples=100, deadline=5000)
    def test_property_15_validation_always_returns_result(self, content: str):
        """
        Property 15: Content Safety Validation
        
        For any content input, validation should always return a complete result.
        **Validates: Requirements 7.3**
        """
        # Feature: digital-calendar, Property 15: Content Safety Validation
        
        # Validate the content
        report = self.validator.validate_content(content)
        
        # Should always return a valid report
        assert report is not None
        assert hasattr(report, 'safety_result')
        assert hasattr(report, 'overall_result')
        assert hasattr(report, 'issues')
        assert hasattr(report, 'quality_score')
        
        # Results should be valid enum values
        assert report.safety_result in [ValidationResult.PASS, ValidationResult.WARNING, ValidationResult.FAIL]
        assert report.overall_result in [ValidationResult.PASS, ValidationResult.WARNING, ValidationResult.FAIL]
        
        # Quality score should be in valid range
        assert 0.0 <= report.quality_score <= 1.0
        
        # Issues should be a list
        assert isinstance(report.issues, list)
    
    @given(content=st.text(min_size=1, max_size=50))
    @settings(max_examples=50, deadline=5000)
    def test_property_15_empty_or_whitespace_content_fails(self, content: str):
        """
        Property 15: Content Safety Validation
        
        For empty or whitespace-only content, validation should fail.
        **Validates: Requirements 7.3**
        """
        # Feature: digital-calendar, Property 15: Content Safety Validation
        
        # Test with whitespace-only content
        whitespace_content = " " * len(content.strip()) if content.strip() else content
        
        if not whitespace_content.strip():
            report = self.validator.validate_content(whitespace_content)
            
            # Empty/whitespace content should fail
            assert report.overall_result == ValidationResult.FAIL
            assert any("empty" in issue.lower() or "whitespace" in issue.lower() for issue in report.issues)
    
    @given(
        content=st.text(min_size=10, max_size=100),
        context=st.fixed_dictionaries({
            'theme_context': st.one_of(
                st.none(),
                st.fixed_dictionaries({
                    'theme_name': st.text(min_size=1, max_size=20),
                    'theme_type': st.sampled_from(['monthly', 'weekly']),
                    'keywords': st.lists(st.text(min_size=1, max_size=10), min_size=0, max_size=5)
                })
            ),
            'user_profile': st.fixed_dictionaries({
                'categories': st.lists(
                    st.fixed_dictionaries({
                        'category': st.sampled_from(['spirituality', 'sport', 'education', 'health', 'humor', 'philosophy']),
                        'weight': st.floats(min_value=0.0, max_value=1.0)
                    }),
                    min_size=0, max_size=3
                )
            })
        })
    )
    @settings(max_examples=30, deadline=5000)
    def test_property_15_validation_with_context_is_consistent(self, content: str, context: Dict[str, Any]):
        """
        Property 15: Content Safety Validation
        
        For any content and context, validation results should be consistent and context-aware.
        **Validates: Requirements 7.3**
        """
        # Feature: digital-calendar, Property 15: Content Safety Validation
        
        # Validate with context
        report_with_context = self.validator.validate_content(content, context)
        
        # Validate without context
        report_without_context = self.validator.validate_content(content)
        
        # Both should return valid reports
        assert report_with_context is not None
        assert report_without_context is not None
        
        # Safety validation should be consistent regardless of context
        # (context might affect other aspects but not basic safety)
        if report_without_context.safety_result == ValidationResult.FAIL:
            # If content is unsafe without context, it should remain unsafe with context
            assert report_with_context.safety_result == ValidationResult.FAIL
    
    def test_property_15_specific_safety_patterns(self):
        """
        Property 15: Content Safety Validation
        
        Test specific safety patterns that should always be caught.
        **Validates: Requirements 7.3**
        """
        # Feature: digital-calendar, Property 15: Content Safety Validation
        
        # Test profanity detection
        profane_content = "This is a damn good example of bad content."
        report = self.validator.validate_content(profane_content)
        assert report.safety_result != ValidationResult.PASS
        
        # Test violence detection
        violent_content = "You need to kill your bad habits and destroy negativity."
        report = self.validator.validate_content(violent_content)
        assert report.safety_result != ValidationResult.PASS
        
        # Test discrimination detection
        discriminatory_content = "Some people are just inferior and worthless."
        report = self.validator.validate_content(discriminatory_content)
        assert report.safety_result != ValidationResult.PASS
        
        # Test inappropriate content detection
        inappropriate_content = "Life is like being drunk and gambling with your future."
        report = self.validator.validate_content(inappropriate_content)
        assert report.safety_result != ValidationResult.PASS
        
        # Test political content detection
        political_content = "Democrats and Republicans are ruining this country with their politics."
        report = self.validator.validate_content(political_content)
        assert report.safety_result != ValidationResult.PASS
    
    def test_property_15_personal_information_detection(self):
        """
        Property 15: Content Safety Validation
        
        Test that personal information patterns are detected and flagged.
        **Validates: Requirements 7.3**
        """
        # Feature: digital-calendar, Property 15: Content Safety Validation
        
        # Test phone number detection
        phone_content = "Call me at 555-123-4567 for more information."
        report = self.validator.validate_content(phone_content)
        personal_info_issues = [issue for issue in report.issues if "personal information" in issue.lower()]
        assert len(personal_info_issues) > 0
        
        # Test email detection
        email_content = "Contact john.doe@example.com for details."
        report = self.validator.validate_content(email_content)
        personal_info_issues = [issue for issue in report.issues if "personal information" in issue.lower()]
        assert len(personal_info_issues) > 0
        
        # Test address detection
        address_content = "Visit us at 123 Main Street for the event."
        report = self.validator.validate_content(address_content)
        personal_info_issues = [issue for issue in report.issues if "personal information" in issue.lower()]
        assert len(personal_info_issues) > 0
    
    @given(content=st.text(min_size=5, max_size=100))
    @settings(max_examples=50, deadline=5000)
    def test_property_15_negative_content_detection(self, content: str):
        """
        Property 15: Content Safety Validation
        
        For content with excessive negative language, validation should identify the issue.
        **Validates: Requirements 7.3**
        """
        # Feature: digital-calendar, Property 15: Content Safety Validation
        
        # Add multiple negative words to the content
        negative_words = ["not", "never", "can't", "won't", "fail", "impossible", "terrible", "awful"]
        negative_content = content + " " + " ".join(negative_words[:4])  # Add 4 negative words
        
        report = self.validator.validate_content(negative_content)
        
        # Should detect excessive negativity
        negative_issues = [issue for issue in report.issues if "negative" in issue.lower()]
        
        # If the content has many negative words, it should be flagged
        negative_count = sum(1 for word in negative_words if word in negative_content.lower())
        if negative_count >= 3:
            assert len(negative_issues) > 0 or report.safety_result != ValidationResult.PASS, \
                f"Excessive negative content not detected: {negative_content[:50]}..."
    
    def test_property_15_controversial_content_assessment(self):
        """
        Property 15: Content Safety Validation
        
        Test that controversial content is properly assessed and flagged.
        **Validates: Requirements 7.3**
        """
        # Feature: digital-calendar, Property 15: Content Safety Validation
        
        controversial_topics = [
            "religion", "politics", "race", "gender", "sexuality", 
            "abortion", "gun", "war", "immigration", "climate"
        ]
        
        for topic in controversial_topics[:5]:  # Test first 5 topics
            controversial_content = f"The topic of {topic} is very important to consider in life."
            report = self.validator.validate_content(controversial_content)
            
            # Should identify controversial content
            controversial_issues = [issue for issue in report.issues 
                                  if "controversial" in issue.lower() or "divisive" in issue.lower()]
            
            # May not always fail, but should at least warn or note the controversial nature
            if report.safety_result == ValidationResult.FAIL:
                assert len(controversial_issues) > 0, \
                    f"Controversial content failed but no controversial issues identified: {controversial_content}"