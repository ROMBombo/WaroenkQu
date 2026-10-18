-- Notifikasi stok menipis dan outbox pesan RabbitMQ

CREATE TABLE notifications (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id         UUID        NOT NULL REFERENCES products (id),
    catalog_publish_id UUID        NOT NULL REFERENCES catalog_publishes (id),
    message            TEXT        NOT NULL,
    is_read            BOOLEAN     NOT NULL DEFAULT false,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at            TIMESTAMPTZ,
    UNIQUE (product_id, catalog_publish_id)
);

CREATE INDEX idx_notifications_is_read ON notifications (is_read);

CREATE TABLE outbox_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue           VARCHAR(50) NOT NULL,
    payload         JSONB       NOT NULL,
    status          VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT')),
    attempts        INTEGER     NOT NULL DEFAULT 0,
    last_error      TEXT,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at         TIMESTAMPTZ
);

CREATE INDEX idx_outbox_messages_pending ON outbox_messages (next_attempt_at) WHERE status = 'PENDING';
