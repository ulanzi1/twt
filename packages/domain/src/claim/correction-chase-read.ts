// The correction CHASE SUMMARY for the District Admin's queue — Story 6.19b (Task 8; AC8b, AC16). Read-only,
// transport-free.
//
// ⭐ ONE row of the correction queue gains: the claim's SHORT REFERENCE (D33 — the string the family's SMS carries),
// WHO MUST ACT (who, when), the run's day count and next reminder, a reminder summary PER PERSON by ROLE ("nominee 1",
// "claimant" — ⛔ never a name), the dead / unreachable flags, the "cannot remind" flag and reason (D30), the "family
// has corrected — awaiting your check" flag (`-269` §2(b)), each letter's state and its overdue flag, and whether any
// chase was escalated to the Pariwar Admin. Everything is derived from the chase's own records through the ONE
// resolver — ⛔ nothing re-derived.
// ⚠ Per claim (a bounded page — the queue's `clampLimit` cap), ⛔ never unbounded.
// ⛔ Carries no name, ⛔ no number, ⛔ no address, ⛔ no tracking number, ⛔ no note.

import { and, eq, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import { type CalendarDateString, addCalendarDays } from '../cycle-calendar/holiday-resolver.js';
import type { FieldCryptoDeps } from '../encryption/field-classes.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import {
  type CorrectionMustAct,
  type CorrectionRunKind,
  claimCorrectionReminders,
  claimCorrectionRuns,
} from '../schema/claim_correction_chase.js';
import {
  type CorrectionCannotRemindReason,
  claimShortReference,
  readCorrectionClaimRow,
  readCorrectionRecipients,
  resolveCorrectionChase,
} from './correction-chase.js';
import { readRunLetters, readRunPersonStates } from './correction-reminder-record.js';
import {
  LETTER_OVERDUE_AFTER_DAYS,
  correctionReminderSchedule,
  correctionRunDay,
  istDateOf,
} from './correction-schedule.js';
import { resolveClaimCorrectionState } from './state-trustee-decision-persist.js';

export type CorrectionPersonStatus = 'reached' | 'dead' | 'unreachable' | 'not_yet';

export interface CorrectionChaseLetterSummary {
  readonly letterId: string;
  readonly sequence: number;
  readonly postedOn: string;
  readonly deliveredOn: string | null;
  readonly overdue: boolean;
  readonly hasScreenshot: boolean;
}

export interface CorrectionChasePersonSummary {
  readonly personKey: string;
  readonly role: 'nominee' | 'claimant';
  readonly rank: 1 | 2 | null;
  readonly status: CorrectionPersonStatus;
  readonly foundDeadOn: string | null;
  readonly remindersAccepted: number;
  readonly letters: readonly CorrectionChaseLetterSummary[];
}

export interface CorrectionChaseSummary {
  readonly shortReference: string;
  readonly returnDecisionId: string | null;
  readonly mark: { readonly mustAct: CorrectionMustAct; readonly setByActorDisplay: string; readonly setAt: Date } | null;
  readonly run: {
    readonly runId: string;
    readonly kind: CorrectionRunKind;
    readonly day0: string;
    readonly dayCount: number;
    readonly open: boolean;
    /** The IST date the run ended, or `null` while it is open. */
    readonly endedOn: string | null;
    readonly nextReminderOn: string | null;
  } | null;
  readonly cannotRemind: CorrectionCannotRemindReason | null;
  readonly claimantUnresolved: boolean;
  /** `-269` §2(b) — the family's part is done and the claim is ⛔ not resubmitted: staff must check. */
  readonly awaitingCheck: boolean;
  readonly people: readonly CorrectionChasePersonSummary[];
  /** A chase of this claim's live return was escalated to the Pariwar Admin. */
  readonly escalated: boolean;
}

/**
 * A person's status on the queue. ⭐ A dead / unreachable fact of the CURRENT number WINS over "reached": a number
 * accepted on day 1 and carrier-rejected on day 3 is chased as dead (the sweep chases the District Admin for its
 * letter), so the queue must show it dead — and offer the letter form — ⛔ never mask it as "reached". Pure.
 */
export function correctionPersonStatus(
  deadKind: 'dead' | 'unreachable' | null,
  accepted: number,
): CorrectionPersonStatus {
  return deadKind === 'dead' ? 'dead' : deadKind === 'unreachable' ? 'unreachable' : accepted > 0 ? 'reached' : 'not_yet';
}

/** The overdue flag (`-250` #3). Pure. */
export function correctionLetterOverdue(postedOn: string, deliveredOn: string | null, today: CalendarDateString): boolean {
  const due = addCalendarDays(postedOn, LETTER_OVERDUE_AFTER_DAYS);
  return deliveredOn === null ? today > due : deliveredOn > due;
}

/** ⭐ The chase summary of ONE claim for the queue (AC8b). `crypto`: hashes each person's CURRENT number so the
 * per-person status resets on a 6.20 correction (AC3) instead of reading the old number's history. */
