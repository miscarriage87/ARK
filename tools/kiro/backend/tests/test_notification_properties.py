"""
Property-based tests for notification system in ARK Digital Calendar.

Tests notification scheduling accuracy and content completeness properties.
"""

import pytest
from hypothesis import given, strategies as st, assume, settings
from datetime import datetime, timezone, timedelta
from unittest.mock import Mock, patch, MagicMock
import json
from sqlalchemy.orm import Session

from app.services.notification_service import NotificationService
from app.services.notification_scheduler import NotificationScheduler
from app.models.user import User
from app.models.quote import Quote
from app.repositories.user_repository import UserRepository
from app.repositories.quote_repository import QuoteRepository

# Test data generators
@st.composite
def notification_preferences(draw):
    """Generate valid notification preferences."""
    return {
        'enabled': draw(st.booleans()),
        'time': draw(st.sampled_from([
            '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
            '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
            '20:00', '21:00', '22:00'
        ])),
        'timezone': draw(st.sampled_from(['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo']))
    }

@st.composite
def push_subscription(draw):
    """Generate valid push subscription data."""
    return {
        'endpoint': f"https://fcm.googleapis.com/fcm/send/{draw(st.text(min_size=10, max_size=50))}",
        'keys': {
            'p256dh': draw(st.text(min_size=20, max_size=100)),
            'auth': draw(st.text(min_size=10, max_size=50))
        }
    }

@st.composite
def user_with_notifications(draw):
    """Generate user with notification settings."""
    user_id = draw(st.uuids()).hex
    preferences = draw(notification_preferences())
    subscription = draw(push_subscription()) if preferences['enabled'] else None
    
    notification_settings = preferences.copy()
    if subscription:
        notification_settings['subscription'] = subscription
    
    return {
        'id': user_id,
        'notification_settings': notification_settings,
        'is_active': True
    }

@st.composite
def daily_quote(draw):
    """Generate daily quote data."""
    return {
        'id': draw(st.uuids()).hex,
        'user_id': draw(st.uuids()).hex,
        'content': draw(st.text(min_size=10, max_size=200)),
        'author': draw(st.text(min_size=3, max_size=50)),
        'date': draw(st.dates()),
        'theme': draw(st.text(min_size=3, max_size=30))
    }

