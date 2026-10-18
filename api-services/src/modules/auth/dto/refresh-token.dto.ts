import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token dari response login atau refresh sebelumnya' })
  @IsString()
  @IsNotEmpty()
  refresh_token!: string;
}
