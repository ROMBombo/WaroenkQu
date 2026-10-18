import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ApiDataResponse, ApiResponseBody, ok } from '../../common/dto/api-response';
import { AuthService } from './auth.service';
import { AuthTokensResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth')
@Public()
@ApiErrorResponses('INTERNAL_SERVER_ERROR')
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login dengan username dan password' })
  @ApiErrorResponses('VALIDATION_ERROR', 'UNAUTHORIZED_LOGIN')
  @ApiDataResponse(AuthTokensResponseDto)
  async login(@Body() dto: LoginDto): Promise<ApiResponseBody<AuthTokensResponseDto>> {
    return ok(await this.authService.login(dto.username, dto.password));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Menukar refresh token dengan pasangan token baru' })
  @ApiErrorResponses('VALIDATION_ERROR', 'UNAUTHORIZED_REFRESH')
  @ApiDataResponse(AuthTokensResponseDto)
  async refresh(@Body() dto: RefreshTokenDto): Promise<ApiResponseBody<AuthTokensResponseDto>> {
    return ok(await this.authService.refresh(dto.refresh_token));
  }
}
