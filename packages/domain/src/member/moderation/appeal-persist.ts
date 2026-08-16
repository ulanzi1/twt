// Moderation-appeal WRITES — Story 10.22. Niyamavali §8.8 (Decision `2026-08-15-121`).
//
// Two writes, and only two: `fileMemberModerationAppeal` and `decideMemberModerationAppeal`. Each
// runs in the CALLER'S scope transaction and appends its event via the canonical
// `projectMemberState` projector, so the event and the row commit or roll back together and can
// never diverge — the `moderation/write.ts` discipline.
//
// ── ⛔ NEITHER WRITE MOVES THE MODERATION OVERLAY, AND THAT IS THE WHOLE DESIGN ─────────────────
// §8.8: "The filing of an appeal does not suspend the act appealed against", and an allowed appeal
// "**DIRECTS** that the act appealed against be undone; it does **not** itself undo it."
// Both payloads therefore omit `overlayShape`, neither event type joins `MODERATION_EVENT_TYPES`,
// and `moderationActionForEventType` returns null for both — so `evaluateModerationOverlay` skips
// them entirely. A test folds a stream containing both and asserts `status`, `reasonCode`, `since`
// and `lastActionAt` are byte-identical to the same stream without them.
//
// ⛔ NOTHING HERE WRITES `members.state`, `member_moderation_actions`, `MODERATION_ACTIONS`,
// `MODERATION_STATUSES` or any `TERMINAL_STATES` set. A diff touching any of them means the design
// drifted.
//
// ── The domain NEVER encrypts ───────────────────────────────────────────────────────────────────
// `groundsCiphertext` and `reasonedOutcomeCiphertext` arrive ALREADY-SERIALIZED as Tier-1 envelopes.
// The ROUTE encrypts under the Pariwar's field class before opening the scope tx — the
// `moderation/write.ts:9-15` placement. Passing plaintext here would put member-authored PII on a
// path that also writes a plaintext-JSONB event payload, which is exactly what R1 exists to prevent.
//
// ⛔ Imports nothing from `claim/appeal*.ts`. Distinct journey.

import { and, eq } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb } from '../../db.js';
import type {
  HelpdeskTicketId,
  MemberId,
  MemberModerationAppealId,
  ModerationActionId,
  PariwarId,
} from '../../ids/index.js';
import { memberModerationActions } from '../../schema/member_moderation_actions.js';
import {
  memberModerationAppeals,
  type MemberModerationAppealRow,
} from '../../schema/member_moderation_appeals.js';
import { projectMemberState } from '../project.js';
import { getMemberStateAt } from '../read.js';
import { isAppealableStatus } from './appeal.js';
import { getAppealExclusionActorIds, getOpenAppealForAction } from './appeal-read.js';
import type { AppealFiledVia, AppealOutcome } from './appeal-vocabulary.js';
import {
  ModerationActionNotFoundError,
  ModerationAppealAdjudicatorExcludedError,
  ModerationAppealAlreadyDecidedError,
  ModerationAppealAlreadyOpenError,
  ModerationAppealNotAppealableError,
  ModerationAppealNotFoundError,
} from './errors.js';
import { getCurrentMemberModerationOverlay } from './overlay.js';

/** True iff `err` (or its wrapped cause) is a Postgres unique-violation (23505) — the
 *  `niyamavali/write.ts` idiom. [[project_domain_limit_clamp_and_savepoint_retry]]. */
function isUniqueViolation(err: unknown): boolean {
  const direct = (err as { code?: string }).code;
  const cause = (err as { cause?: { code?: string } }).cause?.code;
  return direct === '23505' || cause === '23505';
}

/** The Story 1.10 audit `resource_locator` for a moderation appeal. */
export function moderationAppealResourceLocator(appealId: string): string {
  return `member:moderation:appeal:${appealId}`;
}

