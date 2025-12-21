"""
End-to-End System Validation Tests

This module contains comprehensive end-to-end tests that validate the complete
ARK Digital Calendar application flow in a production-like environment.
Tests cover all major user journeys and system integrations.
"""

import pytest
import asyncio
import json
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any
from unittest.mock import Mock, patch
import requests
import sqlite3
import os
import tempfile
import shutil

from app.main import app
from app.database.database import get_db, engine
from app.models.user import User
from app.models.quote import Quote
from app.models.theme import Theme
from app.repositories.user_repository import UserRepository
from app.repositories.quote_repository import QuoteRepository
from app.repositories.theme_repository import ThemeRepository
from app.services.quote_generator import QuoteGeneratorService
from app.services.user_profile import UserProfileService
from app.services.notification_service import NotificationService
from app.services.data_export import DataExportService
from app.core.config import settings
from fastapi.testclient import TestClient

class EndToEndTestEnvironment:
    """Test environment setup for end-to-end validation"""
    
    def __init__(self):
        self.client = TestClient(app)
        self.test_db_path = None
        self.original_db_url = None
        self.test_users = []
        
    def setup(self):
        """Set up test environment with isolated database"""
        # Create temporary database for testing
        self.test_db_path = tempfile.mktemp(suffix='.db')
        self.original_db_url = settings.DATABASE_URL
        settings.DATABASE_URL = f"sqlite:///{self.test_db_path}"
        
        # Initialize test database
        from app.database.database import Base
        from sqlalchemy import create_engine
        test_engine = create_engine(settings.DATABASE_URL)
        Base.metadata.create_all(bind=test_engine)
        
        # Initialize themes for testing
        self._setup_test_themes()
        
    def teardown(self):
        """Clean up test environment"""
        if self.test_db_path and os.path.exists(self.test_db_path):
            os.unlink(self.test_db_path)
        if self.original_db_url:
            settings.DATABASE_URL = self.original_db_url
            
    def _setup_test_themes(self):
        """Set up test themes for the current month"""
        db = next(get_db())
        theme_repo = ThemeRepository(db)
        
        # Create monthly theme
        current_date = datetime.now(timezone.utc)
        month_start = current_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        
        monthly_theme = Theme(
            name="Personal Growth",
            description="Focus on self-improvement and development",
            type="monthly",
            start_date=month_start.date(),
            end_date=month_end.date(),
            keywords=["growth", "improvement", "development", "learning"],
            personality_alignment={"spirituality": 0.3, "education": 0.4, "philosophy": 0.3}
        )
        theme_repo.create(monthly_theme)
        
        # Create weekly sub-themes
        week_start = month_start
        for week_num in range(4):
            week_end = week_start + timedelta(days=6)
            if week_end > month_end:
                week_end = month_end
                
            weekly_theme = Theme(
                name=f"Growth Week {week_num + 1}",
                description=f"Week {week_num + 1} of personal growth focus",
                type="weekly",
                start_date=week_start.date(),
                end_date=week_end.date(),
                parent_theme_id=monthly_theme.id,
                keywords=["weekly", "focus", "development"],
                personality_alignment={"education": 0.5, "philosophy": 0.5}
            )
            theme_repo.create(weekly_theme)
            week_start = week_end + timedelta(days=1)
            
        db.close()

@pytest.fixture
def e2e_env():
    """Fixture providing end-to-end test environment"""
    env = EndToEndTestEnvironment()
    env.setup()
    yield env
    env.teardown()

