"""
Property-based tests for conflict resolution functionality.

Tests the conflict resolution system to ensure no data loss occurs
during synchronization conflicts between different devices or sessions.
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from hypothesis.stateful import RuleBasedStateMachine, Bundle, rule, initialize
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, Any, List
import json
import copy

from app.database.database import get_db
from app.models.user import User
from app.models.quote import Quote, Feedback
from app.repositories.user_repository import UserRepository
from app.repositories.quote_repository import QuoteRepository, FeedbackRepository
from app.services.conflict_resolution import ConflictResolutionService, ConflictResolutionStrategy


# Test data generators
@st.composite
def user_profile_data(draw):
    """Generate realistic user profile data for conflict testing."""
    return {
        'personality_data': {
            'categories': {
                'spirituality': draw(st.floats(min_value=0.0, max_value=1.0)),
                'sport': draw(st.floats(min_value=0.0, max_value=1.0)),
                'education': draw(st.floats(min_value=0.0, max_value=1.0)),
                'health': draw(st.floats(min_value=0.0, max_value=1.0)),
                'humor': draw(st.floats(min_value=0.0, max_value=1.0)),
                'philosophy': draw(st.floats(min_value=0.0, max_value=1.0))
            },
            'confidence_scores': {
                'spirituality': draw(st.floats(min_value=0.1, max_value=1.0)),
                'sport': draw(st.floats(min_value=0.1, max_value=1.0)),
                'education': draw(st.floats(min_value=0.1, max_value=1.0)),
                'health': draw(st.floats(min_value=0.1, max_value=1.0)),
                'humor': draw(st.floats(min_value=0.1, max_value=1.0)),
                'philosophy': draw(st.floats(min_value=0.1, max_value=1.0))
            }
        },
        'notification_settings': {
            'enabled': draw(st.booleans()),
            'time': draw(st.sampled_from(['06:00', '07:00', '08:00', '09:00', '10:00'])),
            'timezone': draw(st.sampled_from(['UTC', 'America/New_York', 'Europe/London']))
        },
        'preferences': {
            'theme': draw(st.sampled_from(['light', 'dark', 'auto'])),
            'language': draw(st.sampled_from(['en', 'es', 'fr', 'de'])),
            'quote_length': draw(st.sampled_from(['short', 'medium', 'long']))
        },
        'updated_at': draw(st.datetimes(
            min_value=datetime.now() - timedelta(days=30),
            max_value=datetime.now()
        )).isoformat()
    }


@st.composite
def feedback_data(draw, quote_id: str, user_id: str):
    """Generate realistic feedback data for conflict testing."""
    return {
        'quote_id': quote_id,
        'user_id': user_id,
        'rating': draw(st.sampled_from(['like', 'neutral', 'dislike'])),
        'timestamp': draw(st.datetimes(
            min_value=datetime.now() - timedelta(days=7),
            max_value=datetime.now()
        )).isoformat(),
        'context': {
            'source': 'user_interaction',
            'confidence': draw(st.floats(min_value=0.1, max_value=1.0))
        }
    }


def create_conflicting_data(original_data: Dict[str, Any], modification_type: str) -> Dict[str, Any]:
    """Create conflicting version of data for testing."""
    conflicted_data = copy.deepcopy(original_data)
    
    if modification_type == "personality_change":
        # Modify personality categories
        categories = conflicted_data['personality_data']['categories']
        for category in categories:
            categories[category] = min(1.0, max(0.0, categories[category] + 0.1))
    
    elif modification_type == "notification_change":
        # Modify notification settings
        settings = conflicted_data['notification_settings']
        settings['enabled'] = not settings['enabled']
        settings['time'] = '09:00' if settings['time'] != '09:00' else '08:00'
    
    elif modification_type == "preference_change":
        # Modify preferences
        prefs = conflicted_data['preferences']
        themes = ['light', 'dark', 'auto']
        current_theme = prefs['theme']
        prefs['theme'] = next(t for t in themes if t != current_theme)
    
    elif modification_type == "timestamp_change":
        # Modify timestamp
        conflicted_data['updated_at'] = (datetime.now() + timedelta(minutes=5)).isoformat()
    
    return conflicted_data


class ConflictResolutionStateMachine(RuleBasedStateMachine):
    """
    Stateful testing for conflict resolution functionality.
    
    Tests various conflict scenarios to ensure no data loss occurs
    during synchronization between different devices or sessions.
    """
    
    def __init__(self):
        super().__init__()
        self.db = next(get_db())
        self.conflict_service = ConflictResolutionService(self.db)
        self.user_repo = UserRepository(self.db)
        self.quote_repo = QuoteRepository(self.db)
        self.feedback_repo = FeedbackRepository(self.db)
        
        # Track created entities
        self.users = {}
        self.quotes = {}
        self.feedback_entries = {}
    
    users = Bundle('users')
    quotes = Bundle('quotes')
    
    @rule(target=users, profile_data=user_profile_data())
    def create_user(self, profile_data):
        """Create a user with generated profile data."""
        user = self.user_repo.create(profile_data)
        assume(user is not None)
        
        self.users[user.id] = {
            'user': user,
            'original_data': profile_data
        }
        return user.id
    
    @rule(user_id=users)
    def test_personality_conflict_resolution(self, user_id):
        """
        Test conflict resolution for personality data changes.
        
        **Feature: digital-calendar, Property 18: Conflict Resolution Without Data Loss**
        **Validates: Requirements 9.4**
        
        For any synchronization conflicts in personality data, the resolution
        should preserve all learning and merge values intelligently.
        """
        user_info = self.users[user_id]
        original_data = user_info['original_data']
        
        # Create conflicting versions
        local_data = create_conflicting_data(original_data, "personality_change")
        remote_data = create_conflicting_data(original_data, "personality_change")
        
        # Resolve conflicts
        resolved_data, conflict_log = self.conflict_service.resolve_user_conflicts(
            user_id, local_data, remote_data
        )
        
        # Verify no data loss occurred
        assert resolved_data is not None, "Resolved data should not be None"
        assert "personality_data" in resolved_data, "Personality data should be preserved"
        
        # Verify all personality categories are preserved
        original_categories = original_data['personality_data']['categories']
        resolved_categories = resolved_data['personality_data']['categories']
        
        for category in original_categories:
            assert category in resolved_categories, f"Category {category} should be preserved"
            assert 0.0 <= resolved_categories[category] <= 1.0, f"Category {category} should have valid range"
        
        # Verify confidence scores are preserved
        original_confidence = original_data['personality_data']['confidence_scores']
        resolved_confidence = resolved_data['personality_data']['confidence_scores']
        
        for category in original_confidence:
            assert category in resolved_confidence, f"Confidence for {category} should be preserved"
            assert 0.1 <= resolved_confidence[category] <= 1.0, f"Confidence for {category} should have valid range"
        
        # Verify conflict log records the resolution
        assert isinstance(conflict_log, list), "Conflict log should be a list"
        
        # Apply resolved data and verify it works
        success = self.conflict_service.apply_resolved_data(user_id, resolved_data)
        assert success, "Applying resolved data should succeed"
    
    @rule(user_id=users)
    def test_notification_conflict_resolution(self, user_id):
        """
        Test conflict resolution for notification settings.
        
        **Feature: digital-calendar, Property 18: Conflict Resolution Without Data Loss**
        **Validates: Requirements 9.4**
        
        For any synchronization conflicts in notification settings, the resolution
        should preserve user preferences and prefer enabled states.
        """
        user_info = self.users[user_id]
        original_data = user_info['original_data']
        
        # Create conflicting versions
        local_data = create_conflicting_data(original_data, "notification_change")
        remote_data = create_conflicting_data(original_data, "notification_change")
        
        # Resolve conflicts
        resolved_data, conflict_log = self.conflict_service.resolve_user_conflicts(
            user_id, local_data, remote_data
        )
        
        # Verify no data loss occurred
        assert resolved_data is not None, "Resolved data should not be None"
        assert "notification_settings" in resolved_data, "Notification settings should be preserved"
        
        # Verify all notification fields are preserved
        resolved_settings = resolved_data['notification_settings']
        assert "enabled" in resolved_settings, "Enabled setting should be preserved"
        assert "time" in resolved_settings, "Time setting should be preserved"
        assert "timezone" in resolved_settings, "Timezone setting should be preserved"
        
        # Verify values are valid
        assert isinstance(resolved_settings["enabled"], bool), "Enabled should be boolean"
        assert resolved_settings["time"] in ['06:00', '07:00', '08:00', '09:00', '10:00'], "Time should be valid"
        assert resolved_settings["timezone"] in ['UTC', 'America/New_York', 'Europe/London'], "Timezone should be valid"
        
        # Apply resolved data and verify it works
        success = self.conflict_service.apply_resolved_data(user_id, resolved_data)
        assert success, "Applying resolved data should succeed"
    
    @rule(user_id=users)
    def test_preference_conflict_resolution(self, user_id):
        """
        Test conflict resolution for user preferences.
        
        **Feature: digital-calendar, Property 18: Conflict Resolution Without Data Loss**
        **Validates: Requirements 9.4**
        
        For any synchronization conflicts in user preferences, the resolution
        should preserve all settings and prefer custom values over defaults.
        """
        user_info = self.users[user_id]
        original_data = user_info['original_data']
        
        # Create conflicting versions
        local_data = create_conflicting_data(original_data, "preference_change")
        remote_data = create_conflicting_data(original_data, "preference_change")
        
        # Resolve conflicts
        resolved_data, conflict_log = self.conflict_service.resolve_user_conflicts(
            user_id, local_data, remote_data
        )
        
        # Verify no data loss occurred
        assert resolved_data is not None, "Resolved data should not be None"
        assert "preferences" in resolved_data, "Preferences should be preserved"
        
        # Verify all preference fields are preserved
        resolved_prefs = resolved_data['preferences']
        assert "theme" in resolved_prefs, "Theme preference should be preserved"
        assert "language" in resolved_prefs, "Language preference should be preserved"
        assert "quote_length" in resolved_prefs, "Quote length preference should be preserved"
        
        # Verify values are valid
        assert resolved_prefs["theme"] in ['light', 'dark', 'auto'], "Theme should be valid"
        assert resolved_prefs["language"] in ['en', 'es', 'fr', 'de'], "Language should be valid"
        assert resolved_prefs["quote_length"] in ['short', 'medium', 'long'], "Quote length should be valid"
        
        # Apply resolved data and verify it works
        success = self.conflict_service.apply_resolved_data(user_id, resolved_data)
        assert success, "Applying resolved data should succeed"
    
    @rule(user_id=users)
    def test_timestamp_conflict_resolution(self, user_id):
        """
        Test conflict resolution for timestamp conflicts.
        
        **Feature: digital-calendar, Property 18: Conflict Resolution Without Data Loss**
        **Validates: Requirements 9.4**
        
        For any synchronization conflicts in timestamps, the resolution
        should use the most recent timestamp while preserving all data.
        """
        user_info = self.users[user_id]
        original_data = user_info['original_data']
        
        # Create versions with different timestamps
        local_data = copy.deepcopy(original_data)
        remote_data = copy.deepcopy(original_data)
        
        local_time = datetime.now() - timedelta(minutes=10)
        remote_time = datetime.now() - timedelta(minutes=5)
        
        local_data['updated_at'] = local_time.isoformat()
        remote_data['updated_at'] = remote_time.isoformat()
        
        # Resolve conflicts
        resolved_data, conflict_log = self.conflict_service.resolve_user_conflicts(
            user_id, local_data, remote_data
        )
        
        # Verify no data loss occurred
        assert resolved_data is not None, "Resolved data should not be None"
        assert "updated_at" in resolved_data, "Timestamp should be preserved"
        
        # Verify the more recent timestamp was chosen
        resolved_time = datetime.fromisoformat(resolved_data['updated_at'])
        assert resolved_time >= local_time, "Resolved timestamp should be at least as recent as local"
        assert resolved_time >= remote_time, "Resolved timestamp should be at least as recent as remote"
        
        # In this case, remote is more recent, so it should be chosen
        assert resolved_data['updated_at'] == remote_data['updated_at'], "Should use more recent timestamp"
        
        # Verify conflict was logged
        timestamp_conflicts = [log for log in conflict_log if log.get('type') == 'timestamp_resolution']
        assert len(timestamp_conflicts) > 0, "Timestamp conflict should be logged"
        
        # Apply resolved data and verify it works
        success = self.conflict_service.apply_resolved_data(user_id, resolved_data)
        assert success, "Applying resolved data should succeed"


# Property-based tests
@given(
    original_data=user_profile_data(),
    modification_type=st.sampled_from(["personality_change", "notification_change", "preference_change"])
)
@settings(max_examples=30, deadline=None)
def test_conflict_resolution_preserves_data(original_data, modification_type):
    """
    Test that conflict resolution always preserves data.
    
    **Feature: digital-calendar, Property 18: Conflict Resolution Without Data Loss**
    **Validates: Requirements 9.4**
    """
    db = next(get_db())
    try:
        conflict_service = ConflictResolutionService(db)
        user_repo = UserRepository(db)
        
        # Create user
        user = user_repo.create(original_data)
        assume(user is not None)
        
        # Create conflicting versions
        local_data = create_conflicting_data(original_data, modification_type)
        remote_data = create_conflicting_data(original_data, modification_type)
        
        # Resolve conflicts
        resolved_data, conflict_log = conflict_service.resolve_user_conflicts(
            user.id, local_data, remote_data
        )
        
        # Verify no data loss occurred
        assert resolved_data is not None, "Resolved data should not be None"
        
        # Verify all major sections are preserved
        assert "personality_data" in resolved_data, "Personality data should be preserved"
        assert "notification_settings" in resolved_data, "Notification settings should be preserved"
        assert "preferences" in resolved_data, "Preferences should be preserved"
        
        # Verify personality data completeness
        original_categories = set(original_data['personality_data']['categories'].keys())
        resolved_categories = set(resolved_data['personality_data']['categories'].keys())
        assert original_categories.issubset(resolved_categories), "All personality categories should be preserved"
        
        original_confidence = set(original_data['personality_data']['confidence_scores'].keys())
        resolved_confidence = set(resolved_data['personality_data']['confidence_scores'].keys())
        assert original_confidence.issubset(resolved_confidence), "All confidence scores should be preserved"
        
        # Verify notification settings completeness
        original_notif_keys = set(original_data['notification_settings'].keys())
        resolved_notif_keys = set(resolved_data['notification_settings'].keys())
        assert original_notif_keys.issubset(resolved_notif_keys), "All notification settings should be preserved"
        
        # Verify preferences completeness
        original_pref_keys = set(original_data['preferences'].keys())
        resolved_pref_keys = set(resolved_data['preferences'].keys())
        assert original_pref_keys.issubset(resolved_pref_keys), "All preferences should be preserved"
        
        # Verify conflict log is provided
        assert isinstance(conflict_log, list), "Conflict log should be provided"
        
        # Verify data can be applied successfully
        success = conflict_service.apply_resolved_data(user.id, resolved_data)
        assert success, "Resolved data should be applicable"
        
    finally:
        db.rollback()
        db.close()


@given(feedback_list=st.lists(feedback_data("quote_1", "user_1"), min_size=1, max_size=10))
@settings(max_examples=20, deadline=None)
def test_feedback_conflict_resolution_preserves_all_feedback(feedback_list):
    """
    Test that feedback conflict resolution preserves all feedback entries.
    
    **Feature: digital-calendar, Property 18: Conflict Resolution Without Data Loss**
    **Validates: Requirements 9.4**
    """
    db = next(get_db())
    try:
        conflict_service = ConflictResolutionService(db)
        
        # Create two versions of feedback with some overlaps and conflicts
        local_feedback = feedback_list[:len(feedback_list)//2 + 1]  # First half + 1
        remote_feedback = feedback_list[len(feedback_list)//2:]     # Second half
        
        # Create some conflicting entries (same quote_id, different ratings)
        if len(local_feedback) > 0 and len(remote_feedback) > 0:
            # Make the first remote feedback conflict with the last local feedback
            conflicting_feedback = copy.deepcopy(local_feedback[-1])
            conflicting_feedback['rating'] = 'dislike' if conflicting_feedback['rating'] != 'dislike' else 'like'
            conflicting_feedback['context']['confidence'] = 0.9  # Higher confidence
            remote_feedback[0] = conflicting_feedback
        
        # Resolve feedback conflicts
        resolved_feedback, conflict_log = conflict_service.resolve_feedback_conflicts(
            "user_1", local_feedback, remote_feedback
        )
        
        # Verify no feedback is lost
        assert len(resolved_feedback) >= max(len(local_feedback), len(remote_feedback)), "No feedback should be lost"
        
        # Verify all unique feedback entries are preserved
        local_keys = {(f['quote_id'], f['timestamp']) for f in local_feedback}
        remote_keys = {(f['quote_id'], f['timestamp']) for f in remote_feedback}
        resolved_keys = {(f['quote_id'], f['timestamp']) for f in resolved_feedback}
        
        all_keys = local_keys | remote_keys
        assert resolved_keys == all_keys, "All unique feedback entries should be preserved"
        
        # Verify conflict log records any conflicts
        assert isinstance(conflict_log, list), "Conflict log should be provided"
        
        # Verify all resolved feedback has valid structure
        for feedback in resolved_feedback:
            assert "quote_id" in feedback, "Quote ID should be preserved"
            assert "user_id" in feedback, "User ID should be preserved"
            assert "rating" in feedback, "Rating should be preserved"
            assert "timestamp" in feedback, "Timestamp should be preserved"
            assert feedback["rating"] in ['like', 'neutral', 'dislike'], "Rating should be valid"
        
    finally:
        db.rollback()
        db.close()


# Stateful test
TestConflictResolution = ConflictResolutionStateMachine.TestCase


if __name__ == "__main__":
    pytest.main([__file__])