export interface FileModerationAppealInput {
  readonly memberId: MemberId;
  readonly pariwarId: PariwarId;
  /** The act under appeal — §8.8 identifies the appeal by the act's §8.6 record. */
  readonly moderationActionId: ModerationActionId;
  /** ALREADY a Tier-1 envelope. The domain never encrypts. */
  readonly groundsCiphertext: string;
  readonly filedVia: AppealFiledVia;
  /** Required when `filedVia === 'helpline'` — the DB CHECK backstops it. */
  readonly helpdeskTicketId?: HelpdeskTicketId | null;
  /** Who the event is attributed to. The MEMBER on both arms — an appeal is the member's act. */
  readonly actorId: string;
  readonly now: Date;
}

export interface FiledModerationAppeal {
  readonly appealId: MemberModerationAppealId;
  readonly moderationActionId: ModerationActionId;
  readonly filedVia: AppealFiledVia;
  readonly filedAt: Date;
  readonly eventId: string;
  readonly eventVersion: number;
}

/**
 * File an appeal against a moderation act (§8.8).
 *
 * Order matters: **every refusal happens before any write.**
 *   (0) the act under appeal must actually belong to this member, in this Pariwar — a 404, never a
 *       403 (the D6/D7 ownership discipline; a mismatched combination simply has no row, and 403
 *       would make this route an existence oracle for another member's — or tenant's — action);
 *   (1) the member's current moderation standing must be appealable (§8.8: suspension or
 *       termination) — a 422, because an unmoderated member has no act to appeal;
 *   (2) no appeal against this same act may already be open — a 409, and ⚠ *not* an exhaustion:
 *       §8.8 permits a further appeal once the open one is determined.
 *
 * ⛔ There is deliberately NO deadline check. §8.8: "No time limit runs against a member's right to
 * appeal under this section." Do not add one.
 */
export async function fileMemberModerationAppeal(
  client: pg.PoolClient,
  input: FileModerationAppealInput,
): Promise<FiledModerationAppeal> {
  const db = bindScopedDb(client);

  // (0) The act must belong to THIS member, in THIS Pariwar — the `grounds.ts:appendModerationGround`
  //     ownership-check precedent, verbatim. Without this, a caller-supplied `moderationActionId` for
  //     an unrelated member (or tenant) would file — and consume the one-open-appeal slot of — an act
  //     that was never theirs.
  const actionRow = await db
    .select({ memberId: memberModerationActions.memberId })
    .from(memberModerationActions)
    .where(
      and(
        eq(memberModerationActions.pariwarId, input.pariwarId),
        eq(memberModerationActions.memberId, input.memberId),
        eq(memberModerationActions.moderationActionId, input.moderationActionId),
      ),
    )
    .limit(1);
  if (!actionRow[0]) {
    throw new ModerationActionNotFoundError(input.moderationActionId);
  }

  // (1) Appealable standing. Read the derived overlay — never a status column, which does not exist.
  const overlay = await getCurrentMemberModerationOverlay(db, input.memberId);
  if (!isAppealableStatus(overlay.status)) {
    throw new ModerationAppealNotAppealableError(overlay.status);
  }

  // (2) The one-open-per-ACT guard. ⚠ A READ, and therefore racy on its own — the partial UNIQUE
  //     index `member_moderation_appeals_one_open_per_action` is the truth. This guard exists so the
  //     ordinary path returns a typed 409 instead of leaking a 23505 as a 500.
  const open = await getOpenAppealForAction(db, input.pariwarId, input.moderationActionId);
  if (open !== null) {
    throw new ModerationAppealAlreadyOpenError(input.moderationActionId, open.appealId);
  }

  // (3) The record. Inserted BEFORE the event so the event can carry the appeal's id.
  //     ⚠ The (2) READ is racy on its own — two concurrent filings can both pass it before either
  //     commits, and only one INSERT wins the partial UNIQUE index. Catching the 23505 here (rather
  //     than letting it propagate as an unmapped 500) is the BACKSTOP the guard's own doc-comment
  //     promises. A best-effort re-read supplies `openAppealId` for the error's `details`; if that
  //     race is ALSO lost (vanishingly unlikely — the row that just won is now visible) the field
  //     falls back to empty rather than the write failing a second time over cosmetics.
  let inserted: MemberModerationAppealRow[];
  try {
    inserted = await db
      .insert(memberModerationAppeals)
      .values({
        memberId: input.memberId,
        pariwarId: input.pariwarId,
        moderationActionId: input.moderationActionId,
        groundsCiphertext: input.groundsCiphertext,
        filedVia: input.filedVia,
        helpdeskTicketId: input.helpdeskTicketId ?? null,
        filedAt: input.now,
        status: 'open',
      })
      .returning();
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const stillOpen = await getOpenAppealForAction(db, input.pariwarId, input.moderationActionId);
    throw new ModerationAppealAlreadyOpenError(input.moderationActionId, stillOpen?.appealId ?? '');
  }
  const row = inserted[0];
  if (!row) {
    throw new Error('[fileMemberModerationAppeal] insert returned no row — check session scope');
  }

  // (4) The event, in the SAME tx. Lifecycle-identity by construction: the moderation event family
  //     folds through the reducer's `default: return state` arm, so `members.state` cannot move.
  const lifecycleState = await getMemberStateAt(db, input.memberId, input.now);
  const projected = await projectMemberState(client, {
    memberId: input.memberId,
    pariwarId: input.pariwarId,
    eventType: 'member.moderation.appeal-filed',
    payload: {
      from_state: lifecycleState,
      to_state: lifecycleState,
      trigger: 'member_moderation.appeal_filed',
      // ⭐ `member`, not `trustee`. An appeal is the MEMBER'S act on both intake surfaces — the
      // helpline operator records it, they do not make it. ⛔ Do not "correct" this to `trustee`
      // for the off-portal arm; that would misattribute the member's own act to staff.
      actor: 'member',
      filed_via: input.filedVia,
      appeal_id: row.appealId,
      moderation_action_id: input.moderationActionId,
      // ⛔ NO grounds text. It is Tier-1 and lives on the row above. `events_log.payload` is
      // plaintext JSONB (R1).
    },
    actorId: input.actorId,
  });

  return {
    appealId: row.appealId,
    moderationActionId: input.moderationActionId,
    filedVia: row.filedVia,
    filedAt: row.filedAt,
    eventId: projected.eventId,
    eventVersion: projected.eventVersion,
  };
}

