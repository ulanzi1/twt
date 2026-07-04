// member_medical_disclosures read accessors — Story 3.5 (Task 2).
//
// Backs `GET /member/medical-disclosure` (the status read) and the submit handler's status
// build. TENANT-scoped: takes an explicit `pariwarId` for defense-in-depth alongside RLS (the
// member_nominees read precedent). A transport-free PRIMITIVE: NO HTTP, NO audit, NO decryption
// — the route maps the rows to the NON-PII summary (presence/count), decrypting NOTHING for the
// status view.
//
// ── Append-only history (R2) ───────────────────────────────────────────────────────────────
// Unlike the nominee read (which returns the single effective row-set), this returns the FULL
// disclosure history newest-first — Epic 4 concealment evaluation walks it. `getLatest…` is a
// convenience for the status summary (the head of the same history).

import { and, desc, eq, lte } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import {
  type MemberMedicalDisclosureRow,
  memberMedicalDisclosures,
} from '../schema/member_medical_disclosures.js';

/**
 * Resolve a member's FULL medical-disclosure history within a Pariwar, newest-first (the head is
 * the latest disclosure). Returns `[]` when the member has disclosed nothing. Tenant-scoped (RLS
 * + the explicit predicate). Ordered by `created_at DESC` — the append-only timeline Epic 4 walks.
 *
 * Optional `atTimestamp` restricts the history to disclosures recorded at/before that instant — the
 * Story 4.6 Validity Service's `getValidityAt` needs this for replay-correct historical reads (a past
 * `at` must NOT see a disclosure filed after that instant). Omitted → present-day (unbounded), the
 * pre-existing behavior every other caller (medical status route, life-events panel) relies on.
 */
export async function getMedicalDisclosures(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  atTimestamp?: Date,
): Promise<MemberMedicalDisclosureRow[]> {
  return db
    .select()
    .from(memberMedicalDisclosures)
    .where(
      and(
        eq(memberMedicalDisclosures.pariwarId, pariwarId),
        eq(memberMedicalDisclosures.memberId, memberId),
        atTimestamp ? lte(memberMedicalDisclosures.createdAt, atTimestamp) : undefined,
      ),
    )
    .orderBy(desc(memberMedicalDisclosures.createdAt));
}

/**
 * The single most-recent disclosure (the history head), or null when none exists — the status
 * summary's source. A thin `limit(1)` over the same newest-first ordering as `getMedicalDisclosures`.
 */
export async function getLatestMedicalDisclosure(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<MemberMedicalDisclosureRow | null> {
  const rows = await db
    .select()
    .from(memberMedicalDisclosures)
    .where(
      and(
        eq(memberMedicalDisclosures.pariwarId, pariwarId),
        eq(memberMedicalDisclosures.memberId, memberId),
      ),
    )
    .orderBy(desc(memberMedicalDisclosures.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
