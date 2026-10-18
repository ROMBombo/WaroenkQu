import { ApiProperty } from '@nestjs/swagger';

export class CatalogItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Indomie Goreng' })
  name!: string;

  @ApiProperty({ example: 3500 })
  price!: number;
}

export class CurrentCatalogResponseDto {
  @ApiProperty({ format: 'uuid' })
  catalog_publish_id!: string;

  @ApiProperty({ example: '2026-10-18T07:00:00+07:00' })
  published_at!: string;

  @ApiProperty({ type: [CatalogItemResponseDto] })
  products!: CatalogItemResponseDto[];
}

export class PublishInfoResponseDto {
  @ApiProperty({ example: '18-10-2026 07:00:00', nullable: true, type: String })
  last_published_at!: string | null;

  @ApiProperty({ example: '18-10-2026 07:05:00', nullable: true, type: String })
  next_published_at!: string | null;
}

export class CatalogHistoryItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '2026-10-18T07:00:00+07:00' })
  published_at!: string;

  @ApiProperty({ example: 12 })
  product_count!: number;
}

export class CatalogSnapshotProductResponseDto extends CatalogItemResponseDto {
  @ApiProperty({ example: 10 })
  min_stock!: number;
}

export class CatalogHistoryDetailResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '2026-10-18T07:00:00+07:00' })
  published_at!: string;

  @ApiProperty({ type: [CatalogSnapshotProductResponseDto] })
  products!: CatalogSnapshotProductResponseDto[];
}
