import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination.dto';

export class NotificationProductDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Indomie Goreng' })
  name!: string;
}

export class NotificationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: NotificationProductDto })
  product!: NotificationProductDto;

  @ApiProperty({ format: 'uuid' })
  catalog_publish_id!: string;

  @ApiProperty({ example: 'Stok Indomie Goreng tersisa 9 (minimum 10)' })
  message!: string;

  @ApiProperty({ example: false })
  is_read!: boolean;

  @ApiProperty({ example: '2026-10-18T20:40:30+07:00' })
  created_at!: string;

  @ApiProperty({ example: null, nullable: true, type: String })
  read_at!: string | null;
}

export class NotificationListMetaDto extends PaginationMetaDto {
  @ApiProperty({ example: 3, description: 'Jumlah notifikasi yang belum dibaca' })
  unread_count!: number;
}
