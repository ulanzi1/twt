// The INTAKE advisory-lock key for one death — Story 6.3/6.4 (moved here UNCHANGED from `icp.ts` by Story 6.19c, so
// `refile-guard.ts` can take the SAME lock as the mints without a runtime import cycle; `icp.ts` re-exports it).
//
// The transaction-scoped advisory-lock key for one death's intake — the SHARED key both the ICP and any
// convergence-resolution writer take (and, since 6.19c, the re-file confirmation writer), so concurrent dual-channel
// filings serialize against the identical lock (the candidate read is then race-safe). Postgres advisory locks take a
// bigint — derive a stable one from the (pariwarId, deceasedMemberId) pair via a truncated SHA-256.

import { createHash } from 'node:crypto';

export function intakeAdvisoryLockKey(pariwarId: string, deceasedMemberId: string): bigint {
  const hex = createHash('sha256').update(`${pariwarId}:${deceasedMemberId}`).digest('hex');
  // 15 hex chars (60 bits) → always positive, safely inside Postgres' signed bigint
  // advisory-lock arg (63 usable magnitude bits).
  return BigInt(`0x${hex.slice(0, 15)}`);
}
