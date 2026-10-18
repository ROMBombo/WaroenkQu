import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

export class TransactionItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  product_id!: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateTransactionDto {
  @ApiProperty({ format: 'uuid', description: 'ID katalog yang sedang dipakai webapp (dari GET /v1/catalog)' })
  @IsUUID()
  catalog_publish_id!: string;

  @ApiProperty({ type: [TransactionItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDto)
  items!: TransactionItemDto[];

  @ApiProperty({ example: 20000, minimum: 0, description: 'Uang yang dibayar pembeli, tidak boleh kurang dari total' })
  @IsInt()
  @Min(0)
  paid_amount!: number;
}
