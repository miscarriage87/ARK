"""
User API endpoints for ARK Digital Calendar.

This module provides REST API endpoints for user profile management,
questionnaire processing, and personalization features.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from app.database.database import get_db
from app.repositories.user_repository import UserRepository
from app.repositories.quote_repository import FeedbackRepository
from app.services.user_profile import UserProfileService, QuestionnaireResponse
from app.services.feedback_analyzer import FeedbackAnalyzer
from app.services.data_export import DataExportService
from app.core.auth import verify_user_access, get_current_user, require_authentication

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/users", tags=["users"])


# Pydantic models for request/response
class QuestionnaireResponseModel(BaseModel):
    """Model for questionnaire response."""
    question_id: str = Field(..., description="Question identifier")
    answer: str = Field(..., description="Selected answer")
    weight: float = Field(1.0, ge=0.1, le=2.0, description="Response weight")


class CreateProfileRequest(BaseModel):
    """Request model for creating user profile."""
    responses: List[QuestionnaireResponseModel] = Field(..., min_items=5, max_items=10)
    
    @validator('responses')
    def validate_responses(cls, v):
        """Validate questionnaire responses."""
        if not v:
            raise ValueError("Questionnaire responses are required")
        
        # Check for duplicate question IDs
        question_ids = [r.question_id for r in v]
        if len(question_ids) != len(set(question_ids)):
            raise ValueError("Duplicate question IDs not allowed")
        
        return v


class UpdateProfileRequest(BaseModel):
    """Request model for updating user profile."""
    notification_settings: Optional[Dict[str, Any]] = None
    preferences: Optional[Dict[str, Any]] = None


class UserProfileResponse(BaseModel):
    """Response model for user profile."""
    id: str
    personality_data: Optional[Dict[str, Any]]
    notification_settings: Optional[Dict[str, Any]]
    preferences: Optional[Dict[str, Any]]
    created_at: str
    updated_at: str


class QuestionnaireResponse(BaseModel):
    """Response model for questionnaire."""
    questions: List[Dict[str, Any]]


class FeedbackAnalysisResponse(BaseModel):
    """Response model for feedback analysis."""
    satisfaction_score: float
    patterns: List[Dict[str, Any]]
    adaptations: List[Dict[str, Any]]
    total_feedback: int


class SyncDataRequest(BaseModel):
    """Request model for data synchronization."""
    offline_changes: List[Dict[str, Any]] = Field(..., description="Changes made while offline")
    last_sync_timestamp: Optional[str] = Field(None, description="Last successful sync timestamp")
    
    @validator('offline_changes')
    def validate_offline_changes(cls, v):
        """Validate offline changes structure."""
        for change in v:
            if 'type' not in change or 'data' not in change:
                raise ValueError("Each offline change must have 'type' and 'data' fields")
            if change['type'] not in ['feedback', 'preferences', 'notification_settings']:
                raise ValueError("Invalid change type")
        return v


class SyncDataResponse(BaseModel):
    """Response model for data synchronization."""
    sync_successful: bool
    conflicts_resolved: int
    changes_applied: int
    sync_timestamp: str
    conflicts: List[Dict[str, Any]] = []


class DataExportResponse(BaseModel):
    """Response model for data export."""
    export_data: Dict[str, Any]
    export_size_bytes: int
    export_timestamp: str


# Initialize services
profile_service = UserProfileService()
feedback_analyzer = FeedbackAnalyzer()


@router.get("/questionnaire", response_model=QuestionnaireResponse)
async def get_questionnaire():
    """
    Get the standard questionnaire for user profiling.
    
    Returns:
        Questionnaire with questions and answer options
    """
    try:
        questions = profile_service.get_questionnaire()
        return QuestionnaireResponse(questions=questions)
    except Exception as e:
        logger.error(f"Error retrieving questionnaire: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve questionnaire"
        )


@router.post("/profile", response_model=UserProfileResponse)
async def create_user_profile(
    request: CreateProfileRequest,
    db: Session = Depends(get_db)
):
    """
    Create a new user profile from questionnaire responses.
    
    Args:
        request: Questionnaire responses and profile data
        db: Database session
        
    Returns:
        Created user profile
    """
    try:
        user_repo = UserRepository(db)
        
        # Convert request to service objects
        responses = [
            QuestionnaireResponse(
                question_id=r.question_id,
                answer=r.answer,
                weight=r.weight
            )
            for r in request.responses
        ]
        
        # Process questionnaire responses
        personality_weights = profile_service.process_questionnaire_responses(responses)
        personality_data = profile_service.create_user_profile_data(personality_weights)
        
        # Create user in database
        user_data = {
            'personality_data': personality_data,
            'notification_settings': {
                'enabled': False,
                'time': '09:00',
                'timezone': 'UTC'
            },
            'preferences': {
                'theme': 'light',
                'language': 'en',
                'quote_length': 'medium'
            }
        }
        
        user = user_repo.create(user_data)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user profile"
            )
        
        logger.info(f"Created user profile: {user.id}")
        
        return UserProfileResponse(
            id=user.id,
            personality_data=user.personality_data,
            notification_settings=user.notification_settings,
            preferences=user.preferences,
            created_at=user.created_at.isoformat(),
            updated_at=user.updated_at.isoformat()
        )
        
    except ValueError as e:
        logger.warning(f"Invalid questionnaire data: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating user profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user profile"
        )


@router.get("/profile/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: str,
    db: Session = Depends(get_db),
    authenticated_user: str = Depends(verify_user_access)
):
    """
    Get user profile by ID.
    
    Requires authentication and authorization to access user data.
    Validates: Requirements 2.1, 9.2 - profile access with authorization
    
    Args:
        user_id: User identifier
        db: Database session
        authenticated_user: Verified authenticated user ID
        
    Returns:
        User profile data
    """
    try:
        user_repo = UserRepository(db)
        user = user_repo.get_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        logger.info(f"Retrieved profile for user {user_id}")
        
        return UserProfileResponse(
            id=user.id,
            personality_data=user.personality_data,
            notification_settings=user.notification_settings,
            preferences=user.preferences,
            created_at=user.created_at.isoformat(),
            updated_at=user.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving user profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user profile"
        )


@router.put("/profile/{user_id}", response_model=UserProfileResponse)
async def update_user_profile(
    user_id: str,
    request: UpdateProfileRequest,
    db: Session = Depends(get_db),
    authenticated_user: str = Depends(verify_user_access)
):
    """
    Update user profile settings.
    
    Requires authentication and authorization to modify user data.
    Validates: Requirements 2.2, 9.2 - profile updates with authorization
    
    Args:
        user_id: User identifier
        request: Profile update data
        db: Database session
        authenticated_user: Verified authenticated user ID
        
    Returns:
        Updated user profile
    """
    try:
        user_repo = UserRepository(db)
        user = user_repo.get_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        # Track what was updated for logging
        updates_made = []
        
        # Update notification settings if provided
        if request.notification_settings is not None:
            # Validate notification settings structure
            valid_keys = {'enabled', 'time', 'timezone', 'frequency'}
            if not all(key in valid_keys for key in request.notification_settings.keys()):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid notification settings keys"
                )
            
            user = user_repo.update_notification_settings(user_id, request.notification_settings)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update notification settings"
                )
            updates_made.append("notification_settings")
        
        # Update preferences if provided
        if request.preferences is not None:
            # Validate preferences structure
            valid_pref_keys = {'theme', 'language', 'quote_length', 'timezone'}
            if not all(key in valid_pref_keys for key in request.preferences.keys()):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid preferences keys"
                )
            
            updated_data = {'preferences': request.preferences}
            user = user_repo.update(user_id, updated_data)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update preferences"
                )
            updates_made.append("preferences")
        
        if not updates_made:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid updates provided"
            )
        
        logger.info(f"Updated user profile {user_id}: {', '.join(updates_made)}")
        
        return UserProfileResponse(
            id=user.id,
            personality_data=user.personality_data,
            notification_settings=user.notification_settings,
            preferences=user.preferences,
            created_at=user.created_at.isoformat(),
            updated_at=user.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user profile"
        )


@router.post("/profile/{user_id}/adapt", response_model=UserProfileResponse)
async def adapt_user_profile_from_feedback(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Adapt user profile based on feedback patterns.
    
    Args:
        user_id: User identifier
        db: Database session
        
    Returns:
        Updated user profile after adaptation
    """
    try:
        user_repo = UserRepository(db)
        feedback_repo = FeedbackRepository(db)
        
        # Get user and feedback history
        user = user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        feedback_history = feedback_repo.get_user_feedback(user_id, limit=100)
        
        if len(feedback_history) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient feedback for profile adaptation"
            )
        
        # Analyze feedback patterns
        patterns = feedback_analyzer.analyze_feedback_patterns(feedback_history, user.personality_data)
        adaptations = feedback_analyzer.generate_profile_adaptations(patterns, user.personality_data)
        
        if not adaptations:
            logger.info(f"No profile adaptations needed for user: {user_id}")
            return UserProfileResponse(
                id=user.id,
                personality_data=user.personality_data,
                notification_settings=user.notification_settings,
                preferences=user.preferences,
                created_at=user.created_at.isoformat(),
                updated_at=user.updated_at.isoformat()
            )
        
        # Apply adaptations to profile
        updated_profile = profile_service.update_profile_from_feedback(
            user.personality_data, adaptations
        )
        
        # Update user in database
        user = user_repo.update_personality_data(user_id, updated_profile)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user profile"
            )
        
        logger.info(f"Adapted user profile from feedback: {user_id}, {len(adaptations)} adaptations applied")
        
        return UserProfileResponse(
            id=user.id,
            personality_data=user.personality_data,
            notification_settings=user.notification_settings,
            preferences=user.preferences,
            created_at=user.created_at.isoformat(),
            updated_at=user.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adapting user profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to adapt user profile"
        )


