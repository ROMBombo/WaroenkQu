-- Seed role & permission. Idempotent: aman dijalankan setiap API Services start.

INSERT INTO roles (code, name) VALUES
    ('OWNER', 'Owner'),
    ('CASHIER', 'Kasir')
ON CONFLICT (code) DO NOTHING;

INSERT INTO permissions (code, description) VALUES
    ('product:read',            'Melihat list dan detail produk'),
    ('product:create',          'Menambah produk'),
    ('product:update',          'Mengubah nama, harga, dan stok minimum produk'),
    ('product-status:update',   'Mengaktifkan dan menonaktifkan produk'),
    ('product:delete',          'Menghapus produk'),
    ('product-stock:update',    'Menambah dan mengurangi stok produk'),
    ('product-history:read',    'Melihat history perubahan produk'),
    ('catalog-management:read', 'Melihat info publish dan history katalog'),
    ('catalog:read',            'Melihat katalog yang berlaku'),
    ('transaction:create',      'Membuat transaksi'),
    ('transaction:read',        'Melihat history dan detail transaksi'),
    ('notification:read',       'Melihat notifikasi'),
    ('notification:update',     'Menandai notifikasi sebagai sudah dibaca')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON
    (r.code = 'OWNER' AND p.code IN (
        'product:read', 'product:create', 'product:update', 'product-status:update',
        'product:delete', 'product-stock:update', 'product-history:read',
        'catalog-management:read', 'transaction:read', 'notification:read', 'notification:update'
    ))
    OR
    (r.code = 'CASHIER' AND p.code IN (
        'catalog:read', 'transaction:create', 'transaction:read'
    ))
ON CONFLICT (role_id, permission_id) DO NOTHING;