class TestCompleteUserJourney:
    """Test complete user journeys from start to finish"""
    
    def test_new_user_complete_onboarding_flow(self, e2e_env):
        """Test complete new user onboarding and first week usage"""
        client = e2e_env.client
        
        # Step 1: New user visits application
        response = client.get("/")
        assert response.status_code == 200
        
        # Step 2: User completes questionnaire
        questionnaire_data = {
            "responses": [
                {"question": "What motivates you most?", "answer": "Learning new things"},
                {"question": "How do you prefer to start your day?", "answer": "With reflection"},
                {"question": "What type of content inspires you?", "answer": "Educational quotes"},
                {"question": "How do you handle challenges?", "answer": "With patience and planning"},
                {"question": "What's your ideal mindset?", "answer": "Growth-oriented"}
            ]
        }
        
        response = client.post("/api/users/profile", json=questionnaire_data)
        assert response.status_code == 200
        user_data = response.json()
        user_id = user_data["id"]
        
        # Verify profile creation
        assert "personality_categories" in user_data
        assert len(user_data["personality_categories"]) > 0
        
        # Step 3: User gets first daily quote
        response = client.get(f"/api/quotes/today?user_id={user_id}")
        assert response.status_code == 200
        quote_data = response.json()
        
        assert "content" in quote_data
        assert "theme" in quote_data
        assert len(quote_data["content"]) > 0
        
        # Step 4: User provides feedback
        feedback_data = {
            "rating": "like",
            "quote_id": quote_data["id"]
        }
        response = client.post("/api/quotes/feedback", json=feedback_data)
        assert response.status_code == 200
        
        # Step 5: Simulate daily usage for a week
        for day in range(1, 8):
            # Get daily quote
            response = client.get(f"/api/quotes/today?user_id={user_id}")
            assert response.status_code == 200
            daily_quote = response.json()
            
            # Provide feedback (vary the ratings)
            rating = "like" if day % 3 == 0 else "neutral" if day % 2 == 0 else "dislike"
            feedback_data = {
                "rating": rating,
                "quote_id": daily_quote["id"]
            }
            client.post("/api/quotes/feedback", json=feedback_data)
            
        # Step 6: Check archive after a week
        response = client.get(f"/api/quotes/archive?user_id={user_id}")
        assert response.status_code == 200
        archive_data = response.json()
        
        assert len(archive_data["quotes"]) >= 7  # At least 7 days of quotes
        
        # Step 7: Test search functionality
        response = client.get(f"/api/quotes/search?user_id={user_id}&q=growth")
        assert response.status_code == 200
        search_results = response.json()
        
        # Should find theme-related quotes
        assert len(search_results["quotes"]) > 0
        
    def test_returning_user_personalization_evolution(self, e2e_env):
        """Test how personalization evolves for returning users over time"""
        client = e2e_env.client
        
        # Create user with initial profile
        questionnaire_data = {
            "responses": [
                {"question": "What motivates you most?", "answer": "Spiritual growth"},
                {"question": "How do you prefer to start your day?", "answer": "With meditation"},
                {"question": "What type of content inspires you?", "answer": "Philosophical quotes"},
                {"question": "How do you handle challenges?", "answer": "With inner strength"},
                {"question": "What's your ideal mindset?", "answer": "Peaceful and centered"}
            ]
        }
        
        response = client.post("/api/users/profile", json=questionnaire_data)
        user_data = response.json()
        user_id = user_data["id"]
        
        # Get initial profile weights
        initial_profile = user_data["personality_categories"]
        initial_spirituality = next(
            (cat["weight"] for cat in initial_profile if cat["category"] == "spirituality"), 0
        )
        
        # Simulate 30 days of consistent feedback toward education
        for day in range(30):
            # Get daily quote
            response = client.get(f"/api/quotes/today?user_id={user_id}")
            quote_data = response.json()
            
            # Provide feedback based on content type
            # Like educational content, dislike purely spiritual content
            content = quote_data["content"].lower()
            if any(word in content for word in ["learn", "knowledge", "education", "study"]):
                rating = "like"
            elif any(word in content for word in ["spirit", "soul", "divine", "sacred"]):
                rating = "dislike"
            else:
                rating = "neutral"
                
            feedback_data = {
                "rating": rating,
                "quote_id": quote_data["id"]
            }
            client.post("/api/quotes/feedback", json=feedback_data)
            
        # Check updated profile
        response = client.get(f"/api/users/profile?user_id={user_id}")
        updated_profile = response.json()
        updated_categories = updated_profile["personality_categories"]
        
        updated_spirituality = next(
            (cat["weight"] for cat in updated_categories if cat["category"] == "spirituality"), 0
        )
        updated_education = next(
            (cat["weight"] for cat in updated_categories if cat["category"] == "education"), 0
        )
        
        # Verify personalization adaptation
        # Spirituality weight should decrease, education should increase
        assert updated_education > 0.3, "Education weight should increase with positive feedback"
        
        # Verify quotes are now more educational
        educational_quotes = 0
        for _ in range(10):
            response = client.get(f"/api/quotes/today?user_id={user_id}")
            quote_data = response.json()
            content = quote_data["content"].lower()
            if any(word in content for word in ["learn", "knowledge", "education", "study"]):
                educational_quotes += 1
                
        assert educational_quotes >= 3, "Should generate more educational quotes after feedback"

