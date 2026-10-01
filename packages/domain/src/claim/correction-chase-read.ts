// The correction CHASE SUMMARY for the District Admin's queue — Story 6.19b (Task 8; AC8b, AC16). Read-only,
// transport-free.
//
// ⭐ ONE row of the correction queue gains: the claim's SHORT REFERENCE (D33 — the string the family's SMS carries),
// WHO MUST ACT (who, when), the run's day count and next reminder, a reminder summary PER PERSON by ROLE ("nominee 1",
// "claimant" — ⛔ never a name), the dead / unreachable flags, the "cannot remind" flag and reason (D30), the "family
// has corrected — awaiting your check" flag (`-269` §2(b)), each letter's state and its overdue flag, and whether any
// chase was escalated to the Pariwar Admin. Everything is derived from the chase's own records through the ONE
// resolver — ⛔ nothing re-derived.
// ⭐ D30 (`cannotRemind`) stops the family's REMINDERS, ⛔ not the letters: the people are then derived from the run's
// own records (its family rows + letters, grouped by person key — ⛔ no crypto), so a recorded letter and its delivery
// form stay visible while the server still accepts a delivery. Their RANK comes from the effective declaration when it
// is `effective` (the same person-key mapping the recipients use), else `null`.
// ⭐ K1 — THE LETTERS ARE THE RETURN'S: every letter of every `family` / `direction` run of the live return (after
// family → staff → family a run-1 letter and its delivery form stay listed — the delivery writer is keyed on the
// letter, ⛔ not the run), and a person who LEFT the recipient set (a W6 (b) rewrite) keeps their letters (their
// line is derived from the records). Each person's STATUS stays the latest family run's — the sweep's own state.
// ⭐ A person whose CURRENT number had to be hashed and whose hash THREW is surfaced as `numberUnverified` (the API
// logs it by claim id) — ⛔ never silently judged on the old number's epoch.
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
import { readVersionChainIndex } from './claim-contact-check.js';
import {
  type CorrectionCannotRemindReason,
  type PersonRunState,
  claimShortReference,
  evaluatePersonRunState,
  nomineePersonKey,
  readCorrectionClaimRow,
  readCorrectionRecipients,
  resolveCorrectionChase,
} from './correction-chase.js';
import {
  type RunFamilyRow,
  type RunLetterRow,
  readReturnFamilyLetters,
  readRunFamilyRows,
  readRunPersonStates,
} from './correction-reminder-record.js';
import {
  LETTER_OVERDUE_AFTER_DAYS,
  correctionReminderSchedule,
  correctionRunDay,
  istDateOf,
} from './correction-schedule.js';
import { getEffectiveNomineeDeclaration } from './nominee-effective.js';
import { resolveClaimCorrectionState } from './state-trustee-decision-persist.js';

export type CorrectionPersonStatus = 'reached' | 'dead' | 'unreachable' | 'not_yet';

