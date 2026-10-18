import { ApiError } from '$lib/api/client';

const MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'Tidak bisa terhubung ke server. Periksa koneksi lalu coba lagi.',
  UNAUTHORIZED: 'Sesi Anda berakhir, silakan login ulang.',
  FORBIDDEN: 'Anda tidak punya akses untuk melakukan ini.',
  INTERNAL_SERVER_ERROR: 'Terjadi kesalahan pada server. Coba lagi beberapa saat lagi.',
  CATALOG_NOT_AVAILABLE: 'Katalog belum tersedia. Tunggu publish katalog pertama lalu muat ulang.',
  CATALOG_OUTDATED: 'Katalog sudah diperbarui. Katalog dimuat ulang, periksa kembali transaksi lalu bayar lagi.',
  PAYLOAD_TOO_LARGE: 'Data yang dikirim terlalu besar.',
};

/** Pesan yang ditampilkan ke user untuk sebuah error dari API. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return MESSAGES[error.code] ?? error.message;
  return 'Terjadi kesalahan yang tidak terduga.';
}
