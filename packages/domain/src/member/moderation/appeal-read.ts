// Moderation-appeal DB READS — Story 10.22. Niyamavali §8.8 (Decision `2026-08-15-121`).
//
// ⛔ Reads only. The writes live in `appeal-persist.ts` and the rules in `appeal.ts`.
// ⛔ Nothing here imports from `claim/appeal*.ts` — the moderation appeal is a DISTINCT journey.
//
// Every dynamic `.limit()` in this file goes through `clampLimit`, per the domain limit-clamp gate
// ([[project_domain_limit_clamp_and_savepoint_retry]]).
//
// ⚠ These reads return CIPHERTEXT in the Tier-1 columns. Decryption is the caller's, inside an
// encryption context — the same discipline every other Tier-1 read in this package follows.

import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import type { Db } from '../../db.js';
import type {
  MemberId,
  MemberModerationAppealId,
  ModerationActionId,
  PariwarId,
} from '../../ids/index.js';
import { clampLimit } from '../../pagination.js';
import { memberModerationActions } from '../../schema/member_moderation_actions.js';
import { memberModerationAppeals } from '../../schema/member_moderation_appeals.js';
import { memberModerationGrounds } from '../../schema/member_moderation_grounds.js';

/** Page-size posture for the appeal reads. The adjudication queue is small by construction. */
const APPEAL_LIST_DEFAULT = 50;
const APPEAL_LIST_CAP = 200;

/**
 * Scan cap for the exclusion-set reads. A single moderation act has one actor and a bounded number
 * of grounds; this is a safety ceiling, not a pagination window.
 * ⚠ It is deliberately generous: **truncating this set would silently ADMIT an excluded adjudicator**,
 * which is the one failure mode §8.8's different-individual requirement exists to prevent. If a real
 * action ever approached this many grounds, the correct response is to raise the cap, never to page.
 */
const EXCLUSION_SCAN_CAP = 1000;

export type MemberModerationAppealRecord = {
  readonly appealId: MemberModerationAppealId;
  readonly memberId: MemberId;
  readonly pariwarId: PariwarId;
  readonly moderationActionId: ModerationActionId;
  readonly groundsCiphertext: string;
  readonly filedVia: 'portal' | 'helpline';
  readonly helpdeskTicketId: string | null;
  readonly filedAt: Date;
  readonly status: 'open' | 'decided';
  readonly outcome: 'upheld' | 'allowed' | null;
  readonly reasonedOutcomeCiphertext: string | null;
  readonly decidedByActorId: string | null;
  readonly decidedByDisplay: string | null;
  readonly decidedAt: Date | null;
};

const APPEAL_COLUMNS = {
  appealId: memberModerationAppeals.appealId,
  memberId: memberModerationAppeals.memberId,
  pariwarId: memberModerationAppeals.pariwarId,
  moderationActionId: memberModerationAppeals.moderationActionId,
  groundsCiphertext: memberModerationAppeals.groundsCiphertext,
  filedVia: memberModerationAppeals.filedVia,
  helpdeskTicketId: memberModerationAppeals.helpdeskTicketId,
  filedAt: memberModerationAppeals.filedAt,
  status: memberModerationAppeals.status,
  outcome: memberModerationAppeals.outcome,
  reasonedOutcomeCiphertext: memberModerationAppeals.reasonedOutcomeCiphertext,
  decidedByActorId: memberModerationAppeals.decidedByActorId,
  decidedByDisplay: memberModerationAppeals.decidedByDisplay,
  decidedAt: memberModerationAppeals.decidedAt,
} as const;

/** One appeal by id, tenant-scoped. `null` when absent — the caller turns that into a 404. */
export async function getMemberModerationAppeal(
  db: Db,
  pariwarId: PariwarId,
  appealId: MemberModerationAppealId,
): Promise<MemberModerationAppealRecord | null> {
  const rows = await db
    .select(APPEAL_COLUMNS)
    .from(memberModerationAppeals)
    .where(
      and(
        eq(memberModerationAppeals.pariwarId, pariwarId),
        eq(memberModerationAppeals.appealId, appealId),
      ),
    )
    .limit(1);
  return (rows[0] as MemberModerationAppealRecord | undefined) ?? null;
}

