// Semua waktu ditampilkan dalam UTC+7 (Asia/Jakarta), lihat readme "Ketentuan umum".
const OFFSET_MS = 7 * 60 * 60 * 1000;

function shifted(date: Date): Date {
  return new Date(date.getTime() + OFFSET_MS);
}

const pad = (value: number): string => String(value).padStart(2, '0');

/** ISO 8601 dengan offset +07:00, contoh "2026-10-18T20:40:30+07:00". */
export function toIsoJakarta(date: Date): string;
export function toIsoJakarta(date: Date | null): string | null;
export function toIsoJakarta(date: Date | null): string | null {
  if (!date) return null;
  return `${shifted(date).toISOString().slice(0, 19)}+07:00`;
}

/** Format tampilan "dd-mm-yyyy hh:mm:ss" dalam UTC+7. */
export function toDisplayJakarta(date: Date | null): string | null {
  if (!date) return null;
  const d = shifted(date);
  return (
    `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}