export interface DecideModerationAppealInput {
  readonly pariwarId: PariwarId;
  readonly appealId: MemberModerationAppealId;
  readonly outcome: AppealOutcome;
  /** ALREADY a Tier-1 envelope. §8.8 requires a reasoned outcome; the DB CHECK requires it too. */
  readonly reasonedOutcomeCiphertext: string;
  readonly decidedByActorId: string;
  /** `users.display_name` SNAPSHOT. ⛔ Never email-derived; a missing name blocks the decision. */
  readonly decidedByDisplay: string;
  readonly now: Date;
}

export interface DecidedModerationAppeal {
  readonly appealId: MemberModerationAppealId;
  readonly memberId: MemberId;
  readonly moderationActionId: ModerationActionId;
  readonly outcome: AppealOutcome;
  readonly decidedAt: Date;
  /** Whether the outcome DIRECTS a restore. ⛔ Informational — this path performs none. */
  readonly directsRestore: boolean;
  readonly eventId: string;
  readonly eventVersion: number;
}

/**
 * Determine an appeal (§8.8).
 *
 * ⭐ **The different-individual exclusion is enforced HERE, inside the scope transaction, before any
 * write** (AC5). Enforcing it only at the route would leave the invariant one refactor away from
 * being lost; enforcing it only at the DB is impossible, because the exclusion set is a join the
 * writer must compute.
 *
 * ⛔ The exclusion raises a **409**, never a 403 — see `ModerationAppealAdjudicatorExcludedError`.
 *
 * ⛔ **An `allowed` outcome writes NOTHING to the overlay.** It returns `directsRestore: true` and
 * stops. The restore is a subsequent, separately-attributed act through the existing moderation write
 * path, with its own reason code, its own Decision Note and the Panel-exclusive
 * `member.restore_terminated` check. Adding an overlay write here would create a second moderation
 * write path bypassing §8.6's record and the dwell.
 */
