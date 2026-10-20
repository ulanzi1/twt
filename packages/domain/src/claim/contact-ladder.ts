// The DELIVERY LADDER — its rules, PURE — Story 6.37c (Task 4.1; AC1–AC4, AC6; `2026-10-17-350` rulings 1–2, `-351`
// 1 A / 3 B / 4 A / 5 A / 6 A, `2026-10-18-355` LD3–LD9, `-360` PQ1–PQ3 A).
//
// ⭐ WHAT A LADDER IS. A reminder the network REPORTED `undelivered` (6.37b's `sms_send_deliveries` — ⛔ silence: a text
// with ⛔ report keeps counting, `-351` 1 A) starts ONE follow-up for that person (`-351` 4 A): the WhatsApp step
// (RECORDED skipped — LD1; `-356` for a nominee), SMS 2 two days after the origin, SMS 3 two days after SMS 2, then a
// four-day wait (`-350` ruling 2) — as IST DATES on the reminders' own 10:00 rhythm (LD3; `-250` #5 *"One message a
// day, at 10:00"*). Any message that IS delivered, or a recorded call that reaches the family, ENDS it (`-351` 4 A,
// 5 A); a number change or a stop ends it too. Otherwise it CONCLUDES: that reminder (and every undelivered reminder of
// the same number in its epoch) is read as never delivered (`-350` ruling 1, B1) — HERE, at READ time, ⛔ a stored
// outcome rewritten (I2) — and the District Admin is asked to call or post a letter (LD9).
//
// ⭐ The Panel's three edges are RULED as our readings (`-360`): PQ1 A — a silent ladder SMS does ⛔ end a ladder (only a
// `delivered` report or a reached call does); PQ2 A — each chase alone (a delivered message of the OTHER chase ends
// ⛔ ladder here; only a correction ladder holds the correction closure); PQ3 A — ⛔ ladder SMS past the reminders' end
// or during a pause, and the ladder still CONCLUDES on its date. Each lives in ONE function below: `ladderEndReason`
// (the ends) and `ladderStepGate` (the horizon / pause / one-a-day) — a ruling is a one-function change.
//
// ⛔ No DB, ⛔ no clock, ⛔ no crypto (hashes compared timing-safe — `sameNumberHash`). ⛔ Decides nothing about a claim.

import { addCalendarDays, istDateOf } from '../cycle-calendar/holiday-resolver.js';
import { CERTIFICATE_RUN_HORIZON_DAYS } from './certificate-reminder-schedule.js';
import { compareReminderRowsByTime, isEvidentialReminderRow, type PersonReminderRow } from './correction-chase.js';
import { sameNumberHash } from './correction-crypto.js';
import { CORRECTION_RUN_HORIZON_DAYS } from './correction-schedule.js';
import type { ContactLadderChase, ContactLadderState, ContactLadderStepState } from '../schema/claim_contact_ladders.js';
import type { ClaimantWhatsappBasis } from './claim-contact-whatsapp-basis.js';
import type { SmsDeliveryState } from '../schema/sms_send_deliveries.js';

// ── The numbers (LD3, LD5, LD13) ───────────────────────────────────────────────────────────────────────────────

/** `-350` ruling 2 (2) — SMS 2, 48 hours after the origin: two IST dates later. */
export const LADDER_SMS2_AFTER_DAYS = 2;
/** `-350` ruling 2 (3) — SMS 3, *"48 hours after the second"*. */
export const LADDER_SMS3_AFTER_DAYS = 2;
/** `-350` ruling 2 (3) — *"and waited 96 hours"* after SMS 3. */
export const LADDER_CONCLUDE_AFTER_DAYS = 4;
/**
 * LD5 — the start scan's bound: only a `family_sms` row SENT within this many days can start a ladder (a failure
 * reported later is never followed up — ⚠ disclosed: it NARROWS `-350` ruling 2 at the edge; MSG91 reports on the final
 * status, usually within minutes).
 */
export const CONTACT_LADDER_SCAN_DAYS = 14;
/** LD13 — this many ladders STARTED in one Pariwar on one IST day alarm (a DLT scrub / template fault fails EVERY text). */
export const CONTACT_LADDER_BURST_THRESHOLD = 3;

/**
 * The WhatsApp step at INSERT — Story 6.37d (WS5; `-357` the claimant only; `-356` ⛔ a nominee; `-367` PQ1 reading A):
 * the CLAIMANT's step is `pending` (the quarter-hourly WhatsApp sweep takes it at origin + 4 h — `ladderWhatsappGate`),
 * and that includes a nominee the claimant link identifies (`isClaimant` — a claimant-nominee is reached as the
 * claimant); every other nominee's is RECORDED `skipped:nominee_no_whatsapp` for good. (6.37c wrote
 * `skipped:whatsapp_not_built` for a claimant; ladders already written keep it — 0172's trigger decides a step once.)
 */
