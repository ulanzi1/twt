// The correction-closure READ MODELS — Story 6.19c (Task 6; AC8c, AC14; `2026-10-01-273` §7). Read-only,
// transport-free.
//
//   · `listPariwarClosureQueue`        — the PARIWAR ADMIN's decisions: the pending closure requests (⛔ lapsed) and the
//                                        live "no correction needed" records (D27), each with its readiness;
//   · `listEscalatedClosures`          — the SUPER ADMIN's queue: every HELD claim of the Pariwar, BOTH origins;
//   · `readEscalatedClosureDetail`     — one held claim for the decision surface: both admins' notes (a declined
//                                        closure) or the mark history (a staff case), the directions, the name check's
//                                        current recorded state, resubmitted / the family's part done;
//   · `listOpenDirectionsFor`          — the DIRECTEE's inbox (unanswered directions naming them);
//   · `listClosureLettersOwed`         — the DISTRICT ADMIN's closure-letter items (`-274` 2);
//   · `readApprovalNameHighlight[Bulk]` — `-273` §7: "approved without a current passing name check" / "approved
//                                        despite a name mismatch", from the Super Admin's approval RECORD.
// ⛔ Carries no name, ⛔ no number, ⛔ no address, ⛔ no tracking number. Notes are CIPHERTEXT AS STORED — the route
// decrypts after authorization (the `correction-queue-read` posture). ⚠ Every list is bounded (`clampLimit`).

