import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { config } from './config';
import { runMigrations, runSqlSeeds } from './database/migrate';
import { seedUsers } from './database/seed-users';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  // Migration & seed harus selesai sebelum server listen, supaya /health baru OK setelah schema siap
  const dataSource = app.get(DataSource);
  const root = join(__dirname, '..');
  await runMigrations(dataSource, join(root, 'migrations'));
  await runSqlSeeds(dataSource, join(root, 'seeds'));
  await seedUsers(dataSource);

  await app.listen(config.port, '0.0.0.0');
  logger.log(`API Services listening on port ${config.port}`);
}

bootstrap().catch((err) => {
  new Logger('Bootstrap').error(err);
  process.exit(1);
});
