import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { RabbitMqModule } from './infrastructure/rabbitmq/rabbitmq.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OutboxModule } from './modules/outbox/outbox.module';
import { ProductsModule } from './modules/products/products.module';
import { TransactionsModule } from './modules/transactions/transactions.module';

@Module({
  imports: [
    // Infrastruktur
    DatabaseModule,
    RedisModule,
    RabbitMqModule,
    // Fitur
    HealthModule,
    AuthModule,
    ProductsModule,
    CatalogModule,
    TransactionsModule,
    NotificationsModule,
    OutboxModule,
  ],
})
export class AppModule {}
