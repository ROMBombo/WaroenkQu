import { Transform } from 'class-transformer';

/** Menghapus spasi di awal/akhir string sebelum divalidasi. */
export const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
