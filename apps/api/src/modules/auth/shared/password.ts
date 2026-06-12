// Argon2id password hashing — first factor (Story 1.9, AC-1, Dev Note "Argon2id +
// pepper").
//
// `@node-rs/argon2` (native; the pure-JS `argon2` is ~100× slower → weaker params).
// PEPPERED via Argon2's keyed mode — the pepper is passed as the `secret` option
// (cleaner than manual HMAC-then-hash) and is sourced from Secret Manager (never
// stored with the hash). Params meet the OWASP-2026 baseline (≈ m=64 MiB, t=3,
// p=1), recorded in ADR-0009 with a review cadence (§2.3).

import { hash, verify } from '@node-rs/argon2';

import type { Argon2Params } from '../../../config.js';

// @node-rs/argon2's default algorithm IS Argon2id (the AC-1 requirement). It is
// deliberately NOT passed via `Algorithm.Argon2id`: that member is an ambient
// `const enum` which cannot be referenced under `isolatedModules`. The default is
// locked by a unit test asserting the encoded hash's `$argon2id$` prefix.
export async function hashPassword(
  plain: string,
  pepper: Buffer,
  params: Argon2Params,
): Promise<string> {
  return hash(plain, {
    memoryCost: params.memoryCost,
    timeCost: params.timeCost,
    parallelism: params.parallelism,
    secret: pepper,
  });
}

/**
 * Verify a password against a stored Argon2id encoded hash, applying the pepper.
 * Returns false (never throws) on any mismatch/parse error so the caller's failure
 * path is uniform — a malformed stored hash is a denial, not a 500.
 */
export async function verifyPassword(
  encoded: string,
  plain: string,
  pepper: Buffer,
): Promise<boolean> {
  try {
    return await verify(encoded, plain, { secret: pepper });
  } catch {
    return false;
  }
}
