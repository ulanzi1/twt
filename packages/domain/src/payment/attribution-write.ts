// member_attribution write accessor — Story 3.6b (Task 2; D2 / R5).
//
// The Reference Code port-seam capture: insert ONE row storing the optional 6-digit code as
// `attribution_source`. NO registry validation, NO field-worker FK resolution (Epic 13 is not built —
// D2). Runs its INSERT DIRECTLY on the passed (scoped) `db` (the member-PII write precedent). NO HTTP,
// NO audit, NO event — the handler writes the Story 1.10 audit line (no lifecycle event is minted; the
// member vocabulary is frozen — R5).

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import {
  type MemberAttributionRow,
  memberAttribution,
} from '../schema/member_attribution.js';

export interface InsertMemberAttributionInput {
  memberId: MemberId;
  pariwarId: PariwarId;
  /** The captured 6-digit Reference Code (format-checked at the contract; stored verbatim). */
  attributionSource: string;
}

/**
 * Insert a member attribution capture within the caller's scope tx. Returns the inserted row.
 * Tenant-scoped (RLS `withCheck` enforces `app.pariwar_id`).
 */
export async function insertMemberAttribution(
  db: Db,
  input: InsertMemberAttributionInput,
): Promise<MemberAttributionRow> {
  const inserted = await db
    .insert(memberAttribution)
    .values({
      memberId: input.memberId,
      pariwarId: input.pariwarId,
      attributionSource: input.attributionSource,
    })
    .returning();
  const row = inserted[0];
  if (!row) {
    throw new Error('[insertMemberAttribution] insert returned no row — check session scope');
  }
  return row;
}
