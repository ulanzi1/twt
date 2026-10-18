// The District Admin's "Certificate reminders" LIST — Story 6.19d (Task 5/6; AC5; `2026-10-03-276` CR10, CR11). A read:
// ⛔ no write, ⛔ no decryption (a person's state is evaluated over the rows' own number hashes — the CURRENT number is
// hashed only where a letter is recorded or its address read).
//
// ⭐ WHICH CLAIMS: each claim with an OPEN certificate run, or with a letter-eligible person whose letter is unrecorded
// or undelivered (any run, open or ended — `-250` #4: letters stay recordable after a run ends). ⛔ Not listed while
// paused in a state that never re-enters the review window (`state_trustee_approved`, `approved`, `settled`) unless a
// person's letter is unrecorded or undelivered.
// ⭐ WHAT EACH SHOWS: the short reference (⛔ no name), the cause, the run day and the next reminder date — or which pause
// — each person BY POSITION AND ROLE (⛔ no name, ⛔ never an assumed rank), their SMS state, their letter (owed / posted
// / delivered / overdue), the day-13 escalation's RECORD date (⚠ in v1 it reaches ⛔ no Pariwar Admin — the surface says
// so, ⛔ never "sent" or "notified"), and the "cannot remind" flag.
// The caller filters the rows to its districts BEFORE it pages (6.19c's `getClosureLettersOwed` shape) — this read
// returns the deceased's member id for that.

