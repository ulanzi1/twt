// The moderation WRITE path — Story 10.10 (Task 2; AC1, AC3, AC4, AC7).
//
// `moderateMember` is the ONE place a moderation decision is recorded. In the CALLER'S scope
// transaction it: (1) re-reads the current overlay status, (2) rejects an illegal transition and an
// inapplicable reason code BEFORE any write, (3) appends the `member.moderation.*` event via the
// canonical `projectMemberState` projector, and (4) inserts the `member_moderation_actions` decision
// record. The event and the row therefore commit or roll back together and can never diverge.
//
// ── The domain NEVER encrypts ───────────────────────────────────────────────────────────────────
// `decisionNoteCiphertext` arrives ALREADY-SERIALIZED as a Tier-1 envelope — exactly like
// `insertMemberWithdrawal` (`member/withdrawal.ts:8-13`) and `recordVerifierDecision`. The ROUTE
// encrypts under the Pariwar's field class via `deps.encryption` BEFORE opening the scope tx (the
// `claims.verification-decision.handlers.ts:190-204` placement). Passing plaintext here would put
// member-facing PII on a path that also writes a plaintext-JSONB event payload — precisely the
// mistake the R1 discipline exists to prevent.
//
// ── Why the projector, and why it is safe ───────────────────────────────────────────────────────
// `projectMemberState` is THE single legitimate writer to `members.state`. All three
// `member.moderation.*` events fold through the lifecycle reducer's `default: return state` arm, so
// the projected state is BY CONSTRUCTION the state the member already had — the projector runs, the
// stream grows, and `members.state` provably cannot move (Decision 1; pinned by a test). Using the
// projector rather than a bespoke insert keeps the stream-version contract, the trigger guard and
// the search-projection refresh identical to every other `member.*` append.

import type pg from 'pg';

import { bindScopedDb } from '../../db.js';
import type { MemberId, ModerationActionId, PariwarId } from '../../ids/index.js';
import { memberModerationActions } from '../../schema/member_moderation_actions.js';
import { projectMemberState } from '../project.js';
import { getMemberStateAt } from '../read.js';
import { assertEvidenceRefs, type EvidenceRef } from './evidence-refs.js';
import {
  ModerationEscalationNotApplicableError,
  ModerationEscalationRequiredError,
  ModerationRationaleRequiredError,
  ModerationReasonCodeInvalidError,
  ModerationStateError,
} from './errors.js';
import { getCurrentMemberModerationOverlay } from './overlay.js';
import { reasonCodeAppliesTo, type ReasonCode } from './reason-codes.js';
import {
  MODERATION_ACTION_EVENT_TYPES,
  nextModerationStatus,
  type ModerationAction,
  type ModerationStatus,
} from './status.js';

/** The Story 1.10 audit `resource_locator` for a moderation action (AC4). */
export function moderationResourceLocator(memberId: string): string {
  return `member:moderation:${memberId}`;
}

/**
 * The AC3 mandatory-rationale guard, as a PURE predicate over the PLAINTEXT. The route calls this
 * BEFORE encrypting (there is nothing meaningful to assert about ciphertext), which is also what
 * keeps the 422 cheap — no KMS round-trip is spent on a request that was always going to fail.
 *
 * Stricter than the UX `<ReasonCodeDropdown>` `other-text-required` state
 * (`ux-design-specification.md:2067-2074`): the rationale is required on EVERY action, not only on
 * an "other" code. A structured code alone can never explain a suspension to the member who
 * receives it.
 */
export function assertRationalePresent(rationale: string | null | undefined, action: string): string {
  const trimmed = (rationale ?? '').trim();
  if (trimmed.length === 0) throw new ModerationRationaleRequiredError(action);
  return trimmed;
}

/** The AC3 registry guard: the code must be declared AND its `appliesTo` must include the action. */
export function assertReasonCodeAppliesTo(code: string, action: ModerationAction): ReasonCode {
  if (!reasonCodeAppliesTo(code, action)) {
    throw new ModerationReasonCodeInvalidError(code, action);
  }
  return code as ReasonCode;
}

/** One moderation decision record to insert (the rationale arrives already Tier-1 encrypted). */
export interface InsertModerationActionInput {
  memberId: MemberId;
  pariwarId: PariwarId;
  action: ModerationAction;
  reasonCode: ReasonCode;
  /** Tier-1 envelope ciphertext (serialized) of the MANDATORY free-text rationale. */
  decisionNoteCiphertext: string;
  actorId: string;
  /** `users.display_name` SNAPSHOT — resolved (and required) by the route. */
  actorDisplay: string;
  /** `terminate` only: acted_at + 12 months. NULL for suspend/restore (DB CHECK enforces this). */
  rejoinPermittedAt: Date | null;
  actedAt: Date;
}