@router.get("/profile/{user_id}/feedback-analysis", response_model=FeedbackAnalysisResponse)
async def get_feedback_analysis(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Get feedback analysis and satisfaction metrics for a user.
    
    Args:
        user_id: User identifier
        db: Database session
        
    Returns:
        Feedback analysis with patterns and satisfaction score
    """
    try:
        user_repo = UserRepository(db)
        feedback_repo = FeedbackRepository(db)
        
        # Verify user exists
        user = user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        # Get feedback history
        feedback_history = feedback_repo.get_user_feedback(user_id, limit=100)
        
        if not feedback_history:
            return FeedbackAnalysisResponse(
                satisfaction_score=0.5,
                patterns=[],
                adaptations=[],
                total_feedback=0
            )
        
        # Analyze feedback
        satisfaction_score = feedback_analyzer.calculate_feedback_satisfaction_score(feedback_history)
        patterns = feedback_analyzer.analyze_feedback_patterns(feedback_history, user.personality_data)
        adaptations = feedback_analyzer.generate_profile_adaptations(patterns, user.personality_data)
        
        # Convert patterns to dict format
        pattern_dicts = [
            {
                'category': p.category,
                'pattern_type': p.pattern_type,
                'strength': p.strength,
                'weight_adjustment': p.weight_adjustment,
                'confidence_change': p.confidence_change,
                'evidence': p.evidence
            }
            for p in patterns
        ]
        
        return FeedbackAnalysisResponse(
            satisfaction_score=satisfaction_score,
            patterns=pattern_dicts,
            adaptations=adaptations,
            total_feedback=len(feedback_history)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing feedback: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze feedback"
        )


@router.post("/profile/{user_id}/sync", response_model=SyncDataResponse)
async def sync_user_data(
    user_id: str,
    request: SyncDataRequest,
    db: Session = Depends(get_db),
    authenticated_user: str = Depends(verify_user_access)
):
    """
    Synchronize offline user data changes.
    
    Handles conflict resolution and data merging for offline/online synchronization.
    Validates: Requirements 5.5, 9.2, 9.4 - data synchronization
    
    Args:
        user_id: User identifier
        request: Sync data with offline changes
        db: Database session
        authenticated_user: Verified authenticated user ID
        
    Returns:
        Synchronization results with conflict information
    """
    try:
        user_repo = UserRepository(db)
        feedback_repo = FeedbackRepository(db)
        
        # Verify user exists
        user = user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        sync_timestamp = datetime.utcnow().isoformat()
        changes_applied = 0
        conflicts_resolved = 0
        conflicts = []
        
        # Process offline changes
        for change in request.offline_changes:
            change_type = change['type']
            change_data = change['data']
            change_timestamp = change.get('timestamp')
            
            try:
                if change_type == 'feedback':
                    # Handle feedback synchronization
                    quote_id = change_data.get('quote_id')
                    rating = change_data.get('rating')
                    context = change_data.get('context', {})
                    
                    if quote_id and rating:
                        # Check for existing feedback (potential conflict)
                        existing_feedback = feedback_repo.get_by_quote_and_user(quote_id, user_id)
                        
                        if existing_feedback and change_timestamp:
                            # Compare timestamps to resolve conflict
                            existing_timestamp = existing_feedback.timestamp
                            change_dt = datetime.fromisoformat(change_timestamp.replace('Z', '+00:00'))
                            
                            if existing_timestamp > change_dt:
                                # Server version is newer, record conflict but keep server version
                                conflicts.append({
                                    'type': 'feedback',
                                    'quote_id': quote_id,
                                    'resolution': 'server_version_kept',
                                    'reason': 'server_timestamp_newer'
                                })
                                conflicts_resolved += 1
                                continue
                        
                        # Apply the change
                        feedback_repo.update_or_create_feedback(
                            quote_id=quote_id,
                            user_id=user_id,
                            rating=rating,
                            context=context
                        )
                        changes_applied += 1
                
                elif change_type == 'preferences':
                    # Handle preferences synchronization
                    new_preferences = change_data
                    
                    # Merge with existing preferences (offline changes take precedence)
                    current_preferences = user.preferences or {}
                    merged_preferences = {**current_preferences, **new_preferences}
                    
                    user_repo.update(user_id, {'preferences': merged_preferences})
                    changes_applied += 1
                
                elif change_type == 'notification_settings':
                    # Handle notification settings synchronization
                    new_settings = change_data
                    
                    # Merge with existing settings
                    current_settings = user.notification_settings or {}
                    merged_settings = {**current_settings, **new_settings}
                    
                    user_repo.update_notification_settings(user_id, merged_settings)
                    changes_applied += 1
                
            except Exception as change_error:
                logger.error(f"Error processing sync change {change_type}: {change_error}")
                conflicts.append({
                    'type': change_type,
                    'error': str(change_error),
                    'resolution': 'change_skipped'
                })
                conflicts_resolved += 1
        
        # Update user's last sync timestamp
        user_repo.update(user_id, {
            'sync_token': sync_timestamp
        })
        
        logger.info(f"Sync completed for user {user_id}: {changes_applied} changes applied, {conflicts_resolved} conflicts resolved")
        
        return SyncDataResponse(
            sync_successful=True,
            conflicts_resolved=conflicts_resolved,
            changes_applied=changes_applied,
            sync_timestamp=sync_timestamp,
            conflicts=conflicts
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error synchronizing user data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to synchronize user data"
        )


@router.get("/profile/{user_id}/export", response_model=DataExportResponse)
async def export_user_data(
    user_id: str,
    db: Session = Depends(get_db),
    authenticated_user: str = Depends(verify_user_access)
):
    """
    Export complete user data in JSON format.
    
    Exports all user data including quotes, profile, and feedback history.
    Validates: Requirements 9.5 - complete data export functionality
    
    Args:
        user_id: User identifier
        db: Database session
        authenticated_user: Verified authenticated user ID
        
    Returns:
        Complete user data export in JSON format
    """
    try:
        export_service = DataExportService(db)
        
        # Export user data
        export_data = export_service.export_user_data(user_id)
        if not export_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found or export failed"
            )
        
        # Validate export completeness
        if not export_service.validate_export_completeness(user_id, export_data):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Export validation failed - incomplete data"
            )
        
        # Calculate export size
        export_json = export_service.export_user_data_json(user_id)
        export_size = len(export_json.encode('utf-8')) if export_json else 0
        
        logger.info(f"Successfully exported data for user {user_id}: {export_size} bytes")
        
        return DataExportResponse(
            export_data=export_data,
            export_size_bytes=export_size,
            export_timestamp=export_data["export_metadata"]["export_timestamp"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting user data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export user data"
        )