export function ladderWhatsappStep(isClaimant: boolean): 'pending' | 'skipped:nominee_no_whatsapp' {
  return isClaimant ? 'pending' : 'skipped:nominee_no_whatsapp';
}

/**
 * LD11 — the nominee-call switch's NAME and parse rule, shared so `apps/api` and `apps/jobs` can't drift on either
 * (review finding D5). ⛔ `process.env` read here — each app reads its own, under this one name, through this one
 * parser; `'1'` ⇒ cleared, anything else ⇒ ⛔.
 */
export const CLAIM_NOMINEE_CALLS_CLEARED_ENV_VAR = 'CLAIM_NOMINEE_CALLS_CLEARED';
export function parseNomineeCallsClearedFlag(rawValue: string | undefined): boolean {
  return rawValue === '1';
}

// ── The READ-time mapping (LD6, LD7; I3, I4) ───────────────────────────────────────────────────────────────────

/** A send row as the mapping needs it — the chase readers' rows carry these (⛔ any other field is touched). */
export interface LadderMappableRow extends Pick<PersonReminderRow, 'sentOn' | 'createdAt' | 'recipientNumberHash'> {
  readonly outcome: PersonReminderRow['outcome'];
  readonly recipientKey: string;
  /** The send row's own id (the ladder's `origin_row_id` names it). Absent on a hand-built fixture ⇒ ⛔ mappable. */
  readonly reminderId?: string;
  /** 6.37b's recorded delivery state for THIS send, or `null` (⛔ report). */
  readonly deliveryState?: SmsDeliveryState | null;
  readonly deadOn?: string;
  readonly concluded?: true;
}

/** A CONCLUDED ladder, as the mapping needs it. */
export interface ConcludedLadderFact {
  readonly personKey: string;
  readonly recipientNumberHash: string;
  readonly originRowId: string;
  /** The IST date it concluded — the mapped rows' found-dead date (LD7). */
  readonly concludedOn: string;
}

/**
 * The epoch of each EVIDENTIAL row of ONE person — the SAME rules as `evaluatePersonRunState` (`isEvidentialReminderRow`
 * + `compareReminderRowsByTime`; a new epoch whenever the number hash changes from the previous evidential row). Keyed
 * by the row OBJECT (a fixture may carry ⛔ id). Pure.
 */
function epochsOf<R extends LadderMappableRow>(rows: readonly R[]): Map<R, number> {
  // Review P1 — the hash comparison is `sameNumberHash` (timing-safe), matching every other hash comparison in this
  // module. Review P11 — a `sentOn` + `createdAt` tie is broken by `reminderId`, so the ordering stays deterministic.
  // ⚠ Corrected in review round 2: both send tables default `created_at` to `clock_timestamp()`, so two rows of one
  // transaction do ⛔ share a `now()` — a tie needs a hand-set fixture; the tie-break is harmless determinism only.
  const evidential = rows
    .filter((r) => isEvidentialReminderRow(r))
    .sort((a, b) => compareReminderRowsByTime(a, b) || (a.reminderId ?? '').localeCompare(b.reminderId ?? ''));
  const out = new Map<R, number>();
  let epoch = 0;
  for (let i = 0; i < evidential.length; i += 1) {
    if (i > 0 && !sameNumberHash(evidential[i]!.recipientNumberHash, evidential[i - 1]!.recipientNumberHash)) epoch += 1;
    out.set(evidential[i]!, epoch);
  }
  return out;
}

/**
 * ⭐ THE B1 MAPPING (`-350` ruling 1 — LD6), applied by each chase's ONE row reader (I3): once ANY ladder of a (claim,
 * chase, person, number) has CONCLUDED undelivered in an epoch, EVERY `accepted` row of that person, on that number,
 * in that epoch, whose report says `undelivered` — EARLIER rows included (a row covered by a stopped ladder) — reads
 * with EFFECTIVE outcome `rejected_unreachable`, `deadOn` = the (earliest) conclusion date, `concluded: true`. Every
 * other row reads AS STORED: an `accepted` row with ⛔ report (`-351` 1 A), every row of an epoch with ⛔ concluded
 * ladder (I4 — a running or ended ladder changes ⛔ nothing), a row on another number. ⛔ A row-multiplying join: each
 * row is returned ONCE, in its input order, matching at most its OWN epoch's ladders. Pure.
 */
