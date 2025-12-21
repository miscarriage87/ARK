"""
Authentication and authorization utilities for ARK Digital Calendar.

This module provides basic authentication and authorization helpers.
For production, this should be replaced with proper JWT/OAuth2 implementation.
"""

from typing import Optional
from fastapi import Header, HTTPException, status
import logging

logger = logging.getLogger(__name__)


async def verify_user_access(
    user_id: str,
    x_user_id: Optional[str] = Header(None, description="User ID from authentication")
) -> str:
    """
    Verify that the authenticated user matches the requested user_id.
    
    This is a basic authorization check. In production, this should be replaced
    with proper JWT token validation and user session management.
    
    Args:
        user_id: The user ID being accessed
        x_user_id: The authenticated user ID from headers
        
    Returns:
        The verified user ID
        
    Raises:
        HTTPException: If authorization fails
    """
    # For development/testing, if no auth header is provided, allow access
    # In production, this should always require authentication
    if x_user_id is None:
        logger.warning(f"No authentication header provided for user {user_id} - allowing for development")
        return user_id
    
    # Verify the authenticated user matches the requested user
    if x_user_id != user_id:
        logger.warning(f"Authorization failed: user {x_user_id} attempted to access user {user_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this user's data"
        )
    
    return user_id


async def get_current_user(
    x_user_id: Optional[str] = Header(None, description="User ID from authentication")
) -> Optional[str]:
    """
    Get the current authenticated user ID.
    
    This is a basic authentication check. In production, this should validate
    JWT tokens and return the authenticated user information.
    
    Args:
        x_user_id: The user ID from authentication headers
        
    Returns:
        The authenticated user ID, or None if not authenticated
    """
    return x_user_id


def require_authentication(user_id: Optional[str]) -> str:
    """
    Require that a user is authenticated.
    
    Args:
        user_id: The user ID from authentication
        
    Returns:
        The verified user ID
        
    Raises:
        HTTPException: If not authenticated
    """
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return user_id