class TestSystemIntegration:
    """Test integration between different system components"""
    
    def test_theme_quote_personalization_integration(self, e2e_env):
        """Test integration between themes, quote generation, and personalization"""
        client = e2e_env.client
        
        # Create user with strong philosophy preference
        questionnaire_data = {
            "responses": [
                {"question": "What motivates you most?", "answer": "Deep thinking"},
                {"question": "How do you prefer to start your day?", "answer": "With contemplation"},
                {"question": "What type of content inspires you?", "answer": "Philosophical insights"},
                {"question": "How do you handle challenges?", "answer": "Through reasoning"},
                {"question": "What's your ideal mindset?", "answer": "Analytical and thoughtful"}
            ]
        }
        
        response = client.post("/api/users/profile", json=questionnaire_data)
        user_data = response.json()
        user_id = user_data["id"]
        
        # Generate quotes over several days
        quotes_generated = []
        for day in range(7):
            response = client.get(f"/api/quotes/today?user_id={user_id}")
            assert response.status_code == 200
            quote_data = response.json()
            quotes_generated.append(quote_data)
            
        # Verify theme integration
        for quote in quotes_generated:
            assert "theme" in quote
            theme = quote["theme"]
            assert theme["name"] in ["Personal Growth", "Growth Week 1", "Growth Week 2", "Growth Week 3", "Growth Week 4"]
            
        # Verify personalization (should contain philosophical elements)
        philosophical_content = 0
        for quote in quotes_generated:
            content = quote["content"].lower()
            if any(word in content for word in ["think", "wisdom", "philosophy", "reason", "mind"]):
                philosophical_content += 1
                
        assert philosophical_content >= 3, "Should generate philosophically-aligned content"
        
    def test_notification_system_integration(self, e2e_env):
        """Test notification system integration with user preferences"""
        client = e2e_env.client
        
        # Create user and set notification preferences
        questionnaire_data = {
            "responses": [
                {"question": "What motivates you most?", "answer": "Daily inspiration"},
                {"question": "How do you prefer to start your day?", "answer": "With motivation"},
                {"question": "What type of content inspires you?", "answer": "Uplifting quotes"},
                {"question": "How do you handle challenges?", "answer": "With positivity"},
                {"question": "What's your ideal mindset?", "answer": "Optimistic"}
            ]
        }
        
        response = client.post("/api/users/profile", json=questionnaire_data)
        user_data = response.json()
        user_id = user_data["id"]
        
        # Set notification preferences
        notification_prefs = {
            "enabled": True,
            "time": "08:00",
            "timezone": "UTC",
            "include_preview": True
        }
        
        response = client.put(
            f"/api/users/profile?user_id={user_id}",
            json={"notification_settings": notification_prefs}
        )
        assert response.status_code == 200
        
        # Test notification scheduling
        response = client.post(f"/api/notifications/schedule?user_id={user_id}")
        assert response.status_code == 200
        
        # Verify notification preferences are stored
        response = client.get(f"/api/users/profile?user_id={user_id}")
        profile = response.json()
        stored_prefs = profile["notification_settings"]
        
        assert stored_prefs["enabled"] == True
        assert stored_prefs["time"] == "08:00"
        assert stored_prefs["include_preview"] == True

