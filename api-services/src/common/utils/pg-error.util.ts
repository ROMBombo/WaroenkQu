import { QueryFailedError } from 'typeorm';

const UNIQUE_VIOLATION = '23505';

/** true kalau error dari Postgres adalah pelanggaran unique pada constraint/index tertentu. */
export function isUniqueViolation(err: unknown, constraint: string): boolean {
  if (!(err instanceof QueryFailedError)) return false;
  const driverError = err.driverError as { code?: string; constraint?: string };
  return driverError.code === UNIQUE_VIOLATION && driverError.constraint === constraint;
}

/** Escape karakter wildcard LIKE supaya input pencarian diperlakukan sebagai teks biasa. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
