// Measured-validation framework — env-var parsing guard (AI-6-2 review fix).
//
// A bare `Number(process.env[...])` silently produces `NaN` on a typo'd/non-numeric value, which then
// silently zeroes a seeded scale or iteration count (`NaN % n` propagates NaN, `for (i=0;i<NaN;i++)`
// never runs) instead of failing loudly at the actual misconfiguration.

/** Parse a non-negative-finite env var as a number, or throw a clear error on an invalid value. */
export function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`[measured-validation] ${name} must be a non-negative finite number, got ${JSON.stringify(raw)}`);
  }
  return n;
}
