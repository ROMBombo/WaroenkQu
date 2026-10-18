/** Kode permission, sama dengan isi tabel permissions (lihat seeds/0001_roles_permissions.sql). */
export enum PermissionCode {
  PRODUCT_READ = 'product:read',
  PRODUCT_CREATE = 'product:create',
  PRODUCT_UPDATE = 'product:update',
  PRODUCT_STATUS_UPDATE = 'product-status:update',
  PRODUCT_DELETE = 'product:delete',
  PRODUCT_STOCK_UPDATE = 'product-stock:update',
  PRODUCT_HISTORY_READ = 'product-history:read',
  CATALOG_MANAGEMENT_READ = 'catalog-management:read',
  CATALOG_READ = 'catalog:read',
  TRANSACTION_CREATE = 'transaction:create',
  TRANSACTION_READ = 'transaction:read',
  NOTIFICATION_READ = 'notification:read',
  NOTIFICATION_UPDATE = 'notification:update',
}