export interface ModerateMemberInput {
  memberId: MemberId;
  pariwarId: PariwarId;
  action: ModerationAction;
  /** The requested reason code (untrusted — validated against the registry here). */
  reasonCode: string;
  /** Tier-1 envelope ciphertext of the mandatory rationale (the domain never encrypts). */
  decisionNoteCiphertext: string;
  actorId: string;
  actorDisplay: string;
  /** Clock-injected instant (no `Date.now()` in the domain). */
  now: Date;
  /** `terminate` only: the FR-6 rejoin-lock lift instant, clock-derived by the caller. */
  rejoinPermittedAt?: Date | null;

  // ── Story 10.20 (WS-C) — the two-part escalation justification ──────────────────────────────
  // Both arrive as ALREADY-SERIALIZED Tier-1 ciphertext, exactly like `decisionNoteCiphertext`:
  // the route encrypts, the domain never does. Required together iff `action === 'terminate'`.
  // ⚠ The SUBSTANTIVE guards (the anti-restatement rule and the substance floor) run on the
  // PLAINTEXT in the route — `assertEscalationJustification` — because ciphertext has nothing
  // meaningful to assert about it. What lives here is the PRESENCE backstop, mirroring the
  // rationale backstop below: it catches a future non-HTTP caller that skipped that step.
  escalationInadequacyCiphertext?: string | null;
  escalationProportionalityCiphertext?: string | null;

  /** Evidence REFERENCES (never prose) — validated here as defence-in-depth. Defaults to `[]`. */
  evidenceRefs?: unknown;

  /**
   * AC7 (Q5(a)): the as-of-decision snapshot of `contribution.r7a_restorations_used`.
   *
   * ⛔ `null` IS A FIRST-CLASS VALUE MEANING *UNKNOWN*, NEVER `0`. R7(A) resolves to no clause
   * version on an unprovisioned Pariwar and the fact is then omitted — recording `0` there would
   * let "restorations exhausted" read as "never restored", which is the false-all-clear D1-B
   * forbids. The caller passes the DERIVED fact through unchanged; it is never defaulted here.
   */
  r7aRestorationsUsedSnapshot?: number | null;
}

export interface ModerateMemberResult {
  moderationActionId: ModerationActionId;
  /** The overlay status BEFORE the action (what the legality check ran against). */
  fromStatus: ModerationStatus;
  /** The overlay status AFTER the action. */
  toStatus: ModerationStatus;
  reasonCode: ReasonCode;
  eventId: string;
  eventVersion: number;
  actedAt: Date;
  rejoinPermittedAt: Date | null;
}

/**
 * Record a moderation decision. Runs in the CALLER's scope transaction (it never opens its own —
 * the `insertMemberWithdrawal` / `projectMemberState` contract); the caller has already run
 * `BEGIN` + `setPariwarScope`.
 *
 * @throws ModerationStateError             (→ 409) the action is illegal from the current status.
 * @throws ModerationReasonCodeInvalidError (→ 422) the code cannot justify this action.
 * @throws ModerationRationaleRequiredError (→ 422) the ciphertext backstop tripped.
 */
