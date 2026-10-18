import { HttpStatus } from '@nestjs/common';
import { standardMessage } from '../exceptions/app.exception';
import { ErrorCode } from './error-code.enum';

export interface ErrorExample {
  status: HttpStatus;
  code: ErrorCode;
  summary: string;
  message: string;
  details?: unknown;
}

const UUID = '3f1c2a9e-8b7d-4c6a-9e21-5d4b3a2f1e00';

/**
 * Contoh response error untuk dokumentasi Swagger.
 * Pesan dan details harus sama dengan yang benar-benar dikirim API (lihat AppException di tiap service).
 */
export const ERROR_EXAMPLES = {
  VALIDATION_ERROR: {
    status: HttpStatus.BAD_REQUEST,
    code: ErrorCode.VALIDATION_ERROR,
    summary: 'Field tidak valid atau tidak dikenal',
    message: 'Data request tidak valid',
    details: [
      { field: 'price', messages: ['price must not be less than 100'] },
      { field: 'stock', messages: ['property stock should not exist'] },
    ],
  },
  INVALID_UUID: {
    status: HttpStatus.BAD_REQUEST,
    code: ErrorCode.VALIDATION_ERROR,
    summary: 'ID di path bukan UUID',
    message: 'ID harus berupa UUID',
  },
  DUPLICATE_TRANSACTION_ITEM: {
    status: HttpStatus.BAD_REQUEST,
    code: ErrorCode.VALIDATION_ERROR,
    summary: 'Produk yang sama muncul lebih dari sekali',
    message: 'Satu produk hanya boleh muncul sekali dalam satu transaksi',
    details: { duplicate_product_ids: [UUID] },
  },
  PAID_AMOUNT_TOO_LOW: {
    status: HttpStatus.BAD_REQUEST,
    code: ErrorCode.VALIDATION_ERROR,
    summary: 'Uang dibayar kurang dari total',
    message: 'Uang dibayar kurang dari total',
    details: { total: 12000, paid_amount: 10000 },
  },
  // 401, 403, 500, 503 sengaja memakai pesan standar HTTP (lihat GENERIC_MESSAGE_STATUSES)
  UNAUTHORIZED_LOGIN: {
    status: HttpStatus.UNAUTHORIZED,
    code: ErrorCode.UNAUTHORIZED,
    summary: 'Username/password salah atau user nonaktif',
    message: standardMessage(HttpStatus.UNAUTHORIZED),
  },
  UNAUTHORIZED_REFRESH: {
    status: HttpStatus.UNAUTHORIZED,
    code: ErrorCode.UNAUTHORIZED,
    summary: 'Refresh token tidak valid, sudah dipakai, kedaluwarsa, atau user nonaktif',
    message: standardMessage(HttpStatus.UNAUTHORIZED),
  },
  UNAUTHORIZED: {
    status: HttpStatus.UNAUTHORIZED,
    code: ErrorCode.UNAUTHORIZED,
    summary: 'Access token tidak ada, tidak valid, kedaluwarsa, atau user nonaktif',
    message: standardMessage(HttpStatus.UNAUTHORIZED),
  },
  FORBIDDEN: {
    status: HttpStatus.FORBIDDEN,
    code: ErrorCode.FORBIDDEN,
    summary: 'Role tidak punya permission',
    message: standardMessage(HttpStatus.FORBIDDEN),
  },
  PRODUCT_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: ErrorCode.PRODUCT_NOT_FOUND,
    summary: 'Produk tidak ada atau sudah dihapus',
    message: 'Produk tidak ditemukan',
  },
  CATALOG_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: ErrorCode.CATALOG_NOT_FOUND,
    summary: 'History katalog tidak ada',
    message: 'Katalog tidak ditemukan',
  },
  TRANSACTION_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: ErrorCode.TRANSACTION_NOT_FOUND,
    summary: 'Transaksi tidak ada atau milik kasir lain',
    message: 'Transaksi tidak ditemukan',
  },
  NOTIFICATION_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    code: ErrorCode.NOTIFICATION_NOT_FOUND,
    summary: 'Notifikasi tidak ada',
    message: 'Notifikasi tidak ditemukan',
  },
  DUPLICATE_PRODUCT_NAME: {
    status: HttpStatus.CONFLICT,
    code: ErrorCode.DUPLICATE_PRODUCT_NAME,
    summary: 'Nama sudah dipakai produk lain yang belum dihapus',
    message: 'Nama produk sudah dipakai produk lain',
  },
  CATALOG_OUTDATED: {
    status: HttpStatus.CONFLICT,
    code: ErrorCode.CATALOG_OUTDATED,
    summary: 'Sudah ada publish katalog baru',
    message: 'Katalog sudah diperbarui, muat ulang katalog',
    details: { current_catalog_publish_id: UUID },
  },
  PRODUCT_NOT_IN_CATALOG: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    code: ErrorCode.PRODUCT_NOT_IN_CATALOG,
    summary: 'Produk tidak ada di katalog Redis',
    message: 'Produk tidak ada di katalog',
    details: { product_ids: [UUID] },
  },
  INSUFFICIENT_STOCK_TRANSACTION: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    code: ErrorCode.INSUFFICIENT_STOCK,
    summary: 'Stok salah satu produk tidak cukup (seluruh transaksi ditolak)',
    message: 'Stok Teh Botol tidak cukup',
    details: { product_id: UUID, product_name: 'Teh Botol', requested: 3, available: 1 },
  },
  INSUFFICIENT_STOCK_OUT: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    code: ErrorCode.INSUFFICIENT_STOCK,
    summary: 'Pengurangan membuat stok negatif',
    message: 'Stok tidak cukup untuk dikurangi',
    details: { product_id: UUID, requested: 30, available: 24 },
  },
  CATALOG_NOT_AVAILABLE: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    code: ErrorCode.CATALOG_NOT_AVAILABLE,
    summary: 'Katalog belum ada di Redis',
    message: standardMessage(HttpStatus.SERVICE_UNAVAILABLE),
  },
  INTERNAL_SERVER_ERROR: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    summary: 'Error tak terduga (misalnya database atau Redis tidak bisa diakses)',
    message: standardMessage(HttpStatus.INTERNAL_SERVER_ERROR),
  },
} satisfies Record<string, ErrorExample>;

export type ErrorExampleKey = keyof typeof ERROR_EXAMPLES;
