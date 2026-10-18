"""Proses publish katalog. Langkah-langkahnya mengikuti readme bagian "Catalog Publisher"."""

import logging
import threading
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.orm import Session, sessionmaker

from .catalog_cache import CatalogCache
from .models import PUBLISH_STATUS_PENDING, PUBLISH_STATUS_PUBLISHED, CatalogPublish, Product

logger = logging.getLogger(__name__)

MAX_CACHE_RETRY_SECONDS = 60


def to_snapshot_item(product: Product) -> dict[str, Any]:
    return {"id": str(product.id), "name": product.name, "price": product.price, "min_stock": product.min_stock}


class CatalogPublisher:
    def __init__(
        self,
        session_factory: sessionmaker[Session],
        cache: CatalogCache,
        publish_interval: timedelta,
        stop_event: threading.Event,
    ) -> None:
        self._session_factory = session_factory
        self._cache = cache
        self._publish_interval = publish_interval
        self._stop_event = stop_event

    def latest_catalog(self) -> CatalogPublish | None:
        with self._session_factory() as session:
            return session.scalars(
                select(CatalogPublish).order_by(CatalogPublish.published_at.desc()).limit(1)
            ).first()

    def next_publish_at(self, latest: CatalogPublish) -> datetime:
        """Sama dengan perhitungan effective_at di API Services: published_at terakhir + interval."""
        return latest.published_at + self._publish_interval

    def publish(self) -> CatalogPublish:
        """
        1. Kunci semua produk (ORDER BY id, sama dengan urutan penguncian transaksi kasir supaya tidak deadlock).
        2. Snapshot produk yang aktif dan belum dihapus ke catalog_publishes.
        3. Ubah produk PENDING yang ikut terkunci menjadi PUBLISHED. Produk yang di-insert owner di tengah proses
           tidak ikut terkunci, jadi tetap PENDING untuk publish berikutnya.
        4. Commit, lalu tulis ke Redis.
        """
        with self._session_factory.begin() as session:
            locked = session.scalars(select(Product).order_by(Product.id).with_for_update()).all()
            active = [p for p in locked if p.is_active and p.deleted_at is None]

            catalog = CatalogPublish(products=[to_snapshot_item(p) for p in sorted(active, key=lambda p: p.name.lower())])
            session.add(catalog)
            session.flush()

            published_count = 0
            if locked:
                result = session.execute(
                    update(Product)
                    .where(Product.id.in_([p.id for p in locked]), Product.publish_status == PUBLISH_STATUS_PENDING)
                    .values(publish_status=PUBLISH_STATUS_PUBLISHED)
                    .execution_options(synchronize_session=False)
                )
                published_count = result.rowcount

        logger.info(
            "Published catalog %s at %s: %d produk di katalog, %d produk PENDING -> PUBLISHED",
            catalog.id,
            catalog.published_at.isoformat(),
            len(catalog.products),
            published_count,
        )
        self._write_cache_with_retry(catalog)
        return catalog

    def sync_cache(self, catalog: CatalogPublish) -> None:
        """Memastikan Redis berisi katalog terbaru, misalnya setelah Redis restart dan datanya hilang."""
        if self._cache.current_catalog_id() != str(catalog.id):
            logger.warning("Redis tidak berisi katalog terbaru %s, menulis ulang", catalog.id)
            self._write_cache_with_retry(catalog)

    def _write_cache_with_retry(self, catalog: CatalogPublish) -> None:
        """Data di database sudah commit, jadi penulisan ke Redis diulang terus sampai berhasil."""
        delay = 1
        while True:
            try:
                self._cache.write(catalog)
                logger.info("Catalog %s ditulis ke Redis", catalog.id)
                return
            except Exception as err:  # noqa: BLE001 - semua error Redis diperlakukan sama: coba lagi
                logger.warning("Gagal menulis catalog %s ke Redis (%s), coba lagi dalam %ds", catalog.id, err, delay)
                if self._stop_event.wait(delay):
                    return
                delay = min(delay * 2, MAX_CACHE_RETRY_SECONDS)