class TestNotificationSchedulingAccuracy:
    """
    Property 13: Notification Scheduling Accuracy
    **Validates: Requirements 6.1, 6.4**
    
    For any user with enabled notifications and specified timing preferences,
    daily notifications should be sent at the configured times.
    """
    
    @given(users_data=st.lists(user_with_notifications(), min_size=1, max_size=10))
    @settings(max_examples=100)
    def test_users_scheduled_for_time_accuracy(self, users_data):
        """
        Feature: digital-calendar, Property 13: Notification Scheduling Accuracy
        
        Test that users are correctly identified for notification at their scheduled time.
        """
        # Create mock database session
        mock_db = Mock(spec=Session)
        
        # Create mock users
        mock_users = []
        for user_data in users_data:
            mock_user = Mock(spec=User)
            mock_user.id = user_data['id']
            mock_user.notification_settings = user_data['notification_settings']
            mock_user.is_active = user_data['is_active']
            mock_users.append(mock_user)
        
        # Mock database query
        mock_query = Mock()
        mock_query.filter.return_value.all.return_value = mock_users
        mock_db.query.return_value = mock_query
        
        # Create notification service
        service = NotificationService(mock_db)
        
        # Test each unique notification time
        notification_times = set()
        for user_data in users_data:
            settings = user_data['notification_settings']
            if settings.get('enabled', False) and settings.get('time'):
                notification_times.add(settings['time'])
        
        for target_time in notification_times:
            # Get users for this time
            users_for_time = service.get_users_for_notification(target_time)
            
            # Verify accuracy: only users with matching time and enabled notifications
            expected_users = []
            for user_data in users_data:
                settings = user_data['notification_settings']
                if (settings.get('enabled', False) and 
                    settings.get('time') == target_time and
                    settings.get('subscription') and
                    user_data['is_active']):
                    expected_users.append(user_data['id'])
            
            actual_user_ids = [user.id for user in users_for_time]
            
            # Property: Users returned should match exactly those scheduled for this time
            assert set(actual_user_ids) == set(expected_users), (
                f"Scheduling accuracy failed for time {target_time}. "
                f"Expected: {expected_users}, Got: {actual_user_ids}"
            )
    
    @given(
        user_data=user_with_notifications(),
        target_times=st.lists(st.sampled_from([
            '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'
        ]), min_size=1, max_size=6, unique=True)
    )
    @settings(max_examples=100)
    def test_notification_time_precision(self, user_data, target_times):
        """
        Test that notification scheduling respects exact time matching.
        """
        mock_db = Mock(spec=Session)
        
        # Create user with specific notification time
        user_notification_time = user_data['notification_settings'].get('time', '09:00')
        
        mock_user = Mock(spec=User)
        mock_user.id = user_data['id']
        mock_user.notification_settings = user_data['notification_settings']
        mock_user.is_active = user_data['is_active']
        
        mock_query = Mock()
        mock_query.filter.return_value.all.return_value = [mock_user]
        mock_db.query.return_value = mock_query
        
        service = NotificationService(mock_db)
        
        for target_time in target_times:
            users_for_time = service.get_users_for_notification(target_time)
            
            # Property: User should only be returned for their exact notification time
            if (user_data['notification_settings'].get('enabled', False) and
                user_data['notification_settings'].get('subscription') and
                user_data['is_active'] and
                target_time == user_notification_time):
                assert len(users_for_time) == 1
                assert users_for_time[0].id == user_data['id']
            else:
                assert len(users_for_time) == 0
    
    @given(preferences=notification_preferences())
    @settings(max_examples=100)
    def test_preference_update_accuracy(self, preferences):
        """
        Test that notification preference updates are accurately stored and retrieved.
        """
        mock_db = Mock(spec=Session)
        mock_user_repo = Mock(spec=UserRepository)
        
        # Create mock user
        user_id = "test-user-123"
        mock_user = Mock(spec=User)
        mock_user.id = user_id
        mock_user.notification_settings = {}
        
        mock_user_repo.get_by_id.return_value = mock_user
        mock_user_repo.update.return_value = None
        
        service = NotificationService(mock_db)
        service.user_repo = mock_user_repo
        
        # Update preferences
        success = service.update_notification_preferences(user_id, preferences)
        
        # Property: Update should succeed for valid preferences
        assert success is True
        
        # Property: User's notification settings should be updated with new preferences
        mock_user_repo.update.assert_called_once_with(mock_user)
        
        # Property: Settings should contain all provided preferences
        updated_settings = mock_user.notification_settings
        for key, value in preferences.items():
            assert key in updated_settings
            assert updated_settings[key] == value

