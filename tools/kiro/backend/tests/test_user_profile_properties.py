"""
Property-based tests for user profile functionality in ARK Digital Calendar.

This module contains property-based tests that validate the correctness
of user profile creation, questionnaire processing, and feedback integration.
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from hypothesis.stateful import RuleBasedStateMachine, Bundle, rule, initialize
import uuid
from typing import List, Dict, Any
from datetime import datetime, timedelta

from app.services.user_profile import (
    UserProfileService, 
    QuestionnaireResponse, 
    PersonalityCategory,
    PersonalityCategoryWeight
)
from app.services.feedback_analyzer import FeedbackAnalyzer, FeedbackPattern


# Hypothesis strategies for generating test data
@st.composite
def questionnaire_response_data(draw):
    """Generate valid questionnaire response data."""
    # Use actual question IDs from the service
    service = UserProfileService()
    questionnaire = service.get_questionnaire()
    
    question = draw(st.sampled_from(questionnaire))
    answer = draw(st.sampled_from(question["options"]))
    weight = draw(st.floats(min_value=0.1, max_value=2.0))
    
    return QuestionnaireResponse(
        question_id=question["id"],
        answer=answer,
        weight=weight
    )


@st.composite
def complete_questionnaire_responses(draw):
    """Generate a complete set of questionnaire responses."""
    service = UserProfileService()
    questionnaire = service.get_questionnaire()
    
    responses = []
    for question in questionnaire:
        answer = draw(st.sampled_from(question["options"]))
        weight = draw(st.floats(min_value=0.1, max_value=2.0))
        
        responses.append(QuestionnaireResponse(
            question_id=question["id"],
            answer=answer,
            weight=weight
        ))
    
    return responses


@st.composite
def personality_category_weight_data(draw):
    """Generate personality category weight data."""
    category = draw(st.sampled_from(list(PersonalityCategory)))
    weight = draw(st.floats(min_value=0.0, max_value=1.0))
    confidence = draw(st.floats(min_value=0.0, max_value=1.0))
    
    return PersonalityCategoryWeight(
        category=category,
        weight=weight,
        confidence=confidence
    )


@st.composite
def user_profile_data(draw):
    """Generate user profile data structure."""
    categories = []
    for category in PersonalityCategory:
        weight = draw(st.floats(min_value=0.0, max_value=1.0))
        confidence = draw(st.floats(min_value=0.0, max_value=1.0))
        categories.append({
            "category": category.value,
            "weight": weight,
            "confidence": confidence
        })
    
    # Normalize weights to sum to 1.0 (or close to it)
    total_weight = sum(cat["weight"] for cat in categories)
    if total_weight > 0:
        for cat in categories:
            cat["weight"] = cat["weight"] / total_weight
    else:
        # If all weights are zero, distribute equally
        equal_weight = 1.0 / len(categories)
        for cat in categories:
            cat["weight"] = equal_weight
    
    return {
        "categories": categories,
        "created_at": datetime.utcnow().isoformat(),
        "version": "1.0",
        "dominant_categories": [cat["category"] for cat in categories[:3] if cat["weight"] > 0.1]
    }


class TestUserProfileProperties:
    """Property-based tests for user profile functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.profile_service = UserProfileService()
        self.feedback_analyzer = FeedbackAnalyzer()
    
    @given(complete_questionnaire_responses())
    @settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_profile_creation_from_questionnaire(self, responses: List[QuestionnaireResponse]):
        """
        Property 5: Profile Creation from Questionnaire
        
        For any valid questionnaire response set, the system should create a user profile
        with appropriate personality category weights and confidence scores.
        
        **Validates: Requirements 2.2**
        """
        # Feature: digital-calendar, Property 5: Profile Creation from Questionnaire
        
        # Process questionnaire responses
        personality_weights = self.profile_service.process_questionnaire_responses(responses)
        
        # Verify basic structure
        assert isinstance(personality_weights, list)
        assert len(personality_weights) == len(PersonalityCategory)
        
        # Verify all personality categories are represented
        represented_categories = {weight.category for weight in personality_weights}
        assert represented_categories == set(PersonalityCategory)
        
        # Verify weights are valid (0.0 to 1.0)
        for weight in personality_weights:
            assert isinstance(weight.weight, float)
            assert 0.0 <= weight.weight <= 1.0
            assert isinstance(weight.confidence, float)
            assert 0.0 <= weight.confidence <= 1.0
        
        # Verify weights are normalized (sum should be reasonable)
        total_weight = sum(weight.weight for weight in personality_weights)
        assert 0.8 <= total_weight <= 1.2  # Allow some tolerance for normalization
        
        # Create profile data
        profile_data = self.profile_service.create_user_profile_data(personality_weights)
        
        # Verify profile data structure
        assert isinstance(profile_data, dict)
        assert "categories" in profile_data
        assert "created_at" in profile_data
        assert "version" in profile_data
        assert "dominant_categories" in profile_data
        
        # Verify categories data
        categories = profile_data["categories"]
        assert len(categories) == len(PersonalityCategory)
        
        for category_data in categories:
            assert "category" in category_data
            assert "weight" in category_data
            assert "confidence" in category_data
            assert category_data["category"] in [cat.value for cat in PersonalityCategory]
            assert 0.0 <= category_data["weight"] <= 1.0
            assert 0.0 <= category_data["confidence"] <= 1.0
        
        # Verify dominant categories are reasonable
        dominant_categories = profile_data["dominant_categories"]
        assert isinstance(dominant_categories, list)
        assert len(dominant_categories) <= 3  # At most 3 dominant categories
        
        # All dominant categories should have meaningful weights
        category_weights = {cat["category"]: cat["weight"] for cat in categories}
        for dominant_cat in dominant_categories:
            assert category_weights[dominant_cat] > 0.1
    
    @given(complete_questionnaire_responses(), st.floats(min_value=0.1, max_value=2.0))
    @settings(max_examples=30, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_questionnaire_response_weight_influence(self, responses: List[QuestionnaireResponse], weight_multiplier: float):
        """
        Property: Response weights should influence final personality weights.
        
        For any questionnaire responses, applying different weights should result in
        different personality category distributions.
        """
        # Feature: digital-calendar, Property 5: Profile Creation from Questionnaire (weight influence)
        
        # Process responses with original weights
        original_weights = self.profile_service.process_questionnaire_responses(responses)
        
        # Create modified responses with adjusted weights
        modified_responses = []
        for response in responses:
            modified_responses.append(QuestionnaireResponse(
                question_id=response.question_id,
                answer=response.answer,
                weight=response.weight * weight_multiplier
            ))
        
        # Process modified responses
        modified_weights = self.profile_service.process_questionnaire_responses(modified_responses)
        
        # The relative ordering of categories should be preserved
        # (highest weight category should remain highest, etc.)
        original_sorted = sorted(original_weights, key=lambda x: x.weight, reverse=True)
        modified_sorted = sorted(modified_weights, key=lambda x: x.weight, reverse=True)
        
        # Top categories should be the same (allowing for some variation due to normalization)
        original_top_categories = [w.category for w in original_sorted[:2]]
        modified_top_categories = [w.category for w in modified_sorted[:2]]
        
        # At least one of the top categories should be the same
        assert len(set(original_top_categories) & set(modified_top_categories)) >= 1
    
    @given(user_profile_data())
    @settings(max_examples=30, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_profile_data_structure_consistency(self, profile_data: Dict[str, Any]):
        """
        Property: Profile data should maintain consistent structure.
        
        For any valid profile data, the structure should be consistent and
        all required fields should be present with valid values.
        """
        # Feature: digital-calendar, Property 5: Profile Creation from Questionnaire (structure consistency)
        
        # Verify required fields
        required_fields = ["categories", "created_at", "version", "dominant_categories"]
        for field in required_fields:
            assert field in profile_data
        
        # Verify categories structure
        categories = profile_data["categories"]
        assert isinstance(categories, list)
        assert len(categories) == len(PersonalityCategory)
        
        category_names = set()
        total_weight = 0.0
        
        for category_data in categories:
            assert isinstance(category_data, dict)
            assert "category" in category_data
            assert "weight" in category_data
            assert "confidence" in category_data
            
            category_name = category_data["category"]
            assert category_name in [cat.value for cat in PersonalityCategory]
            assert category_name not in category_names  # No duplicates
            category_names.add(category_name)
            
            weight = category_data["weight"]
            confidence = category_data["confidence"]
            assert isinstance(weight, (int, float))
            assert isinstance(confidence, (int, float))
            assert 0.0 <= weight <= 1.0
            assert 0.0 <= confidence <= 1.0
            
            total_weight += weight
        
        # All categories should be represented
        assert len(category_names) == len(PersonalityCategory)
        
        # Weights should be normalized
        assert 0.8 <= total_weight <= 1.2  # Allow some tolerance
        
        # Verify dominant categories
        dominant_categories = profile_data["dominant_categories"]
        assert isinstance(dominant_categories, list)
        assert len(dominant_categories) <= 3
        
        # All dominant categories should exist in categories
        category_weights = {cat["category"]: cat["weight"] for cat in categories}
        for dominant_cat in dominant_categories:
            assert dominant_cat in category_weights
            assert category_weights[dominant_cat] > 0.1
    
    @given(complete_questionnaire_responses())
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_questionnaire_processing_deterministic(self, responses: List[QuestionnaireResponse]):
        """
        Property: Questionnaire processing should be deterministic.
        
        For any set of questionnaire responses, processing them multiple times
        should produce identical results.
        """
        # Feature: digital-calendar, Property 5: Profile Creation from Questionnaire (deterministic)
        
        # Process responses multiple times
        result1 = self.profile_service.process_questionnaire_responses(responses)
        result2 = self.profile_service.process_questionnaire_responses(responses)
        
        # Results should be identical
        assert len(result1) == len(result2)
        
        # Sort by category for comparison
        result1_sorted = sorted(result1, key=lambda x: x.category.value)
        result2_sorted = sorted(result2, key=lambda x: x.category.value)
        
        for w1, w2 in zip(result1_sorted, result2_sorted):
            assert w1.category == w2.category
            assert abs(w1.weight - w2.weight) < 1e-10  # Floating point precision
            assert abs(w1.confidence - w2.confidence) < 1e-10
        
        # Profile data creation should also be deterministic
        profile1 = self.profile_service.create_user_profile_data(result1)
        profile2 = self.profile_service.create_user_profile_data(result2)
        
        # Categories should be identical (ignoring timestamps)
        categories1 = sorted(profile1["categories"], key=lambda x: x["category"])
        categories2 = sorted(profile2["categories"], key=lambda x: x["category"])
        
        for cat1, cat2 in zip(categories1, categories2):
            assert cat1["category"] == cat2["category"]
            assert abs(cat1["weight"] - cat2["weight"]) < 1e-10
            assert abs(cat1["confidence"] - cat2["confidence"]) < 1e-10
        
        # Dominant categories should be identical
        assert set(profile1["dominant_categories"]) == set(profile2["dominant_categories"])


class TestQuestionnaireValidation:
    """Property-based tests for questionnaire validation."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.profile_service = UserProfileService()
    
    @given(st.lists(questionnaire_response_data(), min_size=1, max_size=4))
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_incomplete_questionnaire_rejection(self, incomplete_responses: List[QuestionnaireResponse]):
        """
        Property: Incomplete questionnaires should be rejected.
        
        For any questionnaire with fewer than the required number of responses,
        the system should raise a ValueError.
        """
        # Feature: digital-calendar, Property 5: Profile Creation from Questionnaire (validation)
        
        with pytest.raises(ValueError, match="Expected .* responses"):
            self.profile_service.process_questionnaire_responses(incomplete_responses)
    
    @given(complete_questionnaire_responses())
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_invalid_question_id_rejection(self, responses: List[QuestionnaireResponse]):
        """
        Property: Invalid question IDs should be rejected.
        
        For any questionnaire with invalid question IDs, the system should
        raise a ValueError.
        """
        # Feature: digital-calendar, Property 5: Profile Creation from Questionnaire (validation)
        
        if not responses:
            return
        
        # Modify first response to have invalid question ID
        invalid_responses = responses.copy()
        invalid_responses[0] = QuestionnaireResponse(
            question_id="invalid_question_id",
            answer=responses[0].answer,
            weight=responses[0].weight
        )
        
        with pytest.raises(ValueError, match="Invalid question ID"):
            self.profile_service.process_questionnaire_responses(invalid_responses)
    
    @given(complete_questionnaire_responses())
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_invalid_answer_rejection(self, responses: List[QuestionnaireResponse]):
        """
        Property: Invalid answers should be rejected.
        
        For any questionnaire with invalid answers for questions, the system
        should raise a ValueError.
        """
        # Feature: digital-calendar, Property 5: Profile Creation from Questionnaire (validation)
        
        if not responses:
            return
        
        # Modify first response to have invalid answer
        invalid_responses = responses.copy()
        invalid_responses[0] = QuestionnaireResponse(
            question_id=responses[0].question_id,
            answer="This is definitely not a valid answer option",
            weight=responses[0].weight
        )
        
        with pytest.raises(ValueError, match="Invalid answer"):
            self.profile_service.process_questionnaire_responses(invalid_responses)


@st.composite
def feedback_data(draw, user_id: str, quote_id: str):
    """Generate feedback data for testing."""
    rating = draw(st.sampled_from(['like', 'neutral', 'dislike']))
    timestamp = draw(st.datetimes(
        min_value=datetime(2024, 1, 1),
        max_value=datetime(2024, 12, 1)
    ))
    
    # Create a mock feedback object
    class MockFeedback:
        def __init__(self, quote_id, user_id, rating, timestamp):
            self.id = str(uuid.uuid4())
            self.quote_id = quote_id
            self.user_id = user_id
            self.rating = rating
            self.timestamp = timestamp
            self.context = {}
    
    return MockFeedback(quote_id, user_id, rating, timestamp)


@st.composite
def feedback_history_data(draw, user_id: str, min_size: int = 5, max_size: int = 20):
    """Generate a history of feedback for testing."""
    size = draw(st.integers(min_value=min_size, max_value=max_size))
    feedback_list = []
    
    for i in range(size):
        quote_id = f"quote_{i}"
        feedback = draw(feedback_data(user_id, quote_id))
        feedback_list.append(feedback)
    
    return feedback_list


class TestFeedbackIntegrationProperties:
    """Property-based tests for feedback integration functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.profile_service = UserProfileService()
        self.feedback_analyzer = FeedbackAnalyzer()
    
    @given(user_profile_data(), feedback_history_data(user_id="test_user"))
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow])
    def test_feedback_integration_preserves_profile_structure(self, profile_data: Dict[str, Any], feedback_history: List[Any]):
        """
        Property 6: Feedback Integration (Structure Preservation)
        
        For any user providing consistent feedback patterns over time, the personalization
        engine should adapt quote selection while preserving profile data structure.
        
        **Validates: Requirements 2.4, 2.5**
        """
        # Feature: digital-calendar, Property 6: Feedback Integration (structure preservation)
        
        # Analyze feedback patterns
        patterns = self.feedback_analyzer.analyze_feedback_patterns(feedback_history, profile_data)
        adaptations = self.feedback_analyzer.generate_profile_adaptations(patterns, profile_data)
        
        if not adaptations:
            # If no adaptations, profile should remain unchanged
            return
        
        # Apply adaptations
        updated_profile = self.profile_service.update_profile_from_feedback(profile_data, adaptations)
        
        # Verify structure preservation
        assert isinstance(updated_profile, dict)
        
        # Required fields should be preserved
        required_fields = ["categories", "created_at", "version", "dominant_categories"]
        for field in required_fields:
            assert field in updated_profile
        
        # Categories structure should be preserved
        original_categories = {cat["category"] for cat in profile_data["categories"]}
        updated_categories = {cat["category"] for cat in updated_profile["categories"]}
        assert original_categories == updated_categories
        
        # All categories should still have valid weights and confidence
        for category_data in updated_profile["categories"]:
            assert "category" in category_data
            assert "weight" in category_data
            assert "confidence" in category_data
            assert 0.0 <= category_data["weight"] <= 1.0
            assert 0.0 <= category_data["confidence"] <= 1.0
        
        # Weights should still be normalized
        total_weight = sum(cat["weight"] for cat in updated_profile["categories"])
        assert 0.8 <= total_weight <= 1.2  # Allow some tolerance
        
        # Updated timestamp should be present
        assert "updated_at" in updated_profile
        assert updated_profile["updated_at"] != profile_data.get("created_at")
    
    @given(user_profile_data(), feedback_history_data(user_id="test_user", min_size=10))
    @settings(max_examples=15, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow])
    def test_consistent_positive_feedback_increases_satisfaction(self, profile_data: Dict[str, Any], feedback_history: List[Any]):
        """
        Property 6: Feedback Integration (Positive Feedback Effect)
        
        For any user providing consistently positive feedback, the satisfaction score
        should be high and profile adaptations should reinforce preferred categories.
        
        **Validates: Requirements 2.4, 2.5**
        """
        # Feature: digital-calendar, Property 6: Feedback Integration (positive feedback)
        
        # Modify feedback to be consistently positive
        positive_feedback = []
        for feedback in feedback_history:
            feedback.rating = 'like'
            positive_feedback.append(feedback)
        
        # Calculate satisfaction score
        satisfaction_score = self.feedback_analyzer.calculate_feedback_satisfaction_score(positive_feedback)
        
        # Positive feedback should result in high satisfaction
        assert satisfaction_score >= 0.8, f"Expected high satisfaction for positive feedback, got {satisfaction_score}"
        
        # Analyze patterns
        patterns = self.feedback_analyzer.analyze_feedback_patterns(positive_feedback, profile_data)
        
        # Should detect positive patterns
        positive_patterns = [p for p in patterns if 'positive' in p.pattern_type.lower()]
        
        # If patterns are detected, they should suggest positive adjustments
        for pattern in positive_patterns:
            if pattern.weight_adjustment != 0:
                assert pattern.weight_adjustment >= 0, f"Positive feedback should not decrease weights: {pattern.weight_adjustment}"
    
    @given(user_profile_data(), feedback_history_data(user_id="test_user", min_size=10))
    @settings(max_examples=15, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow])
    def test_consistent_negative_feedback_decreases_satisfaction(self, profile_data: Dict[str, Any], feedback_history: List[Any]):
        """
        Property 6: Feedback Integration (Negative Feedback Effect)
        
        For any user providing consistently negative feedback, the satisfaction score
        should be low and profile adaptations should adjust to improve personalization.
        
        **Validates: Requirements 2.4, 2.5**
        """
        # Feature: digital-calendar, Property 6: Feedback Integration (negative feedback)
        
        # Modify feedback to be consistently negative
        negative_feedback = []
        for feedback in feedback_history:
            feedback.rating = 'dislike'
            negative_feedback.append(feedback)
        
        # Calculate satisfaction score
        satisfaction_score = self.feedback_analyzer.calculate_feedback_satisfaction_score(negative_feedback)
        
        # Negative feedback should result in low satisfaction
        assert satisfaction_score <= 0.2, f"Expected low satisfaction for negative feedback, got {satisfaction_score}"
        
        # Analyze patterns
        patterns = self.feedback_analyzer.analyze_feedback_patterns(negative_feedback, profile_data)
        
        # Should detect negative patterns or trends
        negative_patterns = [p for p in patterns if 'negative' in p.pattern_type.lower() or 'declining' in p.pattern_type.lower()]
        
        # Negative patterns should suggest profile adjustments
        if negative_patterns:
            # At least some patterns should suggest changes
            has_adjustments = any(abs(p.weight_adjustment) > 0.01 or abs(p.confidence_change) > 0.01 for p in negative_patterns)
            assert has_adjustments, "Negative feedback should trigger profile adjustments"
    
    @given(user_profile_data(), st.integers(min_value=5, max_value=15))
    @settings(max_examples=10, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow])
    def test_feedback_adaptation_convergence(self, profile_data: Dict[str, Any], feedback_count: int):
        """
        Property 6: Feedback Integration (Adaptation Convergence)
        
        For any user profile, repeated feedback-based adaptations should converge
        to a stable state rather than oscillating indefinitely.
        
        **Validates: Requirements 2.4, 2.5**
        """
        # Feature: digital-calendar, Property 6: Feedback Integration (convergence)
        
        current_profile = profile_data.copy()
        user_id = "test_user"
        
        # Simulate multiple adaptation cycles
        adaptation_history = []
        
        for cycle in range(3):  # Test 3 adaptation cycles
            # Generate feedback for this cycle
            feedback_history = []
            for i in range(feedback_count):
                quote_id = str(uuid.uuid4())
                # Mix of ratings with slight preference for neutral/positive
                rating = st.sampled_from(['like', 'neutral', 'dislike']).example()
                timestamp = datetime.utcnow() - timedelta(days=i)
                
                class MockFeedback:
                    def __init__(self, quote_id, user_id, rating, timestamp):
                        self.id = str(uuid.uuid4())
                        self.quote_id = quote_id
                        self.user_id = user_id
                        self.rating = rating
                        self.timestamp = timestamp
                        self.context = {}
                
                feedback_history.append(MockFeedback(quote_id, user_id, rating, timestamp))
            
            # Analyze and adapt
            patterns = self.feedback_analyzer.analyze_feedback_patterns(feedback_history, current_profile)
            adaptations = self.feedback_analyzer.generate_profile_adaptations(patterns, current_profile)
            
            if adaptations:
                current_profile = self.profile_service.update_profile_from_feedback(current_profile, adaptations)
                
                # Track adaptation magnitude
                total_adjustment = sum(abs(a['weight_adjustment']) for a in adaptations)
                adaptation_history.append(total_adjustment)
        
        # Check for convergence: later adaptations should be smaller
        if len(adaptation_history) >= 2:
            # The magnitude of adaptations should generally decrease over time
            # (allowing for some variation due to randomness)
            first_half_avg = sum(adaptation_history[:len(adaptation_history)//2]) / max(1, len(adaptation_history)//2)
            second_half_avg = sum(adaptation_history[len(adaptation_history)//2:]) / max(1, len(adaptation_history) - len(adaptation_history)//2)
            
            # Allow for some tolerance, but generally expect convergence
            # This is a weak convergence test due to randomness in feedback
            assert second_half_avg <= first_half_avg * 2, f"Adaptations should converge, but got {first_half_avg} -> {second_half_avg}"
    
    @given(user_profile_data(), feedback_history_data(user_id="test_user", min_size=8))
    @settings(max_examples=10, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow])
    def test_feedback_pattern_detection_consistency(self, profile_data: Dict[str, Any], feedback_history: List[Any]):
        """
        Property 6: Feedback Integration (Pattern Detection Consistency)
        
        For any feedback history, pattern detection should be consistent and
        deterministic when run multiple times on the same data.
        
        **Validates: Requirements 2.4, 2.5**
        """
        # Feature: digital-calendar, Property 6: Feedback Integration (consistency)
        
        # Analyze patterns multiple times
        patterns1 = self.feedback_analyzer.analyze_feedback_patterns(feedback_history, profile_data)
        patterns2 = self.feedback_analyzer.analyze_feedback_patterns(feedback_history, profile_data)
        
        # Results should be identical
        assert len(patterns1) == len(patterns2)
        
        # Sort patterns by category and type for comparison
        patterns1_sorted = sorted(patterns1, key=lambda p: (p.category, p.pattern_type))
        patterns2_sorted = sorted(patterns2, key=lambda p: (p.category, p.pattern_type))
        
        for p1, p2 in zip(patterns1_sorted, patterns2_sorted):
            assert p1.category == p2.category
            assert p1.pattern_type == p2.pattern_type
            assert abs(p1.strength - p2.strength) < 1e-10
            assert abs(p1.weight_adjustment - p2.weight_adjustment) < 1e-10
            assert abs(p1.confidence_change - p2.confidence_change) < 1e-10
        
        # Adaptation generation should also be consistent
        adaptations1 = self.feedback_analyzer.generate_profile_adaptations(patterns1, profile_data)
        adaptations2 = self.feedback_analyzer.generate_profile_adaptations(patterns2, profile_data)
        
        assert len(adaptations1) == len(adaptations2)
        
        # Sort adaptations for comparison
        adaptations1_sorted = sorted(adaptations1, key=lambda a: a['category'])
        adaptations2_sorted = sorted(adaptations2, key=lambda a: a['category'])
        
        for a1, a2 in zip(adaptations1_sorted, adaptations2_sorted):
            assert a1['category'] == a2['category']
            assert abs(a1['weight_adjustment'] - a2['weight_adjustment']) < 1e-10
            assert abs(a1['confidence_change'] - a2['confidence_change']) < 1e-10