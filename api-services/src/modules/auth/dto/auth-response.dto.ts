import { ApiProperty } from '@nestjs/swagger';
import { RoleCode } from '../../../common/interfaces/auth-user.interface';

export class AuthUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'owner' })
  username!: string;

  @ApiProperty({ example: 'Owner' })
  name!: string;

  @ApiProperty({ enum: ['OWNER', 'CASHIER'] })
  role!: RoleCode;

  @ApiProperty({ type: [String], example: ['product:read', 'product:create'] })
  permissions!: string[];
}

export class AuthTokensResponseDto {
  @ApiProperty()
  access_token!: string;

  @ApiProperty({ example: 'Bearer' })
  token_type!: string;

  @ApiProperty({ description: 'Masa berlaku access token dalam detik', example: 1800 })
  expires_in!: number;

  @ApiProperty()
  refresh_token!: string;

  @ApiProperty({ description: 'Masa berlaku refresh token dalam detik', example: 604800 })
  refresh_expires_in!: number;

  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;
}
