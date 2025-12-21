"""
ARK Digital Calendar - FastAPI Application Entry Point

This module initializes the FastAPI application with all necessary middleware,
routes, and configuration for the ARK digital calendar system.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path

from app.core.config import settings
from app.database.database import engine, Base
from app.api import quotes, users, themes, notifications

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI application
app = FastAPI(
    title="ARK Digital Calendar API",
    description="API for personalized daily quotes and inspiration",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(quotes.router)
app.include_router(users.router)
app.include_router(themes.router)
app.include_router(notifications.router)

# Serve static files (for PWA frontend if needed)
static_path = Path(__file__).parent.parent.parent / "frontend" / "public"
if static_path.exists():
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

@app.get("/")
async def root():
    """Root endpoint providing API information."""
    return {
        "message": "ARK Digital Calendar API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy", "service": "ark-api"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )