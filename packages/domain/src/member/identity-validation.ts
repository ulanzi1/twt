// Staff check a TYPED-IN identity while the member is alive — Story 3.13 (Task 2.2; DL1–DL5, DL9–DL11; N1–N4, N6, N7).
// Transport-free.
//
// PRD FR-2: *"KYC fields are entered manually and the member becomes `pending-valid` until trustee validation."*
// `2026-11-25-502` Q1 A (Trustee-ratified): the member shows an original government photo ID, in person or on a video
// call; staff check the name, date of birth and photo against what was typed in; *"nothing is copied or kept"*.
// This module VALIDATES and RECORDS the staff member's act; it ⛔ decides nothing itself, ⛔ opens no ciphertext (the
// note arrives ALREADY ENCRYPTED; the detail read returns ciphertext as stored — the API decrypts).
//
// ── The writer's order (`recordIdentityValidation`) ─────────────────────────────────────────────────────────────
//   (0) the SHAPE — display; what each outcome carries (0218's coherence CHECK, refused before any read);
//   (1) ⭐ the DEATH LOCK, FIRST (DL5, N3, Trap 3) — `lockAndReadDeathReport` takes the claim INTAKE key for
//       `(pariwarId, memberId)` and reads the ONE predicate. A standing report ⇒ `death_reported`: 6.39 re-reads
//       `trustee_verified` on every call, so a validation mid-claim would silently drop its identity half. The same
//       key serialises two staff acts on one member — ⛔ second advisory lock (the projector's stream-version
//       conflict is the backstop);
//   (2) the member, its lifecycle state (replayed, unbounded — the clock-domain note on `getCurrentMemberState`), its
//       moderation overlay and its KYC standing;
//   (3) ELIGIBILITY (DL4) — one pure function, shared with the reveal (DL6a) and the detail read;
//   (4) supersede the live act (`re_checked`) and insert the new one;
//   (5) `confirmed` ⇒ `markKycTrusteeVerified` (DL2 — the narrow UPDATE, ⛔ the identity columns, N2); ⛔ row matched ⇒
//       `not_eligible` and the caller rolls the whole transaction back;
//   (6) `member.identity_validation_recorded` through `projectMemberState` (DL3 — the ONE projector);
//   (7) `confirmed` from `pending-valid` ONLY ⇒ ALSO `member.kyc_completed` (`pending-valid → active`, the reducer's
//       existing arm, N7). From `lock-in` ⛔ (Trap 2 — its `to_state: 'active'` would be false audit metadata).
//
// ⛔ PII: ⛔ name, ⛔ note, ⛔ document kind, ⛔ reason in any event (DL3) — the record holds those.

import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type pg from 'pg';

import { lockAndReadDeathReport } from '../claim/death-report-lock.js';
import { isDeathReportStanding, noStandingDeathReportSql } from '../claim/death-report.js';
import { bindScopedDb, type Db } from '../db.js';
import type { MemberId, MemberIdentityValidationId, PariwarId } from '../ids/index.js';
import {
  isKycIdentityVerified,
  isKycStrengthStaffCheckable,
  KYC_STAFF_CHECKABLE_STRENGTHS,
} from '../kyc/identity-verified.js';
import { getMemberKycProfile } from '../kyc/profile-read.js';
import { markKycTrusteeVerified } from '../kyc/profile-write.js';
import { clampLimit } from '../pagination.js';
import {
  IDENTITY_VALIDATION_DOCUMENT_KINDS,
  IDENTITY_VALIDATION_EVIDENCE_KINDS,
  IDENTITY_VALIDATION_NOT_CONFIRMED_REASONS,
  IDENTITY_VALIDATION_OUTCOMES,
  IDENTITY_VALIDATION_REASONS_WITH_DOCUMENT,
  type IdentityValidationDocumentKind,
  type IdentityValidationEvidenceKind,
  type IdentityValidationNotConfirmedReason,
  type IdentityValidationOutcome,
  memberIdentityValidations,
} from '../schema/member_identity_validations.js';
import type { MemberKycProfileRow } from '../schema/member_kyc_profiles.js';
import { memberPostings } from '../schema/member_postings.js';
import { members } from '../schema/members.js';
import { workplaces } from '../schema/workplaces.js';
import { getCurrentMemberModerationOverlay } from './moderation/overlay.js';
import { MODERATION_ACTION_EVENT_TYPES, MODERATION_EVENT_TYPES, type ModerationStatus } from './moderation/status.js';
import { projectMemberState } from './project.js';
import { getCurrentMemberState, memberExists } from './read.js';
import type { MemberLifecycleState } from './state.js';

// ── Eligibility (DL4) ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * DL4 — the lifecycle states in which a typed-in identity may be checked: a MEMBER (Niyamavali §2.1 (c) — paid) whose
 * identity still matters for coverage. `lock-in` is where every typed-in paid member sits until row `3-14`;
 * `pending-valid` is reachable once `3-14` exists. Every other state is refused — `pending-kyc` / `pending-fee`
 * (⛔ yet a member), `withdrawn` / `anonymized`, and `active` / `active-in-grace` / `lapsed-unpaid` (unreachable for a
 * typed-in member except by a hand-seeded fixture — fail closed).
 */
export const IDENTITY_VALIDATION_ELIGIBLE_STATES = ['lock-in', 'pending-valid'] as const satisfies readonly MemberLifecycleState[];

/** Why a member is ⛔ eligible — for the LOG only; the wire carries ONE code (`identity_validation.not_eligible`). */
export type IdentityValidationIneligibility =
  | 'no_kyc_record'
  | 'strength_not_checkable'
  | 'already_verified'
  | 'state_not_eligible'
  | 'terminated';

export interface IdentityValidationEligibilityFacts {
  readonly state: MemberLifecycleState;
  readonly moderationStatus: ModerationStatus;
  readonly kyc: Pick<MemberKycProfileRow, 'verificationStrength' | 'trusteeVerified'> | null;
}

/**
 * ⭐ DL4 — THE eligibility rule, ONE definition (the writer, the reveal and the detail read all call it). Pure. A
 * `suspended` member CAN be checked (identity is a fact; a suspension ends); `terminated` cannot.
 */
export function identityValidationIneligibility(
  facts: IdentityValidationEligibilityFacts,
): IdentityValidationIneligibility | null {
  if (facts.kyc === null) return 'no_kyc_record';
  if (!isKycStrengthStaffCheckable(facts.kyc.verificationStrength)) return 'strength_not_checkable';
  if (isKycIdentityVerified(facts.kyc)) return 'already_verified';
  if (!(IDENTITY_VALIDATION_ELIGIBLE_STATES as readonly string[]).includes(facts.state)) return 'state_not_eligible';
  if (facts.moderationStatus === 'terminated') return 'terminated';
  return null;
}

// ── Errors ────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A refused identity check. → `not_found` 404 · `invalid_shape` 400 · `not_eligible` 409
 * `identity_validation.not_eligible` · `death_reported` 409 `identity_validation.death_reported`.
 * `why` carries the DL4 detail for the log ⛔ the wire.
 */
export class IdentityValidationRefusedError extends Error {
  public readonly name = 'IdentityValidationRefusedError';
  public constructor(
    public readonly memberId: string,
    public readonly reason: 'not_found' | 'invalid_shape' | 'not_eligible' | 'death_reported',
    public readonly why: string,
  ) {
    super(`[identity-validation] member ${memberId}: ${reason} — ${why}`);
  }
}

// ── The shape (step 0) ────────────────────────────────────────────────────────────────────────────────────────────

export interface IdentityValidationShape {
  readonly outcome: IdentityValidationOutcome;
  readonly evidenceKind: IdentityValidationEvidenceKind | null;
  readonly documentKind: IdentityValidationDocumentKind | null;
  readonly notConfirmedReason: IdentityValidationNotConfirmedReason | null;
  /** Tier-1 ciphertext — required for `not_confirmed`, optional for `confirmed`. */
  readonly noteCiphertext: string | null;
}

const isOneOf = (list: readonly string[], v: string | null): boolean => v !== null && list.includes(v);

/**
 * Does the shape cohere (0218's `…_outcome_coherence_check`, in TS so the refusal is a typed 400 before any read)?
 * `confirmed` — evidence + document, ⛔ reason. `not_confirmed` — a reason + a note, and what was seen follows the
 * reason: a mismatch was judged FROM a document; `no_document_shown` had a meeting, ⛔ document; `member_not_reached`
 * had ⛔ meeting. Returns the first problem, or `null`.
 */
