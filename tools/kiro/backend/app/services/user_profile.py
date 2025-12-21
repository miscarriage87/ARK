"""
User Profile Service for ARK Digital Calendar.

This module provides services for user profile management, including
questionnaire processing, personality category weighting, and profile creation.
"""

from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class PersonalityCategory(Enum):
    """Personality categories for user profiling."""
    SPIRITUALITY = "spirituality"
    SPORT = "sport"
    EDUCATION = "education"
    HEALTH = "health"
    HUMOR = "humor"
    PHILOSOPHY = "philosophy"


@dataclass
class QuestionnaireResponse:
    """Represents a single questionnaire response."""
    question_id: str
    answer: str
    weight: float = 1.0  # Weight of this response in profile calculation


@dataclass
class PersonalityCategoryWeight:
    """Represents a personality category with its weight and confidence."""
    category: PersonalityCategory
    weight: float  # 0.0 to 1.0
    confidence: float  # How confident we are in this assessment


class UserProfileService:
    """
    Service for managing user profiles and personality assessment.
    
    Handles questionnaire processing, personality category weighting,
    and profile creation/updates.
    """
    
    # Predefined questionnaire with category mappings
    QUESTIONNAIRE = [
        {
            "id": "q1",
            "question": "What type of content inspires you most in the morning?",
            "options": [
                {"answer": "Spiritual reflections and mindfulness", "categories": {"spirituality": 0.8, "philosophy": 0.3}},
                {"answer": "Motivational fitness and health tips", "categories": {"sport": 0.7, "health": 0.6}},
                {"answer": "Learning opportunities and growth mindset", "categories": {"education": 0.8, "philosophy": 0.2}},
                {"answer": "Wellness and self-care reminders", "categories": {"health": 0.8, "spirituality": 0.2}},
                {"answer": "Light-hearted humor and positivity", "categories": {"humor": 0.9}},
                {"answer": "Deep philosophical thoughts", "categories": {"philosophy": 0.9, "spirituality": 0.1}}
            ]
        },
        {
            "id": "q2", 
            "question": "How do you prefer to approach challenges?",
            "options": [
                {"answer": "Through meditation and inner reflection", "categories": {"spirituality": 0.7, "philosophy": 0.3}},
                {"answer": "With physical activity and movement", "categories": {"sport": 0.8, "health": 0.4}},
                {"answer": "By learning new skills and knowledge", "categories": {"education": 0.8}},
                {"answer": "With a focus on mental and physical wellness", "categories": {"health": 0.7, "spirituality": 0.2}},
                {"answer": "By finding the humor in difficult situations", "categories": {"humor": 0.8, "philosophy": 0.1}},
                {"answer": "Through careful analysis and reasoning", "categories": {"philosophy": 0.7, "education": 0.3}}
            ]
        },
        {
            "id": "q3",
            "question": "What kind of wisdom resonates with you?",
            "options": [
                {"answer": "Ancient spiritual teachings and practices", "categories": {"spirituality": 0.9, "philosophy": 0.2}},
                {"answer": "Sports psychology and peak performance", "categories": {"sport": 0.6, "education": 0.3, "health": 0.2}},
                {"answer": "Educational insights and learning strategies", "categories": {"education": 0.8, "philosophy": 0.2}},
                {"answer": "Holistic health and wellness principles", "categories": {"health": 0.8, "spirituality": 0.3}},
                {"answer": "Witty observations about life", "categories": {"humor": 0.8, "philosophy": 0.3}},
                {"answer": "Philosophical principles and ethics", "categories": {"philosophy": 0.9, "education": 0.1}}
            ]
        },
        {
            "id": "q4",
            "question": "What motivates you to start your day?",
            "options": [
                {"answer": "Connection with something greater than myself", "categories": {"spirituality": 0.8, "philosophy": 0.2}},
                {"answer": "Physical energy and movement goals", "categories": {"sport": 0.7, "health": 0.5}},
                {"answer": "Curiosity and desire to learn something new", "categories": {"education": 0.8, "philosophy": 0.1}},
                {"answer": "Taking care of my mind and body", "categories": {"health": 0.8, "spirituality": 0.1}},
                {"answer": "Finding joy and laughter in everyday moments", "categories": {"humor": 0.9}},
                {"answer": "Contemplating life's deeper meanings", "categories": {"philosophy": 0.8, "spirituality": 0.3}}
            ]
        },
        {
            "id": "q5",
            "question": "How do you define personal growth?",
            "options": [
                {"answer": "Spiritual development and inner peace", "categories": {"spirituality": 0.9, "philosophy": 0.1}},
                {"answer": "Physical fitness and athletic achievement", "categories": {"sport": 0.8, "health": 0.4}},
                {"answer": "Continuous learning and skill development", "categories": {"education": 0.9}},
                {"answer": "Overall wellness and life balance", "categories": {"health": 0.7, "spirituality": 0.2, "philosophy": 0.1}},
                {"answer": "Maintaining a positive, humorous outlook", "categories": {"humor": 0.7, "philosophy": 0.2}},
                {"answer": "Understanding myself and the world better", "categories": {"philosophy": 0.8, "education": 0.3, "spirituality": 0.2}}
            ]
        }
    ]
    
    def __init__(self):
        """Initialize the UserProfileService."""
        pass
    
    def get_questionnaire(self) -> List[Dict[str, Any]]:
        """
        Get the standard questionnaire for user profiling.
        
        Returns:
            List of questionnaire items with questions and options
        """
        # Return questionnaire without category mappings for frontend
        return [
            {
                "id": item["id"],
                "question": item["question"],
                "options": [opt["answer"] for opt in item["options"]]
            }
            for item in self.QUESTIONNAIRE
        ]
    
    def process_questionnaire_responses(self, responses: List[QuestionnaireResponse]) -> List[PersonalityCategoryWeight]:
        """
        Process questionnaire responses to generate personality category weights.
        
        Args:
            responses: List of questionnaire responses
            
        Returns:
            List of personality category weights with confidence scores
            
        Raises:
            ValueError: If responses are invalid or incomplete
        """
        if not responses:
            raise ValueError("No questionnaire responses provided")
        
        if len(responses) != len(self.QUESTIONNAIRE):
            raise ValueError(f"Expected {len(self.QUESTIONNAIRE)} responses, got {len(responses)}")
        
        # Initialize category scores
        category_scores = {category: 0.0 for category in PersonalityCategory}
        total_weight = 0.0
        
        # Process each response
        for response in responses:
            question_item = self._find_question_by_id(response.question_id)
            if not question_item:
                raise ValueError(f"Invalid question ID: {response.question_id}")
            
            option_data = self._find_option_by_answer(question_item, response.answer)
            if not option_data:
                raise ValueError(f"Invalid answer for question {response.question_id}: {response.answer}")
            
            # Add weighted scores for each category
            for category_name, score in option_data["categories"].items():
                category = PersonalityCategory(category_name)
                category_scores[category] += score * response.weight
                total_weight += response.weight
        
        # Calculate confidence based on response consistency
        confidence_scores = self._calculate_confidence_scores(responses)
        
        # Create personality category weights (don't normalize yet)
        personality_weights = []
        for category, score in category_scores.items():
            confidence = confidence_scores.get(category, 0.5)  # Default confidence
            
            personality_weights.append(PersonalityCategoryWeight(
                category=category,
                weight=score,  # Use raw score first
                confidence=confidence
            ))
        
        # Normalize weights so they sum to 1.0
        total_score = sum(weight.weight for weight in personality_weights)
        if total_score == 0:
            # If no scores, distribute equally
            equal_weight = 1.0 / len(personality_weights)
            for weight in personality_weights:
                weight.weight = equal_weight
        else:
            # Normalize to sum to 1.0
            for weight in personality_weights:
                weight.weight = weight.weight / total_score
        
        # Sort by weight (highest first)
        personality_weights.sort(key=lambda x: x.weight, reverse=True)
        
        logger.info(f"Processed questionnaire responses: {len(responses)} responses, {len(personality_weights)} categories")
        return personality_weights
    
    def create_user_profile_data(self, personality_weights: List[PersonalityCategoryWeight]) -> Dict[str, Any]:
        """
        Create user profile data structure from personality weights.
        
        Args:
            personality_weights: List of personality category weights
            
        Returns:
            Dictionary containing user profile data for database storage
        """
        personality_data = {
            "categories": [
                {
                    "category": weight.category.value,
                    "weight": weight.weight,
                    "confidence": weight.confidence
                }
                for weight in personality_weights
            ],
            "created_at": datetime.utcnow().isoformat(),
            "version": "1.0"
        }
        
        # Calculate dominant categories (top 3)
        dominant_categories = [
            weight.category.value 
            for weight in personality_weights[:3] 
            if weight.weight > 0.1  # Only include categories with meaningful weight
        ]
        
        personality_data["dominant_categories"] = dominant_categories
        
        logger.info(f"Created user profile data with {len(personality_weights)} categories, dominant: {dominant_categories}")
        return personality_data
    
    def update_profile_from_feedback(self, current_profile: Dict[str, Any], feedback_patterns: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Update user profile based on feedback patterns.
        
        Args:
            current_profile: Current user profile data
            feedback_patterns: List of feedback pattern analysis
            
        Returns:
            Updated profile data
        """
        if not current_profile or "categories" not in current_profile:
            raise ValueError("Invalid current profile data")
        
        # Create a copy of current profile
        updated_profile = current_profile.copy()
        categories = {cat["category"]: cat for cat in updated_profile["categories"]}
        
        # Process feedback patterns to adjust weights
        for pattern in feedback_patterns:
            category_name = pattern.get("category")
            adjustment = pattern.get("weight_adjustment", 0.0)
            confidence_change = pattern.get("confidence_change", 0.0)
            
            if category_name in categories:
                # Adjust weight (with bounds checking)
                current_weight = categories[category_name]["weight"]
                new_weight = max(0.0, min(1.0, current_weight + adjustment))
                categories[category_name]["weight"] = new_weight
                
                # Adjust confidence
                current_confidence = categories[category_name]["confidence"]
                new_confidence = max(0.0, min(1.0, current_confidence + confidence_change))
                categories[category_name]["confidence"] = new_confidence
        
        # Renormalize weights to ensure they sum appropriately
        total_weight = sum(cat["weight"] for cat in categories.values())
        if total_weight > 0:
            for cat in categories.values():
                cat["weight"] = cat["weight"] / total_weight
        else:
            # If all weights are zero, distribute equally
            equal_weight = 1.0 / len(categories)
            for cat in categories.values():
                cat["weight"] = equal_weight
        
        # Update categories list
        updated_profile["categories"] = list(categories.values())
        updated_profile["updated_at"] = datetime.utcnow().isoformat()
        
        # Recalculate dominant categories
        sorted_categories = sorted(categories.items(), key=lambda x: x[1]["weight"], reverse=True)
        updated_profile["dominant_categories"] = [
            cat_name for cat_name, cat_data in sorted_categories[:3] 
            if cat_data["weight"] > 0.1
        ]
        
        logger.info(f"Updated user profile from feedback patterns: {len(feedback_patterns)} patterns processed")
        return updated_profile
    
    def _find_question_by_id(self, question_id: str) -> Optional[Dict[str, Any]]:
        """Find questionnaire item by ID."""
        for item in self.QUESTIONNAIRE:
            if item["id"] == question_id:
                return item
        return None
    
    def _find_option_by_answer(self, question_item: Dict[str, Any], answer: str) -> Optional[Dict[str, Any]]:
        """Find option data by answer text."""
        for option in question_item["options"]:
            if option["answer"] == answer:
                return option
        return None
    
    def _calculate_confidence_scores(self, responses: List[QuestionnaireResponse]) -> Dict[PersonalityCategory, float]:
        """
        Calculate confidence scores for each category based on response consistency.
        
        Args:
            responses: List of questionnaire responses
            
        Returns:
            Dictionary mapping categories to confidence scores
        """
        category_mentions = {category: 0 for category in PersonalityCategory}
        total_responses = len(responses)
        
        # Count how often each category appears in responses
        for response in responses:
            question_item = self._find_question_by_id(response.question_id)
            if question_item:
                option_data = self._find_option_by_answer(question_item, response.answer)
                if option_data:
                    for category_name in option_data["categories"]:
                        category = PersonalityCategory(category_name)
                        category_mentions[category] += 1
        
        # Calculate confidence based on consistency
        confidence_scores = {}
        for category, mentions in category_mentions.items():
            # Higher confidence for categories mentioned more consistently
            consistency_ratio = mentions / total_responses
            # Base confidence of 0.3, up to 1.0 for categories mentioned in all responses
            confidence = 0.3 + (0.7 * consistency_ratio)
            confidence_scores[category] = confidence
        
        return confidence_scores