/**
 * The OPEN appeal against a given moderation act, if there is one.
 *
 * This is the read behind the filing guard. ⚠ **It is a guard, not the truth** — the partial UNIQUE
 * index `member_moderation_appeals_one_open_per_action` is the truth, and a guard-bypass race lands
 * on `23505`. The guard exists so the ordinary path returns a typed 409 rather than a leaked
 * constraint violation.
 */
export async function getOpenAppealForAction(
  db: Db,
  pariwarId: PariwarId,
  moderationActionId: ModerationActionId,
): Promise<MemberModerationAppealRecord | null> {
  const rows = await db
    .select(APPEAL_COLUMNS)
    .from(memberModerationAppeals)
    .where(
      and(
        eq(memberModerationAppeals.pariwarId, pariwarId),
        eq(memberModerationAppeals.moderationActionId, moderationActionId),
        eq(memberModerationAppeals.status, 'open'),
      ),
    )
    .limit(1);
  return (rows[0] as MemberModerationAppealRecord | undefined) ?? null;
}

/**
 * ⭐ THE ADJUDICATION LIST (AC5) — open appeals within the caller's scope, oldest filing first.
 *
 * ⚠ This read is not a convenience. `trustee_panel` holds NO helpdesk capability at all
 * (`roles.ts:594-637`; stated as settled at `permissions.ts:539-541`) and `routed_to_role` is
 * advisory and inert — so there is no operator queue an appeal could arrive on. A technically
 * complete record plus a decide-endpoint reachable only by direct link would reproduce exactly the
 * helpdesk-is-not-a-queue defect (D6): a filed appeal nobody can find is an unheard member.
 */
export async function listOpenAppealsForPariwar(
  db: Db,
  pariwarId: PariwarId,
  limit?: number,
): Promise<readonly MemberModerationAppealRecord[]> {
  const rows = await db
    .select(APPEAL_COLUMNS)
    .from(memberModerationAppeals)
    .where(
      and(
        eq(memberModerationAppeals.pariwarId, pariwarId),
        eq(memberModerationAppeals.status, 'open'),
      ),
    )
    .orderBy(asc(memberModerationAppeals.filedAt))
    .limit(clampLimit(limit, { default: APPEAL_LIST_DEFAULT, cap: APPEAL_LIST_CAP }));
  return rows as readonly MemberModerationAppealRecord[];
}

/** Every appeal a member has filed, newest first — the member-facing and admin-facing history. */
export async function listAppealsForMember(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  limit?: number,
): Promise<readonly MemberModerationAppealRecord[]> {
  const rows = await db
    .select(APPEAL_COLUMNS)
    .from(memberModerationAppeals)
    .where(
      and(
        eq(memberModerationAppeals.pariwarId, pariwarId),
        eq(memberModerationAppeals.memberId, memberId),
      ),
    )
    .orderBy(desc(memberModerationAppeals.filedAt))
    .limit(clampLimit(limit, { default: APPEAL_LIST_DEFAULT, cap: APPEAL_LIST_CAP }));
  return rows as readonly MemberModerationAppealRecord[];
}

/**
 * Every appeal against a given moderation act, newest first — the lineage read behind the admin
 * cross-link (`moderation action → appeal → restore`, readable from either end; AC6).
 */