class TestNotificationContentCompleteness:
    """
    Property 14: Notification Content Completeness
    **Validates: Requirements 6.2, 6.3**
    
    For any sent notification, it should include preview text from the current day's quote
    and navigate to the correct quote when tapped.
    """
    
    @given(quote_data=daily_quote())
    @settings(max_examples=100)
    def test_notification_payload_completeness(self, quote_data):
        """
        Feature: digital-calendar, Property 14: Notification Content Completeness
        
        Test that notification payloads contain all required content elements.
        """
        mock_db = Mock(spec=Session)
        service = NotificationService(mock_db)
        
        # Create mock quote
        mock_quote = Mock(spec=Quote)
        mock_quote.id = quote_data['id']
        mock_quote.content = quote_data['content']
        mock_quote.author = quote_data['author']
        mock_quote.date = quote_data['date']
        
        # Generate notification payload
        payload = service._create_notification_payload(mock_quote)
        
        # Property: Payload must contain required fields
        required_fields = ['title', 'body', 'icon', 'badge', 'tag', 'data', 'actions']
        for field in required_fields:
            assert field in payload, f"Missing required field: {field}"
        
        # Property: Body should contain quote content (truncated if necessary)
        expected_body = quote_data['content']
        if len(expected_body) > 100:
            expected_body = expected_body[:97] + "..."
        assert payload['body'] == expected_body
        
        # Property: Data should contain quote information for navigation
        assert 'quoteId' in payload['data']
        assert 'date' in payload['data']
        assert 'url' in payload['data']
        assert payload['data']['quoteId'] == quote_data['id']
        assert payload['data']['url'] == "/"
        
        # Property: Actions should include view and dismiss options
        actions = payload['actions']
        assert len(actions) >= 2
        action_types = [action['action'] for action in actions]
        assert 'view' in action_types
        assert 'dismiss' in action_types
    
    @given(
        quote_content=st.text(min_size=1, max_size=500),
        quote_id=st.uuids()
    )
    @settings(max_examples=100)
    def test_quote_preview_truncation(self, quote_content, quote_id):
        """
        Test that quote content is properly truncated for notification preview.
        """
        mock_db = Mock(spec=Session)
        service = NotificationService(mock_db)
        
        # Create mock quote with varying content lengths
        mock_quote = Mock(spec=Quote)
        mock_quote.id = quote_id.hex
        mock_quote.content = quote_content
        mock_quote.author = "Test Author"
        mock_quote.date = datetime.now().date()
        
        payload = service._create_notification_payload(mock_quote)
        
        # Property: Preview text should never exceed 100 characters
        assert len(payload['body']) <= 100
        
        # Property: If original content is <= 100 chars, it should be unchanged
        if len(quote_content) <= 100:
            assert payload['body'] == quote_content
        else:
            # Property: If truncated, should end with "..." and be exactly 100 chars
            assert payload['body'].endswith("...")
            assert len(payload['body']) == 100
            assert payload['body'] == quote_content[:97] + "..."
    
    @given(
        user_data=user_with_notifications(),
        quote_data=daily_quote()
    )
    @settings(max_examples=100)
    def test_notification_delivery_completeness(self, user_data, quote_data):
        """
        Test that notification delivery includes all necessary components.
        """
        # Skip test if notifications are disabled
        assume(user_data['notification_settings'].get('enabled', False))
        assume(user_data['notification_settings'].get('subscription') is not None)
        
        mock_db = Mock(spec=Session)
        mock_user_repo = Mock(spec=UserRepository)
        mock_quote_repo = Mock(spec=QuoteRepository)
        
        # Setup mocks
        mock_user = Mock(spec=User)
        mock_user.id = user_data['id']
        mock_user.notification_settings = user_data['notification_settings']
        
        mock_quote = Mock(spec=Quote)
        mock_quote.id = quote_data['id']
        mock_quote.content = quote_data['content']
        mock_quote.date = quote_data['date']
        
        mock_user_repo.get_by_id.return_value = mock_user
        mock_quote_repo.get_by_user_and_date.return_value = mock_quote
        
        service = NotificationService(mock_db)
        service.user_repo = mock_user_repo
        service.quote_repo = mock_quote_repo
        
        # Mock the push notification sending
        with patch.object(service, '_send_push_notification', return_value=True) as mock_send:
            result = service.send_daily_notification(user_data['id'], mock_quote)
            
            # Property: Notification should be sent successfully
            assert result is True
            
            # Property: Push notification should be called with subscription and payload
            mock_send.assert_called_once()
            call_args = mock_send.call_args
            subscription, payload = call_args[0]
            
            # Property: Subscription should match user's subscription
            assert subscription == user_data['notification_settings']['subscription']
            
            # Property: Payload should contain quote information
            assert 'title' in payload
            assert 'body' in payload
            assert payload['body'] in quote_data['content'] or quote_data['content'] in payload['body']
            assert payload['data']['quoteId'] == quote_data['id']

class TestNotificationSchedulerIntegration:
    """Integration tests for notification scheduler with property-based testing."""
    
    @given(
        users_data=st.lists(user_with_notifications(), min_size=1, max_size=5),
        target_time=st.sampled_from(['09:00', '12:00', '18:00'])
    )
    @settings(max_examples=50)
    def test_scheduler_batch_accuracy(self, users_data, target_time):
        """
        Test that notification scheduler processes batches accurately.
        """
        # Filter users who should receive notifications at target time
        expected_notifications = 0
        for user_data in users_data:
            settings = user_data['notification_settings']
            if (settings.get('enabled', False) and 
                settings.get('time') == target_time and
                settings.get('subscription') and
                user_data['is_active']):
                expected_notifications += 1
        
        # Mock the scheduler's dependencies
        with patch('app.services.notification_scheduler.SessionLocal') as mock_session_local:
            mock_db = Mock(spec=Session)
            mock_session_local.return_value = mock_db
            
            # Create mock users
            mock_users = []
            for user_data in users_data:
                mock_user = Mock(spec=User)
                mock_user.id = user_data['id']
                mock_user.notification_settings = user_data['notification_settings']
                mock_user.is_active = user_data['is_active']
                mock_users.append(mock_user)
            
            mock_query = Mock()
            mock_query.filter.return_value.all.return_value = mock_users
            mock_db.query.return_value = mock_query
            
            scheduler = NotificationScheduler()
            scheduler.db = mock_db
            
            # Mock the notification sending
            with patch.object(scheduler, '_send_notification_to_user', return_value=True) as mock_send:
                import asyncio
                result = asyncio.run(scheduler.send_notifications_for_time(target_time))
                
                # Property: Number of notifications sent should match expected count
                assert result == expected_notifications
                
                # Property: Send method should be called for each eligible user
                assert mock_send.call_count == expected_notifications