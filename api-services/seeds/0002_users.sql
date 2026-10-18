-- Seed akun untuk environment lokal/testing. Idempotent: akun yang sudah ada tidak diubah.
-- Password ditulis apa adanya supaya mudah dipakai saat pengujian, lalu di-hash bcrypt oleh crypt().
--
--   username | password  | role
--   ---------+-----------+--------
--   owner    | owner123  | OWNER
--   kasir1   | kasir123  | CASHIER
--   kasir2   | kasir123  | CASHIER

INSERT INTO users (username, password_hash, name, role_id)
SELECT seed.username, crypt(seed.password, gen_salt('bf', 10)), seed.name, roles.id
FROM (VALUES
    ('owner',  'owner123', 'Owner',   'OWNER'),
    ('kasir1', 'kasir123', 'Kasir 1', 'CASHIER'),
    ('kasir2', 'kasir123', 'Kasir 2', 'CASHIER')
) AS seed (username, password, name, role_code)
JOIN roles ON roles.code = seed.role_code
ON CONFLICT (username) DO NOTHING;
