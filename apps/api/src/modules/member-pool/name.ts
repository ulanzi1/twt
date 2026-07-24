// PII-shielding name split — Story 8.2 (Task 2 / D11).
//
// ── RELOCATED to @twt/domain by Story 8.8 (Task 1) — this module is now a thin re-export ────────────
// Story 8.2 colocated the split with this handler under the "sole consumer today" rule
// ([[feedback_no_premature_package]]). Story 8.8 adds a SECOND consumer in a DIFFERENT app — the
// cycle-open notification copy built in `apps/jobs`, which cannot import `apps/api` — so the
// precondition for colocation is gone and the util moved to `packages/domain/src/kyc/name.ts`
// (the package that already owns the KYC substrate). The implementation is byte-identical to 8.2's;
// this file keeps its path + exported names so every existing apps/api import is unchanged.
//
// The substance is unchanged: `member_kyc_profiles.nameCiphertext` stores a member's declared name as a
// SINGLE combined-name string, and member-facing surfaces may show only `firstName + lastInitial` (AC2
// PII discipline, the Story 1.16b PII-scrape rule) — never the full surname. It runs on
// ALREADY-DECRYPTED plaintext at the member-session-gated read layer.

import { kyc } from '@twt/domain';

/** The two shielded name parts the card model carries — a first name + a last-name INITIAL only. */
export type ShieldedName = kyc.ShieldedName;

/** Split a combined name into a PII-shielded `{ firstName, lastInitial }` (AC2 / D11). Pure. */
export const splitFirstNameLastInitial = kyc.splitFirstNameLastInitial;
