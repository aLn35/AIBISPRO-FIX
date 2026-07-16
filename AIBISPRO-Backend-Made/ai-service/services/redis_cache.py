import redis
import json

# =========================================================
# REDIS CLIENT (LOCAL DEV DEFAULT)
# =========================================================
r = redis.Redis(
    host="localhost",
    port=6379,
    decode_responses=True
)

CACHE_TTL = 300  # 5 minutes


# =========================================================
# GET CACHE
# =========================================================
def get_cache(key: str):
    try:
        data = r.get(key)
        if data is None:
            return None
        return json.loads(data)
    except:
        return None


# =========================================================
# SET CACHE
# =========================================================
def set_cache(key: str, value):
    try:
        r.setex(
            key,
            CACHE_TTL,
            json.dumps(value)
        )
    except:
        pass


# =========================================================
# DELETE CACHE
# =========================================================
def delete_cache(key: str):
    try:
        r.delete(key)
    except:
        pass


# =========================================================
# CLEAR ALL CACHE
# =========================================================
def clear_cache():
    try:
        r.flushdb()
    except:
        pass