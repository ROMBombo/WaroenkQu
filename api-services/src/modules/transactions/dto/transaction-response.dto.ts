import { ApiProperty } from '@nestjs/swagger';

export class TransactionCashierDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Kasir 1' })
  name!: string;
}

export class TransactionItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  product_id!: string;

  @ApiProperty({ example: 'Indomie Goreng' })
  product_name!: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: 3500 })
  price!: number;

  @ApiProperty({ example: 7000 })
  subtotal!: number;
}

export class TransactionSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: TransactionCashierDto })
  cashier!: TransactionCashierDto;

  @ApiProperty({ format: 'uuid' })
  catalog_publish_id!: string;

  @ApiProperty({ example: 12000 })
  total!: number;

  @ApiProperty({ example: 20000 })
  paid_amount!: number;

  @ApiProperty({ example: 8000 })
  change_amount!: number;

  @ApiProperty({ example: '2026-10-18T20:40:30+07:00' })
  created_at!: string;
}

export class TransactionDetailResponseDto extends TransactionSummaryResponseDto {
  @ApiProperty({ type: [TransactionItemResponseDto] })
  items!: TransactionItemResponseDto[];
}
