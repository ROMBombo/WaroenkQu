import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { config } from '../config';
import { entities } from './entities';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...config.postgres,
      username: config.postgres.user,
      entities,
      // Schema dikelola oleh migrations/*.sql, bukan oleh TypeORM
      synchronize: false,
      migrationsRun: false,
    }),
  ],
})
export class DatabaseModule {}