export function applyConcludedLadderMapping<R extends LadderMappableRow>(
  rows: readonly R[],
  ladders: readonly ConcludedLadderFact[],
): R[] {
  if (ladders.length === 0) return [...rows];
  const mapped = new Map<R, { readonly deadOn: string }>();
  const people = new Set(ladders.map((l) => l.personKey));
  for (const personKey of people) {
    const mine = rows.filter((r) => r.recipientKey === personKey);
    const epochs = epochsOf(mine);
    const byId = new Map<string, R>();
    for (const r of mine) if (r.reminderId !== undefined) byId.set(r.reminderId, r);
    /** epoch → the concluded ladders whose ORIGIN sits in it. */
    const concludedIn = new Map<number, ConcludedLadderFact[]>();
    for (const l of ladders) {
      if (l.personKey !== personKey) continue;
      const origin = byId.get(l.originRowId);
      const epoch = origin === undefined ? undefined : epochs.get(origin);
      if (epoch === undefined) continue;
      concludedIn.set(epoch, [...(concludedIn.get(epoch) ?? []), l]);
    }
    for (const r of mine) {
      const epoch = epochs.get(r);
      if (epoch === undefined || r.outcome !== 'accepted' || r.deliveryState !== 'undelivered') continue;
      const hits = (concludedIn.get(epoch) ?? []).filter((l) => sameNumberHash(r.recipientNumberHash, l.recipientNumberHash));
      if (hits.length === 0) continue;
      mapped.set(r, { deadOn: hits.map((l) => l.concludedOn).sort()[0]! });
    }
  }
  return rows.map((r) => {
    const m = mapped.get(r);
    return m === undefined ? r : ({ ...r, outcome: 'rejected_unreachable', deadOn: m.deadOn, concluded: true } as R);
  });
}

// ── The start (LD5) ────────────────────────────────────────────────────────────────────────────────────────────

/** A `family_sms` / `ladder_sms` row of the person, as the start and the ends read it (mapped rows are fine). */
export interface LadderSendFact extends LadderMappableRow {
  readonly runId: string;
}

/** A ladder of the person in THIS chase, as the start reads it. */
export interface LadderStartFact {
  readonly state: ContactLadderState;
  readonly originRowId: string;
  /** The origin row's `created_at` — the start of what the ladder COVERS (LD5). */
  readonly originCreatedAt: Date;
  readonly endedAt: Date | null;
  readonly recipientNumberHash: string;
}

/** A call of the person (either surface — a call reached the PERSON, LD10). */
export interface LadderCallFact {
  readonly outcome: 'reached' | 'not_reached';
  readonly calledOn: string;
  readonly createdAt: Date;
}

/**
 * ⭐ LD5 — which reminder STARTS this person's ladder today, or `null`. The ORIGIN is the EARLIEST row of the person's
 * CURRENT epoch (the number that is theirs NOW) that: was `accepted` and REPORTED `undelivered` (`-351` 1 A); was SENT
 * within `CONTACT_LADDER_SCAN_DAYS`; has ⛔ later row of this chase to that number reported `delivered` (4 A — already
 * reached); has ⛔ reached call on/after its date; whose OWN run passes the stop predicate (`stopOfRun`); and is ⛔ the
 * origin of, or COVERED by, any ladder (a row is covered while its `created_at` lies between a ladder's origin's and
 * that ladder's end — or the ladder still runs: re-starting it would re-send a stopped ladder's steps). And ⛔ start at
 * all while a ladder RUNS for the person (I5), or once one CONCLUDED on this number in the current epoch (⚠ the
 * no-restart rule — the person is already letter-eligible; a second ladder would only add texts). Pure.
 */
