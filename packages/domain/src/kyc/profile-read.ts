// member_kyc_profiles read accessor — Story 3.3b (Task 1).
//
// Extends the 3.3a `kyc/` namespace (re-exported as `@twt/domain` `kyc.*`). TENANT-scoped:
// takes an explicit `pariwarId` for defense-in-depth alongside RLS (the kyc_transactions
// accessor precedent). Like consent/member/kyc-transactions, this is a transport-free
// PRIMITIVE: NO HTTP, NO audit, NO event emission, NO decryption — the route orchestrates
// those (the accessor returns the row with ciphertext columns AS STORED; the handler
// decrypts the Tier-1 envelopes under the request's encryption context).

import { and, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import {
  type MemberKycProfileRow,
  memberKycProfiles,
} from '../schema/member_kyc_profiles.js';

/**
 * Resolve a member's KYC profile within a Pariwar — backs `GET /member/kyc/status` and the
 * confirm guard ("a stored profile exists"). Returns null when no profile row exists for
 * the member in the Pariwar. Tenant-scoped (RLS + the explicit predicate).
 */
export async function getMemberKycProfile(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<MemberKycProfileRow | null> {
  const rows = await db
    .select()
    .from(memberKycProfiles)
    .where(
      and(eq(memberKycProfiles.pariwarId, pariwarId), eq(memberKycProfiles.memberId, memberId)),
    )
    .limit(1);
  return rows[0] ?? null;
}
