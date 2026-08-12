// `member_moderation_grounds` — the APPEND-ONLY grounds writer + reader (Story 10.20, Task 7; AC9,
// WS-E).
//
// ── The rule this module exists to make structural ──────────────────────────────────────────────
// `epics.md:3859-3862`: codes may be **added, superseded, or corrected by a further append-only
// record** — ⛔ never `UPDATE`d, never `DELETE`d. A later finding ATTACHES to the original decision;
// it never rewrites it. That is what keeps "what was known WHEN the decision was made" recoverable.
//
// ── ⭐ THE PRIMARY GROUND NEVER MOVES AT ALL, and that is deliberate ─────────────────────────────
// The partial unique index `(moderation_action_id) WHERE is_primary` plus the `SELECT, INSERT`-only
// grant make it structurally immutable: a second `is_primary` row raises `23505`, and clearing the
// existing row's flag would be an `UPDATE` no grant permits. So WS-E's "added, superseded, or
// corrected" is satisfied FOR SUPPORTING GROUNDS; for the primary the answer is that it is fixed at
// the action.
// ⚠ THE INDEX IS THE BACKSTOP, THE TYPED 409 IS THE INTERFACE. A `23505` reaching a caller as a 500
// is a bug — *"the primary ground is fixed at the action"* is a fact a trustee must be able to read
// off the error, not infer from a stack trace.
//
// ── D3: `code` on the primary row EQUALS `member_moderation_actions.reason_code` ────────────────
// A deliberate denormalization, and the argument for it is stronger than the one it is modelled on
// (`read.ts:183-199`, which holds because one writer writes both in one transaction). Here BOTH
// tables are append-only, so NEITHER side can ever be rewritten — the pair is immutable on both
// sides. A live-DB equivalence test drives every arm anyway, because an argument is not a test.

import { and, asc, eq, inArray } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../../db.js';
import type {
  MemberId,
  ModerationActionId,
  ModerationGroundId,
  PariwarId,
} from '../../ids/index.js';
import { memberModerationActions } from '../../schema/member_moderation_actions.js';
import { memberModerationGrounds } from '../../schema/member_moderation_grounds.js';
import { projectMemberState } from '../project.js';
import { getMemberStateAt } from '../read.js';
import { assertEvidenceRefs, type EvidenceRef } from './evidence-refs.js';
import {
  ModerationActionNotFoundError,
  ModerationGroundNotFoundError,
  ModerationPrimaryGroundImmutableError,
} from './errors.js';
import { assertReasonCodeAppliesTo, type ReasonCode } from './reason-codes.js';

/** The event a supporting-ground append emits, on the MEMBER's own stream. */
export const MODERATION_GROUND_APPENDED_EVENT = 'member.moderation.ground-appended' as const;

/** One ground as stored. */
export interface ModerationGround {
  groundId: ModerationGroundId;
  moderationActionId: ModerationActionId;
  memberId: MemberId;
  code: ReasonCode;
  isPrimary: boolean;
  hasNote: boolean;
  evidenceRefs: EvidenceRef[];
  supersedesGroundId: ModerationGroundId | null;
  /** True when a LATER row supersedes this one — derived by the fold, never stored. */
  superseded: boolean;
  addedBy: string;
  addedByDisplay: string;
  addedAt: Date;
}

/** The primary ground, written in the ACTION's own transaction (AC9). */
export interface InsertPrimaryGroundInput {
  moderationActionId: ModerationActionId;
  memberId: MemberId;
  pariwarId: PariwarId;
  code: ReasonCode;
  addedBy: string;
  addedByDisplay: string;
  addedAt: Date;
}

/**
 * Write the PRIMARY ground for a freshly-recorded action.
 *
 * ⛔ Emits NO event, and the omission is reasoned: the primary ground is already on the member's
 * timeline via the action's own `member.moderation.suspended` / `.terminated` / `.restored` event,
 * which carries the same `reason_code`. A second event for the same fact would double-count the
 * decision on every fold that reads the stream.
 *
 * ⛔ NO `evidence_refs` and NO `note` — the action carries those at the decision level. This row
 * exists so the grounds table is COMPLETE (the fold must be able to show the primary alongside the
 * supporting grounds), not as a second place to record the decision.
 *
 * Runs in the CALLER's transaction, alongside the action insert, so the two can never diverge.
 */
export async function insertPrimaryGround(
  db: Db,
  input: InsertPrimaryGroundInput,
): Promise<ModerationGroundId> {
  const inserted = await db
    .insert(memberModerationGrounds)
    .values({
      moderationActionId: input.moderationActionId,
      pariwarId: input.pariwarId,
      // Denormalized from the action, in the action's own tx, from the action's own value (AC11).
      memberId: input.memberId,
      code: input.code,
      isPrimary: true,
      addedBy: input.addedBy,
      addedByDisplay: input.addedByDisplay,
      addedAt: input.addedAt,
    })
    .returning({ groundId: memberModerationGrounds.groundId });
  const row = inserted[0];
  if (!row) throw new Error('[insertPrimaryGround] insert returned no row — check session scope');
  return row.groundId;
}

