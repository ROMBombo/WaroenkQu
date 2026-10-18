import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { Trim } from '../../../common/utils/transform.util';

export const PRICE_MIN = 100;
export const PRICE_MAX = 1_000_000;
export const NAME_MAX_LENGTH = 50;

export class UpdateProductDto {
  @ApiProperty({ example: 'Indomie Goreng', maxLength: NAME_MAX_LENGTH })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  name!: string;

  @ApiProperty({ example: 3500, minimum: PRICE_MIN, maximum: PRICE_MAX })
  @IsInt()
  @Min(PRICE_MIN)
  @Max(PRICE_MAX)
  price!: number;

  @ApiProperty({ example: 10, minimum: 0 })
  @IsInt()
  @Min(0)
  min_stock!: number;
}

export class CreateProductDto extends UpdateProductDto {
  @ApiProperty({ description: 'Stok awal', example: 50, minimum: 0 })
  @IsInt()
  @Min(0)
  stock!: number;
}

export class UpdateProductStatusDto {
  @ApiProperty({ example: false, description: 'true = aktifkan, false = nonaktifkan' })
  @IsBoolean()
  is_active!: boolean;
}

export class StockInDto {
  @ApiProperty({ example: 10, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 'Restock dari supplier' })
  @IsOptional()
  @Trim()
  @IsString()
  note?: string;
}

export class StockOutDto {
  @ApiProperty({ example: 3, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 'Barang rusak', description: 'Wajib diisi' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  note!: string;
}

export class ListProductsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Cari berdasarkan nama (tidak membedakan huruf besar/kecil)' })
  @IsOptional()
  @Trim()
  @IsString()
  search?: string;
}
