import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product, ProductHistory } from '../../database/entities';
import { CatalogModule } from '../catalog/catalog.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductHistory]), CatalogModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
