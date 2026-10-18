import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionCode } from '../constants/permission-code.enum';
import { AuthenticatedRequest } from '../decorators/current-user.decorator';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { AppException } from '../exceptions/app.exception';

/** Global guard: cek permission dari @RequirePermissions(). Berjalan setelah JwtAuthGuard. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const granted = new Set(user?.permissions ?? []);
    if (!required.every((permission) => granted.has(permission))) {
      throw AppException.forbidden();
    }
    return true;
  }
}
