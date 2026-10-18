import { Logger } from '@nestjs/common';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DataSource, QueryRunner } from 'typeorm';

// Kunci advisory supaya migration tidak jalan bersamaan kalau API Services lebih dari satu instance
const MIGRATION_LOCK_ID = 7_242_001;

const logger = new Logger('Migration');

async function listSqlFiles(dir: string): Promise<string[]> {
  return (await readdir(dir)).filter((file) => file.endsWith('.sql')).sort();
}

async function inTransaction(runner: QueryRunner, fn: () => Promise<void>): Promise<void> {
  await runner.startTransaction();
  try {
    await fn();
    await runner.commitTransaction();
  } catch (err) {
    await runner.rollbackTransaction();
    throw err;
  }
}

/** Menjalankan file migrations/*.sql yang belum pernah dijalankan, berurutan berdasarkan nama file. */
export async function runMigrations(dataSource: DataSource, dir: string): Promise<void> {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    await runner.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    await runner.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const rows: { name: string }[] = await runner.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.name));

    for (const file of await listSqlFiles(dir)) {
      if (applied.has(file)) continue;
      const sql = await readFile(join(dir, file), 'utf8');
      await inTransaction(runner, async () => {
        await runner.query(sql);
        await runner.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      });
      logger.log(`Applied ${file}`);
    }
  } finally {
    await runner.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]).catch(() => undefined);
    await runner.release();
  }
}

/** Menjalankan semua file seeds/*.sql. File seed harus idempotent karena dijalankan setiap start. */
export async function runSqlSeeds(dataSource: DataSource, dir: string): Promise<void> {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    for (const file of await listSqlFiles(dir)) {
      const sql = await readFile(join(dir, file), 'utf8');
      await inTransaction(runner, async () => {
        await runner.query(sql);
      });
      logger.log(`Seeded ${file}`);
    }
  } finally {
    await runner.release();
  }
}
