// SHA-256 hex helper — the single hashing seam for the validity payload hash.
//
// Every hash INPUT is produced by the system canonicalizer (`canonicalJsonStringify`, RFC 8785 JCS)
// BEFORE reaching here — never a bespoke `JSON.stringify` (determinism epic; a divergent
// canonicalization is a correctness defect in a replayed hash). Mirrors
// packages/niyamavali-engine/src/hash.ts (the engine's own hashing seam) — the engine does not
// export it, so the service carries its own one-liner rather than reaching into engine internals.

import { createHash } from 'node:crypto';

/** SHA-256 hex digest of an (already-canonical) string. */
export function sha256Hex(canonicalInput: string): string {
  return createHash('sha256').update(canonicalInput, 'utf8').digest('hex');
}
