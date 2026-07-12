// Shepherd read model — Story 6.12 (Task 5/6, AC3/AC6). Transport-free.
//
// The LIVE-shepherd read consumed by BOTH the member-facing card (AC3 — the claimant's scope-safe GET) and
// the admin verifier-console shepherd section (AC6 — read-only). Returns the current
// (`superseded_at IS NULL`) assignment's display + contact SNAPSHOT + actor id, or `null` when the claim
// has no live shepherd (pre-`verification_in_progress`, the typed not-yet-assigned state). Scope-safe: RLS
// (`claim_shepherd_assignments` tenant isolation) + the explicit pariwar predicate. The route owns the
// claimant-ownership / console-permission authorization on top of this.

import { and, eq, isNull } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import { claimShepherdAssignments } from '../schema/claim_shepherd_assignments.js';

/** The v1 shepherd role label surfaced on the member card + the console section (the shepherd IS a
 *  District Admin, D-C — a fixed human-friendly label; no per-row role resolution in v1). One authority
 *  for both surfaces. */
export const SHEPHERD_ROLE_LABEL = 'District Admin';

/** The live shepherd for a claim (the display + contact SNAPSHOT + the non-PII actor id). */
export interface LiveShepherd {
  /** The assigned District Admin's users.id (non-PII join key). */
  shepherdActorId: string;
  /** The assignment-time display-name snapshot (controlled staff attribution; never email-derived). */
  displayName: string;
  /** The assignment-time E.164 contact snapshot — tappable tel:/wa.me deep-links on the card (R1). */
  contact: { phone: string | null; whatsapp: string | null };
}

/**
 * Resolve a claim's LIVE (`superseded_at IS NULL`) shepherd, or `null` when none exists (a claim still
 * pre-`verification_in_progress`, or one whose fallback never resolved). Partial-unique guarantees ≤1 live
 * row. Tenant-scoped (RLS + explicit predicate).
 */
export async function getLiveShepherd(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<LiveShepherd | null> {
  const rows = await db
    .select({
      shepherdActorId: claimShepherdAssignments.shepherdActorId,
      displayName: claimShepherdAssignments.shepherdDisplay,
      phone: claimShepherdAssignments.shepherdContactPhone,
      whatsapp: claimShepherdAssignments.shepherdContactWhatsapp,
    })
    .from(claimShepherdAssignments)
    .where(
      and(
        eq(claimShepherdAssignments.pariwarId, pariwarId),
        eq(claimShepherdAssignments.claimCaseId, claimCaseId),
        isNull(claimShepherdAssignments.supersededAt),
      ),
    );
  const row = rows[0];
  if (!row) return null;
  return {
    shepherdActorId: row.shepherdActorId,
    displayName: row.displayName,
    contact: { phone: row.phone, whatsapp: row.whatsapp },
  };
}
