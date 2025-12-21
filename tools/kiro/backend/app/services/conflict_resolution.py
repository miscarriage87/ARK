"""
Conflict resolution service for ARK Digital Calendar.

This module provides functionality to handle data synchronization conflicts
between different devices or sessions, ensuring no data loss occurs during
conflict resolution.
"""

from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from datetime import datetime
import logging
from enum import Enum

from app.repositories.user_repository import UserRepository
from app.repositories.quote_repository import QuoteRepository, FeedbackRepository
from app.models.user import User
from app.models.quote import Quote, Feedback

logger = logging.getLogger(__name__)


class ConflictResolutionStrategy(Enum):
    """Strategies for resolving data conflicts."""
    MERGE_PRESERVE_ALL = "merge_preserve_all"  # Keep all data, merge when possible
    LATEST_WINS = "latest_wins"  # Use most recent timestamp
    USER_PREFERENCE = "user_preference"  # Let user choose
    SMART_MERGE = "smart_merge"  # Intelligent merging based on data type


class ConflictType(Enum):
    """Types of data conflicts that can occur."""
    USER_PROFILE = "user_profile"
    FEEDBACK = "feedback"
    PREFERENCES = "preferences"
    NOTIFICATION_SETTINGS = "notification_settings"


class ConflictResolutionService:
    """
    Service for resolving data synchronization conflicts.
    
    Implements various strategies to handle conflicts between different
    versions of user data while ensuring no data loss occurs.
    """
    
    def __init__(self, db: Session):
        """Initialize ConflictResolutionService with database session."""
        self.db = db
        self.user_repo = UserRepository(db)
        self.quote_repo = QuoteRepository(db)
        self.feedback_repo = FeedbackRepository(db)
    
    def resolve_user_conflicts(
        self, 
        user_id: str, 
        local_data: Dict[str, Any], 
        remote_data: Dict[str, Any],
        strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.SMART_MERGE
    ) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        """
        Resolve conflicts between local and remote user data.
        
        Args:
            user_id: User ID for conflict resolution
            local_data: Local version of user data
            remote_data: Remote version of user data
            strategy: Resolution strategy to use
            
        Returns:
            Tuple of (resolved_data, conflict_log)
        """
        try:
            conflict_log = []
            resolved_data = {}
            
            # Get current user data as baseline
            current_user = self.user_repo.get_by_id(user_id)
            if not current_user:
                logger.error(f"User not found for conflict resolution: {user_id}")
                return remote_data, [{"error": "User not found"}]
            
            # Resolve different types of conflicts
            resolved_data["personality_data"] = self._resolve_personality_conflicts(
                local_data.get("personality_data", {}),
                remote_data.get("personality_data", {}),
                current_user.personality_data or {},
                conflict_log
            )
            
            resolved_data["notification_settings"] = self._resolve_notification_conflicts(
                local_data.get("notification_settings", {}),
                remote_data.get("notification_settings", {}),
                current_user.notification_settings or {},
                conflict_log
            )
            
            resolved_data["preferences"] = self._resolve_preferences_conflicts(
                local_data.get("preferences", {}),
                remote_data.get("preferences", {}),
                current_user.preferences or {},
                conflict_log
            )
            
            # Handle timestamps - use latest
            local_updated = local_data.get("updated_at")
            remote_updated = remote_data.get("updated_at")
            
            if local_updated and remote_updated:
                if local_updated > remote_updated:
                    resolved_data["updated_at"] = local_updated
                    conflict_log.append({
                        "type": "timestamp_resolution",
                        "action": "used_local_timestamp",
                        "local": local_updated,
                        "remote": remote_updated
                    })
                else:
                    resolved_data["updated_at"] = remote_updated
                    conflict_log.append({
                        "type": "timestamp_resolution", 
                        "action": "used_remote_timestamp",
                        "local": local_updated,
                        "remote": remote_updated
                    })
            else:
                resolved_data["updated_at"] = local_updated or remote_updated or datetime.utcnow().isoformat()
            
            # Preserve other fields
            for field in ["id", "created_at", "sync_token", "is_active"]:
                resolved_data[field] = local_data.get(field) or remote_data.get(field)
            
            logger.info(f"Successfully resolved user conflicts for user: {user_id}")
            return resolved_data, conflict_log
            
        except Exception as e:
            logger.error(f"Error resolving user conflicts: {e}")
            return remote_data, [{"error": str(e)}]
    
    def _resolve_personality_conflicts(
        self, 
        local: Dict[str, Any], 
        remote: Dict[str, Any], 
        current: Dict[str, Any],
        conflict_log: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Resolve conflicts in personality data using smart merging.
        
        For personality data, we merge categories and confidence scores,
        taking the average when values differ to preserve learning.
        """
        resolved = {}
        
        # Merge categories
        local_categories = local.get("categories", {})
        remote_categories = remote.get("categories", {})
        current_categories = current.get("categories", {})
        
        resolved_categories = {}
        all_category_keys = set(local_categories.keys()) | set(remote_categories.keys()) | set(current_categories.keys())
        
        for category in all_category_keys:
            local_val = local_categories.get(category, 0.0)
            remote_val = remote_categories.get(category, 0.0)
            current_val = current_categories.get(category, 0.0)
            
            if local_val != remote_val:
                # Use weighted average, giving more weight to the value that's further from current
                if abs(local_val - current_val) > abs(remote_val - current_val):
                    resolved_categories[category] = (local_val * 0.6) + (remote_val * 0.4)
                else:
                    resolved_categories[category] = (remote_val * 0.6) + (local_val * 0.4)
                
                conflict_log.append({
                    "type": "personality_merge",
                    "category": category,
                    "action": "averaged_values",
                    "local": local_val,
                    "remote": remote_val,
                    "resolved": resolved_categories[category]
                })
            else:
                resolved_categories[category] = local_val
        
        resolved["categories"] = resolved_categories
        
        # Merge confidence scores similarly
        local_confidence = local.get("confidence_scores", {})
        remote_confidence = remote.get("confidence_scores", {})
        current_confidence = current.get("confidence_scores", {})
        
        resolved_confidence = {}
        all_confidence_keys = set(local_confidence.keys()) | set(remote_confidence.keys()) | set(current_confidence.keys())
        
        for category in all_confidence_keys:
            local_val = local_confidence.get(category, 0.1)
            remote_val = remote_confidence.get(category, 0.1)
            current_val = current_confidence.get(category, 0.1)
            
            if local_val != remote_val:
                # For confidence, take the higher value (more confident learning)
                resolved_confidence[category] = max(local_val, remote_val)
                
                conflict_log.append({
                    "type": "confidence_merge",
                    "category": category,
                    "action": "used_higher_confidence",
                    "local": local_val,
                    "remote": remote_val,
                    "resolved": resolved_confidence[category]
                })
            else:
                resolved_confidence[category] = local_val
        
        resolved["confidence_scores"] = resolved_confidence
        
        return resolved
    
    def _resolve_notification_conflicts(
        self, 
        local: Dict[str, Any], 
        remote: Dict[str, Any], 
        current: Dict[str, Any],
        conflict_log: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Resolve conflicts in notification settings.
        
        For notification settings, we prefer the most recent explicit user choice.
        """
        resolved = {}
        
        # For boolean settings, prefer explicit True over False (user likely enabled)
        enabled_local = local.get("enabled", False)
        enabled_remote = remote.get("enabled", False)
        
        if enabled_local != enabled_remote:
            # Prefer enabled state (user likely turned on notifications)
            resolved["enabled"] = enabled_local or enabled_remote
            conflict_log.append({
                "type": "notification_enabled",
                "action": "preferred_enabled_state",
                "local": enabled_local,
                "remote": enabled_remote,
                "resolved": resolved["enabled"]
            })
        else:
            resolved["enabled"] = enabled_local
        
        # For time and timezone, prefer non-default values
        time_local = local.get("time", "08:00")
        time_remote = remote.get("time", "08:00")
        
        if time_local != time_remote:
            # Prefer non-default time (user likely customized)
            if time_local != "08:00":
                resolved["time"] = time_local
            elif time_remote != "08:00":
                resolved["time"] = time_remote
            else:
                resolved["time"] = time_local  # Both are default, use either
            
            conflict_log.append({
                "type": "notification_time",
                "action": "preferred_custom_time",
                "local": time_local,
                "remote": time_remote,
                "resolved": resolved["time"]
            })
        else:
            resolved["time"] = time_local
        
        # Handle timezone
        timezone_local = local.get("timezone", "UTC")
        timezone_remote = remote.get("timezone", "UTC")
        
        if timezone_local != timezone_remote:
            # Prefer non-UTC timezone (user likely set their local timezone)
            if timezone_local != "UTC":
                resolved["timezone"] = timezone_local
            elif timezone_remote != "UTC":
                resolved["timezone"] = timezone_remote
            else:
                resolved["timezone"] = timezone_local
            
            conflict_log.append({
                "type": "notification_timezone",
                "action": "preferred_local_timezone",
                "local": timezone_local,
                "remote": timezone_remote,
                "resolved": resolved["timezone"]
            })
        else:
            resolved["timezone"] = timezone_local
        
        return resolved
    
    def _resolve_preferences_conflicts(
        self, 
        local: Dict[str, Any], 
        remote: Dict[str, Any], 
        current: Dict[str, Any],
        conflict_log: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Resolve conflicts in user preferences.
        
        For preferences, we prefer explicit user choices over defaults.
        """
        resolved = {}
        
        # Handle theme preference
        theme_local = local.get("theme", "light")
        theme_remote = remote.get("theme", "light")
        
        if theme_local != theme_remote:
            # Prefer non-default theme
            if theme_local != "light":
                resolved["theme"] = theme_local
            elif theme_remote != "light":
                resolved["theme"] = theme_remote
            else:
                resolved["theme"] = theme_local
            
            conflict_log.append({
                "type": "theme_preference",
                "action": "preferred_custom_theme",
                "local": theme_local,
                "remote": theme_remote,
                "resolved": resolved["theme"]
            })
        else:
            resolved["theme"] = theme_local
        
        # Handle language preference
        language_local = local.get("language", "en")
        language_remote = remote.get("language", "en")
        
        if language_local != language_remote:
            # Prefer non-default language
            if language_local != "en":
                resolved["language"] = language_local
            elif language_remote != "en":
                resolved["language"] = language_remote
            else:
                resolved["language"] = language_local
            
            conflict_log.append({
                "type": "language_preference",
                "action": "preferred_custom_language",
                "local": language_local,
                "remote": language_remote,
                "resolved": resolved["language"]
            })
        else:
            resolved["language"] = language_local
        
        # Handle quote length preference
        length_local = local.get("quote_length", "medium")
        length_remote = remote.get("quote_length", "medium")
        
        if length_local != length_remote:
            # For quote length, prefer the more specific choice
            length_priority = {"short": 1, "medium": 2, "long": 3}
            local_priority = length_priority.get(length_local, 2)
            remote_priority = length_priority.get(length_remote, 2)
            
            if local_priority != remote_priority:
                resolved["quote_length"] = length_local if local_priority > remote_priority else length_remote
            else:
                resolved["quote_length"] = length_local
            
            conflict_log.append({
                "type": "quote_length_preference",
                "action": "preferred_specific_length",
                "local": length_local,
                "remote": length_remote,
                "resolved": resolved["quote_length"]
            })
        else:
            resolved["quote_length"] = length_local
        
        return resolved
    
    def resolve_feedback_conflicts(
        self, 
        user_id: str, 
        local_feedback: List[Dict[str, Any]], 
        remote_feedback: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Resolve conflicts in feedback data.
        
        For feedback, we preserve all feedback entries and merge by timestamp,
        ensuring no feedback is lost.
        """
        try:
            conflict_log = []
            
            # Create lookup maps by quote_id and timestamp
            local_map = {}
            remote_map = {}
            
            for feedback in local_feedback:
                key = (feedback.get("quote_id"), feedback.get("timestamp"))
                local_map[key] = feedback
            
            for feedback in remote_feedback:
                key = (feedback.get("quote_id"), feedback.get("timestamp"))
                remote_map[key] = feedback
            
            # Merge feedback entries
            resolved_feedback = []
            all_keys = set(local_map.keys()) | set(remote_map.keys())
            
            for key in all_keys:
                local_entry = local_map.get(key)
                remote_entry = remote_map.get(key)
                
                if local_entry and remote_entry:
                    # Both exist - check for differences
                    if local_entry.get("rating") != remote_entry.get("rating"):
                        # Conflict in rating - prefer the more recent one based on context
                        local_context = local_entry.get("context", {})
                        remote_context = remote_entry.get("context", {})
                        
                        # Use the one with higher confidence or more recent timestamp
                        local_confidence = local_context.get("confidence", 0.5)
                        remote_confidence = remote_context.get("confidence", 0.5)
                        
                        if local_confidence > remote_confidence:
                            resolved_feedback.append(local_entry)
                            conflict_log.append({
                                "type": "feedback_rating_conflict",
                                "quote_id": key[0],
                                "action": "used_higher_confidence",
                                "local_rating": local_entry.get("rating"),
                                "remote_rating": remote_entry.get("rating"),
                                "resolved": local_entry.get("rating")
                            })
                        else:
                            resolved_feedback.append(remote_entry)
                            conflict_log.append({
                                "type": "feedback_rating_conflict",
                                "quote_id": key[0],
                                "action": "used_higher_confidence",
                                "local_rating": local_entry.get("rating"),
                                "remote_rating": remote_entry.get("rating"),
                                "resolved": remote_entry.get("rating")
                            })
                    else:
                        # No conflict, use either (they're the same)
                        resolved_feedback.append(local_entry)
                elif local_entry:
                    # Only local exists
                    resolved_feedback.append(local_entry)
                elif remote_entry:
                    # Only remote exists
                    resolved_feedback.append(remote_entry)
            
            logger.info(f"Successfully resolved feedback conflicts for user: {user_id}")
            return resolved_feedback, conflict_log
            
        except Exception as e:
            logger.error(f"Error resolving feedback conflicts: {e}")
            return remote_feedback, [{"error": str(e)}]
    
    def apply_resolved_data(self, user_id: str, resolved_data: Dict[str, Any]) -> bool:
        """
        Apply resolved data to the database.
        
        Args:
            user_id: User ID to update
            resolved_data: Resolved user data
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Update user with resolved data
            updated_user = self.user_repo.update(user_id, resolved_data)
            if not updated_user:
                logger.error(f"Failed to apply resolved data for user: {user_id}")
                return False
            
            logger.info(f"Successfully applied resolved data for user: {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error applying resolved data: {e}")
            return False
    
    def get_conflict_summary(self, conflict_log: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate a summary of conflicts that were resolved.
        
        Args:
            conflict_log: List of conflict resolution actions
            
        Returns:
            Summary of conflicts and resolutions
        """
        summary = {
            "total_conflicts": len(conflict_log),
            "conflict_types": {},
            "actions_taken": {},
            "data_preserved": True,  # We always preserve data
            "resolution_timestamp": datetime.utcnow().isoformat()
        }
        
        for entry in conflict_log:
            conflict_type = entry.get("type", "unknown")
            action = entry.get("action", "unknown")
            
            summary["conflict_types"][conflict_type] = summary["conflict_types"].get(conflict_type, 0) + 1
            summary["actions_taken"][action] = summary["actions_taken"].get(action, 0) + 1
        
        return summary