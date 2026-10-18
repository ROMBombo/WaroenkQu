export type RoleCode = 'OWNER' | 'CASHIER';

/** User yang sedang login, dipasang di request oleh JwtAuthGuard. */
export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: RoleCode;
  permissions: string[];
}

export interface AccessTokenPayload {
  sub: string;
  role: RoleCode;
}
