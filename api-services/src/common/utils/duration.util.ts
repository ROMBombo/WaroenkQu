const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
};

/** Mengubah durasi seperti "30m", "7d", "3600s", atau "3600" menjadi detik. */
export function parseDurationToSeconds(value: string): number {
  const match = /^(\d+)\s*([smhd]?)$/.exec(value.trim());
  if (!match) {
    throw new Error(`Format durasi tidak valid: "${value}" (contoh: 30m, 7d, 3600s)`);
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_SECONDS[unit || 's'];
}
