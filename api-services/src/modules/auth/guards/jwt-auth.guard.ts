import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { AuthenticatedRequest } from '../../../common/decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { AccessTokenPayload } from '../../../common/interfaces/auth-user.interface';

/**
 * Global guard: semua endpoint butuh access token kecuali yang diberi @Public().
 * User dimuat ulang dari database setiap request, supaya user yang dinonaktifkan langsung ditolak
 * walaupun tokennya belum kedaluwarsa.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);
    if (!token) throw AppException.unauthorized();

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw AppException.unauthorized();
    }

    const user = await this.authService.findActiveAuthUser(payload.sub);
    if (!user) throw AppException.unauthorized();

    request.user = user;
    return true;
  }

  private extractBearerToken(header?: string): string | null {
    const [type, token] = header?.split(' ') ?? [];
    return type === 'Bearer' && token ? token : null;
  }
}
