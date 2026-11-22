// member_attribution accessors — Story 3.6b (Task 2; D2 / R5), Story 3.15 (DL2).
//
// The ONE writer and the ONE by-member read of `member_attribution`. Since Story 3.15 the capture is made at signup by the
// `assisted` step's route (`apps/api/src/modules/member-attribution/`, the only `apps/api` caller — N6): it inserts the row and
// resolves it through Story 13.2's API door `asOf: { captureId }` IN THE SAME transaction, so a code nobody in the Pariwar holds
// rolls back and is ⛔ stored. Nothing here validates or resolves — that is the door's; ⛔ field-worker id is stored and ⛔ credit is
// decided (Story 13.5 derives both from `attribution_source` + `captured_at`). Runs DIRECTLY on the passed (scoped) `db` (the
// member-PII write precedent). NO HTTP, NO audit, NO event — the handler writes the Story 1.10 audit line (no lifecycle event
// is minted; the member vocabulary is frozen — R5).

import { eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import {
  type MemberAttributionRow,
  memberAttribution,
} from '../schema/member_attribution.js';

export interface InsertMemberAttributionInput {
  memberId: MemberId;
  pariwarId: PariwarId;
  /** The captured 6-digit code (format-checked at the contract; stored verbatim). */
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

/**
 * The member's capture, if any — `{ attributionSource }` or `null` (Story 3.15 DL2: the signup step's status read and the
 * POST's same-code / different-code check). `UNIQUE(member_id)` ⇒ at most one row. Tenant-scoped by RLS on the passed `db`.
 */
export async function readMemberAttributionForMember(
  db: Db,
  memberId: MemberId,
): Promise<{ attributionSource: string } | null> {
  const rows = await db
    .select({ attributionSource: memberAttribution.attributionSource })
    .from(memberAttribution)
    .where(eq(memberAttribution.memberId, memberId))
    .limit(1);
  return rows[0] ?? null;
}

/** The `UNIQUE(member_id)` constraint name (matches the 0027 migration). */
const MEMBER_UQ_CONSTRAINT = 'member_attribution_member_uq';

/**
 * True when `err` is the 23505 on `member_attribution_member_uq` — two captures racing for one member (Story 3.15 DL2). The
 * transaction is ABORTED after it: the caller rolls back and re-reads in a fresh one (⛔ continue the same transaction).
 */
export function isMemberAttributionDuplicate(err: unknown): boolean {
  let e: unknown = err;
  for (let depth = 0; depth < 3 && typeof e === 'object' && e !== null; depth += 1) {
    const v = e as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (v.code === '23505') return v.constraint === MEMBER_UQ_CONSTRAINT;
    e = v.cause;
  }
  return false;
}
