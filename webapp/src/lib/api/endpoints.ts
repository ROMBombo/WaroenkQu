import { api } from './client';
import type {
  CatalogHistoryDetail,
  CatalogHistoryItem,
  CurrentCatalog,
  EffectiveAtMeta,
  Notification,
  NotificationListMeta,
  PaginationMeta,
  Product,
  ProductHistory,
  PublishInfo,
  TransactionDetail,
  TransactionSummary,
} from './types';

export interface PageQuery {
  page?: number;
  limit?: number;
}

/** Angka boleh null: input kosong dikirim apa adanya supaya API yang memvalidasi "wajib diisi". */
export interface ProductInput {
  name: string;
  price: number | null;
  min_stock: number | null;
}

export const productsApi = {
  list: (query: PageQuery & { search?: string }) =>
    api<Product[], PaginationMeta>('/v1/product-management', { query: { ...query } }),
  get: (id: string) => api<Product>(`/v1/product-management/${id}`),
  create: (input: ProductInput & { stock: number | null }) =>
    api<Product, EffectiveAtMeta>('/v1/product-management', { method: 'POST', body: input }),
  update: (id: string, input: ProductInput) =>
    api<Product, EffectiveAtMeta>(`/v1/product-management/${id}`, { method: 'PUT', body: input }),
  setStatus: (id: string, isActive: boolean) =>
    api<Product, EffectiveAtMeta>(`/v1/product-management/${id}/status`, { method: 'PATCH', body: { is_active: isActive } }),
  remove: (id: string) =>
    api<{ id: string; deleted_at: string }, EffectiveAtMeta>(`/v1/product-management/${id}`, { method: 'DELETE' }),
  stockIn: (id: string, quantity: number | null, note?: string) =>
    api<Product>(`/v1/product-management/${id}/stock-in`, { method: 'POST', body: { quantity, ...(note ? { note } : {}) } }),
  stockOut: (id: string, quantity: number | null, note: string) =>
    api<Product>(`/v1/product-management/${id}/stock-out`, { method: 'POST', body: { quantity, note } }),
  history: (id: string, query: PageQuery) =>
    api<ProductHistory[], PaginationMeta>(`/v1/product-management/${id}/history`, { query: { ...query } }),
};

export const catalogApi = {
  current: () => api<CurrentCatalog>('/v1/catalog'),
  publishInfo: () => api<PublishInfo>('/v1/catalog-management/publish-info'),
  history: (query: PageQuery) =>
    api<CatalogHistoryItem[], PaginationMeta>('/v1/catalog-management/history', { query: { ...query } }),
  historyDetail: (id: string) => api<CatalogHistoryDetail>(`/v1/catalog-management/history/${id}`),
};

export interface TransactionInput {
  catalog_publish_id: string;
  items: { product_id: string; quantity: number }[];
  paid_amount: number;
}

export const transactionsApi = {
  create: (input: TransactionInput) => api<TransactionDetail>('/v1/transactions', { method: 'POST', body: input }),
  list: (query: PageQuery) => api<TransactionSummary[], PaginationMeta>('/v1/transactions', { query: { ...query } }),
  get: (id: string) => api<TransactionDetail>(`/v1/transactions/${id}`),
};

export const notificationsApi = {
  list: (query: PageQuery) => api<Notification[], NotificationListMeta>('/v1/notifications', { query: { ...query } }),
  markAsRead: (id: string) => api<Notification>(`/v1/notifications/${id}/read`, { method: 'PATCH' }),
};