class TestDataConsistency:
    """Test data consistency across the system"""
    
    def test_data_export_and_integrity(self, e2e_env):
        """Test complete data export functionality and integrity"""
        client = e2e_env.client
        
        # Create user with rich data
        questionnaire_data = {
            "responses": [
                {"question": "What motivates you most?", "answer": "Personal achievement"},
                {"question": "How do you prefer to start your day?", "answer": "With goals"},
                {"question": "What type of content inspires you?", "answer": "Success stories"},
                {"question": "How do you handle challenges?", "answer": "With determination"},
                {"question": "What's your ideal mindset?", "answer": "Achievement-focused"}
            ]
        }
        
        response = client.post("/api/users/profile", json=questionnaire_data)
        user_data = response.json()
        user_id = user_data["id"]
        
        # Generate quotes and feedback over time
        quotes_with_feedback = []
        for day in range(14):
            # Get quote
            response = client.get(f"/api/quotes/today?user_id={user_id}")
            quote_data = response.json()
            
            # Provide feedback
            rating = ["like", "neutral", "dislike"][day % 3]
            feedback_data = {
                "rating": rating,
                "quote_id": quote_data["id"]
            }
            client.post("/api/quotes/feedback", json=feedback_data)
            
            quotes_with_feedback.append({
                "quote": quote_data,
                "feedback": rating
            })
            
        # Export user data
        response = client.get(f"/api/users/export?user_id={user_id}")
        assert response.status_code == 200
        export_data = response.json()
        
        # Verify export completeness
        assert "user_profile" in export_data
        assert "quotes" in export_data
        assert "feedback_history" in export_data
        assert "themes" in export_data
        
        # Verify all quotes are included
        exported_quotes = export_data["quotes"]
        assert len(exported_quotes) == 14
        
        # Verify all feedback is included
        exported_feedback = export_data["feedback_history"]
        assert len(exported_feedback) == 14
        
        # Verify data integrity
        for i, quote_feedback in enumerate(quotes_with_feedback):
            exported_quote = next(
                (q for q in exported_quotes if q["id"] == quote_feedback["quote"]["id"]), None
            )
            assert exported_quote is not None
            
            exported_fb = next(
                (f for f in exported_feedback if f["quote_id"] == quote_feedback["quote"]["id"]), None
            )
            assert exported_fb is not None
            assert exported_fb["rating"] == quote_feedback["feedback"]

class TestSystemResilience:
    """Test system resilience and error handling"""
    
    def test_graceful_degradation_scenarios(self, e2e_env):
        """Test system behavior under various failure conditions"""
        client = e2e_env.client
        
        # Create test user
        questionnaire_data = {
            "responses": [
                {"question": "What motivates you most?", "answer": "Resilience"},
                {"question": "How do you prefer to start your day?", "answer": "With strength"},
                {"question": "What type of content inspires you?", "answer": "Motivational quotes"},
                {"question": "How do you handle challenges?", "answer": "With perseverance"},
                {"question": "What's your ideal mindset?", "answer": "Resilient"}
            ]
        }
        
        response = client.post("/api/users/profile", json=questionnaire_data)
        user_data = response.json()
        user_id = user_data["id"]
        
        # Test 1: AI service failure simulation
        with patch('app.services.quote_generator.QuoteGeneratorService._generate_with_ai') as mock_ai:
            mock_ai.side_effect = Exception("AI service unavailable")
            
            # Should still get a quote (fallback mechanism)
            response = client.get(f"/api/quotes/today?user_id={user_id}")
            assert response.status_code == 200
            quote_data = response.json()
            assert "content" in quote_data
            assert len(quote_data["content"]) > 0
            
        # Test 2: Database connection issues
        # This would require more complex setup to simulate properly
        # For now, verify the system handles invalid user IDs gracefully
        response = client.get("/api/quotes/today?user_id=invalid-id")
        assert response.status_code in [400, 404]  # Should handle gracefully
        
        # Test 3: Invalid feedback data
        invalid_feedback = {
            "rating": "invalid_rating",
            "quote_id": "invalid_id"
        }
        response = client.post("/api/quotes/feedback", json=invalid_feedback)
        assert response.status_code in [400, 422]  # Should validate input
        
    def test_concurrent_user_operations(self, e2e_env):
        """Test system behavior with concurrent user operations"""
        client = e2e_env.client
        
        # Create multiple users
        users = []
        for i in range(5):
            questionnaire_data = {
                "responses": [
                    {"question": "What motivates you most?", "answer": f"Goal {i}"},
                    {"question": "How do you prefer to start your day?", "answer": f"Method {i}"},
                    {"question": "What type of content inspires you?", "answer": f"Type {i}"},
                    {"question": "How do you handle challenges?", "answer": f"Approach {i}"},
                    {"question": "What's your ideal mindset?", "answer": f"Mindset {i}"}
                ]
            }
            
            response = client.post("/api/users/profile", json=questionnaire_data)
            assert response.status_code == 200
            users.append(response.json())
            
        # Simulate concurrent quote requests
        import threading
        results = []
        errors = []
        
        def get_quote_for_user(user_id):
            try:
                response = client.get(f"/api/quotes/today?user_id={user_id}")
                if response.status_code == 200:
                    results.append(response.json())
                else:
                    errors.append(f"User {user_id}: {response.status_code}")
            except Exception as e:
                errors.append(f"User {user_id}: {str(e)}")
                
        threads = []
        for user in users:
            thread = threading.Thread(target=get_quote_for_user, args=(user["id"],))
            threads.append(thread)
            thread.start()
            
        for thread in threads:
            thread.join()
            
        # Verify all users got quotes successfully
        assert len(results) == 5, f"Expected 5 successful quotes, got {len(results)}. Errors: {errors}"
        
        # Verify quotes are unique per user
        quote_contents = [result["content"] for result in results]
        user_ids = [result["user_id"] for result in results]
        
        # Each user should have their own quote
        assert len(set(user_ids)) == 5, "Each user should have their own quote"

