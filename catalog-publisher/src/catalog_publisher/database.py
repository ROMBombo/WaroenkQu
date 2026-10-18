from sqlalchemy import URL, create_engine
from sqlalchemy.orm import Session, sessionmaker

from .config import PostgresSettings


def create_session_factory(settings: PostgresSettings) -> sessionmaker[Session]:
    url = URL.create(
        "postgresql+psycopg",
        username=settings.user,
        password=settings.password,
        host=settings.host,
        port=settings.port,
        database=settings.database,
    )
    # pool_pre_ping: koneksi yang putus (misalnya Postgres restart) dibuat ulang otomatis
    engine = create_engine(url, pool_pre_ping=True)
    return sessionmaker(engine, expire_on_commit=False)
