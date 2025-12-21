"""
Notification Scheduler for ARK Digital Calendar

Handles scheduled sending of daily notifications to users based on their preferences.
This service is designed to be run as a background task or cron job.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import List
from sqlalchemy.orm import Session

from ..database.database import SessionLocal
from ..services.notification_service import NotificationService
from ..services.quote_generator import QuoteGenerator
from ..models.user import User

logger = logging.getLogger(__name__)

class NotificationScheduler:
    """Service for scheduling and sending daily notifications."""
    
    def __init__(self):
        self.db = SessionLocal()
        self.notification_service = NotificationService(self.db)
        self.quote_service = QuoteGenerator(self.db)
    
    def __del__(self):
        """Clean up database connection."""
        if hasattr(self, 'db'):
            self.db.close()
    
    async def send_notifications_for_time(self, target_time: str) -> int:
        """
        Send notifications to all users scheduled for the specified time.
        
        Args:
            target_time: Time in HH:MM format
            
        Returns:
            Number of notifications sent successfully
        """
        try:
            logger.info(f"Starting notification batch for time {target_time}")
            
            # Get users who should receive notifications at this time
            users = self.notification_service.get_users_for_notification(target_time)
            
            if not users:
                logger.info(f"No users found for notification time {target_time}")
                return 0
            
            # Send notifications concurrently
            tasks = []
            for user in users:
                task = self._send_notification_to_user(user)
                tasks.append(task)
            
            # Wait for all notifications to complete
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Count successful notifications
            successful = sum(1 for result in results if result is True)
            failed = len(results) - successful
            
            logger.info(f"Notification batch complete: {successful} sent, {failed} failed")
            return successful
            
        except Exception as e:
            logger.error(f"Error in send_notifications_for_time: {str(e)}")
            return 0
    
    async def _send_notification_to_user(self, user: User) -> bool:
        """
        Send notification to a specific user.
        
        Args:
            user: User to send notification to
            
        Returns:
            True if notification was sent successfully
        """
        try:
            # Get or generate today's quote for the user
            today = datetime.now(timezone.utc).date()
            quote = self.notification_service.quote_repo.get_by_user_and_date(user.id, today)
            
            if not quote:
                # Generate quote if it doesn't exist
                logger.info(f"Generating quote for user {user.id} for notification")
                quote = await self._generate_quote_for_user(user.id, today)
                
                if not quote:
                    logger.error(f"Failed to generate quote for user {user.id}")
                    return False
            
            # Send notification
            success = self.notification_service.send_daily_notification(user.id, quote)
            
            if success:
                logger.info(f"Notification sent successfully to user {user.id}")
            else:
                logger.error(f"Failed to send notification to user {user.id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending notification to user {user.id}: {str(e)}")
            return False
    
    async def _generate_quote_for_user(self, user_id: str, date) -> object:
        """
        Generate a quote for a user if one doesn't exist.
        
        Args:
            user_id: User identifier
            date: Date for the quote
            
        Returns:
            Generated quote or None if generation failed
        """
        try:
            # Use the quote generator service to create a new quote
            quote = await self.quote_service.generate_daily_quote(user_id, date)
            return quote
            
        except Exception as e:
            logger.error(f"Error generating quote for user {user_id}: {str(e)}")
            return None
    
    def get_notification_times(self) -> List[str]:
        """
        Get all unique notification times from active users.
        
        Returns:
            List of unique notification times in HH:MM format
        """
        try:
            users = self.db.query(User).filter(
                User.is_active == True,
                User.notification_settings.isnot(None)
            ).all()
            
            times = set()
            for user in users:
                settings = user.notification_settings or {}
                if settings.get('enabled', False) and settings.get('time'):
                    times.add(settings['time'])
            
            return sorted(list(times))
            
        except Exception as e:
            logger.error(f"Error getting notification times: {str(e)}")
            return []
    
    async def run_daily_notification_cycle(self):
        """
        Run a complete daily notification cycle for all scheduled times.
        
        This method should be called once per day to send all scheduled notifications.
        """
        try:
            logger.info("Starting daily notification cycle")
            
            notification_times = self.get_notification_times()
            
            if not notification_times:
                logger.info("No notification times found")
                return
            
            total_sent = 0
            current_time = datetime.now(timezone.utc).strftime('%H:%M')
            
            # Send notifications for each scheduled time
            for time_slot in notification_times:
                try:
                    sent = await self.send_notifications_for_time(time_slot)
                    total_sent += sent
                    
                    # Add delay between batches to avoid overwhelming the push service
                    await asyncio.sleep(1)
                    
                except Exception as e:
                    logger.error(f"Error processing time slot {time_slot}: {str(e)}")
            
            logger.info(f"Daily notification cycle complete: {total_sent} notifications sent")
            
        except Exception as e:
            logger.error(f"Error in run_daily_notification_cycle: {str(e)}")
    
    async def send_immediate_notifications(self):
        """
        Send notifications immediately to users whose notification time matches current time.
        
        This method is designed to be called every minute by a scheduler.
        """
        try:
            current_time = datetime.now(timezone.utc).strftime('%H:%M')
            logger.info(f"Checking for notifications at {current_time}")
            
            sent = await self.send_notifications_for_time(current_time)
            
            if sent > 0:
                logger.info(f"Sent {sent} notifications at {current_time}")
            
        except Exception as e:
            logger.error(f"Error in send_immediate_notifications: {str(e)}")

# Standalone function for use in cron jobs or task schedulers
async def run_notification_scheduler():
    """
    Standalone function to run the notification scheduler.
    
    This function can be called from external schedulers or cron jobs.
    """
    scheduler = NotificationScheduler()
    try:
        await scheduler.send_immediate_notifications()
    finally:
        # Ensure database connection is closed
        if hasattr(scheduler, 'db'):
            scheduler.db.close()

# CLI entry point for manual execution
if __name__ == "__main__":
    import sys
    
    async def main():
        if len(sys.argv) > 1 and sys.argv[1] == "daily":
            # Run full daily cycle
            scheduler = NotificationScheduler()
            await scheduler.run_daily_notification_cycle()
        else:
            # Run immediate notifications
            await run_notification_scheduler()
    
    asyncio.run(main())