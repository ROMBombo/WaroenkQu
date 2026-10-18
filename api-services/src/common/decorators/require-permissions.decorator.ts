import { SetMetadata } from '@nestjs/common';
import { PermissionCode } from '../constants/permission-code.enum';

export const PERMISSIONS_KEY = 'permissions';

/** Role user harus punya semua permission ini. Dicek oleh PermissionsGuard. */
export const RequirePermissions = (...permissions: PermissionCode[]) => SetMetadata(PERMISSIONS_KEY, permissions);
