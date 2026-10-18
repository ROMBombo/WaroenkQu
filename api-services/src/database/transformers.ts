import { ValueTransformer } from 'typeorm';

/** pg mengembalikan BIGINT sebagai string. Nilai Rupiah di aplikasi ini aman sebagai number. */
export const bigintToNumber: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : Number(value)),
};
