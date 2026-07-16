import time

# =========================================================
# SIMPLE IN-MEMORY CACHE (FASTAPI LOCAL CACHE)
# =========================================================

_cache_store = {}
_cache_ttl_seconds = 300  # 5 minutes


def get_cache(key: str):
    """
    Get value from cache if not expired.
    Returns None if not found or expired.
    """

    if key not in _cache_store:
        return None

    value, timestamp = _cache_store[key]

    # check expiry
    if time.time() - timestamp > _cache_ttl_seconds:
        del _cache_store[key]
        return None

    return value


def set_cache(key: str, value):
    """
    Save value to cache with timestamp
    """

    _cache_store[key] = (value, time.time())


def clear_cache():
    """
    Clear all cache (useful for debugging or admin reset)
    """

    _cache_store.clear()


def cache_size():
    """
    Return number of cached items
    """

    return len(_cache_store)