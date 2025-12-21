"""
Configuration settings for the ARK Digital Calendar application.

This module handles all configuration settings using Pydantic BaseSettings,
allowing for environment variable overrides and type validation.
"""

from pydantic import BaseSettings, Field
from typing import List
import os
from pathlib import Path

class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Database configuration
    DATABASE_URL: str = Field(
        default="sqlite:///./database/ark.db",
        description="Database connection URL"
    )
    
    # API configuration
    SECRET_KEY: str = Field(
        default="your-secret-key-change-in-production",
        description="Secret key for JWT token generation"
    )
    
    ALGORITHM: str = Field(
        default="HS256",
        description="Algorithm for JWT token encoding"
    )
    
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30,
        description="Access token expiration time in minutes"
    )
    
    # CORS configuration
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8080", "http://127.0.0.1:3000"],
        description="Allowed CORS origins"
    )
    
    # AI Service configuration
    OPENAI_API_KEY: str = Field(
        default="",
        description="OpenAI API key for quote generation"
    )
    
    OPENAI_MODEL: str = Field(
        default="gpt-3.5-turbo",
        description="OpenAI model to use for quote generation"
    )
    
    # Application configuration
    APP_NAME: str = Field(
        default="ARK Digital Calendar",
        description="Application name"
    )
    
    DEBUG: bool = Field(
        default=False,
        description="Debug mode flag"
    )
    
    # Notification configuration
    VAPID_PUBLIC_KEY: str = Field(
        default="",
        description="VAPID public key for push notifications"
    )
    
    VAPID_PRIVATE_KEY: str = Field(
        default="",
        description="VAPID private key for push notifications"
    )
    
    VAPID_CLAIMS_EMAIL: str = Field(
        default="admin@arkapp.com",
        description="VAPID claims email"
    )
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = Field(
        default=60,
        description="API rate limit per minute per user"
    )
    
    # File storage
    UPLOAD_DIR: str = Field(
        default="./uploads",
        description="Directory for file uploads"
    )
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

# Create settings instance
settings = Settings()

# Ensure required directories exist
def ensure_directories():
    """Create necessary directories if they don't exist."""
    directories = [
        Path(settings.DATABASE_URL.replace("sqlite:///", "")).parent,
        Path(settings.UPLOAD_DIR),
    ]
    
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)

# Initialize directories
ensure_directories()