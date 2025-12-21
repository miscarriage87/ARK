"""
Notification API endpoints for ARK Digital Calendar

Handles push notification subscription, preferences, and testing.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database.database import get_db
from ..services.notification_service import NotificationService
from ..services.quote_generator import QuoteGeneratorService
from ..core.auth import get_current_user_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

# Request/Response models
class PushSubscriptionRequest(BaseModel):
    """Request model for push subscription registration."""
    endpoint: str = Field(..., description="Push service endpoint URL")
    keys: Dict[str, str] = Field(..., description="Subscription keys (p256dh and auth)")
    
    class Config:
        schema_extra = {
            "example": {
                "endpoint": "https://fcm.googleapis.com/fcm/send/...",
                "keys": {
                    "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                    "auth": "tBHItJI5svbpez7KI4CCXg"
                }
            }
        }

class NotificationPreferencesRequest(BaseModel):
    """Request model for notification preferences."""
    enabled: bool = Field(..., description="Whether notifications are enabled")
    time: str = Field(..., pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$", description="Notification time in HH:MM format")
    timezone: Optional[str] = Field(default="UTC", description="User timezone")
    
    class Config:
        schema_extra = {
            "example": {
                "enabled": True,
                "time": "09:00",
                "timezone": "UTC"
            }
        }

class TestNotificationRequest(BaseModel):
    """Request model for test notification."""
    message: Optional[str] = Field(default="Test notification from ARK", description="Test message")

class NotificationResponse(BaseModel):
    """Response model for notification operations."""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

@router.post("/subscribe", response_model=NotificationResponse)
async def subscribe_to_notifications(
    request: PushSubscriptionRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Register a push notification subscription for the current user.
    
    This endpoint allows users to subscribe to push notifications by providing
    their browser's push subscription object.
    """
    try:
        notification_service = NotificationService(db)
        
        # Convert request to subscription dictionary
        subscription = {
            "endpoint": request.endpoint,
            "keys": request.keys
        }
        
        success = notification_service.register_push_subscription(user_id, subscription)
        
        if success:
            return NotificationResponse(
                success=True,
                message="Push subscription registered successfully"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to register push subscription"
            )
            
    except Exception as e:
        logger.error(f"Error in subscribe_to_notifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.put("/preferences", response_model=NotificationResponse)
async def update_notification_preferences(
    request: NotificationPreferencesRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Update notification preferences for the current user.
    
    This endpoint allows users to enable/disable notifications and set their
    preferred notification time.
    """
    try:
        notification_service = NotificationService(db)
        
        # Convert request to preferences dictionary
        preferences = {
            "enabled": request.enabled,
            "time": request.time,
            "timezone": request.timezone
        }
        
        success = notification_service.update_notification_preferences(user_id, preferences)
        
        if success:
            return NotificationResponse(
                success=True,
                message="Notification preferences updated successfully"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update notification preferences"
            )
            
    except Exception as e:
        logger.error(f"Error in update_notification_preferences: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/preferences", response_model=NotificationResponse)
async def get_notification_preferences(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Get current notification preferences for the user.
    
    Returns the user's current notification settings including enabled status,
    notification time, and timezone.
    """
    try:
        notification_service = NotificationService(db)
        user = notification_service.user_repo.get_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        settings = user.notification_settings or {}
        
        # Remove sensitive subscription data from response
        safe_settings = {
            "enabled": settings.get("enabled", False),
            "time": settings.get("time", "09:00"),
            "timezone": settings.get("timezone", "UTC"),
            "hasSubscription": bool(settings.get("subscription"))
        }
        
        return NotificationResponse(
            success=True,
            message="Notification preferences retrieved successfully",
            data=safe_settings
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_notification_preferences: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/test", response_model=NotificationResponse)
async def send_test_notification(
    request: TestNotificationRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Send a test notification to verify the setup.
    
    This endpoint allows users to test their notification setup by sending
    a test push notification.
    """
    try:
        notification_service = NotificationService(db)
        
        success = notification_service.send_test_notification(user_id, request.message)
        
        if success:
            return NotificationResponse(
                success=True,
                message="Test notification sent successfully"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to send test notification. Check your subscription and settings."
            )
            
    except Exception as e:
        logger.error(f"Error in send_test_notification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/send-daily", response_model=NotificationResponse)
async def send_daily_notification(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Manually trigger a daily notification for the current user.
    
    This endpoint is primarily for testing and debugging purposes.
    In production, daily notifications are sent via scheduled tasks.
    """
    try:
        notification_service = NotificationService(db)
        
        success = notification_service.send_daily_notification(user_id)
        
        if success:
            return NotificationResponse(
                success=True,
                message="Daily notification sent successfully"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to send daily notification. Check your subscription and today's quote."
            )
            
    except Exception as e:
        logger.error(f"Error in send_daily_notification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.delete("/unsubscribe", response_model=NotificationResponse)
async def unsubscribe_from_notifications(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Unsubscribe from push notifications.
    
    This endpoint removes the user's push subscription and disables notifications.
    """
    try:
        notification_service = NotificationService(db)
        
        # Disable notifications and remove subscription
        preferences = {
            "enabled": False,
            "subscription": None
        }
        
        success = notification_service.update_notification_preferences(user_id, preferences)
        
        if success:
            return NotificationResponse(
                success=True,
                message="Successfully unsubscribed from notifications"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to unsubscribe from notifications"
            )
            
    except Exception as e:
        logger.error(f"Error in unsubscribe_from_notifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """
    Get the VAPID public key for push notification subscription.
    
    This endpoint provides the public key needed by the frontend to subscribe
    to push notifications.
    """
    try:
        from ..core.config import settings
        
        if not settings.VAPID_PUBLIC_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Push notifications are not configured"
            )
        
        return {
            "publicKey": settings.VAPID_PUBLIC_KEY
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_vapid_public_key: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )