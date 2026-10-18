-- pgcrypto dipakai seeds/0002_users.sql untuk membuat hash bcrypt (crypt + gen_salt('bf'))

CREATE EXTENSION IF NOT EXISTS pgcrypto;
