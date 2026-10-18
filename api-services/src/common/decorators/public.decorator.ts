import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Endpoint yang bisa diakses tanpa access token (login, refresh, health). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
