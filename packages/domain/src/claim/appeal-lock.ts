// The appeal advisory-lock key — a LEAF (Story 6.24a moved it here, unchanged, from `appeal-persist.ts`, the 6.19c
// `icp-lock.ts` precedent): the suspicion-appeal closure writer (`suspicion-refusal-persist.ts`, RF6) takes a held claim's
// `appeal:` key, and `appeal-persist.ts` / `appeal-panel-persist.ts` call that writer — so the key must live where all three
// can import it without a runtime import cycle. Re-exported by `appeal-persist.ts`: every existing caller keeps its import.

import { createHash } from 'node:crypto';

/** The transaction-scoped advisory-lock key for one claim's appeal action (AC9). A DISTINCT namespace prefix
 *  (`appeal:`) from the verifier / cycle-freeze / r9 locks so the four never collide on one claim. */
export function appealAdvisoryLockKey(pariwarId: string, claimCaseId: string): bigint {
  const hex = createHash('sha256').update(`appeal:${pariwarId}:${claimCaseId}`).digest('hex');
  return BigInt(`0x${hex.slice(0, 15)}`);
}
