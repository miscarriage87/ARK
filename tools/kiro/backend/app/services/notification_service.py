"""
Notification Service for ARK Digital Calendar

Handles push notification scheduling, delivery, and management for daily quotes.
Implements web push notifications using VAPID protocol.
"""

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
from pywebpush import webpush, WebPushException
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from ..core.config import settings
from ..models.user import User
from ..models.quote import Quote
from ..repositories.user_repository import UserRepository
from ..repositories.quote_repository import QuoteRepository

logger = logging.getLogger(__name__)

class NotificationService:
    """Service for managing push notifications."""
    
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.quote_repo = QuoteRepository(db)
        
    def schedule_daily_notification(self, user_id: str, preferences: Dict[str, Any]) -> bool:
        """
        Schedule daily notifications for a user based on their preferences.
        
        Args:
            user_id: User identifier
            preferences: Notification preferences including time and enabled status
            
        Returns:
            bool: True if scheduling was successful
        """
        try:
            user = self.user_repo.get_by_id(user_id)
            if not user:
                logger.error(f"User not found: {user_id}")
                return False
                
            # Update user's notification settings
            current_settings = user.notification_settings or {}
            current_settings.update(preferences)
            
            # Validate notification time format
            if 'time' in preferences:
                try:
                    datetime.strptime(preferences['time'], '%H:%M')
                except ValueError:
                    logger.error(f"Invalid time format: {preferences['time']}")
                    return False
            
            # Update user settings
            user.notification_settings = current_settings
            self.user_repo.update(user)
            
            logger.info(f"Notification schedule updated for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error scheduling notifications for user {user_id}: {str(e)}")
            return False
    
    def send_daily_notification(self, user_id: str, quote: Optional[Quote] = None) -> bool:
        """
        Send a daily notification to a user with their quote preview.
        
        Args:
            user_id: User identifier
            quote: Optional quote to include in notification
            
        Returns:
            bool: True if notification was sent successfully
        """
        try:
            user = self.user_repo.get_by_id(user_id)
            if not user or not user.notification_settings:
                logger.warning(f"User not found or no notification settings: {user_id}")
                return False
                
            settings_data = user.notification_settings
            if not settings_data.get('enabled', False):
                logger.info(f"Notifications disabled for user {user_id}")
                return True  # Not an error, just disabled
                
            # Get subscription endpoint from user settings
            subscription = settings_data.get('subscription')
            if not subscription:
                logger.warning(f"No push subscription found for user {user_id}")
                return False
                
            # Get today's quote if not provided
            if not quote:
                today = datetime.now(timezone.utc).date()
                quote = self.quote_repo.get_by_user_and_date(user_id, today)
                
            if not quote:
                logger.warning(f"No quote found for user {user_id} on {today}")
                return False
                
            # Prepare notification payload
            payload = self._create_notification_payload(quote)
            
            # Send push notification
            return self._send_push_notification(subscription, payload)
            
        except Exception as e:
            logger.error(f"Error sending notification to user {user_id}: {str(e)}")
            return False
    
    def update_notification_preferences(self, user_id: str, preferences: Dict[str, Any]) -> bool:
        """
        Update notification preferences for a user.
        
        Args:
            user_id: User identifier
            preferences: New notification preferences
            
        Returns:
            bool: True if update was successful
        """
        try:
            user = self.user_repo.get_by_id(user_id)
            if not user:
                logger.error(f"User not found: {user_id}")
                return False
                
            # Merge with existing settings
            current_settings = user.notification_settings or {}
            current_settings.update(preferences)
            
            # Validate settings
            if 'time' in preferences:
                try:
                    datetime.strptime(preferences['time'], '%H:%M')
                except ValueError:
                    logger.error(f"Invalid time format: {preferences['time']}")
                    return False
                    
            if 'enabled' in preferences and not isinstance(preferences['enabled'], bool):
                logger.error(f"Invalid enabled value: {preferences['enabled']}")
                return False
            
            # Update user
            user.notification_settings = current_settings
            self.user_repo.update(user)
            
            logger.info(f"Notification preferences updated for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating notification preferences for user {user_id}: {str(e)}")
            return False
    
    def register_push_subscription(self, user_id: str, subscription: Dict[str, Any]) -> bool:
        """
        Register a push notification subscription for a user.
        
        Args:
            user_id: User identifier
            subscription: Push subscription object from browser
            
        Returns:
            bool: True if registration was successful
        """
        try:
            user = self.user_repo.get_by_id(user_id)
            if not user:
                logger.error(f"User not found: {user_id}")
                return False
                
            # Validate subscription format
            required_fields = ['endpoint', 'keys']
            if not all(field in subscription for field in required_fields):
                logger.error(f"Invalid subscription format: {subscription}")
                return False
                
            if 'p256dh' not in subscription['keys'] or 'auth' not in subscription['keys']:
                logger.error(f"Missing required keys in subscription: {subscription}")
                return False
            
            # Update user's notification settings with subscription
            current_settings = user.notification_settings or {}
            current_settings['subscription'] = subscription
            
            user.notification_settings = current_settings
            self.user_repo.update(user)
            
            logger.info(f"Push subscription registered for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error registering push subscription for user {user_id}: {str(e)}")
            return False
    
    def get_users_for_notification(self, target_time: str) -> List[User]:
        """
        Get users who should receive notifications at the specified time.
        
        Args:
            target_time: Time in HH:MM format
            
        Returns:
            List of users who should receive notifications
        """
        try:
            # Query users with notifications enabled at the target time
            users = self.db.query(User).filter(
                and_(
                    User.is_active == True,
                    User.notification_settings.isnot(None)
                )
            ).all()
            
            # Filter users based on notification settings
            target_users = []
            for user in users:
                settings_data = user.notification_settings or {}
                if (settings_data.get('enabled', False) and 
                    settings_data.get('time') == target_time and
                    settings_data.get('subscription')):
                    target_users.append(user)
            
            logger.info(f"Found {len(target_users)} users for notification at {target_time}")
            return target_users
            
        except Exception as e:
            logger.error(f"Error getting users for notification at {target_time}: {str(e)}")
            return []
    
    def _create_notification_payload(self, quote: Quote) -> Dict[str, Any]:
        """
        Create notification payload with quote preview.
        
        Args:
            quote: Quote to include in notification
            
        Returns:
            Notification payload dictionary
        """
        # Truncate quote content for preview (max 100 characters)
        preview_text = quote.content
        if len(preview_text) > 100:
            preview_text = preview_text[:97] + "..."
            
        return {
            "title": "ARK Daily Quote",
            "body": preview_text,
            "icon": "/icons/icon-192x192.png",
            "badge": "/icons/icon-72x72.png",
            "tag": "daily-quote",
            "requireInteraction": False,
            "data": {
                "quoteId": quote.id,
                "date": quote.date.isoformat(),
                "url": "/"
            },
            "actions": [
                {
                    "action": "view",
                    "title": "View Quote",
                    "icon": "/icons/icon-96x96.png"
                },
                {
                    "action": "dismiss",
                    "title": "Dismiss"
                }
            ]
        }
    
    def _send_push_notification(self, subscription: Dict[str, Any], payload: Dict[str, Any]) -> bool:
        """
        Send push notification using VAPID protocol.
        
        Args:
            subscription: Push subscription object
            payload: Notification payload
            
        Returns:
            bool: True if notification was sent successfully
        """
        try:
            # Check if VAPID keys are configured
            if not settings.VAPID_PUBLIC_KEY or not settings.VAPID_PRIVATE_KEY:
                logger.error("VAPID keys not configured")
                return False
            
            # Prepare VAPID claims
            vapid_claims = {
                "sub": f"mailto:{settings.VAPID_CLAIMS_EMAIL}"
            }
            
            # Send push notification
            webpush(
                subscription_info=subscription,
                data=json.dumps(payload),
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims=vapid_claims
            )
            
            logger.info("Push notification sent successfully")
            return True
            
        except WebPushException as e:
            logger.error(f"WebPush error: {str(e)}")
            if e.response and e.response.status_code:
                logger.error(f"Response status: {e.response.status_code}")
                logger.error(f"Response text: {e.response.text}")
            return False
        except Exception as e:
            logger.error(f"Error sending push notification: {str(e)}")
            return False
    
    def send_test_notification(self, user_id: str, message: str = "Test notification") -> bool:
        """
        Send a test notification to verify the setup.
        
        Args:
            user_id: User identifier
            message: Test message to send
            
        Returns:
            bool: True if test notification was sent successfully
        """
        try:
            user = self.user_repo.get_by_id(user_id)
            if not user or not user.notification_settings:
                logger.error(f"User not found or no notification settings: {user_id}")
                return False
                
            subscription = user.notification_settings.get('subscription')
            if not subscription:
                logger.error(f"No push subscription found for user {user_id}")
                return False
            
            # Create test payload
            payload = {
                "title": "ARK Test Notification",
                "body": message,
                "icon": "/icons/icon-192x192.png",
                "tag": "test-notification",
                "data": {"test": True}
            }
            
            return self._send_push_notification(subscription, payload)
            
        except Exception as e:
            logger.error(f"Error sending test notification to user {user_id}: {str(e)}")
            return False