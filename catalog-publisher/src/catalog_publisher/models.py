"""Model SQLAlchemy untuk tabel yang dipakai Catalog Publisher.

Schema dikelola oleh migration di api-services/migrations. Model ini hanya untuk membaca/menulis data,
jadi JANGAN memanggil Base.metadata.create_all().
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

PUBLISH_STATUS_PENDING = "PENDING"
PUBLISH_STATUS_PUBLISHED = "PUBLISHED"


class Base(DeclarativeBase):
    pass


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    price: Mapped[int]
    min_stock: Mapped[int]
    is_active: Mapped[bool]
    publish_status: Mapped[str] = mapped_column(String(10))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class CatalogPublish(Base):
    __tablename__ = "catalog_publishes"
    # Ambil id & published_at hasil default database langsung saat flush (RETURNING)
    __mapper_args__ = {"eager_defaults": True}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    products: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
