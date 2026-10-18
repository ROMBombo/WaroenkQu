-- Snapshot katalog hasil Catalog Publisher

CREATE TABLE catalog_publishes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    products     JSONB       NOT NULL DEFAULT '[]'
);

CREATE INDEX idx_catalog_publishes_published_at ON catalog_publishes (published_at);
