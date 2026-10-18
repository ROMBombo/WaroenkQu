"""Konfigurasi dari environment variable. Aplikasi gagal start kalau ada yang kurang atau tidak valid."""

import os
from dataclasses import dataclass


def _required(name: str) -> str:
    value = os.environ.get(name, "")
    if not value:
        raise RuntimeError(f"Environment variable {name} wajib diisi")
    return value


def _positive_int(name: str, default: int) -> int:
    raw = os.environ.get(name, "")
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        raise RuntimeError(f"Environment variable {name} harus angka bulat, didapat {raw!r}") from None
    if value <= 0:
        raise RuntimeError(f"Environment variable {name} harus lebih dari 0, didapat {value}")
    return value


@dataclass(frozen=True)
class PostgresSettings:
    host: str
    port: int
    database: str
    user: str
    password: str


@dataclass(frozen=True)
class RedisSettings:
    host: str
    port: int


@dataclass(frozen=True)
class Settings:
    postgres: PostgresSettings
    redis: RedisSettings
    # Interval publish dalam detik. Di sistem sungguhan 1 hari, di environment tes beberapa detik/menit.
    publish_interval_seconds: int
    log_level: str


def load_settings() -> Settings:
    return Settings(
        postgres=PostgresSettings(
            host=_required("POSTGRES_HOST"),
            port=_positive_int("POSTGRES_PORT", 5432),
            database=_required("POSTGRES_DB"),
            user=_required("POSTGRES_USER"),
            password=_required("POSTGRES_PASSWORD"),
        ),
        redis=RedisSettings(
            host=_required("REDIS_HOST"),
            port=_positive_int("REDIS_PORT", 6379),
        ),
        publish_interval_seconds=_positive_int("CATALOG_PUBLISH_INTERVAL", 300),
        log_level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    )
