import redis
import json

r = redis.Redis(
    host="localhost",
    port=6379,
    decode_responses=True
)


def set_cache(key, value, ttl=300):
    r.setex(
        key,
        ttl,
        json.dumps(value)
    )


def get_cache(key):
    data = r.get(key)
    if not data:
        return None
    return json.loads(data)


def clear_cache():
    r.flushdb()