export function planLadderStart(input: {
  readonly today: string;
  /** The person's `family_sms` rows of THIS chase (the reader's — mapped). */
  readonly rows: readonly LadderSendFact[];
  /** The person's `ladder_sms` rows of THIS chase (any ladder). */
  readonly ladderRows: readonly Pick<LadderMappableRow, 'recipientNumberHash' | 'createdAt' | 'deliveryState'>[];
  /** The person's CURRENT number hash (`null` = ⛔ no sendable number ⇒ ⛔ start). */
  readonly currentNumberHash: string | null;
  readonly ladders: readonly LadderStartFact[];
  readonly calls: readonly LadderCallFact[];
  /** The stop predicate of a run, judged on the ROW's own run (a run ended `mark_changed` fails it). */
  readonly stopOfRun: (runId: string) => string | null;
}): LadderSendFact | null {
  const current = input.currentNumberHash;
  if (current === null) return null;
  if (input.ladders.some((l) => l.state === 'running')) return null;
  const epochs = epochsOf(input.rows);
  const evidential = [...epochs.keys()].sort(compareReminderRowsByTime);
  const last = evidential.at(-1);
  if (last === undefined || !sameNumberHash(last.recipientNumberHash, current)) return null;
  const currentEpoch = epochs.get(last)!;
  const inEpoch = evidential.filter((r) => epochs.get(r) === currentEpoch);
  const epochIds = new Set(inEpoch.map((r) => r.reminderId).filter((id): id is string => id !== undefined));
  // ⚠ The no-restart rule: a ladder CONCLUDED on this number in this epoch ⇒ ⛔ another.
  if (input.ladders.some((l) => l.state === 'concluded_undelivered' && epochIds.has(l.originRowId))) return null;
  const scanFrom = addCalendarDays(input.today, -CONTACT_LADDER_SCAN_DAYS);
  const sameNumber = [...input.rows, ...input.ladderRows].filter((x) => sameNumberHash(x.recipientNumberHash, current));
  for (const r of inEpoch) {
    if (r.outcome !== 'accepted' || r.deliveryState !== 'undelivered' || r.reminderId === undefined) continue;
    if (r.sentOn < scanFrom) continue;
    if (!sameNumberHash(r.recipientNumberHash, current)) continue;
    if (sameNumber.some((x) => x.createdAt.getTime() > r.createdAt.getTime() && x.deliveryState === 'delivered')) continue;
    if (input.calls.some((c) => c.outcome === 'reached' && c.calledOn >= r.sentOn)) continue;
    const t = r.createdAt.getTime();
    // Review round 2 P1 — a ladder COVERS only rows to ITS number: a text to a NEW number sent before the old number's
    // ladder ended `ended_number_changed` (the 10:00 chase sweep before the ladder sweep) is ⛔ covered by it.
    const coveredOrOrigin = input.ladders.some(
      (l) =>
        l.originRowId === r.reminderId ||
        (sameNumberHash(l.recipientNumberHash, r.recipientNumberHash) &&
          t >= l.originCreatedAt.getTime() &&
          (l.endedAt === null || t <= l.endedAt.getTime())),
    );
    if (coveredOrOrigin) continue;
    if (input.stopOfRun(r.runId) !== null) continue;
    return r;
  }
  return null;
}

/**
 * LD3 — SMS 2's date: two IST dates after the origin's (48 hours); a date that has already PASSED when the ladder
 * starts (a report seen late — F3) is due on the run AFTER this one (⛔ two steps in one run). Pure.
 */
export function ladderFirstDueOn(originSentOn: string, today: string): string {
  const due = addCalendarDays(originSentOn, LADDER_SMS2_AFTER_DAYS);
  return due < today ? addCalendarDays(today, 1) : due;
}

/**
 * Story 6.37d (WS6) — SMS 2's date for a ladder the QUARTER-HOURLY sweep starts (it never calls `advance`): the later of
 * `ladderFirstDueOn` and the date of the NEXT daily 10:00 run (`nextDailyRunOn` — today before 10:00 IST, else
 * tomorrow; the jobs compute it). After today's run has gone, `ladderFirstDueOn` alone could name TODAY (origin + 2 =
 * today) — the step would then be taken tomorrow and a `satisfied` / skipped SMS 2 would anchor SMS 3 on the DUE date,
 * one day after the step instead of two. ⛔ Pass the next run's date AS `today` (that returns the day AFTER it). Pure.
 */
export function ladderFirstDueOnForLateStart(originSentOn: string, today: string, nextDailyRunOn: string): string {
  const due = ladderFirstDueOn(originSentOn, today);
  return due < nextDailyRunOn ? nextDailyRunOn : due;
}

/**
 * LD3 — the NEXT date after a step resolved on `today`: `gap` days after its anchor (a `sent` step's own `sent_on`; a
 * `satisfied` / skipped step's DUE date), and ⛔ earlier than tomorrow (a slipped step never makes two steps in one run).
 * Pure.
 */
export function nextLadderStepDate(anchor: string, gap: number, today: string): string {
  const due = addCalendarDays(anchor, gap);
  const tomorrow = addCalendarDays(today, 1);
  return due < tomorrow ? tomorrow : due;
}

// ── The ends (LD5; PQ1 / PQ2 A) — ONE function ─────────────────────────────────────────────────────────────────

export type LadderEnd =
  | { readonly state: 'ended_delivered'; readonly detail: 'delivered' | 'delivered:whatsapp' }
  | { readonly state: 'ended_call'; readonly detail: 'call_reached' }
  | { readonly state: 'ended_number_changed'; readonly detail: 'number_changed' }
  | { readonly state: 'ended_stopped'; readonly detail: `stopped:${string}` };

/**
 * ⭐ WHAT ENDS A RUNNING LADDER, in this order (an end and `conclude_on` on one run ⇒ the END wins — the caller asks
 * this FIRST): a `delivered` report on a `family_sms` / `ladder_sms` row of THIS chase to the ladder's number created
 * after its origin, or on a row that SATISFIED one of its steps (another person on the same number — T22) ⇒
 * `ended_delivered`; a call recorded `reached` for the person on/after the origin's date (either surface) ⇒
 * `ended_call`; the person's current number known and ⛔ the ladder's ⇒ `ended_number_changed`; a stop ⇒
 * `ended_stopped:<reason>`. ⛔ Ends it: silence on a ladder SMS (PQ1 A), an `undelivered` ladder SMS, a delivered
 * message of the OTHER chase (PQ2 A — the caller passes this chase's rows only). Pure.
 */
