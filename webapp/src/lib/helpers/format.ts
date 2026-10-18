const rupiahFormatter = new Intl.NumberFormat('id-ID');

/** 3500 -> "Rp3.500" */
export function rupiah(value: number): string {
  return `Rp${rupiahFormatter.format(value)}`;
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** ISO 8601 -> "dd-mm-yyyy hh:mm:ss" dalam UTC+7 (Asia/Jakarta), sama dengan format publish-info di API. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const parts = Object.fromEntries(dateTimeFormatter.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.day}-${parts.month}-${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;
}

/** Pesan setelah owner mengubah produk (lihat readme bagian Webapp). */
export function effectiveMessage(effectiveAt: string | null): string {
  return effectiveAt
    ? `Perubahan berhasil disimpan dan akan berlaku di kasir mulai ${formatDateTime(effectiveAt)} (publish katalog berikutnya).`
    : 'Perubahan berhasil disimpan dan akan berlaku di kasir setelah publish katalog berikutnya.';
}

export const HISTORY_ACTION_LABELS: Record<string, string> = {
  CREATE: 'Dibuat',
  UPDATE: 'Diubah',
  ACTIVATE: 'Diaktifkan',
  DEACTIVATE: 'Dinonaktifkan',
  STOCK_IN: 'Tambah stok',
  STOCK_OUT: 'Kurang stok',
  DELETE: 'Dihapus',
};
