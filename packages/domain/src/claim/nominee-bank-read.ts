// Claim-time nominee-bank read accessor — Story 6.8 (Task 4; AC3). Transport-free.
//
// `getClaimNomineeBankAccountsCiphertext` is the surface the Epic 7 pool spawn (Story 7.4
// nominee_bank_accounts refs) and the Epic 9 dual-account donor-choice read (Story 9.9) consume. It
// returns the claim's account rows (empty when not yet collected, EXACTLY TWO when collected —
// never a single-account partial, per Task 5), ordered by account_rank (#1 then #2). Ciphertext is
// returned AS STORED — the ROUTE/consumer decrypts under its OWN encryption context at
// disbursement time (the getClaimGroundInspection / getClaimDocuments precedent — the accessor
// never decrypts).
//
// NAMING (review finding, 2026-07-11): suffixed `Ciphertext` — unlike its `getClaimGroundInspection`/
// `getClaimDocuments` siblings — specifically because this row shape is ALSO exposed through a
// masked API read endpoint (`GET .../nominee-bank`, the presence-view `nomineeBankStatus()` in
// `claims.nominee-bank.handlers.ts`) sitting right next to the domain accessor; the suffix is a
// misuse-resistance guard against a future caller returning this row shape (ciphertext + all) from
// an API handler by mistake, confusing it with the already-masked view. A cheap, one-caller rename;
// not a broader family-wide convention change.
//
// ABSENCE IS A SIGNAL (AC3): a claim with NO accounts returns `[]` — a first-class "not yet
// collected" signal the consumer MUST handle, never a throw.
//
// Tenant-scoped by RLS + the explicit `pariwar_id` predicate (a cross-tenant claim_case_id guess
// resolves to empty, never another Pariwar's disbursement accounts — AC5).

import { and, asc, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import {
  type ClaimNomineeBankAccountRow,
  claimNomineeBankAccounts,
} from '../schema/claim_nominee_bank_accounts.js';

/**
 * The claim's nominee bank accounts, ordered #1 → #2. Returns `[]` when the claim has no accounts
 * (the AC3 absence signal). Ciphertext AS STORED (the consumer decrypts). Tenant-scoped.
 */
export async function getClaimNomineeBankAccountsCiphertext(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimNomineeBankAccountRow[]> {
  return db
    .select()
    .from(claimNomineeBankAccounts)
    .where(
      and(
        eq(claimNomineeBankAccounts.pariwarId, pariwarId),
        eq(claimNomineeBankAccounts.claimCaseId, claimCaseId),
      ),
    )
    .orderBy(asc(claimNomineeBankAccounts.accountRank));
}
