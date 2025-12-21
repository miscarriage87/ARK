"""
Feedback Analyzer Service for ARK Digital Calendar.

This module provides services for analyzing user feedback patterns
and generating profile adaptation recommendations.
"""

from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from datetime import datetime, timedelta
import logging
from collections import defaultdict, Counter

from app.models.quote import Feedback
from app.services.user_profile import PersonalityCategory

logger = logging.getLogger(__name__)


@dataclass
class FeedbackPattern:
    """Represents a detected feedback pattern."""
    category: str
    pattern_type: str  # 'positive_trend', 'negative_trend', 'consistent_preference'
    strength: float  # 0.0 to 1.0
    weight_adjustment: float  # Suggested weight adjustment (-0.2 to +0.2)
    confidence_change: float  # Suggested confidence change (-0.1 to +0.1)
    evidence: List[str]  # Supporting evidence for this pattern


class FeedbackAnalyzer:
    """
    Service for analyzing user feedback patterns and generating profile adaptations.
    
    Analyzes feedback history to identify trends, preferences, and areas for
    profile adjustment to improve personalization.
    """
    
    def __init__(self):
        """Initialize the FeedbackAnalyzer."""
        self.min_feedback_for_analysis = 5  # Minimum feedback items needed for analysis
        self.recent_feedback_days = 30  # Consider feedback from last 30 days as "recent"
    
    def analyze_feedback_patterns(self, feedback_history: List[Feedback], user_profile: Dict[str, Any]) -> List[FeedbackPattern]:
        """
        Analyze user feedback history to identify patterns and trends.
        
        Args:
            feedback_history: List of user feedback objects
            user_profile: Current user profile data
            
        Returns:
            List of detected feedback patterns with adaptation recommendations
        """
        if len(feedback_history) < self.min_feedback_for_analysis:
            logger.info(f"Insufficient feedback for analysis: {len(feedback_history)} items (minimum: {self.min_feedback_for_analysis})")
            return []
        
        patterns = []
        
        # Analyze rating trends over time
        patterns.extend(self._analyze_rating_trends(feedback_history))
        
        # Analyze category preferences based on quote themes
        patterns.extend(self._analyze_category_preferences(feedback_history, user_profile))
        
        # Analyze recent vs historical preferences
        patterns.extend(self._analyze_preference_shifts(feedback_history))
        
        # Analyze consistency patterns
        patterns.extend(self._analyze_consistency_patterns(feedback_history))
        
        logger.info(f"Analyzed feedback patterns: {len(feedback_history)} feedback items, {len(patterns)} patterns detected")
        return patterns
    
    def generate_profile_adaptations(self, patterns: List[FeedbackPattern], current_profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate profile adaptation recommendations based on feedback patterns.
        
        Args:
            patterns: List of detected feedback patterns
            current_profile: Current user profile data
            
        Returns:
            List of profile adaptation recommendations
        """
        if not patterns:
            return []
        
        adaptations = []
        
        # Group patterns by category
        category_patterns = defaultdict(list)
        for pattern in patterns:
            category_patterns[pattern.category].append(pattern)
        
        # Generate adaptations for each category
        for category, cat_patterns in category_patterns.items():
            adaptation = self._generate_category_adaptation(category, cat_patterns, current_profile)
            if adaptation:
                adaptations.append(adaptation)
        
        logger.info(f"Generated profile adaptations: {len(adaptations)} adaptations from {len(patterns)} patterns")
        return adaptations
    
    def calculate_feedback_satisfaction_score(self, feedback_history: List[Feedback]) -> float:
        """
        Calculate overall user satisfaction score based on feedback history.
        
        Args:
            feedback_history: List of user feedback objects
            
        Returns:
            Satisfaction score from 0.0 (very dissatisfied) to 1.0 (very satisfied)
        """
        if not feedback_history:
            return 0.5  # Neutral score for no feedback
        
        # Weight recent feedback more heavily
        cutoff_date = datetime.utcnow() - timedelta(days=self.recent_feedback_days)
        
        total_score = 0.0
        total_weight = 0.0
        
        for feedback in feedback_history:
            # Convert rating to numeric score
            if feedback.rating == 'like':
                score = 1.0
            elif feedback.rating == 'neutral':
                score = 0.5
            else:  # dislike
                score = 0.0
            
            # Apply time-based weighting (recent feedback weighted more)
            if feedback.timestamp >= cutoff_date:
                weight = 2.0  # Recent feedback gets double weight
            else:
                weight = 1.0
            
            total_score += score * weight
            total_weight += weight
        
        satisfaction_score = total_score / total_weight if total_weight > 0 else 0.5
        
        logger.info(f"Calculated satisfaction score: {satisfaction_score:.3f} from {len(feedback_history)} feedback items")
        return satisfaction_score
    
    def _analyze_rating_trends(self, feedback_history: List[Feedback]) -> List[FeedbackPattern]:
        """Analyze overall rating trends over time."""
        patterns = []
        
        # Sort feedback by timestamp
        sorted_feedback = sorted(feedback_history, key=lambda f: f.timestamp)
        
        # Split into early and recent periods
        mid_point = len(sorted_feedback) // 2
        early_feedback = sorted_feedback[:mid_point]
        recent_feedback = sorted_feedback[mid_point:]
        
        if len(early_feedback) < 2 or len(recent_feedback) < 2:
            return patterns
        
        # Calculate average scores for each period
        early_score = self._calculate_average_rating_score(early_feedback)
        recent_score = self._calculate_average_rating_score(recent_feedback)
        
        score_change = recent_score - early_score
        
        if abs(score_change) > 0.1:  # Significant change threshold
            if score_change > 0:
                pattern_type = 'positive_trend'
                evidence = [f"Rating improved from {early_score:.2f} to {recent_score:.2f}"]
            else:
                pattern_type = 'negative_trend'
                evidence = [f"Rating declined from {early_score:.2f} to {recent_score:.2f}"]
            
            patterns.append(FeedbackPattern(
                category='overall',
                pattern_type=pattern_type,
                strength=min(abs(score_change) * 2, 1.0),
                weight_adjustment=0.0,  # Overall trends don't adjust specific categories
                confidence_change=score_change * 0.1,  # Adjust overall confidence
                evidence=evidence
            ))
        
        return patterns
    
    def _analyze_category_preferences(self, feedback_history: List[Feedback], user_profile: Dict[str, Any]) -> List[FeedbackPattern]:
        """Analyze preferences for different personality categories based on quote themes."""
        patterns = []
        
        # Group feedback by quote themes/categories
        category_feedback = defaultdict(list)
        
        for feedback in feedback_history:
            # Extract category information from quote's personalization context
            if hasattr(feedback, 'quote') and feedback.quote and feedback.quote.personalization_context:
                context = feedback.quote.personalization_context
                dominant_categories = context.get('dominant_categories', [])
                
                for category in dominant_categories:
                    category_feedback[category].append(feedback)
        
        # Analyze each category's feedback
        for category, cat_feedback in category_feedback.items():
            if len(cat_feedback) < 3:  # Need minimum feedback for analysis
                continue
            
            avg_score = self._calculate_average_rating_score(cat_feedback)
            
            # Compare to overall average
            overall_avg = self._calculate_average_rating_score(feedback_history)
            score_difference = avg_score - overall_avg
            
            if abs(score_difference) > 0.15:  # Significant preference difference
                if score_difference > 0:
                    pattern_type = 'positive_preference'
                    weight_adjustment = min(score_difference * 0.3, 0.2)
                    evidence = [f"Category '{category}' rated {avg_score:.2f} vs overall {overall_avg:.2f}"]
                else:
                    pattern_type = 'negative_preference'
                    weight_adjustment = max(score_difference * 0.3, -0.2)
                    evidence = [f"Category '{category}' rated {avg_score:.2f} vs overall {overall_avg:.2f}"]
                
                patterns.append(FeedbackPattern(
                    category=category,
                    pattern_type=pattern_type,
                    strength=min(abs(score_difference) * 2, 1.0),
                    weight_adjustment=weight_adjustment,
                    confidence_change=abs(score_difference) * 0.05,
                    evidence=evidence
                ))
        
        return patterns
    
    def _analyze_preference_shifts(self, feedback_history: List[Feedback]) -> List[FeedbackPattern]:
        """Analyze shifts in preferences between recent and historical feedback."""
        patterns = []
        
        cutoff_date = datetime.utcnow() - timedelta(days=self.recent_feedback_days)
        recent_feedback = [f for f in feedback_history if f.timestamp >= cutoff_date]
        historical_feedback = [f for f in feedback_history if f.timestamp < cutoff_date]
        
        if len(recent_feedback) < 3 or len(historical_feedback) < 3:
            return patterns
        
        # Compare recent vs historical satisfaction
        recent_score = self._calculate_average_rating_score(recent_feedback)
        historical_score = self._calculate_average_rating_score(historical_feedback)
        
        score_shift = recent_score - historical_score
        
        if abs(score_shift) > 0.2:  # Significant shift threshold
            if score_shift > 0:
                pattern_type = 'improving_satisfaction'
                evidence = [f"Recent satisfaction ({recent_score:.2f}) improved from historical ({historical_score:.2f})"]
            else:
                pattern_type = 'declining_satisfaction'
                evidence = [f"Recent satisfaction ({recent_score:.2f}) declined from historical ({historical_score:.2f})"]
            
            patterns.append(FeedbackPattern(
                category='satisfaction_trend',
                pattern_type=pattern_type,
                strength=min(abs(score_shift) * 1.5, 1.0),
                weight_adjustment=0.0,
                confidence_change=score_shift * 0.05,
                evidence=evidence
            ))
        
        return patterns
    
    def _analyze_consistency_patterns(self, feedback_history: List[Feedback]) -> List[FeedbackPattern]:
        """Analyze consistency in user feedback patterns."""
        patterns = []
        
        # Calculate rating distribution
        rating_counts = Counter(f.rating for f in feedback_history)
        total_feedback = len(feedback_history)
        
        # Check for extreme consistency (too much of one rating)
        for rating, count in rating_counts.items():
            ratio = count / total_feedback
            
            if ratio > 0.8:  # Very high consistency (might indicate poor personalization)
                if rating == 'neutral':
                    pattern_type = 'excessive_neutrality'
                    evidence = [f"{ratio:.1%} of feedback is neutral - may indicate poor personalization"]
                    weight_adjustment = 0.0
                    confidence_change = -0.1  # Reduce confidence
                elif rating == 'like':
                    pattern_type = 'high_satisfaction'
                    evidence = [f"{ratio:.1%} of feedback is positive - good personalization"]
                    weight_adjustment = 0.0
                    confidence_change = 0.05  # Slight confidence boost
                else:  # dislike
                    pattern_type = 'high_dissatisfaction'
                    evidence = [f"{ratio:.1%} of feedback is negative - poor personalization"]
                    weight_adjustment = 0.0
                    confidence_change = -0.15  # Significant confidence reduction
                
                patterns.append(FeedbackPattern(
                    category='consistency',
                    pattern_type=pattern_type,
                    strength=ratio,
                    weight_adjustment=weight_adjustment,
                    confidence_change=confidence_change,
                    evidence=evidence
                ))
        
        return patterns
    
    def _generate_category_adaptation(self, category: str, patterns: List[FeedbackPattern], current_profile: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Generate adaptation recommendation for a specific category."""
        if not patterns:
            return None
        
        # Aggregate adjustments from all patterns for this category
        total_weight_adjustment = sum(p.weight_adjustment for p in patterns)
        total_confidence_change = sum(p.confidence_change for p in patterns)
        
        # Limit adjustments to reasonable bounds
        weight_adjustment = max(-0.2, min(0.2, total_weight_adjustment))
        confidence_change = max(-0.1, min(0.1, total_confidence_change))
        
        # Only create adaptation if adjustments are significant
        if abs(weight_adjustment) < 0.05 and abs(confidence_change) < 0.02:
            return None
        
        evidence = []
        for pattern in patterns:
            evidence.extend(pattern.evidence)
        
        return {
            'category': category,
            'weight_adjustment': weight_adjustment,
            'confidence_change': confidence_change,
            'patterns': [p.pattern_type for p in patterns],
            'evidence': evidence,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def _calculate_average_rating_score(self, feedback_list: List[Feedback]) -> float:
        """Calculate average numeric score from feedback ratings."""
        if not feedback_list:
            return 0.5
        
        total_score = 0.0
        for feedback in feedback_list:
            if feedback.rating == 'like':
                total_score += 1.0
            elif feedback.rating == 'neutral':
                total_score += 0.5
            else:  # dislike
                total_score += 0.0
        
        return total_score / len(feedback_list)