export async function listAppealsForAction(
  db: Db,
  pariwarId: PariwarId,
  moderationActionId: ModerationActionId,
  limit?: number,
): Promise<readonly MemberModerationAppealRecord[]> {
  const rows = await db
    .select(APPEAL_COLUMNS)
    .from(memberModerationAppeals)
    .where(
      and(
        eq(memberModerationAppeals.pariwarId, pariwarId),
        eq(memberModerationAppeals.moderationActionId, moderationActionId),
      ),
    )
    .orderBy(desc(memberModerationAppeals.filedAt))
    .limit(clampLimit(limit, { default: APPEAL_LIST_DEFAULT, cap: APPEAL_LIST_CAP }));
  return rows as readonly MemberModerationAppealRecord[];
}

/**
 * ⭐ THE EXCLUSION SET for a moderation act (§8.8; Decision clause 3).
 *
 * The union of everyone who took part in the appealed act:
 *   · `member_moderation_actions.actor_id` — the authority who imposed it;
 *   · `member_moderation_grounds.added_by` — everyone who contributed a ground it rests on.
 *
 * ⚠ Mirrors the SHAPE of the claim side's `getOriginalDeciderActorIds` and **imports nothing from
 * it**. The two journeys are distinct: Part 9 is claim-scoped with three geographic stages and no
 * member in it; this is a Part 8 act against a member.
 *
 * ⚠ Tenant-scoped on BOTH reads. An exclusion set assembled across Pariwars would be a cross-tenant
 * read; one assembled without the tenant predicate could also come back EMPTY under RLS, which fails
 * OPEN — it would admit the original decider. Both predicates are load-bearing.
 */
export async function getAppealExclusionActorIds(
  db: Db,
  pariwarId: PariwarId,
  moderationActionId: ModerationActionId,
): Promise<ReadonlySet<string>> {
  const cap = { default: EXCLUSION_SCAN_CAP, cap: EXCLUSION_SCAN_CAP };

  const actionRows = await db
    .select({ actorId: memberModerationActions.actorId })
    .from(memberModerationActions)
    .where(
      and(
        eq(memberModerationActions.pariwarId, pariwarId),
        eq(memberModerationActions.moderationActionId, moderationActionId),
      ),
    )
    .limit(clampLimit(EXCLUSION_SCAN_CAP, cap));

  const groundRows = await db
    .select({ addedBy: memberModerationGrounds.addedBy })
    .from(memberModerationGrounds)
    .where(
      and(
        eq(memberModerationGrounds.pariwarId, pariwarId),
        eq(memberModerationGrounds.moderationActionId, moderationActionId),
      ),
    )
    .limit(clampLimit(EXCLUSION_SCAN_CAP, cap));

  const set = new Set<string>();
  for (const r of actionRows) set.add(r.actorId);
  for (const r of groundRows) set.add(r.addedBy);
  return set;
}

/**
 * The moderation acts a member may appeal — those with no open appeal against them.
 * Used by the member-facing filing surface to name the act, and by the admin lineage view.
 */
export async function listAppealableActionIds(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  limit?: number,
): Promise<readonly ModerationActionId[]> {
  const clamped = clampLimit(limit, { default: APPEAL_LIST_DEFAULT, cap: APPEAL_LIST_CAP });

  const actions = await db
    .select({ id: memberModerationActions.moderationActionId })
    .from(memberModerationActions)
    .where(
      and(
        eq(memberModerationActions.pariwarId, pariwarId),
        eq(memberModerationActions.memberId, memberId),
        inArray(memberModerationActions.action, ['suspend', 'terminate']),
      ),
    )
    .orderBy(desc(memberModerationActions.actedAt))
    .limit(clamped);

  if (actions.length === 0) return [];

  const openRows = await db
    .select({ id: memberModerationAppeals.moderationActionId })
    .from(memberModerationAppeals)
    .where(
      and(
        eq(memberModerationAppeals.pariwarId, pariwarId),
        eq(memberModerationAppeals.status, 'open'),
        inArray(
          memberModerationAppeals.moderationActionId,
          actions.map((a) => a.id),
        ),
      ),
    )
    .limit(clamped);

  const open = new Set(openRows.map((r) => r.id));
  return actions.filter((a) => !open.has(a.id)).map((a) => a.id);
}