export async function decideMemberModerationAppeal(
  client: pg.PoolClient,
  input: DecideModerationAppealInput,
): Promise<DecidedModerationAppeal> {
  const db = bindScopedDb(client);

  // (1) The appeal must exist in the caller's scope. 404, never 403.
  const rows = await db
    .select({
      appealId: memberModerationAppeals.appealId,
      memberId: memberModerationAppeals.memberId,
      moderationActionId: memberModerationAppeals.moderationActionId,
      status: memberModerationAppeals.status,
    })
    .from(memberModerationAppeals)
    .where(
      and(
        eq(memberModerationAppeals.pariwarId, input.pariwarId),
        eq(memberModerationAppeals.appealId, input.appealId),
      ),
    )
    .limit(1);
  const appeal = rows[0];
  if (!appeal) {
    throw new ModerationAppealNotFoundError(input.appealId);
  }

  // (2) §8.8 gives ONE review of a filed appeal. A recorded determination is immutable.
  if (appeal.status !== 'open') {
    throw new ModerationAppealAlreadyDecidedError(input.appealId);
  }

  // (3) ⭐ THE DIFFERENT-INDIVIDUAL REQUIREMENT. The exclusion set is everyone who took part in the
  //     appealed act: its `actor_id`, plus every `added_by` on a ground attached to it — a
  //     supporting ground IS participation in the decision.
  const excluded = await getAppealExclusionActorIds(
    db,
    input.pariwarId,
    appeal.moderationActionId,
  );
  if (excluded.has(input.decidedByActorId)) {
    throw new ModerationAppealAdjudicatorExcludedError(
      input.appealId,
      appeal.moderationActionId,
    );
  }

  // (4) The determination. Guarded on `status = 'open'` so a concurrent decide loses the race
  //     rather than overwriting a recorded outcome — the row count is the check.
  const updated = await db
    .update(memberModerationAppeals)
    .set({
      status: 'decided',
      outcome: input.outcome,
      reasonedOutcomeCiphertext: input.reasonedOutcomeCiphertext,
      decidedByActorId: input.decidedByActorId,
      decidedByDisplay: input.decidedByDisplay,
      decidedAt: input.now,
    })
    .where(
      and(
        eq(memberModerationAppeals.pariwarId, input.pariwarId),
        eq(memberModerationAppeals.appealId, input.appealId),
        eq(memberModerationAppeals.status, 'open'),
      ),
    )
    .returning({ appealId: memberModerationAppeals.appealId });
  if (updated.length === 0) {
    // Lost the race against a concurrent determination. Same typed 409 the pre-check raises.
    throw new ModerationAppealAlreadyDecidedError(input.appealId);
  }

  // (5) The event, in the SAME tx. ⛔ Omits the overlay pair even when `allowed` — see the header.
  const lifecycleState = await getMemberStateAt(db, appeal.memberId, input.now);
  const projected = await projectMemberState(client, {
    memberId: appeal.memberId,
    pariwarId: input.pariwarId,
    eventType: 'member.moderation.appeal-decided',
    payload: {
      from_state: lifecycleState,
      to_state: lifecycleState,
      trigger: 'member_moderation.appeal_decided',
      actor: 'trustee',
      outcome: input.outcome,
      appeal_id: input.appealId,
      moderation_action_id: appeal.moderationActionId,
      // ⛔ NO outcome prose, NO adjudicator display name. Both live on the row (R1).
    },
    actorId: input.decidedByActorId,
  });

  return {
    appealId: appeal.appealId,
    memberId: appeal.memberId,
    moderationActionId: appeal.moderationActionId,
    outcome: input.outcome,
    decidedAt: input.now,
    // ⛔ A FLAG, not an action. Nothing in this function restores anything.
    directsRestore: input.outcome === 'allowed',
    eventId: projected.eventId,
    eventVersion: projected.eventVersion,
  };
}
