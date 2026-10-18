import { ApiProperty } from '@nestjs/swagger';
import { ProductHistoryAction, PublishStatus } from '../../../database/entities';

export class ProductResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Indomie Goreng' })
  name!: string;

  @ApiProperty({ example: 3500 })
  price!: number;

  @ApiProperty({ example: 50 })
  stock!: number;

  @ApiProperty({ example: 10 })
  min_stock!: number;

  @ApiProperty({ example: true })
  is_active!: boolean;

  @ApiProperty({ enum: ['PENDING', 'PUBLISHED'] })
  publish_status!: PublishStatus;

  @ApiProperty({ example: '2026-10-18T20:40:30+07:00' })
  created_at!: string;

  @ApiProperty({ example: '2026-10-18T21:00:00+07:00', nullable: true, type: String })
  updated_at!: string | null;
}

export class DeletedProductResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '2026-10-18T21:00:00+07:00' })
  deleted_at!: string;
}

export class EffectiveAtMetaDto {
  @ApiProperty({
    example: '2026-10-18T21:05:00+07:00',
    nullable: true,
    type: String,
    description: 'Waktu perubahan berlaku di kasir (publish katalog berikutnya). null kalau belum pernah ada publish',
  })
  effective_at!: string | null;
}

export class ProductHistoryChangedByDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Owner' })
  name!: string;
}

export class ProductHistoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['CREATE', 'UPDATE', 'ACTIVATE', 'DEACTIVATE', 'STOCK_IN', 'STOCK_OUT', 'DELETE'] })
  action!: ProductHistoryAction;

  @ApiProperty({ example: 20, nullable: true, type: Number })
  quantity!: number | null;

  @ApiProperty({ example: 'Restock dari supplier', nullable: true, type: String })
  note!: string | null;

  @ApiProperty({ example: 'Indomie Goreng' })
  name!: string;

  @ApiProperty({ example: 3500 })
  price!: number;

  @ApiProperty({ example: 29 })
  stock!: number;

  @ApiProperty({ example: 10 })
  min_stock!: number;

  @ApiProperty({ example: true })
  is_active!: boolean;

  @ApiProperty({ type: ProductHistoryChangedByDto })
  changed_by!: ProductHistoryChangedByDto;

  @ApiProperty({ example: '2026-10-18T20:40:30+07:00' })
  created_at!: string;
}
