import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ErrorCode } from '../constants/error-code.enum';
import { AppException, GENERIC_MESSAGE_STATUSES, standardMessage } from '../exceptions/app.exception';

export interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

const DEFAULT_CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_ERROR,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCode.PAYLOAD_TOO_LARGE,
  [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCode.INTERNAL_SERVER_ERROR,
};

/**
 * Menyeragamkan semua error menjadi { error: { code, message, details } }.
 * - AppException: pesan & details dari aplikasi, kecuali status di GENERIC_MESSAGE_STATUSES (401/403/500/503).
 * - HttpException lain dan error HTTP dari Express (misalnya JSON rusak, route tidak ada, body terlalu besar):
 *   selalu pesan standar HTTP, supaya detail framework/parser tidak bocor.
 * - Error lain: 500 dengan pesan standar, detailnya hanya dicatat di log server.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toErrorResponse(exception);
    response.status(status).json(body);
  }

  private toErrorResponse(exception: unknown): { status: number; body: ErrorResponseBody } {
    if (exception instanceof AppException) {
      const status = exception.getStatus();
      const body = GENERIC_MESSAGE_STATUSES.has(status)
        ? { code: exception.code, message: standardMessage(status) }
        : { code: exception.code, message: exception.message, details: exception.details };
      return { status, body: { error: body } };
    }

    const httpStatus = this.httpStatusOf(exception);
    if (httpStatus !== null) {
      if (httpStatus >= HttpStatus.INTERNAL_SERVER_ERROR) this.logger.error((exception as Error).stack);
      return {
        status: httpStatus,
        body: {
          error: { code: DEFAULT_CODE_BY_STATUS[httpStatus] ?? `HTTP_${httpStatus}`, message: standardMessage(httpStatus) },
        },
      };
    }

    this.logger.error(exception instanceof Error ? exception.stack : exception);
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    return {
      status,
      body: { error: { code: ErrorCode.INTERNAL_SERVER_ERROR, message: standardMessage(status) } },
    };
  }

  /**
   * Status HTTP dari HttpException NestJS, atau dari error body-parser Express (misalnya body terlalu besar -> 413)
   * yang membawa properti status 4xx. Selain itu null (dianggap error tak terduga).
   */
  private httpStatusOf(exception: unknown): number | null {
    if (exception instanceof HttpException) return exception.getStatus();
    const status = (exception as { status?: unknown } | null)?.status;
    return typeof status === 'number' && status >= 400 && status < 500 ? status : null;
  }
}
