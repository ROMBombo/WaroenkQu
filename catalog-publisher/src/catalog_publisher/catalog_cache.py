"""Katalog yang berlaku di Redis (key catalog:current), dibaca oleh API Services."""

import json
from typing import Any

from redis import Redis

from .config import RedisSettings
from .models import CatalogPublish

CURRENT_CATALOG_KEY = "catalog:current"


def create_redis_client(settings: RedisSettings) -> Redis:
    return Redis(host=settings.host, port=settings.port, socket_timeout=5, socket_connect_timeout=5)


def to_cache_payload(catalog: CatalogPublish) -> dict[str, Any]:
    """Salinan row catalog_publishes. Format ini dibaca CatalogService di API Services."""
    return {
        "catalog_publish_id": str(catalog.id),
        "published_at": catalog.published_at.isoformat(),
        "products": catalog.products,
    }


class CatalogCache:
    def __init__(self, client: Redis) -> None:
        self._client = client

    def current_catalog_id(self) -> str | None:
        raw = self._client.get(CURRENT_CATALOG_KEY)
        return json.loads(raw)["catalog_publish_id"] if raw else None

    def write(self, catalog: CatalogPublish) -> None:
        self._client.set(CURRENT_CATALOG_KEY, json.dumps(to_cache_payload(catalog)))