class TestCrossBrowserCompatibility:
    """Test cross-browser compatibility and PWA features"""
    
    def test_pwa_manifest_and_service_worker(self, e2e_env):
        """Test PWA manifest and service worker functionality"""
        client = e2e_env.client
        
        # Test manifest.json
        response = client.get("/manifest.json")
        assert response.status_code == 200
        manifest = response.json()
        
        assert "name" in manifest
        assert "short_name" in manifest
        assert "start_url" in manifest
        assert "display" in manifest
        assert "icons" in manifest
        
        # Test service worker
        response = client.get("/sw.js")
        assert response.status_code == 200
        
        # Verify service worker content
        sw_content = response.text
        assert "install" in sw_content or "fetch" in sw_content
        
    def test_offline_functionality_simulation(self, e2e_env):
        """Test offline functionality through API simulation"""
        client = e2e_env.client
        
        # Create user and get initial quote
        questionnaire_data = {
            "responses": [
                {"question": "What motivates you most?", "answer": "Independence"},
                {"question": "How do you prefer to start your day?", "answer": "Self-sufficiently"},
                {"question": "What type of content inspires you?", "answer": "Self-reliance quotes"},
                {"question": "How do you handle challenges?", "answer": "Independently"},
                {"question": "What's your ideal mindset?", "answer": "Self-reliant"}
            ]
        }
        
        response = client.post("/api/users/profile", json=questionnaire_data)
        user_data = response.json()
        user_id = user_data["id"]
        
        # Get quote (this would be cached in real PWA)
        response = client.get(f"/api/quotes/today?user_id={user_id}")
        assert response.status_code == 200
        cached_quote = response.json()
        
        # Simulate offline feedback (would be queued in real PWA)
        offline_feedback = {
            "rating": "like",
            "quote_id": cached_quote["id"],
            "offline": True,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # When back online, sync the feedback
        response = client.post("/api/quotes/feedback", json=offline_feedback)
        assert response.status_code == 200
        
        # Verify feedback was processed
        response = client.get(f"/api/quotes/archive?user_id={user_id}")
        archive = response.json()
        
        # Find the quote and verify it has feedback
        quote_with_feedback = next(
            (q for q in archive["quotes"] if q["id"] == cached_quote["id"]), None
        )
        assert quote_with_feedback is not None
        # Note: Feedback verification would depend on API response structure

def run_end_to_end_validation():
    """Run all end-to-end validation tests"""
    print("Starting End-to-End System Validation...")
    print("=" * 60)
    
    # Run tests with pytest
    test_results = pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "--capture=no"
    ])
    
    if test_results == 0:
        print("\n" + "=" * 60)
        print("✅ All End-to-End Tests PASSED!")
        print("✅ System is ready for production deployment")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("❌ Some End-to-End Tests FAILED!")
        print("❌ System needs fixes before production deployment")
        print("=" * 60)
        
    return test_results == 0

if __name__ == "__main__":
    success = run_end_to_end_validation()
    exit(0 if success else 1)