export async function moderateMember(
  client: pg.PoolClient,
  input: ModerateMemberInput,
): Promise<ModerateMemberResult> {
  const db = bindScopedDb(client);

  // (0) Backstop only — the route asserts the PLAINTEXT rationale before encrypting. This catches a
  //     future caller that skipped that step; it cannot inspect the ciphertext's contents.
  if (input.decisionNoteCiphertext.trim().length === 0) {
    throw new ModerationRationaleRequiredError(input.action);
  }

  // (1) The registry guard (AC3) — a restore code can never justify a termination.
  const reasonCode = assertReasonCodeAppliesTo(input.reasonCode, input.action);

  // (1b) ── Story 10.20 (AC6) — the escalation PRESENCE backstop, in the same voice as (0) ───────
  //      Niyamavali §8.6: termination is an exceptional governance act, not a stronger suspension,
  //      so it carries both parts of the escalation test — and no other action carries either.
  //      ⛔ This is a BACKSTOP, not the guard. The substantive checks (substance floor,
  //      anti-restatement) run on the PLAINTEXT in the route, because envelope encryption is
  //      non-deterministic and there is nothing to compare once these are ciphertext. The DB's
  //      `escalation_iff_terminate` CHECK is the third layer and enforces the same `iff` on every
  //      write path including raw SQL; this typed error is what keeps a 23514 from reaching a
  //      caller as a 500.
  //
  //      ⚠ ORDERED DELIBERATELY AFTER (1), NOT BEFORE IT. The vocabulary objection is the more
  //      fundamental one — "this code cannot justify a termination" has to be answered before "your
  //      justification for the termination is incomplete", or a caller offering a restore code for a
  //      terminate would be told to write an escalation justification for an action the code can
  //      never support. Story 10.10 pinned that ordering with a no-query revert-sanity test; these
  //      checks slot in behind it, and still ahead of (2), so a doomed request never touches the DB.
  const escalationInadequacy = (input.escalationInadequacyCiphertext ?? '').trim() || null;
  const escalationProportionality =
    (input.escalationProportionalityCiphertext ?? '').trim() || null;
  if (input.action === 'terminate') {
    if (escalationInadequacy === null) {
      throw new ModerationEscalationRequiredError('inadequacy', 'missing', 0);
    }
    if (escalationProportionality === null) {
      throw new ModerationEscalationRequiredError('proportionality', 'missing', 0);
    }
  } else if (escalationInadequacy !== null || escalationProportionality !== null) {
    throw new ModerationEscalationNotApplicableError(input.action);
  }

  // (1c) Evidence references — the domain enforcement point (AC4). Absent ⇒ `[]`; anything that is
  //      not an array of bounded `{ kind, ref }` identifiers within the cap is a typed 422. The DB
  //      mirrors all three rules (array-ness, cap, per-entry shape via the IMMUTABLE validator), so
  //      a raw-SQL writer cannot bypass what this rejects.
  const evidenceRefs: EvidenceRef[] = assertEvidenceRefs(input.evidenceRefs);

  // (2) Legality, against the CURRENT derived overlay status — read inside the tx so a concurrent
  //     moderation of the same member is serialized by the row/stream contention below.
  //     ⚠ UNBOUNDED deliberately: `input.now` is the injected APP clock while `occurred_at` is
  //     DB-generated, so bounding the legality read by it would let app-clock lag hide the previous
  //     action's event and accept a duplicate suspend. See `getCurrentMemberModerationOverlay`.
  const overlay = await getCurrentMemberModerationOverlay(db, input.memberId);
  const toStatus = nextModerationStatus(overlay.status, input.action);
  if (toStatus === null) {
    // Rejected BEFORE any write (AC2): a no-op never returns 200, and a re-suspend is a 409.
    throw new ModerationStateError(input.memberId, overlay.status, input.action);
  }

  // (3) The lifecycle state, for the audit shape. `from_state === to_state` on every moderation
  //     event: these are lifecycle NON-transitions (Decision 1), so the reducer is identity.
  const lifecycleState = await getMemberStateAt(db, input.memberId, input.now);

  const rejoinPermittedAt = input.action === 'terminate' ? (input.rejoinPermittedAt ?? null) : null;

  // (4) Append the event via the canonical projector (identity on `members.state` by construction).
  const projected = await projectMemberState(client, {
    memberId: input.memberId,
    pariwarId: input.pariwarId,
    eventType: MODERATION_ACTION_EVENT_TYPES[input.action],
    payload: {
      from_state: lifecycleState,
      to_state: lifecycleState,
      trigger: `member_moderation.${input.action}`,
      actor: 'trustee',
      moderation_from: overlay.status,
      moderation_to: toStatus,
      reason_code: reasonCode,
    },
    actorId: input.actorId,
  });

  // (5) The decision record, in the SAME tx — it carries what the plaintext payload may not.
  const inserted = await db
    .insert(memberModerationActions)
    .values({
      memberId: input.memberId,
      pariwarId: input.pariwarId,
      action: input.action,
      reasonCode,
      decisionNoteCiphertext: input.decisionNoteCiphertext,
      escalationInadequacyCiphertext: escalationInadequacy,
      escalationProportionalityCiphertext: escalationProportionality,
      evidenceRefs,
      // ⛔ Passed through UNCHANGED, `null` included. `?? 0` here would be the D1-B false-all-clear:
      // "unknown" would become "never restored" in a record a reviewer later relies on.
      r7aRestorationsUsedSnapshot: input.r7aRestorationsUsedSnapshot ?? null,
      actorId: input.actorId,
      actorDisplay: input.actorDisplay,
      rejoinPermittedAt,
      actedAt: input.now,
    })
    .returning();
  const row = inserted[0];
  if (!row) {
    throw new Error('[moderateMember] insert returned no row — check session scope');
  }

  return {
    moderationActionId: row.moderationActionId,
    fromStatus: overlay.status,
    toStatus,
    reasonCode,
    eventId: projected.eventId,
    eventVersion: projected.eventVersion,
    actedAt: row.actedAt,
    rejoinPermittedAt: row.rejoinPermittedAt,
  };
}