import { and, desc, eq, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { claimCertificateReminderRuns } from '../schema/claim_certificate_reminder.js';
import { claims } from '../schema/claims.js';
import { certificateCatchUp, certificateReminderSchedule } from './certificate-reminder-schedule.js';
import {
  type CertificateCannotRemindReason,
  type CertificatePauseReason,
  certificateLetterCapReached,
  certificateRecordedDays,
  evaluateCertificatePersonStates,
  planCertificateRun,
  readCertificatePlanFacts,
  readCertificateRecipients,
  readClaimCertificateFamilyRows,
  readClaimCertificateLetters,
  readClaimCertificateRuns,
  readClaimCertificateStaffRows,
  NEVER_REENTERS,
} from './certificate-reminder.js';
import type { ClaimContactCallRow } from '../schema/claim_contact_calls.js';
import { type ContactLadderAsk, type ContactLadderFollowUp, ladderFollowUpOf, pendingLadderAsk, unreachableReasonOf } from './contact-ladder.js';
import { readClaimContactCalls, readClaimLadders } from './contact-ladder-read.js';
import { claimShortReference, isEvidentialReminderRow, compareReminderRowsByTime } from './correction-chase.js';
import { closureLetterOverdue } from './correction-closure-read.js';
import type { CalendarDateString } from '../cycle-calendar/holiday-resolver.js';


export const CERTIFICATE_LIST_DEFAULT_LIMIT = 50;
export const CERTIFICATE_LIST_MAX_LIMIT = 200;
/** The bounded scan the caller's district filter runs over (before the page slice). */
export const CERTIFICATE_LIST_SCAN_CAP = 1000;

/** A person's SMS state on the list. ⚠ LOCKSTEP with the contract's `CERTIFICATE_REMINDER_SMS_STATES`. */
export const CERTIFICATE_PERSON_SMS_STATES = [
  'not_yet_reminded',
  'reminded',
  'number_not_working',
  'unreachable',
  'no_number',
  'not_sent',
  'letter_delivered_no_sms',
] as const;
export type CertificatePersonSmsState = (typeof CERTIFICATE_PERSON_SMS_STATES)[number];

/** A person's role on the list. ⚠ LOCKSTEP with the contract's `CERTIFICATE_REMINDER_ROLES` (code review, 2026-10-03). */
export const CERTIFICATE_LIST_PERSON_ROLES = ['nominee', 'claimant'] as const;
export type CertificateListPersonRole = (typeof CERTIFICATE_LIST_PERSON_ROLES)[number];

export interface CertificateListPerson {
  readonly personKey: string;
  readonly role: CertificateListPersonRole;
  /** `A`, `B`, … for nominees; `null` for the claimant. */
  readonly position: string | null;
  readonly smsState: CertificatePersonSmsState;
  readonly letterEligible: boolean;
  readonly letter: {
    readonly letterId: string;
    readonly postedOn: string;
    readonly deliveredOn: string | null;
    readonly overdue: boolean;
    readonly hasScreenshot: boolean;
  } | null;
  /** The day-13 escalation's RECORD date (⚠ delivered to ⛔ no Pariwar Admin in v1), or `null`. */
  readonly escalationRecordedOn: string | null;
  /** Story 6.37c (LD12) — the person's LATEST certificate delivery ladder (claim-wide — runs have ⛔ return), or `null`. */
  readonly followUp: ContactLadderFollowUp | null;
  /**
   * Story 6.37c (LD12, LD7) — why the person reads unreachable (from the found-dead row — ⛔ `smsState`, which shows the
   * LAST row: a later accepted text reads `reminded` while the person stays letter-eligible).
   */
  readonly unreachableReason: 'refused' | 'not_delivered' | null;
  /** Story 6.37c (LD9, LD12) — a concluded ladder's call-or-letter ask still open (cap-aware), or `null`. */
  readonly ask: ContactLadderAsk | null;
  /** Story 6.37c (LD10) — the calls recorded for the person (either surface). ⛔ PII. */
  readonly calls: readonly ClaimContactCallRow[];
}

/** The run's state on the list. ⚠ LOCKSTEP with the contract's `CERTIFICATE_REMINDER_RUN_STATES` (code review, 2026-10-03). */
export const CERTIFICATE_LIST_RUN_STATES = ['open', 'paused', 'ended'] as const;
export type CertificateListRunState = (typeof CERTIFICATE_LIST_RUN_STATES)[number];

export interface CertificateListItem {
  readonly claimCaseId: string;
  readonly deceasedMemberId: string;
  readonly shortReference: string;
  readonly cause: 'rejected' | 'missing';
  readonly runState: CertificateListRunState;
  readonly pauseReason: CertificatePauseReason | null;
  readonly runDay: number | null;
  readonly nextReminderOn: string | null;
  readonly cannotRemind: CertificateCannotRemindReason | null;
  readonly people: readonly CertificateListPerson[];
}

export interface CertificateListScanResult {
  readonly items: readonly CertificateListItem[];
  /** The scan hit its limit — claims whose LATEST run began earlier than the last one scanned are NOT in `items`. */
  readonly truncated: boolean;
}

/**
 * ⭐ THE LIST's rows for one Pariwar — a bounded scan (the claim whose LATEST run began most recently first), each claim
 * evaluated in full. Reads only; ⛔ nothing decrypted. The caller filters by district and pages.
 */
export async function listCertificateReminderClaims(
  db: Db,
  pariwarId: PariwarId,
  today: CalendarDateString,
  opts: { readonly limit?: number; readonly nomineeCallsCleared?: boolean } = {},
): Promise<CertificateListScanResult> {
  const limit = clampLimit(opts.limit, { default: CERTIFICATE_LIST_SCAN_CAP, cap: CERTIFICATE_LIST_SCAN_CAP });
  const claimRows = await db
    .select({ claimCaseId: claimCertificateReminderRuns.claimCaseId, latest: sql<Date>`max(${claimCertificateReminderRuns.openedAt})` })
    .from(claimCertificateReminderRuns)
    .where(eq(claimCertificateReminderRuns.pariwarId, pariwarId))
    .groupBy(claimCertificateReminderRuns.claimCaseId)
    .orderBy(desc(sql`max(${claimCertificateReminderRuns.openedAt})`))
    // ONE PAST the limit — `truncated` only when a claim was REALLY left out (⛔ not at exactly `limit`). ⚠ The
    // `clampLimit(...)` call stays INLINE in `.limit(...)` — the domain-accessor-invariants gate accepts nothing else.
    .limit(clampLimit(limit + 1, { default: CERTIFICATE_LIST_SCAN_CAP + 1, cap: CERTIFICATE_LIST_SCAN_CAP + 1 }));
  const out: CertificateListItem[] = [];
  for (const { claimCaseId } of claimRows.slice(0, limit)) {
    const item = await readCertificateListItem(db, pariwarId, claimCaseId as ClaimId, today, {
      nomineeCallsCleared: opts.nomineeCallsCleared ?? false,
    });
    if (item !== null) out.push(item);
  }
  return { items: out, truncated: claimRows.length > limit };
}

/** One claim's row, or `null` when it is ⛔ not listed. */
export async function readCertificateListItem(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  today: CalendarDateString,
  /** Story 6.37c (LD11) — the api config's nominee-call switch (the ask reads it) — ⛔ read here. */
  opts: { readonly nomineeCallsCleared?: boolean } = {},
): Promise<CertificateListItem | null> {
  const [claimRow] = await db
    .select({ deceasedMemberId: claims.deceasedMemberId, currentState: claims.currentState })
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
    .limit(1);
  if (!claimRow) return null;
  const runs = await readClaimCertificateRuns(db, pariwarId, claimCaseId);
  if (runs.length === 0) return null;
  const open = runs.find((r) => r.endedAt === null) ?? null;
  const latest = open ?? runs[runs.length - 1]!;

  let runState: CertificateListItem['runState'] = 'ended';
  let pauseReason: CertificatePauseReason | null = null;
  let runDay: number | null = null;
  let nextReminderOn: string | null = null;
  const rows = await readClaimCertificateFamilyRows(db, pariwarId, claimCaseId);
  const recipients = await readCertificateRecipients(db, pariwarId, claimCaseId);
  const letters = await readClaimCertificateLetters(db, pariwarId, claimCaseId);
  const states = evaluateCertificatePersonStates(recipients.people, rows, letters, new Map());
  if (open !== null) {
    const facts = await readCertificatePlanFacts(db, pariwarId, claimCaseId);
    const plan = facts === null ? null : planCertificateRun(facts, today);
    if (plan?.kind === 'pause' && plan.runId === open.runId) {
      runState = 'paused';
      pauseReason = plan.reason;
      runDay = plan.runDay;
    } else {
      runState = 'open';
      if (plan?.kind === 'continue') {
        runDay = plan.runDay;
        // ⭐ The SWEEP's own per-person rule, mirrored (code review round 3) — ⛔ never an approximation of it:
        // ⛔ no date while the family cannot be reminded (the sweep sends nothing); TODAY while any person still has a
        // send owed today — today's slot OR a late catch-up of a missed one (`certificateCatchUp`, a pause or an
        // outage across a slot day) — ⛔ skipping a number whose letter was delivered; else the next slot after today.
        if (recipients.cannotRemind === null) {
          const runDayToday = plan.runDay;
          const owedToday = states.some(
            (st) => !st.numberLetterDelivered && certificateCatchUp(certificateRecordedDays(rows, open.runId, st.personKey), runDayToday).send !== null,
          );
          nextReminderOn = owedToday ? today : (certificateReminderSchedule(open.day0).find((sl) => sl.date > today)?.date ?? null);
        }
      }
      // `plan?.kind === 'end'` (completed / certificate received) or `'open'` (a restart about to supersede this
      // run) — the row is still open in the DB right now, but the next sweep ends/supersedes it: no further slot
      // of THIS run will fire, so `runDay`/`nextReminderOn` stay `null` rather than naming a date that never comes.
    }
  }

  const staff = await readClaimCertificateStaffRows(db, pariwarId, claimCaseId);
  // Story 6.37c (LD12) — the claim's certificate ladders and calls, read ONCE.
  const ladders = await readClaimLadders(db, pariwarId, claimCaseId, 'certificate');
  const calls = await readClaimContactCalls(db, pariwarId, claimCaseId);
  const people: CertificateListPerson[] = recipients.people.map((p) => {
    const s = states.find((x) => x.personKey === p.personKey)!;
    const last = rows
      .filter((r) => r.recipientKey === p.personKey)
      .filter(isEvidentialReminderRow)
      .sort(compareReminderRowsByTime)
      .at(-1);
    const smsState: CertificatePersonSmsState = s.numberLetterDelivered
      ? 'letter_delivered_no_sms'
      : last === undefined
        ? 'not_yet_reminded'
        : last.outcome === 'accepted'
          ? 'reminded'
          : last.outcome === 'rejected_invalid_number'
            ? 'number_not_working'
            : last.outcome === 'rejected_unreachable'
              ? 'unreachable'
              : last.outcome === 'no_target'
                ? 'no_number'
                : 'not_sent';
    const foundDeadOn = s.track.foundDeadOn;
    const escalation = staff
      .filter((r) => r.purpose === 'letter_escalation' && r.subjectKey === p.personKey && (foundDeadOn === null || r.sentOn > foundDeadOn))
      .at(-1);
    return {
      personKey: p.personKey,
      role: p.role,
      position: p.position,
      smsState,
      letterEligible: s.letterEligible,
      letter:
        s.letter === null
          ? null
          : {
              letterId: s.letter.letterId,
              postedOn: s.letter.postedOn,
              deliveredOn: s.letter.deliveredOn,
              overdue: closureLetterOverdue(s.letter.postedOn, s.letter.deliveredOn, today),
              hasScreenshot: s.letter.hasScreenshot,
            },
      escalationRecordedOn: escalation?.sentOn ?? null,
      followUp: ladderFollowUpOf(ladders.filter((l) => l.personKey === p.personKey)),
      unreachableReason: unreachableReasonOf(s.track.deadKind),
      ask: pendingLadderAsk({
        ladders: ladders.filter((l) => l.personKey === p.personKey),
        calls: calls.filter((c) => c.personKey === p.personKey),
        letterRecordedAt: s.letter === null ? [] : [s.letter.createdAt],
        role: p.role,
        // `-275` Q1 — ONE letter per person per claim, ever — AND CR6's one per NUMBER (round 2 P24: the route refuses it).
        letterCapReached: certificateLetterCapReached(states, p.personKey),
        nomineeCallsCleared: opts.nomineeCallsCleared ?? false,
      }),
      calls: calls.filter((c) => c.personKey === p.personKey),
    };
  });

  const letterOwedOrUndelivered = people.some(
    (p) => (p.letterEligible && p.letter === null) || (p.letter !== null && p.letter.deliveredOn === null),
  );
  const listedForRun = runState === 'open' || (runState === 'paused' && !NEVER_REENTERS.has(claimRow.currentState as string));
  // ⭐ Story 6.37c (LD12) — a claim whose run has ENDED stays listed while a ladder RUNS, or a concluded ladder's ask is
  // still open (a day-180 origin; a "call"-only ask after day 180 — else invisible).
  const ladderOpen = people.some((p) => p.followUp?.state === 'running' || p.ask !== null);
  if (!listedForRun && !letterOwedOrUndelivered && !ladderOpen) return null;

  return {
    claimCaseId: claimCaseId as string,
    deceasedMemberId: claimRow.deceasedMemberId as string,
    shortReference: claimShortReference(claimCaseId as string),
    cause: latest.cause,
    runState,
    pauseReason,
    runDay,
    nextReminderOn,
    cannotRemind: recipients.cannotRemind,
    people,
  };
}
