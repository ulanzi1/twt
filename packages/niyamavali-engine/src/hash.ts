// SHA-256 hex helper — the single hashing seam for the engine (payload hash,
// member-state hash, niyamavali-version hash, audit request-payload digest).
//
// Every hash INPUT is produced by the system canonicalizer (`canonicalJsonStringify`,
// RFC 8785 JCS) BEFORE reaching here — never a bespoke `JSON.stringify` (determinism
// epic; a divergent canonicalization is a correctness defect in a replayed hash).
// This module only turns an already-canonical string into a stable digest.

import { createHash } from 'node:crypto';

/** SHA-256 hex digest of a (already-canonical) string. */
export function sha256Hex(canonicalInput: string): string {
  return createHash('sha256').update(canonicalInput, 'utf8').digest('hex');
}
