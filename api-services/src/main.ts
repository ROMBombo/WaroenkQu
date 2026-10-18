import 'reflect-metadata';
import { INestApplication, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { appValidationPipe } from './common/pipes/validation.pipe';
import { config } from './config/configuration';
import { runMigrations, runSqlSeeds } from './database/migrate';
import { seedUsers } from './database/seed-users';

function setupSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('WaroenkQu API Services')
      .setDescription('Semua waktu dalam UTC+7 (Asia/Jakarta). Response sukses: { data, meta? }. Error: { error }.')
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, document);
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.enableCors();
  app.useGlobalPipes(appValidationPipe);
  app.useGlobalFilters(new AllExceptionsFilter());
  setupSwagger(app);

  // Migration & seed harus selesai sebelum server listen, supaya /health baru OK setelah schema siap
  const dataSource = app.get(DataSource);
  const root = join(__dirname, '..');
  await runMigrations(dataSource, join(root, 'migrations'));
  await runSqlSeeds(dataSource, join(root, 'seeds'));
  await seedUsers(dataSource);

  await app.listen(config.port, '0.0.0.0');
  logger.log(`API Services listening on port ${config.port} (Swagger: /docs)`);
}

bootstrap().catch((err) => {
  new Logger('Bootstrap').error(err);
  process.exit(1);
});
