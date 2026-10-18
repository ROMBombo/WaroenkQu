-- Produk, history produk, dan trigger-nya

CREATE TABLE products (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(50) NOT NULL,
    price          INTEGER     NOT NULL CHECK (price BETWEEN 100 AND 1000000),
    stock          INTEGER     NOT NULL CHECK (stock >= 0),
    min_stock      INTEGER     NOT NULL CHECK (min_stock >= 0),
    is_active      BOOLEAN     NOT NULL DEFAULT true,
    publish_status VARCHAR(10) NOT NULL DEFAULT 'PENDING'
                   CHECK (publish_status IN ('PENDING', 'PUBLISHED')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ,
    deleted_at     TIMESTAMPTZ
);

CREATE INDEX idx_products_name ON products (name);
CREATE UNIQUE INDEX uq_products_name_active ON products (lower(name)) WHERE deleted_at IS NULL;

CREATE TABLE product_histories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID        NOT NULL REFERENCES products (id),
    action     VARCHAR(10) NOT NULL
               CHECK (action IN ('CREATE', 'UPDATE', 'ACTIVATE', 'DEACTIVATE', 'STOCK_IN', 'STOCK_OUT', 'DELETE')),
    quantity   INTEGER CHECK (quantity > 0),
    note       TEXT,
    name       VARCHAR(50) NOT NULL,
    price      INTEGER     NOT NULL,
    stock      INTEGER     NOT NULL,
    min_stock  INTEGER     NOT NULL,
    is_active  BOOLEAN     NOT NULL,
    changed_by UUID        NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- quantity hanya untuk STOCK_IN / STOCK_OUT
    CHECK ((action IN ('STOCK_IN', 'STOCK_OUT')) = (quantity IS NOT NULL)),
    -- note wajib untuk STOCK_OUT, hanya boleh ada untuk STOCK_IN / STOCK_OUT
    CHECK (action <> 'STOCK_OUT' OR note IS NOT NULL),
    CHECK (action IN ('STOCK_IN', 'STOCK_OUT') OR note IS NULL)
);

CREATE INDEX idx_product_histories_product_id_created_at ON product_histories (product_id, created_at);

-- trg_products_before_update: isi updated_at dan publish_status
CREATE FUNCTION products_before_update() RETURNS trigger AS $$
BEGIN
    IF NEW.name      IS DISTINCT FROM OLD.name
    OR NEW.price     IS DISTINCT FROM OLD.price
    OR NEW.stock     IS DISTINCT FROM OLD.stock
    OR NEW.min_stock IS DISTINCT FROM OLD.min_stock
    OR NEW.is_active IS DISTINCT FROM OLD.is_active
    OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
        NEW.updated_at := now();
    END IF;

    -- Kolom yang masuk katalog berubah -> menunggu publish. Perubahan stock tidak.
    IF NEW.name      IS DISTINCT FROM OLD.name
    OR NEW.price     IS DISTINCT FROM OLD.price
    OR NEW.min_stock IS DISTINCT FROM OLD.min_stock
    OR NEW.is_active IS DISTINCT FROM OLD.is_active
    OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
        NEW.publish_status := 'PENDING';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_before_update
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION products_before_update();

-- trg_products_history: catat history hanya kalau app.changed_by diisi (endpoint product-management)
CREATE FUNCTION products_history() RETURNS trigger AS $$
DECLARE
    v_changed_by UUID := NULLIF(current_setting('app.changed_by', true), '')::UUID;
    v_note       TEXT := NULLIF(current_setting('app.note', true), '');
    v_action     VARCHAR(10);
    v_quantity   INTEGER;
BEGIN
    IF v_changed_by IS NULL THEN
        RETURN NULL;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_action := 'CREATE';
    ELSIF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        v_action := 'DELETE';
    ELSIF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        v_action := CASE WHEN NEW.is_active THEN 'ACTIVATE' ELSE 'DEACTIVATE' END;
    ELSIF NEW.stock > OLD.stock THEN
        v_action := 'STOCK_IN';
        v_quantity := NEW.stock - OLD.stock;
    ELSIF NEW.stock < OLD.stock THEN
        v_action := 'STOCK_OUT';
        v_quantity := OLD.stock - NEW.stock;
    ELSIF NEW.name      IS DISTINCT FROM OLD.name
       OR NEW.price     IS DISTINCT FROM OLD.price
       OR NEW.min_stock IS DISTINCT FROM OLD.min_stock THEN
        v_action := 'UPDATE';
    ELSE
        -- Tidak ada perubahan (misalnya status yang sama dikirim lagi)
        RETURN NULL;
    END IF;

    IF v_action NOT IN ('STOCK_IN', 'STOCK_OUT') THEN
        v_note := NULL;
    END IF;

    INSERT INTO product_histories
        (product_id, action, quantity, note, name, price, stock, min_stock, is_active, changed_by)
    VALUES
        (NEW.id, v_action, v_quantity, v_note, NEW.name, NEW.price, NEW.stock, NEW.min_stock, NEW.is_active, v_changed_by);

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_history
    AFTER INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION products_history();