export async function readCorrectionChaseSummary(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  today: CalendarDateString,
  opts: { readonly crypto?: FieldCryptoDeps } = {},
): Promise<CorrectionChaseSummary> {
  const chase = await resolveCorrectionChase(db, pariwarId, claimCaseId);
  const shortReference = claimShortReference(claimCaseId);
  const empty: CorrectionChaseSummary = {
    shortReference,
    returnDecisionId: null,
    mark: null,
    run: null,
    cannotRemind: null,
    claimantUnresolved: false,
    awaitingCheck: false,
    people: [],
    escalated: false,
  };
  if (chase.liveReturn === null) return empty;

  const claimRow = await readCorrectionClaimRow(db, pariwarId, claimCaseId);
  const resubmitted =
    claimRow === null
      ? false
      : (
          await resolveClaimCorrectionState(
            db,
            pariwarId,
            claimCaseId,
            claimRow.deceasedMemberId as MemberId,
            claimRow.currentState,
          )
        ).resubmitted;

  // ⭐ Prefer the OPEN run — but ONLY when it belongs to the LIVE return (an earlier return's still-open run is
  // stale: its day count is ⛔ not this return's); otherwise the more RECENTLY OPENED of the live return's family /
  // staff runs (⛔ never a fixed family-before-staff preference — an ended run picked by kind alone can be stale).
  const openOfLiveReturn =
    chase.openRun !== null && chase.openRun.returnDecisionId === chase.liveReturn.decisionId ? chase.openRun : null;
  const run =
    openOfLiveReturn ??
    (chase.familyRun === null
      ? chase.staffRun
      : chase.staffRun === null
        ? chase.familyRun
        : chase.familyRun.openedAt.getTime() >= chase.staffRun.openedAt.getTime()
          ? chase.familyRun
          : chase.staffRun);
  const runSummary =
    run === null
      ? null
      : (() => {
          const dayCount = correctionRunDay(run.day0, today);
          // ⭐ `resubmitted` PAUSES the run (`-267` §3) — ⛔ no next reminder is due while it holds.
          const next =
            run.endedAt === null && !resubmitted
              ? correctionReminderSchedule(run.kind, run.day0).find((s) => s.kind === 'reminder' && s.day > dayCount)
              : undefined;
          return {
            runId: run.runId,
            kind: run.kind,
            day0: run.day0,
            dayCount,
            open: run.endedAt === null,
            endedOn: run.endedAt === null ? null : istDateOf(run.endedAt),
            nextReminderOn: next?.date ?? null,
          };
        })();

  const recipients = await readCorrectionRecipients(db, pariwarId, claimCaseId);
  const familyRun = chase.familyRun;
  let people: CorrectionChasePersonSummary[] = [];
  if (familyRun !== null && recipients.cannotRemind === null) {
    const states = await readRunPersonStates(db, pariwarId, familyRun, recipients.people, { crypto: opts.crypto });
    const letters = await readRunLetters(db, pariwarId, familyRun.runId);
    people = states.map(({ person, state }) => {
      const accepted = state.epochRows.filter((r) => r.outcome === 'accepted').length;
      return {
        personKey: person.personKey,
        role: person.role,
        rank: person.rank,
        status: correctionPersonStatus(state.deadKind, accepted),
        foundDeadOn: state.foundDeadOn,
        remindersAccepted: accepted,
        letters: letters
          .filter((l) => l.personKey === person.personKey)
          .map((l) => ({
            letterId: l.letterId,
            sequence: l.sequence,
            postedOn: l.postedOn,
            deliveredOn: l.deliveredOn,
            overdue: correctionLetterOverdue(l.postedOn, l.deliveredOn, today),
            hasScreenshot: l.hasScreenshot,
          })),
      };
    });
  }

  const escalations = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(claimCorrectionReminders)
    .innerJoin(claimCorrectionRuns, eq(claimCorrectionRuns.runId, claimCorrectionReminders.runId))
    .where(
      and(
        eq(claimCorrectionReminders.pariwarId, pariwarId),
        eq(claimCorrectionReminders.claimCaseId, claimCaseId),
        eq(claimCorrectionReminders.purpose, 'escalation'),
        eq(claimCorrectionRuns.returnDecisionId, chase.liveReturn.decisionId as never),
      ),
    );

  return {
    shortReference,
    returnDecisionId: chase.liveReturn.decisionId,
    mark: chase.mark
      ? { mustAct: chase.mark.mustAct, setByActorDisplay: chase.mark.setByActorDisplay, setAt: chase.mark.setAt }
      : null,
    run: runSummary,
    cannotRemind: recipients.cannotRemind,
    claimantUnresolved: recipients.claimantUnresolved,
    awaitingCheck: chase.familyPartDoneAt !== null && !resubmitted,
    people,
    escalated: (escalations[0]?.n ?? 0) > 0,
  };
}