export function ladderEndReason(input: {
  readonly ladder: { readonly originSentOn: string; readonly recipientNumberHash: string };
  readonly originCreatedAt: Date;
  /** The person's `family_sms` + `ladder_sms` rows of THIS chase. */
  readonly rows: readonly Pick<LadderMappableRow, 'recipientNumberHash' | 'createdAt' | 'deliveryState'>[];
  /** The rows that satisfied this ladder's steps (by id — another person's rows on the same number). */
  readonly satisfyingRows: readonly Pick<LadderMappableRow, 'deliveryState'>[];
  readonly calls: readonly LadderCallFact[];
  /** The person's CURRENT number hash; `undefined` = ⛔ known (version unchanged, or the hash failed). */
  readonly currentNumberHash: string | null | undefined;
  /** The stop predicate's reason, or `null`. */
  readonly stop: string | null;
  /**
   * Story 6.37d (WS12; `-351` 4 A *"on either channel"*) — the ladder's OWN WhatsApp send was DELIVERED (its
   * `delivered_at`, or the status store's `delivered` copied into it — WS11 (1)). Absent ⇒ ⛔ delivered.
   */
  readonly whatsappDelivered?: boolean;
}): LadderEnd | null {
  const origin = input.originCreatedAt.getTime();
  const delivered =
    input.rows.some(
      (r) =>
        r.deliveryState === 'delivered' &&
        r.createdAt.getTime() > origin &&
        sameNumberHash(r.recipientNumberHash, input.ladder.recipientNumberHash),
    ) || input.satisfyingRows.some((r) => r.deliveryState === 'delivered');
  if (delivered) return { state: 'ended_delivered', detail: 'delivered' };
  if (input.whatsappDelivered === true) return { state: 'ended_delivered', detail: 'delivered:whatsapp' };
  if (input.calls.some((c) => c.outcome === 'reached' && c.calledOn >= input.ladder.originSentOn)) {
    return { state: 'ended_call', detail: 'call_reached' };
  }
  if (input.currentNumberHash !== undefined && !sameNumberHash(input.currentNumberHash, input.ladder.recipientNumberHash)) {
    return { state: 'ended_number_changed', detail: 'number_changed' };
  }
  if (input.stop !== null) return { state: 'ended_stopped', detail: `stopped:${input.stop}` };
  return null;
}

// ── The step gate (LD3, LD4; PQ3 A) — ONE function ─────────────────────────────────────────────────────────────

export type LadderStepVerdict = 'send' | 'satisfied' | 'skipped:past_horizon' | 'skipped:paused';

/**
 * ⭐ WHETHER A DUE STEP SENDS TODAY, in this order: past the chase's horizon — correction day ≥ 90 (`-250` #5 *"stop at
 * day 90"*), a certificate run's day > 180 (`-259`) — ⇒ `skipped:past_horizon`; a certificate run PAUSED (a pause that
 * does ⛔ end the ladder — `-275` Q4) ⇒ `skipped:paused` (PQ3 A — ⛔ a text, the clock runs on, the ladder still
 * concludes on its date); a scheduled reminder slot for this number TODAY (LD4 (a) — "a scheduled day IS the step",
 * computed from the SCHEDULE, ⛔ by watching for a sent row) or ANY `family_sms` / `ladder_sms` row of this chase to
 * this number already today (I8 — ⛔ two texts to one number in one chase on one day) ⇒ `satisfied`; else `send`.
 * Pure.
 */
export function ladderStepGate(input: {
  readonly chase: ContactLadderChase;
  /** The ORIGIN run's day number today. */
  readonly runDay: number;
  readonly paused: boolean;
  readonly scheduledToday: boolean;
  readonly sentToNumberToday: boolean;
}): LadderStepVerdict {
  const limit = ladderHorizonVerdict(input);
  if (limit !== null) return limit;
  if (input.scheduledToday || input.sentToNumberToday) return 'satisfied';
  return 'send';
}

/**
 * The horizon / pause HALF of `ladderStepGate`, EXTRACTED so the WhatsApp step obeys the SAME limits (Story 6.37d WS7 —
 * `-360` Q3 A's *"no follow-up text"* read as *"no follow-up message"*) — ⛔ a copy: correction day ≥ 90, a certificate
 * run's day > 180 ⇒ `skipped:past_horizon`; a certificate run PAUSED ⇒ `skipped:paused`; else `null`. Pure.
 */
