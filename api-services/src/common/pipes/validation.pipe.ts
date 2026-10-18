import { ParseUUIDPipe, ValidationError, ValidationPipe } from '@nestjs/common';
import { AppException } from '../exceptions/app.exception';

interface FieldError {
  field: string;
  messages: string[];
}

function flatten(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = error.constraints ? [{ field, messages: Object.values(error.constraints) }] : [];
    return [...own, ...flatten(error.children ?? [], field)];
  });
}

/**
 * Validasi body/query dengan class-validator.
 * - whitelist + forbidNonWhitelisted: field yang tidak dikenal (misalnya `stock` di PUT produk) ditolak.
 * - transform: query string diubah ke tipe di DTO (misalnya page menjadi number).
 */
export const appValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errors) => AppException.validation('Data request tidak valid', flatten(errors)),
});

/** Validasi path param UUID dengan format error yang sama. */
export const uuidPipe = new ParseUUIDPipe({
  exceptionFactory: () => AppException.validation('ID harus berupa UUID'),
});