/** Append a SUPPORTING ground to an existing action. */
export interface AppendGroundInput {
  moderationActionId: ModerationActionId;
  memberId: MemberId;
  pariwarId: PariwarId;
  /** The requested code (untrusted — validated against the registry here). */
  code: string;
  /** Tier-1 envelope ciphertext of the optional note (the domain never encrypts). */
  noteCiphertext?: string | null;
  evidenceRefs?: unknown;
  /** The SUPPORTING ground this one replaces, if any. ⛔ Never a primary — typed 409. */
  supersedesGroundId?: ModerationGroundId | null;
  addedBy: string;
  addedByDisplay: string;
  now: Date;
}

export interface AppendGroundResult {
  groundId: ModerationGroundId;
  code: ReasonCode;
  supersedesGroundId: ModerationGroundId | null;
  eventId: string;
  eventVersion: number;
  addedAt: Date;
}

/**
 * Append a SUPPORTING ground, and emit `member.moderation.ground-appended` on the member's stream.
 *
 * Runs in the CALLER's scope transaction (the `moderateMember` contract) — the event and the row
 * commit or roll back together.
 *
 * @throws ModerationReasonCodeInvalidError      (→ 422) the code is not declared.
 * @throws ModerationGroundNotFoundError         (→ 404) the superseded ground is not on this action.
 * @throws ModerationPrimaryGroundImmutableError (→ 409) an attempt to supersede the PRIMARY ground.
 * @throws ModerationEvidenceRefInvalidError     (→ 422) evidence that is not a reference.
 */
export async function appendModerationGround(
  client: pg.PoolClient,
  input: AppendGroundInput,
): Promise<AppendGroundResult> {
  const db = bindScopedDb(client);

  // (1) The action this ground attaches to — read INSIDE the tx, so the append cannot race a
  //     concurrent write, and so the `appliesTo` check below reads the same snapshot as the insert.
  const actionRow = await db
    .select({
      action: memberModerationActions.action,
      memberId: memberModerationActions.memberId,
    })
    .from(memberModerationActions)
    .where(
      and(
        eq(memberModerationActions.pariwarId, input.pariwarId),
        eq(memberModerationActions.memberId, input.memberId),
        eq(memberModerationActions.moderationActionId, input.moderationActionId),
      ),
    )
    .limit(1);
  const action = actionRow[0];
  // 404-not-403 on a cross-tenant / cross-member / nonexistent id: RLS plus the explicit predicate
  // means a mismatched combination simply has no row, never an existence oracle for another tenant.
  if (!action) throw new ModerationActionNotFoundError(input.moderationActionId);

  // (2) The registry guard, against THE ACTION THIS GROUND ATTACHES TO.
  //     ⚠ Deliberately the existing `appliesTo` discipline rather than a looser "is it a declared
  //     code" check: `prd.md:871` requires that grounds for termination and grounds for suspension
  //     "are not interchangeable", and a supporting ground is still a ground for the sanction that
  //     was imposed. A restore code can no more support a termination than justify one.
  const code = assertReasonCodeAppliesTo(input.code, action.action);

  const evidenceRefs: EvidenceRef[] = assertEvidenceRefs(input.evidenceRefs);

  // (2) The supersede target must exist ON THIS ACTION and must not be the primary.
  //     ⛔ The PRIMARY is un-supersedable BY CONSTRUCTION (the partial unique index + the grant
  //     posture), so this is not merely a policy check: without it the caller would get a `23505`
  //     or a silently-orphaned reference instead of a readable refusal.
  if (input.supersedesGroundId != null) {
    const target = await db
      .select({
        groundId: memberModerationGrounds.groundId,
        isPrimary: memberModerationGrounds.isPrimary,
      })
      .from(memberModerationGrounds)
      .where(
        and(
          eq(memberModerationGrounds.groundId, input.supersedesGroundId),
          // Scoped to the action so a ground from ANOTHER action cannot be superseded from here —
          // 404-not-403 on a mismatch, never an existence oracle.
          eq(memberModerationGrounds.moderationActionId, input.moderationActionId),
        ),
      )
      .limit(1);
    const found = target[0];
    if (!found) throw new ModerationGroundNotFoundError(input.supersedesGroundId);
    if (found.isPrimary) {
      throw new ModerationPrimaryGroundImmutableError(input.moderationActionId);
    }
  }

  // (3) The lifecycle state, for the audit shape. `from_state === to_state`: an append is a
  //     lifecycle NON-transition, so the reducer is identity by construction.
  const lifecycleState = await getMemberStateAt(db, input.memberId, input.now);

  // (4) The event, via the canonical projector. ⛔ NO note, NO evidence refs, NO actor display, no
  //     free text of any kind — `events_log.payload` is plaintext JSONB (R1).
  const projected = await projectMemberState(client, {
    memberId: input.memberId,
    pariwarId: input.pariwarId,
    eventType: MODERATION_GROUND_APPENDED_EVENT,
    payload: {
      from_state: lifecycleState,
      to_state: lifecycleState,
      trigger: 'member_moderation.ground_appended',
      actor: 'trustee',
      code,
      supersedes_ground_id: input.supersedesGroundId ?? null,
      // ⛔ NO `moderation_from`/`moderation_to`: no status moves on an append, and asserting a pair
      // would be a false statement about the member's standing.
    },
    actorId: input.addedBy,
  });

  // (5) The row, in the SAME tx. ⛔ `isPrimary` is never set here — appends are supporting-only by
  //     construction, which is also why the event payload has no `is_primary` field.
  const inserted = await db
    .insert(memberModerationGrounds)
    .values({
      moderationActionId: input.moderationActionId,
      pariwarId: input.pariwarId,
      memberId: input.memberId,
      code,
      isPrimary: false,
      noteCiphertext: (input.noteCiphertext ?? '').trim() || null,
      evidenceRefs,
      supersedesGroundId: input.supersedesGroundId ?? null,
      addedBy: input.addedBy,
      addedByDisplay: input.addedByDisplay,
      addedAt: input.now,
    })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error('[appendModerationGround] insert returned no row — check session scope');

  return {
    groundId: row.groundId,
    code,
    supersedesGroundId: row.supersedesGroundId,
    eventId: projected.eventId,
    eventVersion: projected.eventVersion,
    addedAt: row.addedAt,
  };
}

