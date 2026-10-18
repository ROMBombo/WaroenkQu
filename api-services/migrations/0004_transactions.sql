-- Transaksi kasir

CREATE TABLE transactions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cashier_id         UUID        NOT NULL REFERENCES users (id),
    catalog_publish_id UUID        NOT NULL REFERENCES catalog_publishes (id),
    total              BIGINT      NOT NULL CHECK (total > 0),
    paid_amount        BIGINT      NOT NULL,
    change_amount      BIGINT      NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (paid_amount >= total),
    CHECK (change_amount = paid_amount - total)
);

CREATE INDEX idx_transactions_cashier_id_created_at ON transactions (cashier_id, created_at);
CREATE INDEX idx_transactions_created_at ON transactions (created_at);

CREATE TABLE transaction_items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID        NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
    product_id     UUID        NOT NULL REFERENCES products (id),
    product_name   VARCHAR(50) NOT NULL,
    quantity       INTEGER     NOT NULL CHECK (quantity > 0),
    price          INTEGER     NOT NULL,
    subtotal       BIGINT      NOT NULL,
    CHECK (subtotal = quantity::BIGINT * price),
    UNIQUE (transaction_id, product_id)
);