export function ladderHorizonVerdict(input: {
  readonly chase: ContactLadderChase;
  readonly runDay: number;
  readonly paused: boolean;
}): 'skipped:past_horizon' | 'skipped:paused' | null {
  const past = input.chase === 'correction' ? input.runDay >= CORRECTION_RUN_HORIZON_DAYS : input.runDay > CERTIFICATE_RUN_HORIZON_DAYS;
  if (past) return 'skipped:past_horizon';
  if (input.paused) return 'skipped:paused';
  return null;
}

// ── The WhatsApp step (Story 6.37d — WS6, WS7, WS9, WS10; I2, I3, I10) — ONE function ──────────────────────────

/** `-350` ruling 2 (1) — the WhatsApp is due this many hours after the origin text (`-368` Q1 A — in the daytime). */
export const LADDER_WHATSAPP_AFTER_HOURS = 4;

/** WS6 — the step is due at the ORIGIN row's `created_at` + 4 h (T5 — it never moves; ⛔ `claimed_at`, ⛔ `sent_on`). Pure. */
export function ladderWhatsappDueAt(originCreatedAt: Date): Date {
  return new Date(originCreatedAt.getTime() + LADDER_WHATSAPP_AFTER_HOURS * 3_600_000);
}

/**
 * WS9 — what the Pariwar's WhatsApp configuration says: `ok`, or why ⛔. `whatsapp_not_configured` (the switch off, ⛔
 * phone number, ⛔ template name set — a Pariwar that has not gone live: ⛔ alarm); the other three are FAULTS (an
 * unreadable key or secret, a malformed template name, an unreadable / unsendable helpline) — skipped AND alarmed (I10).
 */
export type LadderWhatsappConfigVerdict =
  | 'ok'
  | 'whatsapp_not_configured'
  | 'whatsapp_config_unreadable'
  | 'whatsapp_template_invalid'
  | 'helpline_unreadable';

/** The config verdicts that are FAULTS — each skip raises `contact_ladder.whatsapp_config_fault` (I10). */
export const LADDER_WHATSAPP_CONFIG_FAULTS: readonly LadderWhatsappConfigVerdict[] = [
  'whatsapp_config_unreadable',
  'whatsapp_template_invalid',
  'helpline_unreadable',
];

export type LadderWhatsappVerdict =
  | { readonly kind: 'send' }
  /** ⛔ Due yet (before origin + 4 h) — ⛔ write; a later tick takes it. */
  | { readonly kind: 'wait'; readonly until: Date }
  /** Outside 09:00–20:00 IST — ⛔ write; the child re-enqueues itself for `until` (the next 09:00). */
  | { readonly kind: 'defer'; readonly until: Date }
  /** The step is RECORDED `skipped:<reason>` (a `[a-z_]` word — the step CHECK) and the ladder goes on to SMS 2 (I10). */
  | { readonly kind: 'skip'; readonly reason: string };

/**
 * ⭐ WHETHER THE CLAIMANT'S WHATSAPP STEP SENDS NOW, in this order (AC5 (2) — the caller has ALREADY asked
 * `ladderEndReason` and the chase's stop predicate: an end or a stop ENDS the ladder and records nothing for the step):
 * the anchor unknown ⇒ `skip anchor_unknown`; a STOP from that number in this Pariwar (WS10) ⇒ `skip stopped`; ⛔ a
 * WhatsApp basis (I2 — the reader's reason: `not_live`, `old_wording`, `unknown_version`, `hindi_not_reviewed`,
 * `claimant_changed` — Review R3) ⇒ `skip <reason>`; past the chase's horizon / paused (WS7) ⇒ that skip; SMS 2 already
 * resolved ⇒ `skip overtaken` (⛔ a
 * WhatsApp after the second text — WS6); before origin + 4 h ⇒ `wait`; outside 09:00–20:00 IST ⇒ `defer` to the next
 * 09:00 (`inWindow` / `nextWindowStart` are INPUTS — the jobs compute them with `isInPeerRequestSendWindow`; T12); THEN
 * the config verdict (⛔ `ok` ⇒ `skip <verdict>`); else `send`. ⛔ The one-text-a-day check (F20 — a WhatsApp is ⛔ a
 * text). Pure.
 */
export function ladderWhatsappGate(input: {
  readonly originCreatedAt: Date | null;
  readonly now: Date;
  readonly inWindow: boolean;
  readonly nextWindowStart: Date;
  readonly sms2State: ContactLadderStepState;
  readonly horizon: { readonly chase: ContactLadderChase; readonly runDay: number; readonly paused: boolean };
  readonly stopped: boolean;
  readonly basis: ClaimantWhatsappBasis;
  readonly config: LadderWhatsappConfigVerdict;
}): LadderWhatsappVerdict {
  if (input.originCreatedAt === null) return { kind: 'skip', reason: 'anchor_unknown' };
  if (input.stopped) return { kind: 'skip', reason: 'stopped' };
  if (!input.basis.eligible) return { kind: 'skip', reason: input.basis.reason };
  const limit = ladderHorizonVerdict(input.horizon);
  if (limit !== null) return { kind: 'skip', reason: limit.slice('skipped:'.length) };
  if (input.sms2State !== 'pending') return { kind: 'skip', reason: 'overtaken' };
  const dueAt = ladderWhatsappDueAt(input.originCreatedAt);
  if (input.now.getTime() < dueAt.getTime()) return { kind: 'wait', until: dueAt };
  if (!input.inWindow) return { kind: 'defer', until: input.nextWindowStart };
  if (input.config !== 'ok') return { kind: 'skip', reason: input.config };
  return { kind: 'send' };
}

