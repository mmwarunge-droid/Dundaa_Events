import json
from typing import Any

try:
    import redis
except ImportError:
    redis = None

from app.config import settings

redis_client = None

if settings.REDIS_URL and redis:
    redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)


def cache_get(key: str) -> Any | None:
    if not redis_client:
        return None

    raw = redis_client.get(key)
    if raw is None:
        return None

    return json.loads(raw)


def cache_set(key: str, value: Any, ttl: int | None = None) -> None:
    if not redis_client:
        return

    redis_client.setex(
        key,
        ttl or settings.CACHE_TTL_SECONDS,
        json.dumps(value, default=str),
    )


def cache_delete(key: str) -> None:
    if not redis_client:
        return

    redis_client.delete(key)


def cache_delete_prefix(prefix: str) -> None:
    if not redis_client:
        return

    keys = redis_client.keys(f"{prefix}*")
    if keys:
        redis_client.delete(*keys)