"""
Base repository class for ARK Digital Calendar.

This module provides a base repository class with common CRUD operations
and error handling patterns.
"""

from typing import Generic, TypeVar, Type, List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError
from sqlalchemy import text
from app.database.database import Base
import logging
import time
import random

logger = logging.getLogger(__name__)

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Base repository class providing common CRUD operations.
    
    This class implements the Repository pattern for database operations
    with error handling and transaction management.
    """
    
    def __init__(self, model: Type[ModelType], db: Session):
        """
        Initialize repository with model class and database session.
        
        Args:
            model: SQLAlchemy model class
            db: Database session
        """
        self.model = model
        self.db = db
    
    def _retry_on_database_lock(self, operation, max_retries=3, base_delay=0.1):
        """
        Retry database operations on lock/busy errors.
        
        Args:
            operation: Function to execute
            max_retries: Maximum number of retry attempts
            base_delay: Base delay between retries in seconds
            
        Returns:
            Result of the operation
        """
        for attempt in range(max_retries + 1):
            try:
                return operation()
            except OperationalError as e:
                if "database is locked" in str(e).lower() or "busy" in str(e).lower():
                    if attempt < max_retries:
                        # Exponential backoff with jitter
                        delay = base_delay * (2 ** attempt) + random.uniform(0, 0.1)
                        logger.warning(f"Database locked, retrying in {delay:.2f}s (attempt {attempt + 1}/{max_retries + 1})")
                        time.sleep(delay)
                        continue
                raise
            except Exception as e:
                # For non-lock errors, don't retry
                raise
    
    def create(self, obj_data: Dict[str, Any]) -> Optional[ModelType]:
        """
        Create a new record in the database.
        
        Args:
            obj_data: Dictionary containing object data
            
        Returns:
            Created object or None if creation failed
            
        Raises:
            ValueError: If required fields are missing
            IntegrityError: If database constraints are violated
        """
        def _create_operation():
            try:
                obj = self.model(**obj_data)
                self.db.add(obj)
                self.db.commit()
                self.db.refresh(obj)
                logger.info(f"Created {self.model.__name__} with id: {obj.id}")
                return obj
            except IntegrityError as e:
                self.db.rollback()
                logger.error(f"Integrity error creating {self.model.__name__}: {e}")
                raise
            except SQLAlchemyError as e:
                self.db.rollback()
                logger.error(f"Database error creating {self.model.__name__}: {e}")
                raise
            except Exception as e:
                self.db.rollback()
                logger.error(f"Unexpected error creating {self.model.__name__}: {e}")
                raise
        
        try:
            return self._retry_on_database_lock(_create_operation)
        except Exception as e:
            logger.error(f"Failed to create {self.model.__name__} after retries: {e}")
            return None
    
    def get_by_id(self, obj_id: str) -> Optional[ModelType]:
        """
        Retrieve a record by its ID.
        
        Args:
            obj_id: Object ID
            
        Returns:
            Object if found, None otherwise
        """
        def _get_operation():
            return self.db.query(self.model).filter(self.model.id == obj_id).first()
        
        try:
            return self._retry_on_database_lock(_get_operation)
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving {self.model.__name__} by id {obj_id}: {e}")
            return None
    
    def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """
        Retrieve all records with pagination.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of objects
        """
        def _get_all_operation():
            return self.db.query(self.model).offset(skip).limit(limit).all()
        
        try:
            return self._retry_on_database_lock(_get_all_operation)
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving {self.model.__name__} records: {e}")
            return []
    
    def update(self, obj_id: str, update_data: Dict[str, Any]) -> Optional[ModelType]:
        """
        Update a record by ID.
        
        Args:
            obj_id: Object ID
            update_data: Dictionary containing fields to update
            
        Returns:
            Updated object or None if update failed
        """
        def _update_operation():
            try:
                obj = self.db.query(self.model).filter(self.model.id == obj_id).first()
                if not obj:
                    logger.warning(f"{self.model.__name__} with id {obj_id} not found for update")
                    return None
                
                for key, value in update_data.items():
                    if hasattr(obj, key):
                        setattr(obj, key, value)
                
                self.db.commit()
                self.db.refresh(obj)
                logger.info(f"Updated {self.model.__name__} with id: {obj_id}")
                return obj
            except IntegrityError as e:
                self.db.rollback()
                logger.error(f"Integrity error updating {self.model.__name__}: {e}")
                raise
            except SQLAlchemyError as e:
                self.db.rollback()
                logger.error(f"Database error updating {self.model.__name__}: {e}")
                raise
            except Exception as e:
                self.db.rollback()
                logger.error(f"Unexpected error updating {self.model.__name__}: {e}")
                raise
        
        try:
            return self._retry_on_database_lock(_update_operation)
        except Exception as e:
            logger.error(f"Failed to update {self.model.__name__} after retries: {e}")
            return None
    
    def delete(self, obj_id: str) -> bool:
        """
        Delete a record by ID.
        
        Args:
            obj_id: Object ID
            
        Returns:
            True if deletion was successful, False otherwise
        """
        def _delete_operation():
            try:
                obj = self.db.query(self.model).filter(self.model.id == obj_id).first()
                if not obj:
                    logger.warning(f"{self.model.__name__} with id {obj_id} not found for deletion")
                    return False
                
                self.db.delete(obj)
                self.db.commit()
                logger.info(f"Deleted {self.model.__name__} with id: {obj_id}")
                return True
            except SQLAlchemyError as e:
                self.db.rollback()
                logger.error(f"Database error deleting {self.model.__name__}: {e}")
                raise
            except Exception as e:
                self.db.rollback()
                logger.error(f"Unexpected error deleting {self.model.__name__}: {e}")
                raise
        
        try:
            return self._retry_on_database_lock(_delete_operation)
        except Exception as e:
            logger.error(f"Failed to delete {self.model.__name__} after retries: {e}")
            return False
    
    def count(self) -> int:
        """
        Count total number of records.
        
        Returns:
            Total count of records
        """
        def _count_operation():
            return self.db.query(self.model).count()
        
        try:
            return self._retry_on_database_lock(_count_operation)
        except SQLAlchemyError as e:
            logger.error(f"Database error counting {self.model.__name__} records: {e}")
            return 0
    
    def exists(self, obj_id: str) -> bool:
        """
        Check if a record exists by ID.
        
        Args:
            obj_id: Object ID
            
        Returns:
            True if record exists, False otherwise
        """
        def _exists_operation():
            return self.db.query(self.model).filter(self.model.id == obj_id).first() is not None
        
        try:
            return self._retry_on_database_lock(_exists_operation)
        except SQLAlchemyError as e:
            logger.error(f"Database error checking existence of {self.model.__name__}: {e}")
            return False