/**
 * Read every ground for a set of actions, folded so the console can render the CURRENT set AND the
 * history that produced it.
 *
 * ⛔ THE SUPERSEDED ROWS ARE STILL RETURNED, flagged rather than filtered. An audit trail that hides
 * what was superseded is not an audit trail — the whole point of the append-only posture is that a
 * later reader can see what the decision looked like before the correction. The `superseded` flag is
 * DERIVED here (from which ids are pointed at) and never stored, so it cannot go stale.
 *
 * ⚠ Carries `hasNote`, never the note itself: the note is Tier-1 and stays decrypt-on-demand, per
 * action, exactly like the Decision Note (`dto.ts:9-16`).
 */
export async function listGroundsForActions(
  db: Db,
  pariwarId: PariwarId,
  moderationActionIds: ModerationActionId[],
): Promise<Map<ModerationActionId, ModerationGround[]>> {
  const byAction = new Map<ModerationActionId, ModerationGround[]>();
  if (moderationActionIds.length === 0) return byAction;

  const rows = await db
    .select()
    .from(memberModerationGrounds)
    .where(
      and(
        // Defence-in-depth alongside RLS, the shape every other accessor in this module uses.
        eq(memberModerationGrounds.pariwarId, pariwarId),
        inArray(memberModerationGrounds.moderationActionId, moderationActionIds),
      ),
    )
    // Primary first, then chronologically — the order the console renders and the order a reader
    // reconstructs the case in.
    .orderBy(asc(memberModerationGrounds.addedAt));

  // Derive `superseded` from the ids actually pointed at, rather than storing a flag that a future
  // writer could forget to set.
  const supersededIds = new Set(
    rows.map((r) => r.supersedesGroundId).filter((id): id is ModerationGroundId => id != null),
  );

  for (const r of rows) {
    const list = byAction.get(r.moderationActionId) ?? [];
    list.push({
      groundId: r.groundId,
      moderationActionId: r.moderationActionId,
      memberId: r.memberId,
      code: r.code as ReasonCode,
      isPrimary: r.isPrimary,
      hasNote: r.noteCiphertext !== null,
      evidenceRefs: r.evidenceRefs,
      supersedesGroundId: r.supersedesGroundId,
      superseded: supersededIds.has(r.groundId),
      addedBy: r.addedBy,
      addedByDisplay: r.addedByDisplay,
      addedAt: r.addedAt,
    });
    byAction.set(r.moderationActionId, list);
  }

  // Primary first within each action.
  for (const list of byAction.values()) {
    list.sort((a, b) => (a.isPrimary === b.isPrimary ? 0 : a.isPrimary ? -1 : 1));
  }
  return byAction;
}

/** The Story 1.10 audit `resource_locator` for a ground append. */
export function moderationGroundResourceLocator(memberId: string): string {
  return `member:moderation:grounds:${memberId}`;
}