import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import { type CalendarDateString, addCalendarDays } from '../cycle-calendar/holiday-resolver.js';
import type { ClaimId, MemberId, PariwarId, TrusteeDecisionId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { claimCorrectionMarks } from '../schema/claim_correction_chase.js';
import {
  CLOSURE_HELD_STATES,
  type ClaimCorrectionClosureRow,
  type ClaimCorrectionDirectionRow,
  claimClosureLetters,
  claimCorrectionClosures,
  claimCorrectionDirections,
  claimCorrectionNoCorrectionRecords,
} from '../schema/claim_correction_closure.js';
import { claimStateTrusteeDecisions } from '../schema/claim_state_trustee_decisions.js';
import { claims } from '../schema/claims.js';
import { claimShortReference, resolveCorrectionChase } from './correction-chase.js';
import { isClosureRequestLapsed, isCorrectionClaimHeld, isNameCheckRecordedAfterRecord } from './correction-closure.js';
import { LETTER_OVERDUE_AFTER_DAYS, calendarDaysBetween, istDateOf } from './correction-schedule.js';
import { readNomineeNameCheckApprovalState } from './nominee-name-check.js';
import { resolveClaimCorrectionState } from './state-trustee-decision-persist.js';

export const CLOSURE_QUEUE_DEFAULT_LIMIT = 50;
export const CLOSURE_QUEUE_MAX_LIMIT = 200;


// ── The Pariwar Admin's queue (AC6, D27) ──────────────────────────────────────────────────────────────────────

export interface PariwarClosureQueueItem {
  readonly kind: 'closure_request' | 'no_correction_needed';
  readonly claimCaseId: string;
  readonly deceasedMemberId: string;
  readonly shortReference: string;
  /** When the District Admin asked / recorded. */
  readonly at: Date;
  readonly byDisplay: string;
  /** ⛔ Ciphertext AS STORED (the closure field class). */
  readonly noteCiphertext: string;
  /** `closure_request` — the family run's day 0 the request was made against. */
  readonly familyRunDay0: string | null;
  /** `no_correction_needed` — a name check was recorded AFTER the record (the approve's precondition, D27). */
  readonly checkedAfterRecord: boolean | null;
  /** The claim is HELD (only the Super Admin decides it — `-273` §4): the strip shows it ⛔ actionable. */
  readonly held: boolean;
}

/**
 * ⭐ THE PARIWAR ADMIN'S CLOSURE DECISIONS: every pending closure request of a LIVE return (a LAPSED one is ⛔ listed —
 * its approve and decline would only 409, `-273` §3d), oldest first, and every LIVE "no correction needed" record (its
 * mark still the return's latest). Bounded.
 */
export async function listPariwarClosureQueue(
  db: Db,
  pariwarId: PariwarId,
  opts: { readonly limit?: number } = {},
): Promise<PariwarClosureQueueItem[]> {
  const limit = clampLimit(opts.limit, { default: CLOSURE_QUEUE_DEFAULT_LIMIT, cap: CLOSURE_QUEUE_MAX_LIMIT });
  const requests = await db
    .select({ row: claimCorrectionClosures, deceasedMemberId: claims.deceasedMemberId })
    .from(claimCorrectionClosures)
    .innerJoin(
      claimStateTrusteeDecisions,
      and(
        eq(claimStateTrusteeDecisions.decisionId, claimCorrectionClosures.returnDecisionId),
        isNull(claimStateTrusteeDecisions.supersededAt),
      ),
    )
    .innerJoin(claims, eq(claims.claimCaseId, claimCorrectionClosures.claimCaseId))
    .where(and(eq(claimCorrectionClosures.pariwarId, pariwarId), eq(claimCorrectionClosures.state, 'requested')))
    .orderBy(asc(claimCorrectionClosures.requestedAt))
    .limit(clampLimit(opts.limit, { default: CLOSURE_QUEUE_DEFAULT_LIMIT, cap: CLOSURE_QUEUE_MAX_LIMIT }));
  const out: PariwarClosureQueueItem[] = [];
  for (const { row, deceasedMemberId } of requests) {
    const chase = await resolveCorrectionChase(db, pariwarId, row.claimCaseId);
    if (await isClosureRequestLapsed(db, pariwarId, row, chase)) continue;
    out.push({
      kind: 'closure_request',
      claimCaseId: row.claimCaseId,
      deceasedMemberId,
      shortReference: claimShortReference(row.claimCaseId),
      at: row.requestedAt!,
      byDisplay: row.requestedByDisplay!,
      noteCiphertext: row.requestNoteCiphertext!,
      familyRunDay0: chase.familyRun?.day0 ?? null,
      checkedAfterRecord: null,
      held: false,
    });
  }
  // The live "no correction needed" records: the record's mark is the LATEST mark of a LIVE return.
  const records = await db
    .select({ record: claimCorrectionNoCorrectionRecords, deceasedMemberId: claims.deceasedMemberId })
    .from(claimCorrectionNoCorrectionRecords)
    .innerJoin(
      claimStateTrusteeDecisions,
      and(
        eq(claimStateTrusteeDecisions.decisionId, claimCorrectionNoCorrectionRecords.returnDecisionId),
        isNull(claimStateTrusteeDecisions.supersededAt),
      ),
    )
    .innerJoin(claims, eq(claims.claimCaseId, claimCorrectionNoCorrectionRecords.claimCaseId))
    .where(
      and(
        eq(claimCorrectionNoCorrectionRecords.pariwarId, pariwarId),
        sql`${claimCorrectionNoCorrectionRecords.markId} = (
          SELECT m.mark_id FROM claim_correction_marks m
           WHERE m.return_decision_id = "claim_correction_no_correction_records"."return_decision_id"
           ORDER BY m.set_at DESC, m.mark_id DESC LIMIT 1)`,
      ),
    )
    .orderBy(asc(claimCorrectionNoCorrectionRecords.recordedAt))
    .limit(clampLimit(opts.limit, { default: CLOSURE_QUEUE_DEFAULT_LIMIT, cap: CLOSURE_QUEUE_MAX_LIMIT }));
  for (const { record, deceasedMemberId } of records) {
    // Second pass (2026-10-03): the SAME µs-precise predicate the D27 writer refuses on — ⛔ a ms-truncated `Date`
    // comparison that read a same-millisecond check as "not after", so the strip and the writer could disagree.
    // No check at all ⇒ `false` (as before).
    const checkedAfterRecord = await isNameCheckRecordedAfterRecord(db, pariwarId, record.recordId);
    const held = await isCorrectionClaimHeld(db, pariwarId, record.claimCaseId);
    out.push({
      kind: 'no_correction_needed',
      claimCaseId: record.claimCaseId,
      deceasedMemberId,
      shortReference: claimShortReference(record.claimCaseId),
      at: record.recordedAt,
      byDisplay: record.recordedByDisplay,
      noteCiphertext: record.noteCiphertext,
      familyRunDay0: null,
      checkedAfterRecord,
      held,
    });
  }
  // Code review patch (2026-10-02): the two kinds were concatenated requests-first, records-second, then sliced —
  // so a full page of requests silently dropped every record regardless of its age. The doc comment promises "oldest
  // first" across the WHOLE queue, not per-kind; sort by `at` before the bound so both kinds get a fair, age-ordered
  // slice.
  out.sort((a, b) => a.at.getTime() - b.at.getTime());
  return out.slice(0, limit);
}

// ── The Super Admin's queue (AC14) ────────────────────────────────────────────────────────────────────────────

export interface EscalatedClosureItem {
  readonly closureId: string;
  readonly claimCaseId: string;
  readonly deceasedMemberId: string;
  readonly shortReference: string;
  readonly origin: ClaimCorrectionClosureRow['origin'];
  readonly state: ClaimCorrectionClosureRow['state'];
  readonly escalatedAt: Date;
  readonly underReviewSince: Date | null;
  /** Directions still waiting for a response. */
  readonly openDirections: number;
}

/** ⭐ EVERY HELD claim of the Pariwar (BOTH origins), oldest escalation first. Bounded. */
export async function listEscalatedClosures(
  db: Db,
  pariwarId: PariwarId,
  opts: { readonly limit?: number } = {},
): Promise<EscalatedClosureItem[]> {
  const rows = await db
    .select({
      row: claimCorrectionClosures,
      deceasedMemberId: claims.deceasedMemberId,
      openDirections: sql<number>`(
        SELECT count(*)::int FROM claim_correction_directions d
         WHERE d.closure_id = "claim_correction_closures"."closure_id" AND d.responded_at IS NULL)`,
    })
    .from(claimCorrectionClosures)
    .innerJoin(
      claimStateTrusteeDecisions,
      and(
        eq(claimStateTrusteeDecisions.decisionId, claimCorrectionClosures.returnDecisionId),
        isNull(claimStateTrusteeDecisions.supersededAt),
      ),
    )
    .innerJoin(claims, eq(claims.claimCaseId, claimCorrectionClosures.claimCaseId))
    .where(and(eq(claimCorrectionClosures.pariwarId, pariwarId), inArray(claimCorrectionClosures.state, [...CLOSURE_HELD_STATES])))
    .orderBy(asc(claimCorrectionClosures.escalatedAt))
    .limit(clampLimit(opts.limit, { default: CLOSURE_QUEUE_DEFAULT_LIMIT, cap: CLOSURE_QUEUE_MAX_LIMIT }));
  return rows.map(({ row, deceasedMemberId, openDirections }) => ({
    closureId: row.closureId,
    claimCaseId: row.claimCaseId,
    deceasedMemberId,
    shortReference: claimShortReference(row.claimCaseId),
    origin: row.origin,
    state: row.state,
    escalatedAt: row.escalatedAt!,
    underReviewSince: row.underReviewSince ?? null,
    openDirections,
  }));
}

export interface EscalatedClosureMark {
  readonly mustAct: 'family' | 'staff';
  readonly isReturnMark: boolean;
  readonly setAt: Date;
  readonly setByDisplay: string;
  readonly setByRole: string;
  /** ⛔ Ciphertext AS STORED (the MARK field class), `null` on the return's own mark. */
  readonly noteCiphertext: string | null;
}

export interface EscalatedClosureDetail {
  readonly closure: ClaimCorrectionClosureRow;
  readonly deceasedMemberId: string;
  readonly shortReference: string;
  readonly currentState: string;
  /** The return's marks, oldest first — the staff case's history (and a declined closure's). */
  readonly marks: readonly EscalatedClosureMark[];
  readonly directions: readonly ClaimCorrectionDirectionRow[];
  /** The family has corrected and the claim is RESUBMITTED (`-273` §4 — the Super Admin approves through the full gate). */
  readonly resubmitted: boolean;
  /** "The family's part is done" (`-268`) — the accounts rewritten, ⛔ re-checked yet. */
  readonly familyPartDone: boolean;
  /**
   * The name check's CURRENT recorded state, as the gate would judge it now (`passing` / `never_checked` / `stale` /
   * `does_not_match`), or the gate leg that is missing before it (`accounts_missing` / `undetermined`). ⛔ Never a
   * name comparison.
   */
  readonly nameCheckState: 'passing' | 'never_checked' | 'stale' | 'does_not_match' | 'accounts_missing' | 'undetermined';
}

/** ⭐ ONE held claim for the Super Admin's decision surface — `null` unless the claim is held (live return). */
export async function readEscalatedClosureDetail(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<EscalatedClosureDetail | null> {
  const [found] = await db
    .select({ row: claimCorrectionClosures, deceasedMemberId: claims.deceasedMemberId, currentState: claims.currentState })
    .from(claimCorrectionClosures)
    .innerJoin(
      claimStateTrusteeDecisions,
      and(
        eq(claimStateTrusteeDecisions.decisionId, claimCorrectionClosures.returnDecisionId),
        isNull(claimStateTrusteeDecisions.supersededAt),
      ),
    )
    .innerJoin(claims, eq(claims.claimCaseId, claimCorrectionClosures.claimCaseId))
    .where(
      and(
        eq(claimCorrectionClosures.pariwarId, pariwarId),
        eq(claimCorrectionClosures.claimCaseId, claimCaseId),
        inArray(claimCorrectionClosures.state, [...CLOSURE_HELD_STATES]),
      ),
    )
    .limit(1);
  if (!found) return null;
  const { row, deceasedMemberId, currentState } = found;
  const marks = await db
    .select()
    .from(claimCorrectionMarks)
    .where(
      and(
        eq(claimCorrectionMarks.pariwarId, pariwarId),
        eq(claimCorrectionMarks.returnDecisionId, row.returnDecisionId as TrusteeDecisionId),
      ),
    )
    .orderBy(asc(claimCorrectionMarks.setAt), asc(claimCorrectionMarks.markId))
    .limit(200);
  const directions = await db
    .select()
    .from(claimCorrectionDirections)
    .where(and(eq(claimCorrectionDirections.pariwarId, pariwarId), eq(claimCorrectionDirections.closureId, row.closureId)))
    .orderBy(asc(claimCorrectionDirections.createdAt))
    .limit(200);
  const correction = await resolveClaimCorrectionState(db, pariwarId, claimCaseId, deceasedMemberId as MemberId, currentState);
  const chase = await resolveCorrectionChase(db, pariwarId, claimCaseId);
  let nameCheckState: EscalatedClosureDetail['nameCheckState'];
  try {
    nameCheckState = await readNomineeNameCheckApprovalState(db, pariwarId, claimCaseId, deceasedMemberId as MemberId);
  } catch (err) {
    const name = (err as { name?: string }).name;
    if (name === 'NomineeBankAccountsRequiredError') nameCheckState = 'accounts_missing';
    else if (name === 'NomineeDeterminationRequiredError') nameCheckState = 'undetermined';
    else throw err;
  }
  return {
    closure: row,
    deceasedMemberId,
    shortReference: claimShortReference(claimCaseId),
    currentState,
    marks: marks.map((m) => ({
      mustAct: m.mustAct,
      isReturnMark: m.isReturnMark,
      setAt: m.setAt,
      setByDisplay: m.setByActorDisplay,
      setByRole: m.setByRole,
      noteCiphertext: m.noteCiphertext ?? null,
    })),
    directions,
    resubmitted: correction.resubmitted,
    familyPartDone: chase.familyPartDoneAt !== null,
    nameCheckState,
  };
}

// ── The directee's inbox (D18) ────────────────────────────────────────────────────────────────────────────────

export interface OpenDirectionItem {
  readonly direction: ClaimCorrectionDirectionRow;
  readonly shortReference: string;
  /** The claim is still held (the direction's purpose stands); a response is a record either way. */
  readonly stillHeld: boolean;
}

/** ⭐ The UNANSWERED directions naming `actorId`, oldest first. Bounded. */
export async function listOpenDirectionsFor(
  db: Db,
  pariwarId: PariwarId,
  actorId: string,
  opts: { readonly limit?: number } = {},
): Promise<OpenDirectionItem[]> {
  const rows = await db
    .select({ direction: claimCorrectionDirections, state: claimCorrectionClosures.state })
    .from(claimCorrectionDirections)
    .innerJoin(claimCorrectionClosures, eq(claimCorrectionClosures.closureId, claimCorrectionDirections.closureId))
    .where(
      and(
        eq(claimCorrectionDirections.pariwarId, pariwarId),
        eq(claimCorrectionDirections.directedToActor, actorId),
        isNull(claimCorrectionDirections.respondedAt),
      ),
    )
    .orderBy(asc(claimCorrectionDirections.createdAt))
    .limit(clampLimit(opts.limit, { default: CLOSURE_QUEUE_DEFAULT_LIMIT, cap: CLOSURE_QUEUE_MAX_LIMIT }));
  return rows.map(({ direction, state }) => ({
    direction,
    shortReference: claimShortReference(direction.claimCaseId),
    stillHeld: (CLOSURE_HELD_STATES as readonly string[]).includes(state),
  }));
}

// ── The District Admin's closure letters (`-274` 2) ───────────────────────────────────────────────────────────

export interface ClosureLetterOwedPerson {
  readonly personKey: string;
  readonly letter: {
    readonly letterId: string;
    readonly postedOn: string;
    readonly deliveredOn: string | null;
    readonly overdue: boolean;
    readonly hasScreenshot: boolean;
  } | null;
}

export interface ClosureLettersOwedItem {
  readonly claimCaseId: string;
  readonly deceasedMemberId: string;
  readonly shortReference: string;
  /** The closure's IST date — the chase's day 0. */
  readonly closedOn: string;
  /** Days since the closure (the chase: day 7, daily to 12, then escalated). */
  readonly daysSinceClosure: number;
  readonly people: readonly ClosureLetterOwedPerson[];
}

/** ⭐ Every CLOSED claim that owes a closure letter not yet DELIVERED, oldest closure first. Bounded. */
export async function listClosureLettersOwed(
  db: Db,
  pariwarId: PariwarId,
  today: CalendarDateString,
  opts: { readonly limit?: number } = {},
): Promise<ClosureLettersOwedItem[]> {
  const rows = await db
    .select({ row: claimCorrectionClosures, deceasedMemberId: claims.deceasedMemberId })
    .from(claimCorrectionClosures)
    .innerJoin(claims, eq(claims.claimCaseId, claimCorrectionClosures.claimCaseId))
    .where(
      and(
        eq(claimCorrectionClosures.pariwarId, pariwarId),
        eq(claimCorrectionClosures.state, 'closed'),
        sql`cardinality(${claimCorrectionClosures.closureLetterPersonKeys}) > 0`,
        // ⛔ Every owed letter already delivered ⇒ ⛔ listed.
        sql`EXISTS (
          SELECT 1 FROM unnest(${claimCorrectionClosures.closureLetterPersonKeys}) AS k(person_key)
           WHERE NOT EXISTS (
             SELECT 1 FROM claim_closure_letters l
              WHERE l.closure_id = "claim_correction_closures"."closure_id" AND l.person_key = k.person_key
                AND l.delivered_on IS NOT NULL))`,
      ),
    )
    .orderBy(asc(claimCorrectionClosures.closedAt))
    .limit(clampLimit(opts.limit, { default: CLOSURE_QUEUE_DEFAULT_LIMIT, cap: CLOSURE_QUEUE_MAX_LIMIT }));
  const out: ClosureLettersOwedItem[] = [];
  for (const { row, deceasedMemberId } of rows) {
    const letters = await db
      .select()
      .from(claimClosureLetters)
      .where(and(eq(claimClosureLetters.pariwarId, pariwarId), eq(claimClosureLetters.closureId, row.closureId)))
      .limit(50);
    const closedOn = istDateOf(row.closedAt!);
    out.push({
      claimCaseId: row.claimCaseId,
      deceasedMemberId,
      shortReference: claimShortReference(row.claimCaseId),
      closedOn,
      daysSinceClosure: calendarDaysBetween(closedOn, today),
      people: row.closureLetterPersonKeys.map((personKey) => {
        const l = letters.find((x) => x.personKey === personKey);
        return {
          personKey,
          letter:
            l === undefined
              ? null
              : {
                  letterId: l.letterId,
                  postedOn: l.postedOn,
                  deliveredOn: l.deliveredOn ?? null,
                  overdue: closureLetterOverdue(l.postedOn, l.deliveredOn ?? null, today),
                  hasScreenshot: l.screenshotStorageKey !== null,
                },
        };
      }),
    });
  }
  return out;
}

/** The 14-day overdue flag (`-250` #3 — shown, ⛔ nothing else). Pure. */
export function closureLetterOverdue(postedOn: string, deliveredOn: string | null, today: CalendarDateString): boolean {
  const due = addCalendarDays(postedOn, LETTER_OVERDUE_AFTER_DAYS);
  return deliveredOn === null ? today > due : deliveredOn > due;
}

// ── The highlight (`-273` §7, `-226` cl.5, `-255` F4) ──────────────────────────────────────────────────────────

export type ApprovalNameHighlight = 'approved_without_passing_check' | 'approved_despite_name_mismatch';

/**
 * ⭐ `-273` §7 — THE RULE, pure: a closures row's highlight from its APPROVAL RECORD — `null` unless it was approved
 * with the name check WAIVED and the check's recorded state was ⛔ `passing`. ONE place: the bulk read below and the
 * Super Admin decision's own response both call it.
 */
export function approvalNameHighlightOf(row: {
  readonly state: string;
  readonly nameCheckWaived: boolean | null;
  readonly approvalNameCheckState: string | null;
}): ApprovalNameHighlight | null {
  if (row.state !== 'approved' || row.nameCheckWaived !== true) return null;
  if (row.approvalNameCheckState === null || row.approvalNameCheckState === 'passing') return null;
  return row.approvalNameCheckState === 'does_not_match' ? 'approved_despite_name_mismatch' : 'approved_without_passing_check';
}

/**
 * ⭐ `-273` §7 — the Super Admin APPROVED the claim with the name check WAIVED (the `-251` path) and the check's
 * RECORDED state at approval was ⛔ `passing`: `approved_despite_name_mismatch` when it was `does_not_match`, else
 * `approved_without_passing_check` (`never_checked` / `stale`). DERIVED from the approval record — ⛔ never a name
 * comparison. Reaches the District Admin, the Pariwar Admin and the Super Admin.
 * Code review patch (2026-10-02, corrected after an adversarial re-check): ⛔ no `.limit()` at all — a claim can
 * carry MORE THAN ONE matching row (a second return, separately approved+waived), so even a `claimCaseIds.length`
 * bound doesn't guarantee one row per id: if the ROWS for some ids outnumber 1, the budget can be consumed before
 * the scan reaches a DIFFERENT id's only (older-sorting) row, silently dropping that id's highlight. The `inArray`
 * clause already bounds this query to exactly these ids' own rows — a small, naturally-bounded set, not an
 * unbounded scan — so no safety-valve limit is needed for this COMPLETE bulk read (the doc's own word).
 * ⚠ Second pass (2026-10-03): the NEWEST matching row per id decides — an id is marked SEEN before its highlight is
 * checked, so a newest approval recorded `passing` (no highlight) is ⛔ shadowed by an older `does_not_match` one.
 * Ties on `super_admin_decided_at` break on `closure_id` (deterministic).
 */
export async function readApprovalNameHighlightBulk(
  db: Db,
  pariwarId: PariwarId,
  claimCaseIds: readonly string[],
): Promise<Map<string, ApprovalNameHighlight>> {
  const out = new Map<string, ApprovalNameHighlight>();
  if (claimCaseIds.length === 0) return out;
  const rows = await db
    .select({
      claimCaseId: claimCorrectionClosures.claimCaseId,
      state: claimCorrectionClosures.state,
      nameCheckWaived: claimCorrectionClosures.nameCheckWaived,
      approvalNameCheckState: claimCorrectionClosures.approvalNameCheckState,
    })
    .from(claimCorrectionClosures)
    .where(
      and(
        eq(claimCorrectionClosures.pariwarId, pariwarId),
        inArray(claimCorrectionClosures.claimCaseId, claimCaseIds as ClaimId[]),
        eq(claimCorrectionClosures.state, 'approved'),
        eq(claimCorrectionClosures.nameCheckWaived, true),
      ),
    )
    .orderBy(desc(claimCorrectionClosures.superAdminDecidedAt), desc(claimCorrectionClosures.closureId));
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.claimCaseId)) continue;
    seen.add(r.claimCaseId);
    const highlight = approvalNameHighlightOf(r);
    if (highlight !== null) out.set(r.claimCaseId, highlight);
  }
  return out;
}

/** The single-claim form of `readApprovalNameHighlightBulk`. */
export async function readApprovalNameHighlight(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ApprovalNameHighlight | null> {
  return (await readApprovalNameHighlightBulk(db, pariwarId, [claimCaseId])).get(claimCaseId) ?? null;
}
