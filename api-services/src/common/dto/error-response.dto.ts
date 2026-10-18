import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ErrorCode } from '../constants/error-code.enum';

export class ErrorBodyDto {
  @ApiProperty({ enum: ErrorCode, example: ErrorCode.VALIDATION_ERROR })
  code!: ErrorCode;

  @ApiProperty({ example: 'Data request tidak valid' })
  message!: string;

  @ApiPropertyOptional({ description: 'Info tambahan, isinya tergantung kode error' })
  details?: unknown;
}

export class ErrorResponseDto {
  @ApiProperty({ type: ErrorBodyDto })
  error!: ErrorBodyDto;
}
