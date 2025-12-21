"""
Profile Adaptation Service for ARK Digital Calendar.

This module provides services for adapting user profiles based on feedback patterns,
integrating feedback analysis with profile updates for improved personalization.
"""

from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import logging

from app.models.quote import Feedback
from app.services.user_profile import UserProfileService, PersonalityCategory
from app.services.feedback_analyzer import FeedbackAnalyzer, FeedbackPattern
from app.repositories.user_repository import UserRepository
from app.repositories.quote_repository import FeedbackRepository

logger = logging.getLogger(__name__)


@dataclass
class AdaptationResult:
    """Result of profile adaptation process."""
    success: bool
    adaptations_applied: int
    satisfaction_improvement: float
    updated_profile: Optional[Dict[str, Any]]
    adaptation_summary: List[str]
    error_message: Optional[str] = None


class ProfileAdaptationService:
    """
    Service for adapting user profiles based on feedback patterns.
    
    Coordinates between feedback analysis and profile updates to continuously
    improve personalization based on user preferences and satisfaction.
    """
    
    def __init__(self):
        """Initialize the ProfileAdaptationService."""
        self.profile_service = UserProfileService()
        self.feedback_analyzer = FeedbackAnalyzer()
        self.min_feedback_for_adaptation = 10  # Minimum feedback needed for adaptation
        self.adaptation_cooldown_days = 7  # Days between adaptations
        self.max_adaptations_per_session = 5  # Maximum adaptations per session
    
    def should_adapt_profile(self, user_id: str, user_profile: Dict[str, Any], feedback_history: List[Feedback]) -> Tuple[bool, str]:
        """
        Determine if a user profile should be adapted based on feedback patterns.
        
        Args:
            user_id: User identifier
            user_profile: Current user profile data
            feedback_history: User's feedback history
            
        Returns:
            Tuple of (should_adapt, reason)
        """
        if len(feedback_history) < self.min_feedback_for_adaptation:
            return False, f"Insufficient feedback: {len(feedback_history)} < {self.min_feedback_for_adaptation}"
        
        # Check if enough time has passed since last adaptation
        last_updated = user_profile.get("updated_at")
        if last_updated:
            try:
                last_update_time = datetime.fromisoformat(last_updated.replace('Z', '+00:00'))
                time_since_update = datetime.utcnow() - last_update_time.replace(tzinfo=None)
                
                if time_since_update.days < self.adaptation_cooldown_days:
                    return False, f"Adaptation cooldown: {time_since_update.days} < {self.adaptation_cooldown_days} days"
            except (ValueError, AttributeError):
                # If we can't parse the date, proceed with adaptation
                pass
        
        # Check satisfaction score
        satisfaction_score = self.feedback_analyzer.calculate_feedback_satisfaction_score(feedback_history)
        
        # Adapt if satisfaction is low or if there are strong patterns
        if satisfaction_score < 0.4:
            return True, f"Low satisfaction score: {satisfaction_score:.2f}"
        
        # Check for strong feedback patterns
        patterns = self.feedback_analyzer.analyze_feedback_patterns(feedback_history, user_profile)
        strong_patterns = [p for p in patterns if p.strength > 0.7]
        
        if len(strong_patterns) >= 2:
            return True, f"Strong feedback patterns detected: {len(strong_patterns)} patterns"
        
        # Check for recent negative trends
        recent_feedback = [f for f in feedback_history if f.timestamp >= datetime.utcnow() - timedelta(days=14)]
        if len(recent_feedback) >= 5:
            recent_satisfaction = self.feedback_analyzer.calculate_feedback_satisfaction_score(recent_feedback)
            overall_satisfaction = satisfaction_score
            
            if recent_satisfaction < overall_satisfaction - 0.2:
                return True, f"Recent satisfaction decline: {recent_satisfaction:.2f} vs {overall_satisfaction:.2f}"
        
        return False, "No adaptation needed"
    
    def adapt_user_profile(self, user_id: str, user_repo: UserRepository, feedback_repo: FeedbackRepository) -> AdaptationResult:
        """
        Perform comprehensive profile adaptation for a user.
        
        Args:
            user_id: User identifier
            user_repo: User repository instance
            feedback_repo: Feedback repository instance
            
        Returns:
            AdaptationResult with details of the adaptation process
        """
        try:
            # Get user and feedback data
            user = user_repo.get_by_id(user_id)
            if not user or not user.personality_data:
                return AdaptationResult(
                    success=False,
                    adaptations_applied=0,
                    satisfaction_improvement=0.0,
                    updated_profile=None,
                    adaptation_summary=[],
                    error_message="User or profile data not found"
                )
            
            feedback_history = feedback_repo.get_user_feedback(user_id, limit=200)
            
            # Check if adaptation is needed
            should_adapt, reason = self.should_adapt_profile(user_id, user.personality_data, feedback_history)
            if not should_adapt:
                return AdaptationResult(
                    success=True,
                    adaptations_applied=0,
                    satisfaction_improvement=0.0,
                    updated_profile=user.personality_data,
                    adaptation_summary=[f"No adaptation needed: {reason}"],
                    error_message=None
                )
            
            # Calculate baseline satisfaction
            baseline_satisfaction = self.feedback_analyzer.calculate_feedback_satisfaction_score(feedback_history)
            
            # Analyze feedback patterns
            patterns = self.feedback_analyzer.analyze_feedback_patterns(feedback_history, user.personality_data)
            adaptations = self.feedback_analyzer.generate_profile_adaptations(patterns, user.personality_data)
            
            if not adaptations:
                return AdaptationResult(
                    success=True,
                    adaptations_applied=0,
                    satisfaction_improvement=0.0,
                    updated_profile=user.personality_data,
                    adaptation_summary=["No adaptations generated from feedback patterns"],
                    error_message=None
                )
            
            # Limit adaptations per session
            adaptations = adaptations[:self.max_adaptations_per_session]
            
            # Apply adaptations to profile
            updated_profile = self.profile_service.update_profile_from_feedback(
                user.personality_data, adaptations
            )
            
            # Update user in database
            updated_user = user_repo.update_personality_data(user_id, updated_profile)
            if not updated_user:
                return AdaptationResult(
                    success=False,
                    adaptations_applied=0,
                    satisfaction_improvement=0.0,
                    updated_profile=None,
                    adaptation_summary=[],
                    error_message="Failed to update user profile in database"
                )
            
            # Generate adaptation summary
            adaptation_summary = self._generate_adaptation_summary(adaptations, patterns, baseline_satisfaction)
            
            # Estimate satisfaction improvement (this is a projection)
            estimated_improvement = self._estimate_satisfaction_improvement(adaptations, baseline_satisfaction)
            
            logger.info(f"Profile adapted for user {user_id}: {len(adaptations)} adaptations applied")
            
            return AdaptationResult(
                success=True,
                adaptations_applied=len(adaptations),
                satisfaction_improvement=estimated_improvement,
                updated_profile=updated_profile,
                adaptation_summary=adaptation_summary,
                error_message=None
            )
            
        except Exception as e:
            logger.error(f"Error adapting user profile {user_id}: {e}")
            return AdaptationResult(
                success=False,
                adaptations_applied=0,
                satisfaction_improvement=0.0,
                updated_profile=None,
                adaptation_summary=[],
                error_message=str(e)
            )
    
    def batch_adapt_profiles(self, user_repo: UserRepository, feedback_repo: FeedbackRepository, limit: int = 50) -> Dict[str, Any]:
        """
        Perform batch profile adaptation for multiple users.
        
        Args:
            user_repo: User repository instance
            feedback_repo: Feedback repository instance
            limit: Maximum number of users to process
            
        Returns:
            Summary of batch adaptation results
        """
        try:
            # Get active users with recent feedback
            active_users = user_repo.get_active_users(limit=limit * 2)  # Get more to filter
            
            adaptation_results = []
            processed_count = 0
            
            for user in active_users:
                if processed_count >= limit:
                    break
                
                # Check if user has recent feedback
                recent_feedback = feedback_repo.get_user_feedback(user.id, limit=10)
                if len(recent_feedback) < 5:
                    continue  # Skip users with insufficient recent feedback
                
                # Perform adaptation
                result = self.adapt_user_profile(user.id, user_repo, feedback_repo)
                adaptation_results.append({
                    'user_id': user.id,
                    'result': result
                })
                processed_count += 1
            
            # Generate batch summary
            successful_adaptations = [r for r in adaptation_results if r['result'].success]
            failed_adaptations = [r for r in adaptation_results if not r['result'].success]
            total_adaptations_applied = sum(r['result'].adaptations_applied for r in successful_adaptations)
            average_improvement = sum(r['result'].satisfaction_improvement for r in successful_adaptations) / len(successful_adaptations) if successful_adaptations else 0.0
            
            batch_summary = {
                'processed_users': processed_count,
                'successful_adaptations': len(successful_adaptations),
                'failed_adaptations': len(failed_adaptations),
                'total_adaptations_applied': total_adaptations_applied,
                'average_satisfaction_improvement': average_improvement,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            logger.info(f"Batch profile adaptation completed: {processed_count} users processed, {len(successful_adaptations)} successful")
            
            return batch_summary
            
        except Exception as e:
            logger.error(f"Error in batch profile adaptation: {e}")
            return {
                'error': str(e),
                'processed_users': 0,
                'successful_adaptations': 0,
                'failed_adaptations': 0,
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def _generate_adaptation_summary(self, adaptations: List[Dict[str, Any]], patterns: List[FeedbackPattern], baseline_satisfaction: float) -> List[str]:
        """Generate human-readable summary of adaptations applied."""
        summary = []
        
        summary.append(f"Baseline satisfaction: {baseline_satisfaction:.2f}")
        summary.append(f"Patterns analyzed: {len(patterns)}")
        summary.append(f"Adaptations applied: {len(adaptations)}")
        
        for adaptation in adaptations:
            category = adaptation['category']
            weight_adj = adaptation['weight_adjustment']
            confidence_adj = adaptation['confidence_change']
            
            if abs(weight_adj) > 0.05:
                direction = "increased" if weight_adj > 0 else "decreased"
                summary.append(f"Category '{category}' weight {direction} by {abs(weight_adj):.2f}")
            
            if abs(confidence_adj) > 0.02:
                direction = "increased" if confidence_adj > 0 else "decreased"
                summary.append(f"Category '{category}' confidence {direction} by {abs(confidence_adj):.2f}")
        
        return summary
    
    def _estimate_satisfaction_improvement(self, adaptations: List[Dict[str, Any]], baseline_satisfaction: float) -> float:
        """Estimate potential satisfaction improvement from adaptations."""
        # This is a heuristic estimation based on adaptation strength
        total_adjustment = sum(abs(a['weight_adjustment']) for a in adaptations)
        confidence_adjustment = sum(abs(a['confidence_change']) for a in adaptations)
        
        # Estimate improvement based on adaptation magnitude
        # More significant adaptations should lead to better satisfaction
        estimated_improvement = (total_adjustment * 0.3) + (confidence_adjustment * 0.2)
        
        # Cap the improvement estimate
        estimated_improvement = min(estimated_improvement, 0.3)
        
        # If baseline satisfaction is already high, improvement potential is lower
        if baseline_satisfaction > 0.7:
            estimated_improvement *= 0.5
        
        return estimated_improvement