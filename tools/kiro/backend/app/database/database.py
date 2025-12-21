"""
Database configuration and session management for ARK Digital Calendar.

This module sets up SQLAlchemy engine, session factory, and base model class
for the ARK application database operations.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import threading
from app.core.config import settings

# Configure SQLite for better concurrency handling
sqlite_connect_args = {
    "check_same_thread": False,
    "timeout": 30,  # 30 second timeout for database locks
}

# Create SQLAlchemy engine with proper concurrency settings
if "sqlite" in settings.DATABASE_URL:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args=sqlite_connect_args,
        poolclass=StaticPool,
        pool_pre_ping=True,
        pool_recycle=300,  # Recycle connections every 5 minutes
        echo=settings.DEBUG  # Log SQL queries in debug mode
    )
    
    # Enable WAL mode for better concurrency in SQLite
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        # Enable WAL mode for better concurrent access
        cursor.execute("PRAGMA journal_mode=WAL")
        # Set busy timeout to 30 seconds
        cursor.execute("PRAGMA busy_timeout=30000")
        # Enable foreign key constraints
        cursor.execute("PRAGMA foreign_keys=ON")
        # Set synchronous mode to NORMAL for better performance
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()
else:
    # For non-SQLite databases (PostgreSQL, MySQL, etc.)
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        echo=settings.DEBUG
    )

# Create SessionLocal class with proper isolation level
SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine,
    expire_on_commit=False  # Prevent issues with accessing objects after commit
)

# Create Base class for models
Base = declarative_base()

# Thread-local storage for database sessions
_thread_local = threading.local()

def get_db():
    """
    Dependency function to get database session with thread safety.
    
    Yields:
        Session: SQLAlchemy database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_thread_local_db():
    """
    Get a thread-local database session for concurrent operations.
    
    Returns:
        Session: Thread-local SQLAlchemy database session
    """
    if not hasattr(_thread_local, 'db') or _thread_local.db is None:
        _thread_local.db = SessionLocal()
    return _thread_local.db

def close_thread_local_db():
    """Close the thread-local database session."""
    if hasattr(_thread_local, 'db') and _thread_local.db is not None:
        _thread_local.db.close()
        _thread_local.db = None

def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)

def drop_db():
    """Drop all database tables (for testing)."""
    Base.metadata.drop_all(bind=engine)