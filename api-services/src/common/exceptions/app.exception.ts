import { HttpException, HttpStatus } from '@nestjs/common';
import { STATUS_CODES } from 'node:http';
import { ErrorCode } from '../constants/error-code.enum';

/**
 * Status yang pesannya selalu teks standar HTTP ("Unauthorized", "Internal Server Error", ...).
 * Alasan detailnya tidak dikirim ke client supaya tidak bisa dipakai menebak kondisi internal.
 */
export const GENERIC_MESSAGE_STATUSES: ReadonlySet<number> = new Set([
  HttpStatus.UNAUTHORIZED,
  HttpStatus.FORBIDDEN,
  HttpStatus.INTERNAL_SERVER_ERROR,
  HttpStatus.SERVICE_UNAVAILABLE,
]);

/** Teks standar HTTP untuk sebuah status, contoh 503 -> "Service Unavailable". */
export const standardMessage = (status: number): string => STATUS_CODES[status] ?? 'Error';

/** Exception dengan kode error aplikasi. Diubah menjadi response oleh AllExceptionsFilter. */
export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    status: HttpStatus,
    readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }

  static validation(message: string, details?: unknown): AppException {
    return new AppException(ErrorCode.VALIDATION_ERROR, message, HttpStatus.BAD_REQUEST, details);
  }

  static unauthorized(): AppException {
    return AppException.generic(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
  }

  static forbidden(): AppException {
    return AppException.generic(ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN);
  }

  static notFound(code: ErrorCode, message: string): AppException {
    return new AppException(code, message, HttpStatus.NOT_FOUND);
  }

  static conflict(code: ErrorCode, message: string, details?: unknown): AppException {
    return new AppException(code, message, HttpStatus.CONFLICT, details);
  }

  static unprocessable(code: ErrorCode, message: string, details?: unknown): AppException {
    return new AppException(code, message, HttpStatus.UNPROCESSABLE_ENTITY, details);
  }

  /** Kode tetap spesifik (misalnya CATALOG_NOT_AVAILABLE), pesannya standar. */
  static serviceUnavailable(code: ErrorCode): AppException {
    return AppException.generic(code, HttpStatus.SERVICE_UNAVAILABLE);
  }

  private static generic(code: ErrorCode, status: HttpStatus): AppException {
    return new AppException(code, standardMessage(status), status);
  }
}