export function identityValidationShapeProblem(s: IdentityValidationShape): string | null {
  if (!isOneOf(IDENTITY_VALIDATION_OUTCOMES, s.outcome)) return 'an unknown outcome';
  if (s.evidenceKind !== null && !isOneOf(IDENTITY_VALIDATION_EVIDENCE_KINDS, s.evidenceKind)) return 'an unknown evidence kind';
  if (s.documentKind !== null && !isOneOf(IDENTITY_VALIDATION_DOCUMENT_KINDS, s.documentKind)) return 'an unknown document kind';
  if (s.noteCiphertext !== null && s.noteCiphertext.trim() === '') return 'an empty note is not a note';
  if (s.outcome === 'confirmed') {
    if (s.notConfirmedReason !== null) return 'a reason is recorded only when the identity is not confirmed';
    if (s.evidenceKind === null || s.documentKind === null) return 'a confirmation names how the ID was shown and which ID';
    return null;
  }
  if (!isOneOf(IDENTITY_VALIDATION_NOT_CONFIRMED_REASONS, s.notConfirmedReason)) {
    return 'an identity that is not confirmed needs one of the four reasons';
  }
  if (s.noteCiphertext === null) return 'an identity that is not confirmed needs a note';
  if (isOneOf(IDENTITY_VALIDATION_REASONS_WITH_DOCUMENT, s.notConfirmedReason)) {
    return s.evidenceKind !== null && s.documentKind !== null ? null : 'a mismatch was judged from a document — name it';
  }
  if (s.notConfirmedReason === 'no_document_shown') {
    return s.evidenceKind !== null && s.documentKind === null ? null : '"no ID was shown" names how the member was met, ⛔ an ID';
  }
  // member_not_reached
  return s.evidenceKind === null && s.documentKind === null ? null : '"could not reach the member" names ⛔ meeting and ⛔ ID';
}

// ── The writer ────────────────────────────────────────────────────────────────────────────────────────────────────

export interface RecordIdentityValidationInput extends IdentityValidationShape {
  readonly pariwarId: PariwarId;
  readonly memberId: MemberId;
  /** The staff member — the events' `actor_id` and the row's `decided_by_actor_id`. */
  readonly actorId: string;
  /** Snapshotted server-side by the caller — ⛔ never email-derived, ⛔ never from the request. */
  readonly actorDisplay: string;
}

export interface RecordIdentityValidationResult {
  readonly validationId: MemberIdentityValidationId;
  readonly outcome: IdentityValidationOutcome;
  readonly supersededValidationId: MemberIdentityValidationId | null;
  /** The member's lifecycle state after the act (`active` only for a `confirmed` from `pending-valid`). */
  readonly state: MemberLifecycleState;
  /** The marker event's stream version. */
  readonly eventVersion: number;
  /** True iff `member.kyc_completed` was also appended. */
  readonly kycCompleted: boolean;
}

/**
 * Record one staff identity check. MUST run inside the caller's Pariwar-scoped transaction (the projector contract);
 * the caller COMMITS or ROLLS BACK. See the header for the order of every guard.
 *
 * @throws IdentityValidationRefusedError
 */
