import type { AuthUser } from '$lib/api/types';

export interface NavItem {
  href: string;
  label: string;
  permission: string;
}

/** Menu ditampilkan sesuai permission role user (sama dengan permission di API). */
export const NAV_ITEMS: NavItem[] = [
  { href: '/pos', label: 'Kasir', permission: 'transaction:create' },
  { href: '/products', label: 'Produk', permission: 'product:read' },
  { href: '/catalog', label: 'Katalog', permission: 'catalog-management:read' },
  { href: '/transactions', label: 'Transaksi', permission: 'transaction:read' },
  { href: '/notifications', label: 'Notifikasi', permission: 'notification:read' },
];

/** Permission minimal untuk membuka sebuah halaman. Prefix yang lebih spesifik ditaruh lebih dulu. */
const ROUTE_PERMISSIONS: [prefix: string, permission: string][] = [
  ['/products/new', 'product:create'],
  ...NAV_ITEMS.map((item): [string, string] => [item.href, item.permission]),
];

export function requiredPermission(pathname: string): string | null {
  const match = ROUTE_PERMISSIONS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return match?.[1] ?? null;
}

/** Halaman awal setelah login: menu pertama yang boleh diakses (kasir -> /pos, owner -> /products). */
export function homePath(user: AuthUser): string {
  return NAV_ITEMS.find((item) => user.permissions.includes(item.permission))?.href ?? '/login';
}
