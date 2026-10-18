import { parseDurationToSeconds } from '../common/utils/duration.util';

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Environment variable ${name} wajib diisi`);
  }
  return value;
}

function positiveNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Environment variable ${name} harus angka positif, didapat "${raw}"`);
  }
  return value;
}

export const config = {
  port: positiveNumber('PORT', 3000),
  postgres: {
    host: required('POSTGRES_HOST'),
    port: positiveNumber('POSTGRES_PORT', 5432),
    database: required('POSTGRES_DB'),
    user: required('POSTGRES_USER'),
    password: required('POSTGRES_PASSWORD'),
  },
  redis: {
    host: required('REDIS_HOST'),
    port: positiveNumber('REDIS_PORT', 6379),
  },
  rabbitmq: {
    url: required('RABBITMQ_URL'),
  },
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    accessExpiresInSeconds: parseDurationToSeconds(required('JWT_ACCESS_EXPIRES_IN')),
    refreshExpiresInSeconds: parseDurationToSeconds(required('JWT_REFRESH_EXPIRES_IN')),
  },
  outbox: {
    pollIntervalMs: positiveNumber('OUTBOX_POLL_INTERVAL', 1) * 1000,
  },
  catalog: {
    publishIntervalSeconds: positiveNumber('CATALOG_PUBLISH_INTERVAL', 300),
  },
  seed: {
    owner: {
      username: required('SEED_OWNER_USERNAME'),
      password: required('SEED_OWNER_PASSWORD'),
    },
    cashiers: [
      {
        username: required('SEED_CASHIER1_USERNAME'),
        password: required('SEED_CASHIER1_PASSWORD'),
      },
      {
        username: required('SEED_CASHIER2_USERNAME'),
        password: required('SEED_CASHIER2_PASSWORD'),
      },
    ],
  },
};
