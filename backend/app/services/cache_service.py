import json
from typing import Any

from app.config import settings

try:
    import redis
except ImportError:
    redis = None


redis_client = None

if redis is not None and settings.REDIS_URL:
    try:
        redis_client = redis.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
            retry_on_timeout=True,
        )
        redis_client.ping()
    except Exception as exc:
        print(f"Redis unavailable at startup, continuing without cache: {exc}")
        redis_client = None


def cache_get(key: str) -> Any | None:
    if not redis_client:
        return None

    try:
        raw = redis_client.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception as exc:
        print(f"cache_get failed for key '{key}': {exc}")
        return None


def cache_set(key: str, value: Any, ttl: int | None = None) -> None:
    if not redis_client:
        return

    try:
        redis_client.setex(
            key,
            ttl or settings.CACHE_TTL_SECONDS,
            json.dumps(value, default=str),
        )
    except Exception as exc:
        print(f"cache_set failed for key '{key}': {exc}")


def cache_delete(key: str) -> None:
    if not redis_client:
        return

    try:
        redis_client.delete(key)
    except Exception as exc:
        print(f"cache_delete failed for key '{key}': {exc}")


def cache_delete_prefix(prefix: str) -> None:
    if not redis_client:
        return

    try:
        keys = redis_client.keys(f"{prefix}*")
        if keys:
            redis_client.delete(*keys)
    except Exception as exc:
        print(f"cache_delete_prefix failed for prefix '{prefix}': {exc}")