export async function recordIdentityValidation(
  client: pg.PoolClient,
  input: RecordIdentityValidationInput,
): Promise<RecordIdentityValidationResult> {
  const refuse = (reason: IdentityValidationRefusedError['reason'], why: string) =>
    new IdentityValidationRefusedError(input.memberId, reason, why);

  // (0) The shape.
  if (input.actorDisplay.trim() === '') throw refuse('invalid_shape', 'a check is attributed to a named staff member');
  const problem = identityValidationShapeProblem(input);
  if (problem !== null) throw refuse('invalid_shape', problem);

  // (1) ⭐ The death lock — FIRST (⛔ any other lock or read before it).
  if (await lockAndReadDeathReport(client, input.pariwarId, input.memberId)) {
    throw refuse('death_reported', 'a claim is filed for this member’s death — the identity is checked on the claim');
  }

  // (2) + (3) The member and DL4.
  const db = bindScopedDb(client);
  const { state, kyc } = await readEligibility(db, input.pariwarId, input.memberId, refuse);

  // (4) Supersede the live act, insert the new one. ⭐ Both stamps are `clock_timestamp()` — the moment the statement runs, AFTER
  // the intake lock is held — ⛔ `now()` (the column DEFAULT), which is when this transaction BEGAN: an act that waited on the
  // lock behind another staff member's act would otherwise be stamped BEFORE the act it supersedes, and the export's "oldest
  // first" and the queue's latest time would invert (code review R3-P13). It also ends the one-transaction clock tie.
  const superseded = await db
    .update(memberIdentityValidations)
    .set({ supersededAt: sql`clock_timestamp()`, supersededReason: 're_checked' })
    .where(
      and(
        eq(memberIdentityValidations.pariwarId, input.pariwarId),
        eq(memberIdentityValidations.memberId, input.memberId),
        isNull(memberIdentityValidations.supersededAt),
      ),
    )
    .returning({ validationId: memberIdentityValidations.validationId });
  const [row] = await db
    .insert(memberIdentityValidations)
    .values({
      pariwarId: input.pariwarId,
      memberId: input.memberId,
      outcome: input.outcome,
      evidenceKind: input.evidenceKind,
      documentKind: input.documentKind,
      notConfirmedReason: input.notConfirmedReason,
      noteCiphertext: input.noteCiphertext,
      kycProfileUpdatedAt: kyc.updatedAt,
      decidedAt: sql`clock_timestamp()`,
      decidedByActorId: input.actorId,
      decidedByDisplay: input.actorDisplay.trim(),
    })
    .returning({ validationId: memberIdentityValidations.validationId });
  if (!row) throw new Error('[recordIdentityValidation] insert returned no row — check session scope');

  // (5) DL2 — the flag, in the same transaction.
  if (input.outcome === 'confirmed') {
    const flipped = await markKycTrusteeVerified(db, { pariwarId: input.pariwarId, memberId: input.memberId });
    if (!flipped) throw refuse('not_eligible', 'the KYC row was no longer an unverified, staff-checkable identity');
  }

  // (6) DL3 — the marker (non-transition).
  const marker = await projectMemberState(client, {
    memberId: input.memberId,
    pariwarId: input.pariwarId,
    eventType: 'member.identity_validation_recorded',
    payload: {
      from_state: state,
      to_state: state,
      trigger: 'staff_identity_validation',
      actor: 'trustee',
      validation_id: row.validationId,
      outcome: input.outcome,
    },
    actorId: input.actorId,
  });

  // (7) DL3 — `pending-valid → active`, ONLY from `pending-valid` (Trap 2).
  let after = marker.state;
  let kycCompleted = false;
  if (input.outcome === 'confirmed' && state === 'pending-valid') {
    const completed = await projectMemberState(client, {
      memberId: input.memberId,
      pariwarId: input.pariwarId,
      eventType: 'member.kyc_completed',
      payload: {
        from_state: 'pending-valid',
        to_state: 'active',
        trigger: 'staff_identity_validation',
        actor: 'trustee',
        kyc_reference: row.validationId,
      },
      actorId: input.actorId,
    });
    after = completed.state;
    kycCompleted = true;
  }

  return {
    validationId: row.validationId,
    outcome: input.outcome,
    supersededValidationId: superseded[0]?.validationId ?? null,
    state: after,
    eventVersion: marker.eventVersion,
    kycCompleted,
  };
}

/** Steps (2) + (3): read the member's standing and apply DL4, or refuse. Runs AFTER the death lock. */
async function readEligibility(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  refuse: (reason: IdentityValidationRefusedError['reason'], why: string) => IdentityValidationRefusedError,
): Promise<{ state: MemberLifecycleState; kyc: MemberKycProfileRow }> {
  if (!(await memberExists(db, pariwarId, memberId))) throw refuse('not_found', 'no such member in this Pariwar');
  const state = await getCurrentMemberState(db, memberId);
  const overlay = await getCurrentMemberModerationOverlay(db, memberId);
  const kyc = await getMemberKycProfile(db, pariwarId, memberId);
  const why = identityValidationIneligibility({ state, moderationStatus: overlay.status, kyc });
  if (why !== null || kyc === null) throw refuse('not_eligible', why ?? 'no_kyc_record');
  return { state, kyc };
}