/** The step of a RUNNING ladder that is DUE today (⛔ more than one per run), or `null`. Pure. */
export function dueLadderStep(
  ladder: {
    readonly state: ContactLadderState;
    readonly sms2DueOn: string;
    readonly sms2State: ContactLadderStepState;
    readonly sms3DueOn: string | null;
    readonly sms3State: ContactLadderStepState;
    readonly concludeOn: string | null;
  },
  today: string,
): 2 | 3 | 'conclude' | null {
  // Review P9 — the step columns alone are ⛔ enough: an ended/concluded ladder's sms2/sms3 may still read `pending`
  // if it ended before reaching that step (`ended_delivered` / `ended_call` / `ended_number_changed` / `ended_stopped`).
  if (ladder.state !== 'running') return null;
  if (ladder.sms2State === 'pending') return ladder.sms2DueOn <= today ? 2 : null;
  if (ladder.sms3State === 'pending') return ladder.sms3DueOn !== null && ladder.sms3DueOn <= today ? 3 : null;
  return ladder.concludeOn !== null && ladder.concludeOn <= today ? 'conclude' : null;
}

// ── The ask (LD9, LD11) ────────────────────────────────────────────────────────────────────────────────────────

export const CONTACT_LADDER_ASKS = ['call_or_letter', 'call', 'letter', 'none'] as const;
export type ContactLadderAsk = (typeof CONTACT_LADDER_ASKS)[number];

/**
 * ⭐ THE CAP-AWARE ASK on a conclusion (`-351` 5 A *"asked to call or post the letter"*): a call is possible unless the
 * person is a NOMINEE and nominee calls are ⛔ cleared (`-354` decision 5 — G1; LD11's ONE switch, passed in by the
 * apps — ⛔ read here); a letter is possible unless the person is at the chase's letter cap (correction: 2 per person
 * per return; certificate: one per claim, ever). Both ⇒ `call_or_letter`; one ⇒ it; neither ⇒ `none` ("neither is
 * possible — escalate"). Pure.
 */
export function ladderAsk(input: {
  readonly role: 'nominee' | 'claimant';
  readonly letterCapReached: boolean;
  readonly nomineeCallsCleared: boolean;
}): ContactLadderAsk {
  const call = input.role === 'claimant' || input.nomineeCallsCleared;
  const letter = !input.letterCapReached;
  if (call && letter) return 'call_or_letter';
  if (call) return 'call';
  if (letter) return 'letter';
  return 'none';
}

/**
 * `2026-10-18-363` decision 1 — THE ONE RULE: a call recorded `reached` answers a concluded ladder's ask only when it
 * was MADE (`called_on`) on or after that ladder's `origin_sent_on` (the IST date of the failed text that started it).
 * When it was RECORDED does ⛔ matter: a historical call logged late counts iff its date is on/after the origin; a call
 * that ended an EARLIER ladder answers ⛔ a later one. Shared by the staff view (`pendingLadderAsk`) and the letter-chase
 * stop (`reachedCallSince`) — ⛔ two rules (round 2 D1). Pure.
 */
export function callAnswersLadder(call: LadderCallFact, originSentOn: string): boolean {
  return call.outcome === 'reached' && call.calledOn >= originSentOn;
}

/**
 * LD9 as narrowed by `2026-10-18-363` decision 1 — the EARLIEST `called_on` of a call recorded `reached` for the person
 * on or after the CONCLUDED ladder's `originSentOn` (`callAnswersLadder`), or `null` (and `null` for a `null` origin —
 * ⛔ concluded ladder). It stops the staff letter-chase asks ONLY for a CONCLUDED person (`deadKind 'not_delivered'`) —
 * the caller checks that and passes that person's latest concluded ladder's origin date. Pure.
 */
export function reachedCallSince(calls: readonly LadderCallFact[], originSentOn: string | null): string | null {
  if (originSentOn === null) return null;
  return (
    calls
      .filter((c) => callAnswersLadder(c, originSentOn))
      .map((c) => c.calledOn)
      .sort()[0] ?? null
  );
}

// ── What staff see (LD12) — PURE ───────────────────────────────────────────────────────────────────────────────

