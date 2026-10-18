import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../interfaces/auth-user.interface';

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

/** Mengambil user yang sedang login dari request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
