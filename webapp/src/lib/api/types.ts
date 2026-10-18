// Bentuk data sesuai response API Services (lihat Swagger di http://localhost:3000/docs).

export type RoleCode = 'OWNER' | 'CASHIER';
export type PublishStatus = 'PENDING' | 'PUBLISHED';
export type ProductHistoryAction =
  | 'CREATE'
  | 'UPDATE'
  | 'ACTIVATE'
  | 'DEACTIVATE'
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'DELETE';

export interface ApiBody<T, M = undefined> {
  data: T;
  meta: M;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: RoleCode;
  permissions: string[];
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  user: AuthUser;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  min_stock: number;
  is_active: boolean;
  publish_status: PublishStatus;
  created_at: string;
  updated_at: string | null;
}

export interface EffectiveAtMeta {
  effective_at: string | null;
}

export interface ProductHistory {
  id: string;
  action: ProductHistoryAction;
  quantity: number | null;
  note: string | null;
  name: string;
  price: number;
  stock: number;
  min_stock: number;
  is_active: boolean;
  changed_by: { id: string; name: string };
  created_at: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  price: number;
}

export interface CurrentCatalog {
  catalog_publish_id: string;
  published_at: string;
  products: CatalogItem[];
}

export interface PublishInfo {
  last_published_at: string | null;
  next_published_at: string | null;
}

export interface CatalogHistoryItem {
  id: string;
  published_at: string;
  product_count: number;
}

export interface CatalogHistoryDetail {
  id: string;
  published_at: string;
  products: (CatalogItem & { min_stock: number })[];
}

export interface TransactionItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface TransactionSummary {
  id: string;
  cashier: { id: string; name: string };
  catalog_publish_id: string;
  total: number;
  paid_amount: number;
  change_amount: number;
  created_at: string;
}

export interface TransactionDetail extends TransactionSummary {
  items: TransactionItem[];
}

export interface Notification {
  id: string;
  product: { id: string; name: string };
  catalog_publish_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface NotificationListMeta extends PaginationMeta {
  unread_count: number;
}

export interface FieldError {
  field: string;
  messages: string[];
}