/** The person's latest follow-up on the staff views. ⚠ LOCKSTEP with the contracts' `CONTACT_LADDER_FOLLOW_UP_STATES`. */
export const CONTACT_LADDER_FOLLOW_UP_STATES = ['running', 'concluded', 'ended_delivered', 'ended_call', 'ended_other'] as const;
export type ContactLadderFollowUpState = (typeof CONTACT_LADDER_FOLLOW_UP_STATES)[number];

export interface ContactLadderFollowUp {
  readonly state: ContactLadderFollowUpState;
  /** The IST date the follow-up started. */
  readonly startedOn: string;
  /** A running follow-up's next date (its next text, or its conclusion date); `null` otherwise. */
  readonly nextStepOn: string | null;
  readonly concludedOn: string | null;
  /**
   * Story 6.37d (WS13) — the channel that got through when the follow-up ended `ended_delivered`: `'whatsapp'` (the ladder's
   * claim WhatsApp was delivered — `end_detail` `delivered:whatsapp`) or `'text'`; `null` for every other state.
   */
  readonly deliveredBy: 'text' | 'whatsapp' | null;
}

/** A ladder as the staff views read it. */
export interface LadderViewFact {
  readonly state: ContactLadderState;
  readonly createdAt: Date;
  readonly endedAt: Date | null;
  /** The IST date of the failed text that started the ladder — the ask's call window (`-363` decision 1). */
  readonly originSentOn: string;
  readonly sms2DueOn: string;
  readonly sms2State: ContactLadderStepState;
  readonly sms3DueOn: string | null;
  readonly sms3State: ContactLadderStepState;
  readonly concludeOn: string | null;
  readonly concludedOn: string | null;
  /** Story 6.37d (WS13) — why it ended (`delivered`, `delivered:whatsapp`, `stopped:<reason>`, …), or `null`. */
  readonly endDetail: string | null;
}

/** The LATEST of a person's ladders (by start), or `undefined`. Pure. */
export function latestLadder<L extends Pick<LadderViewFact, 'createdAt'>>(ladders: readonly L[]): L | undefined {
  return [...ladders].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).at(-1);
}

/** LD12 — the person's latest follow-up as staff see it, or `null` (⛔ ladder). Pure. */
export function ladderFollowUpOf(ladders: readonly LadderViewFact[]): ContactLadderFollowUp | null {
  const l = latestLadder(ladders);
  if (l === undefined) return null;
  const state: ContactLadderFollowUpState =
    l.state === 'running'
      ? 'running'
      : l.state === 'concluded_undelivered'
        ? 'concluded'
        : l.state === 'ended_delivered' || l.state === 'ended_call'
          ? l.state
          : 'ended_other';
  const nextStepOn =
    l.state !== 'running' ? null : l.sms2State === 'pending' ? l.sms2DueOn : l.sms3State === 'pending' ? l.sms3DueOn : l.concludeOn;
  const deliveredBy = l.state !== 'ended_delivered' ? null : l.endDetail === 'delivered:whatsapp' ? 'whatsapp' : 'text';
  return { state, startedOn: istDateOf(l.createdAt), nextStepOn, concludedOn: l.concludedOn, deliveredBy };
}

/**
 * LD9 / LD12 — the call-or-letter ask STILL OPEN for the person, or `null`: their latest ladder CONCLUDED and ⛔ answered
 * since — ⛔ a call recorded `reached` MADE on or after that ladder's origin date (`callAnswersLadder` — `-363`
 * decision 1: the same rule as the letter-chase stop), ⛔ a letter recorded after its conclusion. Cap-aware through
 * `ladderAsk`. Pure.
 */
export function pendingLadderAsk(input: {
  readonly ladders: readonly LadderViewFact[];
  readonly calls: readonly LadderCallFact[];
  /** When the person's letters were recorded (`created_at`). */
  readonly letterRecordedAt: readonly Date[];
  readonly role: 'nominee' | 'claimant';
  readonly letterCapReached: boolean;
  readonly nomineeCallsCleared: boolean;
}): ContactLadderAsk | null {
  const l = latestLadder(input.ladders);
  if (l === undefined || l.state !== 'concluded_undelivered' || l.endedAt === null) return null;
  const since = l.endedAt.getTime();
  if (input.calls.some((c) => callAnswersLadder(c, l.originSentOn))) return null;
  if (input.letterRecordedAt.some((d) => d.getTime() >= since)) return null;
  return ladderAsk(input);
}

/** LD12 — why a person reads unreachable: a number REFUSED at send, or a reminder NOT DELIVERED (a concluded ladder). Pure. */
export function unreachableReasonOf(deadKind: 'dead' | 'unreachable' | 'not_delivered' | null): 'refused' | 'not_delivered' | null {
  return deadKind === null ? null : deadKind === 'not_delivered' ? 'not_delivered' : 'refused';
}
