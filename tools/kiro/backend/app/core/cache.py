"""
Query result caching for ARK Digital Calendar.

This module provides a simple in-memory cache for frequently accessed
database queries to improve performance.
"""

import time
import threading
from typing import Any, Dict, Optional, Callable, Tuple
from functools import wraps
import hashlib
import json
import logging

logger = logging.getLogger(__name__)


class QueryCache:
    """
    Thread-safe in-memory cache for database query results.
    
    Features:
    - TTL (Time To Live) support
    - Thread-safe operations
    - Automatic cleanup of expired entries
    - Size-based eviction (LRU)
    """
    
    def __init__(self, max_size: int = 1000, default_ttl: int = 300):
        """
        Initialize the cache.
        
        Args:
            max_size: Maximum number of entries to store
            default_ttl: Default TTL in seconds (5 minutes)
        """
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._cache: Dict[str, Tuple[Any, float, float]] = {}  # key -> (value, expiry, access_time)
        self._lock = threading.RLock()
        self._access_order: Dict[str, float] = {}  # key -> last_access_time
        
    def _generate_key(self, func_name: str, args: tuple, kwargs: dict) -> str:
        """Generate a cache key from function name and arguments."""
        # Create a deterministic key from function name and arguments
        key_data = {
            'func': func_name,
            'args': args,
            'kwargs': sorted(kwargs.items()) if kwargs else {}
        }
        
        # Convert to JSON string and hash for consistent key length
        key_str = json.dumps(key_data, sort_keys=True, default=str)
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Get a value from the cache."""
        with self._lock:
            if key not in self._cache:
                return None
            
            value, expiry, _ = self._cache[key]
            current_time = time.time()
            
            # Check if expired
            if current_time > expiry:
                del self._cache[key]
                if key in self._access_order:
                    del self._access_order[key]
                return None
            
            # Update access time for LRU
            self._access_order[key] = current_time
            self._cache[key] = (value, expiry, current_time)
            
            return value
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set a value in the cache."""
        with self._lock:
            if ttl is None:
                ttl = self.default_ttl
            
            current_time = time.time()
            expiry = current_time + ttl
            
            # If cache is full, remove least recently used item
            if len(self._cache) >= self.max_size and key not in self._cache:
                self._evict_lru()
            
            self._cache[key] = (value, expiry, current_time)
            self._access_order[key] = current_time
    
    def delete(self, key: str) -> bool:
        """Delete a specific key from the cache."""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                if key in self._access_order:
                    del self._access_order[key]
                return True
            return False
    
    def clear(self) -> None:
        """Clear all cache entries."""
        with self._lock:
            self._cache.clear()
            self._access_order.clear()
    
    def _evict_lru(self) -> None:
        """Evict the least recently used item."""
        if not self._access_order:
            return
        
        # Find the key with the oldest access time
        lru_key = min(self._access_order.keys(), key=lambda k: self._access_order[k])
        
        del self._cache[lru_key]
        del self._access_order[lru_key]
    
    def cleanup_expired(self) -> int:
        """Remove all expired entries and return count of removed items."""
        with self._lock:
            current_time = time.time()
            expired_keys = []
            
            for key, (_, expiry, _) in self._cache.items():
                if current_time > expiry:
                    expired_keys.append(key)
            
            for key in expired_keys:
                del self._cache[key]
                if key in self._access_order:
                    del self._access_order[key]
            
            return len(expired_keys)
    
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self._lock:
            current_time = time.time()
            expired_count = sum(
                1 for _, expiry, _ in self._cache.values()
                if current_time > expiry
            )
            
            return {
                'size': len(self._cache),
                'max_size': self.max_size,
                'expired_entries': expired_count,
                'hit_ratio': getattr(self, '_hit_count', 0) / max(getattr(self, '_total_requests', 1), 1)
            }


# Global cache instance
query_cache = QueryCache(max_size=1000, default_ttl=300)  # 5 minutes default TTL


def cached_query(ttl: int = 300, cache_instance: Optional[QueryCache] = None):
    """
    Decorator to cache database query results.
    
    Args:
        ttl: Time to live in seconds
        cache_instance: Cache instance to use (defaults to global cache)
    
    Usage:
        @cached_query(ttl=600)  # Cache for 10 minutes
        def get_user_quotes(user_id: str):
            return db.query(Quote).filter(Quote.user_id == user_id).all()
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache = cache_instance or query_cache
            
            # Generate cache key
            cache_key = cache._generate_key(func.__name__, args, kwargs)
            
            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {func.__name__}")
                return cached_result
            
            # Execute function and cache result
            logger.debug(f"Cache miss for {func.__name__}, executing query")
            result = func(*args, **kwargs)
            
            # Only cache non-None results
            if result is not None:
                cache.set(cache_key, result, ttl)
            
            return result
        
        # Add cache control methods to the wrapped function
        wrapper.cache_clear = lambda: cache.clear()
        wrapper.cache_delete = lambda *args, **kwargs: cache.delete(
            cache._generate_key(func.__name__, args, kwargs)
        )
        
        return wrapper
    return decorator


def invalidate_user_cache(user_id: str) -> None:
    """
    Invalidate all cached queries for a specific user.
    
    This should be called when user data is modified.
    """
    # For now, we'll clear the entire cache when user data changes
    # In a more sophisticated implementation, we could track which
    # cache keys belong to which users
    query_cache.clear()
    logger.info(f"Invalidated cache for user: {user_id}")


def invalidate_theme_cache() -> None:
    """
    Invalidate theme-related cached queries.
    
    This should be called when theme data is modified.
    """
    # Clear cache when themes change
    query_cache.clear()
    logger.info("Invalidated theme cache")


# Background cleanup task
def start_cache_cleanup_task():
    """Start a background task to periodically clean up expired cache entries."""
    import threading
    import time
    
    def cleanup_task():
        while True:
            try:
                time.sleep(60)  # Run every minute
                removed_count = query_cache.cleanup_expired()
                if removed_count > 0:
                    logger.debug(f"Cleaned up {removed_count} expired cache entries")
            except Exception as e:
                logger.error(f"Error in cache cleanup task: {e}")
    
    cleanup_thread = threading.Thread(target=cleanup_task, daemon=True)
    cleanup_thread.start()
    logger.info("Started cache cleanup background task")


# Initialize cleanup task when module is imported
start_cache_cleanup_task()