export interface CorrectionChaseLetterSummary {
  readonly letterId: string;
  readonly sequence: number;
  readonly postedOn: string;
  readonly deliveredOn: string | null;
  readonly overdue: boolean;
  readonly hasScreenshot: boolean;
  /** K1 — the letter belongs to the latest family / direction run (the run the per-run letter rules count). */
  readonly inCurrentRun: boolean;
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
  /**
   * At least one person's CURRENT number had to be hashed and the hash THREW — their status is the OLD number's
   * epoch. ⛔ Not on the contract DTO: the API logs it (claim id only); the letter route fails closed on it.
   */
  readonly numberUnverified: boolean;
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

/**
 * The run's NEXT reminder date, or `null`. ⛔ None once the run ended, nor while the claim is `resubmitted` (a pause,
 * `-267` §3); and for a FAMILY / DIRECTION run ⛔ none while the family's part is done (tier (b), `-269` §2) or the
 * family cannot be reminded (D30) — the sweep sends nothing to them then, so the queue must ⛔ not advertise a date.
 * ⭐ A `family` run whose live return's LATEST mark is ⛔ not `family` (a held switch, 6.19c — the run can outlive
 * the mark) has ⛔ none either: the child skips every slot `not_a_family_mark`. A `direction` run is exempt (as in the
 * child). A STAFF run keeps its dates under tier (b) and D30 (the District Admin is still reminded). Pure.
 */
export function correctionNextReminderOn(input: {
  readonly kind: CorrectionRunKind;
  readonly day0: CalendarDateString;
  readonly open: boolean;
  readonly dayCount: number;
  readonly resubmitted: boolean;
  readonly familyPartDone: boolean;
  readonly cannotRemind: boolean;
  /** The live return's LATEST mark (`null` = unmarked). */
  readonly latestMark: CorrectionMustAct | null;
}): string | null {
  if (!input.open || input.resubmitted) return null;
  if (input.kind === 'family' && input.latestMark !== 'family') return null;
  if (input.kind !== 'staff' && (input.familyPartDone || input.cannotRemind)) return null;
  const next = correctionReminderSchedule(input.kind, input.day0).find(
    (s) => s.kind === 'reminder' && s.day > input.dayCount,
  );
  return next?.date ?? null;
}

/** A person derived from the chase's own records (D30 — the recipient read is empty then; or one who left it). */
export interface CorrectionRecordPerson {
  readonly personKey: string;
  readonly role: 'nominee' | 'claimant';
  /** From `ranks` (the effective declaration's, when it is `effective`), else `null` — ⛔ never guessed. */
  readonly rank: 1 | 2 | null;
  readonly rows: readonly RunFamilyRow[];
  readonly letters: readonly RunLetterRow[];
}

/**
 * The people of a chase from its OWN records: every person key on a `family_sms` row or a letter, in order of first
 * appearance (rows by slot, then letters), with the role read off the key's format (`claimant`, or
 * `nominee:<root version>`; a key of any other format is ⛔ not a person key and is skipped). A nominee's rank is
 * `ranks.get(personKey)` — the claimant's is always `null`. Pure.
 */
export function correctionPeopleFromRecords(
  rows: readonly RunFamilyRow[],
  letters: readonly RunLetterRow[],
  ranks: ReadonlyMap<string, 1 | 2> = new Map(),
): CorrectionRecordPerson[] {
  const keys: string[] = [];
  for (const k of [...rows.map((r) => r.recipientKey), ...letters.map((l) => l.personKey)]) {
    if ((k === 'claimant' || k.startsWith('nominee:')) && !keys.includes(k)) keys.push(k);
  }
  return keys.map((personKey) => ({
    personKey,
    role: personKey === 'claimant' ? ('claimant' as const) : ('nominee' as const),
    rank: personKey === 'claimant' ? null : (ranks.get(personKey) ?? null),
    rows: rows.filter((r) => r.recipientKey === personKey),
    letters: letters.filter((l) => l.personKey === personKey),
  }));
}

/**
 * K1 — the record-derived people the queue ADDS to the current recipients: every person ⛔ among them who has a
 * LETTER (a person who left the recipient set — a W6 (b) rewrite — keeps their letters and its delivery form), in
 * record order. A person with only reminder rows is ⛔ not added (they are no longer chased). Pure.
 */
export function correctionPeopleLeftWithLetters(
  recipientKeys: readonly string[],
  recordPeople: readonly CorrectionRecordPerson[],
): CorrectionRecordPerson[] {
  const known = new Set(recipientKeys);
  return recordPeople.filter((p) => !known.has(p.personKey) && p.letters.length > 0);
}

/**
 * The effective declaration's rank per nominee PERSON KEY (the recipients' own mapping — `nomineePersonKey` over the
 * version chain), or an EMPTY map when the declaration is ⛔ not `effective` (D30 `undetermined`: ⛔ no rank is known).
 */
async function readEffectiveNomineeRanks(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<Map<string, 1 | 2>> {
  const effective = await getEffectiveNomineeDeclaration(db, pariwarId, claimCaseId);
  if (effective.status !== 'effective') return new Map();
  const index = await readVersionChainIndex(db, pariwarId, effective.deceasedMemberId);
  return new Map(effective.entries.map((e) => [nomineePersonKey(e.versionId as string, index), e.rank] as const));
}

/** One person's queue line from their evaluated state and their letters in the run. Pure. */
function personSummary(
  person: { readonly personKey: string; readonly role: 'nominee' | 'claimant'; readonly rank: 1 | 2 | null },
  state: PersonRunState,
  letters: readonly (RunLetterRow & { readonly runId?: string })[],
  today: CalendarDateString,
  currentRunId: string,
): CorrectionChasePersonSummary {
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
        inCurrentRun: l.runId === undefined || l.runId === currentRunId,
      })),
  };
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
    numberUnverified: false,
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
  const recipients = await readCorrectionRecipients(db, pariwarId, claimCaseId);
  const runSummary =
    run === null
      ? null
      : (() => {
          const dayCount = correctionRunDay(run.day0, today);
          return {
            runId: run.runId,
            kind: run.kind,
            day0: run.day0,
            dayCount,
            open: run.endedAt === null,
            endedOn: run.endedAt === null ? null : istDateOf(run.endedAt),
            nextReminderOn: correctionNextReminderOn({
              kind: run.kind,
              day0: run.day0,
              open: run.endedAt === null,
              dayCount,
              resubmitted,
              familyPartDone: chase.familyPartDoneAt !== null,
              cannotRemind: recipients.cannotRemind !== null,
              latestMark: chase.mark?.mustAct ?? null,
            }),
          };
        })();

  const familyRun = chase.familyRun;
  let people: CorrectionChasePersonSummary[] = [];
  let numberUnverified = false;
  if (familyRun !== null) {
    // ⭐ K1 — the letters LISTED are every family / direction run's of the live return; a person's STATE is the
    // latest family run's (its own rows and letters — the sweep's evaluation), ⛔ never mixed across runs.
    const letters = await readReturnFamilyLetters(db, pariwarId, claimCaseId, chase.liveReturn.decisionId);
    const runLetters = letters.filter((l) => l.runId === familyRun.runId);
    /** A record-derived person's line: ⛔ no crypto — their number's epoch is the recorded one. */
    const recordLine = (p: CorrectionRecordPerson): CorrectionChasePersonSummary =>
      personSummary(
        p,
        evaluatePersonRunState(p.rows, runLetters.filter((l) => l.personKey === p.personKey)),
        p.letters,
        today,
        familyRun.runId,
      );
    if (recipients.cannotRemind === null) {
      const states = await readRunPersonStates(db, pariwarId, familyRun, recipients.people, { crypto: opts.crypto });
      numberUnverified = states.some((s) => s.hashFailed === true);
      people = states.map(({ person, state }) => personSummary(person, state, letters, today, familyRun.runId));
      const recipientKeys = recipients.people.map((p) => p.personKey);
      if (letters.some((l) => !recipientKeys.includes(l.personKey))) {
        // ⭐ A person who LEFT the recipient set keeps their letters (K1). ⛔ No rank: every effective nominee IS a
        // recipient, so a person outside the set holds ⛔ no effective rank.
        const rows = await readRunFamilyRows(db, pariwarId, familyRun.runId);
        const left = correctionPeopleLeftWithLetters(recipientKeys, correctionPeopleFromRecords(rows, letters));
        people = [...people, ...left.map(recordLine)];
      }
    } else {
      // ⭐ D30 — ⛔ no reminders, but the letters stay recordable at any time: derive the people from the records
      // (the latest run's rows + the return's letters); the rank from the effective declaration when it is one.
      const rows = await readRunFamilyRows(db, pariwarId, familyRun.runId);
      const ranks = await readEffectiveNomineeRanks(db, pariwarId, claimCaseId);
      people = correctionPeopleFromRecords(rows, letters, ranks).map(recordLine);
    }
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
    numberUnverified,
  };
}
