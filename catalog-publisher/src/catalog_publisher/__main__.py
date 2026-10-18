"""Entry point: `catalog-publisher` atau `python -m catalog_publisher`."""

import logging
import signal
import threading
from datetime import UTC, datetime, timedelta

from .catalog_cache import CatalogCache, create_redis_client
from .config import load_settings
from .database import create_session_factory
from .publisher import CatalogPublisher

logger = logging.getLogger("catalog_publisher")

# Jeda sebelum mencoba lagi kalau satu putaran gagal (misalnya database sedang tidak bisa diakses)
ERROR_RETRY_SECONDS = 5


def run(publisher: CatalogPublisher, stop_event: threading.Event) -> None:
    """
    Setiap putaran:
    - Belum ada katalog, atau sudah waktunya publish -> publish sekarang.
    - Belum waktunya -> tidak membuat katalog baru, hanya memastikan Redis berisi katalog terbaru.
      Jadi restart container tidak memajukan "hari".
    Lalu tidur sampai waktu publish berikutnya (published_at terakhir + interval).
    """
    while not stop_event.is_set():
        try:
            latest = publisher.latest_catalog()
            if latest is None or datetime.now(UTC) >= publisher.next_publish_at(latest):
                latest = publisher.publish()
            else:
                publisher.sync_cache(latest)
            next_at = publisher.next_publish_at(latest)
            logger.info("Publish berikutnya: %s", next_at.isoformat())
            wait_seconds = max((next_at - datetime.now(UTC)).total_seconds(), 0)
        except Exception:
            logger.exception("Putaran publish gagal, coba lagi dalam %ds", ERROR_RETRY_SECONDS)
            wait_seconds = ERROR_RETRY_SECONDS
        stop_event.wait(wait_seconds)


def main() -> None:
    settings = load_settings()
    logging.basicConfig(level=settings.log_level, format="%(asctime)s %(levelname)s [%(name)s] %(message)s")

    stop_event = threading.Event()

    def handle_stop(signum: int, _frame: object) -> None:
        logger.info("Menerima sinyal %s, berhenti", signal.Signals(signum).name)
        stop_event.set()

    signal.signal(signal.SIGTERM, handle_stop)
    signal.signal(signal.SIGINT, handle_stop)

    publisher = CatalogPublisher(
        session_factory=create_session_factory(settings.postgres),
        cache=CatalogCache(create_redis_client(settings.redis)),
        publish_interval=timedelta(seconds=settings.publish_interval_seconds),
        stop_event=stop_event,
    )
    logger.info("Catalog Publisher berjalan, interval %ds", settings.publish_interval_seconds)
    run(publisher, stop_event)


if __name__ == "__main__":
    main()
