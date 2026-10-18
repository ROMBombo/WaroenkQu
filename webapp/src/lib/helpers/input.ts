/**
 * Nilai input angka untuk dikirim ke API. Input kosong dikirim sebagai null (bukan 0),
 * supaya validasi "wajib diisi" di API tetap berjalan.
 */
export function numberOrNull(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  return Number(value);
}