/**
 * ⭐ DL6a — "for this purpose" is STRUCTURAL: the number reveal is allowed only while the member is awaiting a check.
 * The death lock FIRST (as the writer), then DL4. Returns nothing; refuses with the writer's own codes. MUST run inside
 * the caller's Pariwar-scoped transaction (the lock is transaction-scoped).
 *
 * @throws IdentityValidationRefusedError (`not_found` | `death_reported` | `not_eligible`)
 */
export async function assertIdentityCheckAwaited(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<void> {
  const refuse = (reason: IdentityValidationRefusedError['reason'], why: string) =>
    new IdentityValidationRefusedError(memberId, reason, why);
  if (await lockAndReadDeathReport(client, pariwarId, memberId)) {
    throw refuse('death_reported', 'a claim is filed for this member’s death');
  }
  await readEligibility(bindScopedDb(client), pariwarId, memberId, refuse);
}

// ── Reads ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** One row of the queue (DL11) — ⛔ name, ⛔ mobile, ⛔ Tier-1 field at all. */
export interface IdentityCheckQueueEntry {
  readonly memberId: MemberId;
  readonly signedUpAt: Date;
  readonly state: MemberLifecycleState;
  /** The member's CURRENT posting district (newest posting as of `at`), or `null` when unposted. */
  readonly district: string | null;
  readonly latestOutcome: IdentityValidationOutcome | null;
  readonly latestDecidedAt: Date | null;
  readonly attemptCount: number;
}

export interface ListIdentityCheckQueueOptions {
  /** The injected app clock — the posting district is resolved as of it (`getMemberCurrentDistrict`'s discipline). */
  readonly at: Date;
  /** `null` = every district AND the unposted (a pariwar-ceiling caller); a string = that district only. */
  readonly district: string | null;
  readonly limit?: number;
  readonly offset?: number;
}

/** DL11's page bounds. */
export const IDENTITY_CHECK_QUEUE_LIMIT = { default: 50, cap: 200 } as const;
/** The deepest page the queue reads — the contract's own ceiling (`IdentityCheckQueueQuery.offset`), held here too; a contracts test pins the two equal (R4-P10). */
export const IDENTITY_CHECK_QUEUE_MAX_OFFSET = 1_000_000;

interface QueueSqlRow extends Record<string, unknown> {
  member_id: string;
  state: string;
  created_at: string | Date;
  district: string | null;
  latest_outcome: string | null;
  latest_decided_at: string | Date | null;
  attempt_count: string | number;
}

const toDate = (v: string | Date): Date => (v instanceof Date ? v : new Date(v));
const sqlList = (values: readonly string[]) => sql.join(values.map((v) => sql`${v}`), sql`, `);

/** One page of the queue, and whether another follows it (`2026-11-26-504` item 3). */
export interface IdentityCheckQueuePage {
  readonly entries: IdentityCheckQueueEntry[];
  /** `true` when at least one more member waits after this page — a member staff could not reach cannot hide those behind them. */
  readonly hasMore: boolean;
}

/**
 * ⭐ DL11 — FR-2's trustee-action queue: every DL4-eligible member, `pending-valid` first, then signup date ascending,
 * tie-broken by `member_id`. The DL4 predicates are the SAME definitions the writer uses (the state list, the derived
 * checkable strengths, `trustee_verified = false`; `terminated` = the member's LATEST `member.moderation.*` action event
 * by `event_version` — the stream the writer's overlay folds, ⛔ a second source; the write path refuses an illegal
 * moderation action, so the latest action event IS the folded status). ⭐ `2026-11-26-504` item 3: a member with a standing
 * DEATH REPORT is ⛔ listed — the claim module's ONE predicate (`noStandingDeathReportSql`), so the list and the writer's
 * death lock (DL5) cannot disagree. The district filter is pushed into SQL so a page is a true page; the API ALSO applies
 * the per-row scope predicate (DL6). ⛔ Ciphertext is selected. ONE row more than the page is read to learn `hasMore`; it is
 * ⛔ returned.
 */
export async function listIdentityCheckQueuePage(
  db: Db,
  pariwarId: PariwarId,
  opts: ListIdentityCheckQueueOptions,
): Promise<IdentityCheckQueuePage> {
  // Clamped BEFORE interpolation (the forced-pagination invariant applies to a raw-SQL LIMIT too).
  // ⚠ A non-finite value (`NaN`, `Infinity`) from an in-process caller would pass `Math.min` / `Math.trunc` straight into SQL
  // (code review R3-P15): it falls back to the default / the first page.
  const limit = Math.trunc(clampLimit(Number.isFinite(opts.limit) ? opts.limit : undefined, IDENTITY_CHECK_QUEUE_LIMIT));
  const probe = limit + 1;
  const rawOffset = opts.offset;
  const offset = typeof rawOffset === 'number' && Number.isFinite(rawOffset) ? Math.max(0, Math.trunc(rawOffset)) : 0;
  // Past the ceiling there is no page to read (code review R4-P10): an EMPTY page, ⛔ the page AT the ceiling answered as if it
  // were the one asked for. ⛔ SQL runs.
  if (offset > IDENTITY_CHECK_QUEUE_MAX_OFFSET) return { entries: [], hasMore: false };
  const districtFilter = opts.district === null ? sql`` : sql`AND p.district = ${opts.district}`;
  const result = await db.execute<QueueSqlRow>(sql`
    SELECT m.member_id, m.state::text AS state, m.created_at, p.district,
           v.outcome AS latest_outcome, v.decided_at AS latest_decided_at,
           (SELECT count(*) FROM member_identity_validations c
             WHERE c.pariwar_id = m.pariwar_id AND c.member_id = m.member_id) AS attempt_count
      FROM members m
      JOIN member_kyc_profiles k ON k.pariwar_id = m.pariwar_id AND k.member_id = m.member_id
      LEFT JOIN LATERAL (
        SELECT mp.district FROM member_postings mp
         WHERE mp.pariwar_id = m.pariwar_id AND mp.member_id = m.member_id AND mp.created_at <= ${opts.at}
         ORDER BY mp.created_at DESC, mp.posting_id DESC
         LIMIT 1
      ) p ON true
      LEFT JOIN member_identity_validations v
        ON v.pariwar_id = m.pariwar_id AND v.member_id = m.member_id AND v.superseded_at IS NULL
     WHERE m.pariwar_id = ${pariwarId}
       AND m.state::text IN (${sqlList(IDENTITY_VALIDATION_ELIGIBLE_STATES)})
       AND k.verification_strength::text IN (${sqlList(KYC_STAFF_CHECKABLE_STRENGTHS)})
       AND k.trustee_verified = false
       AND COALESCE((
             SELECT e.event_type FROM events_log e
              WHERE e.pariwar_id = m.pariwar_id AND e.stream_id = m.member_id
                AND e.event_type IN (${sqlList(MODERATION_EVENT_TYPES)})
              ORDER BY e.event_version DESC
              LIMIT 1), 'none') <> ${MODERATION_ACTION_EVENT_TYPES.terminate}
       AND ${noStandingDeathReportSql(sql`m.pariwar_id`, sql`m.member_id`)}
       ${districtFilter}
     ORDER BY (m.state = 'pending-valid') DESC, m.created_at ASC, m.member_id ASC
     LIMIT ${probe} OFFSET ${offset}
  `);
  const rows = result.rows.map((r) => ({
    memberId: r.member_id as MemberId,
    signedUpAt: toDate(r.created_at),
    state: r.state as MemberLifecycleState,
    district: r.district,
    latestOutcome: (r.latest_outcome as IdentityValidationOutcome | null) ?? null,
    latestDecidedAt: r.latest_decided_at === null ? null : toDate(r.latest_decided_at),
    attemptCount: Number(r.attempt_count),
  }));
  return { entries: rows.slice(0, limit), hasMore: rows.length > limit };
}

/** The page's entries alone — {@link listIdentityCheckQueuePage} without the `hasMore` signal. */
export async function listIdentityCheckQueue(
  db: Db,
  pariwarId: PariwarId,
  opts: ListIdentityCheckQueueOptions,
): Promise<IdentityCheckQueueEntry[]> {
  return (await listIdentityCheckQueuePage(db, pariwarId, opts)).entries;
}

/** One act in a member's history, as the detail shows it (DL8) — ⛔ the note except on the LIVE row. */
export interface IdentityValidationHistoryEntry {
  readonly validationId: MemberIdentityValidationId;
  readonly outcome: IdentityValidationOutcome;
  readonly evidenceKind: IdentityValidationEvidenceKind | null;
  readonly documentKind: IdentityValidationDocumentKind | null;
  readonly notConfirmedReason: IdentityValidationNotConfirmedReason | null;
  readonly decidedByDisplay: string;
  readonly decidedAt: Date;
  readonly live: boolean;
}

/** The detail (DL8) — ciphertext AS STORED (the API decrypts, one audited view). */
export interface IdentityCheckDetail {
  readonly memberId: MemberId;
  readonly state: MemberLifecycleState;
  readonly signedUpAt: Date;
  readonly moderationStatus: ModerationStatus;
  readonly kyc: Pick<
    MemberKycProfileRow,
    'nameCiphertext' | 'dobCiphertext' | 'photoCiphertext' | 'verificationStrength' | 'source' | 'trusteeVerified' | 'updatedAt'
  > | null;
  readonly posting: { readonly district: string; readonly workplaceName: string | null } | null;
  /** Newest first: the live act, then superseded ones. */
  readonly history: readonly IdentityValidationHistoryEntry[];
  /** The LIVE act's note ciphertext (only it is ever decrypted). */
  readonly liveNoteCiphertext: string | null;
  /** DL5 — read WITHOUT the lock (a read never takes it); the form is hidden when true. */
  readonly deathReported: boolean;
  /** DL4 (`null` = eligible). */
  readonly ineligibility: IdentityValidationIneligibility | null;
}

/** The DL8 detail of one member, or `null` when there is no such member in this Pariwar. Tenant-scoped. */
export async function readIdentityCheckDetail(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  at: Date,
): Promise<IdentityCheckDetail | null> {
  const [member] = await db
    .select({ createdAt: members.createdAt })
    .from(members)
    .where(and(eq(members.pariwarId, pariwarId), eq(members.memberId, memberId)))
    .limit(1);
  if (!member) return null;
  const state = await getCurrentMemberState(db, memberId);
  const overlay = await getCurrentMemberModerationOverlay(db, memberId);
  const kyc = await getMemberKycProfile(db, pariwarId, memberId);
  const [posting] = await db
    .select({ district: memberPostings.district, workplaceName: workplaces.name })
    .from(memberPostings)
    .leftJoin(workplaces, eq(workplaces.workplaceId, memberPostings.workplaceId))
    .where(
      and(
        eq(memberPostings.pariwarId, pariwarId),
        eq(memberPostings.memberId, memberId),
        sql`${memberPostings.createdAt} <= ${at}`,
      ),
    )
    .orderBy(desc(memberPostings.createdAt), desc(memberPostings.postingId))
    .limit(1);
  const rows = await db
    .select()
    .from(memberIdentityValidations)
    .where(and(eq(memberIdentityValidations.pariwarId, pariwarId), eq(memberIdentityValidations.memberId, memberId)))
    // The LIVE row first; then superseded by when they were superseded. ⛔ `decided_at` alone (one txn ⇒ equal now()).
    .orderBy(
      sql`(${memberIdentityValidations.supersededAt} IS NULL) DESC`,
      desc(memberIdentityValidations.supersededAt),
      desc(memberIdentityValidations.decidedAt),
      desc(memberIdentityValidations.validationId),
    );
  const live = rows.find((r) => r.supersededAt === null) ?? null;
  return {
    memberId,
    state,
    signedUpAt: member.createdAt,
    moderationStatus: overlay.status,
    kyc:
      kyc === null
        ? null
        : {
            nameCiphertext: kyc.nameCiphertext,
            dobCiphertext: kyc.dobCiphertext,
            photoCiphertext: kyc.photoCiphertext,
            verificationStrength: kyc.verificationStrength,
            source: kyc.source,
            trusteeVerified: kyc.trusteeVerified,
            updatedAt: kyc.updatedAt,
          },
    posting: posting ? { district: posting.district, workplaceName: posting.workplaceName ?? null } : null,
    history: rows.map((r) => ({
      validationId: r.validationId,
      outcome: r.outcome,
      evidenceKind: r.evidenceKind,
      documentKind: r.documentKind,
      notConfirmedReason: r.notConfirmedReason,
      decidedByDisplay: r.decidedByDisplay,
      decidedAt: r.decidedAt,
      live: r.supersededAt === null,
    })),
    liveNoteCiphertext: live?.noteCiphertext ?? null,
    deathReported: await isDeathReportStanding(db, pariwarId, memberId),
    ineligibility: identityValidationIneligibility({ state, moderationStatus: overlay.status, kyc }),
  };
}
