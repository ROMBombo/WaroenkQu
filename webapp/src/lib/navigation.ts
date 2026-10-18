import BellIcon from '@lucide/svelte/icons/bell';
import BookOpenIcon from '@lucide/svelte/icons/book-open';
import PackageIcon from '@lucide/svelte/icons/package';
import ReceiptIcon from '@lucide/svelte/icons/receipt';
import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart';
import type { Component } from 'svelte';
import type { AuthUser } from '$lib/api/types';

export interface NavItem {
  href: string;
  label: string;
  permission: string;
  icon: Component;
}

/** Menu sidebar ditampilkan sesuai permission role user (sama dengan permission di API). */
export const NAV_ITEMS: NavItem[] = [
  { href: '/pos', label: 'Kasir', permission: 'transaction:create', icon: ShoppingCartIcon },
  { href: '/products', label: 'Produk', permission: 'product:read', icon: PackageIcon },
  { href: '/catalog', label: 'Katalog', permission: 'catalog-management:read', icon: BookOpenIcon },
  { href: '/transactions', label: 'Transaksi', permission: 'transaction:read', icon: ReceiptIcon },
  { href: '/notifications', label: 'Notifikasi', permission: 'notification:read', icon: BellIcon },
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

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export interface Breadcrumb {
  label: string;
  href?: string;
}

/** Breadcrumb di bar atas, contoh: Produk › Detail. */
export function breadcrumbs(pathname: string): Breadcrumb[] {
  const section = NAV_ITEMS.find((item) => isNavItemActive(item, pathname));
  if (!section) return [];
  if (pathname === section.href) return [{ label: section.label }];
  return [{ label: section.label, href: section.href }, { label: pathname.endsWith('/new') ? 'Tambah' : 'Detail' }];
}

/** Halaman awal setelah login: menu pertama yang boleh diakses (kasir -> /pos, owner -> /products). */
export function homePath(user: AuthUser): string {
  return NAV_ITEMS.find((item) => user.permissions.includes(item.permission))?.href ?? '/login';
}
