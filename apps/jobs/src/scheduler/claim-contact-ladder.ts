// The DELIVERY LADDER — the daily SWEEP and the two ladder-SMS CHILDREN — Story 6.37c (Tasks 4.2, 8; AC1–AC6, AC11;
// `2026-10-17-350` rulings 1–2, `-351` 1 A / 3 B / 4 A / 5 A / 6 A, `2026-10-18-355` LD3–LD9, LD11, LD13; `-360`
// PQ1–PQ3 A).
//
// ── What runs when ────────────────────────────────────────────────────────────────────────────────────────────
// ⭐ The SWEEP (daily 10:00 IST — `-250` #5's hour, the chases' own cron) FIRST refuses to run when the pool's role cannot
// read across Pariwars (`canReadAcrossPariwars` — under an RLS-bound role its cross-tenant scan would see ⛔ row and ⛔
// ladder would ever start: every reported failure would keep counting as reached, the gap `-350` closed — T24). Then,
// per chase (correction, certificate), it pages the CANDIDATE claims (a `family_sms` row accepted within 14 days and
// REPORTED undelivered; a RUNNING ladder; a recent ask) and, per claim, in ONE scope transaction under the chase's OWN
// lock (`acquireCorrectionChaseLock` — the closure request / decide's lock; `lockCertificateClaim`):
//   · each RUNNING ladder: the ends (`ladderEndReason` — a delivered message, a reached call, a number change, a stop);
//     a `satisfied` step's scheduled row found (or ⛔ — `skipped:scheduled_not_sent` + alarm); the DUE step through the
//     step gate (`ladderStepGate` — ⛔ past the reminders' end, ⛔ in a pause, a scheduled day IS the step, ⛔ two texts to
//     one number in one chase today) — a step to SEND is a CHILD; on its date it CONCLUDES and writes ONE ask
//     (`ladder_escalation`) to the District Admin;
//   · the STARTS (`planLadderStart` — the earliest reported failure of the person's current number that nothing covers).
// ⭐ The CHILD (one ladder SMS): the re-check + the `ladder_sms` row claimed in ONE transaction under the chase's lock
// (`begin*LadderSend`), COMMIT, then decrypt → send through the chase's OWN `sendClaimCorrectionSms` (the chase's
// approved reminder — ⛔ a new template; the CRQID `cr` / `ce` + the row's own id, so 6.37b's reports reach it) →
// compare-and-set. It throws ONLY on a transient failure.
// ⛔ WhatsApp (I7 — the step is RECORDED skipped). ⛔ NOTHING here approves, refuses or closes a claim. ⛔ No number or
// name in a payload, a log line or an alarm — ids only. ⚠ Every alarm reaches the LOGS only until roster Row 32 (h)
// wires `onAlarm` to a named person — and Row 32 (h) closed is a GO-LIVE condition of this ladder (`-354` decision 4 (b)).

import { claim as claimDomain, cycleCalendar, ids, smsDelivery, withPariwarScope, type Db } from '@twt/domain';
import { QUEUE_NAMES, type Job, type JobEnvelope, type QueueClient } from '@twt/queue';
import type pg from 'pg';

import {
  CHILD_RETRY_DELAY_SECONDS,
  CHILD_RETRY_LIMIT,
  CLAIM_CORRECTION_TZ,
  CORRECTION_PLAN_LOCK_TIMEOUT,
  CORRECTION_PLAN_STATEMENT_TIMEOUT,
  CORRECTION_PUSH_RETRY,
  CORRECTION_SWEEP_EXPIRE_SECONDS,
  CORRECTION_SWEEP_RETRY,
  ClaimCorrectionTransientError,
  sendClaimCorrectionSms,
  type ClaimCorrectionReminderDeps,
  type CorrectionChildAttempt,
  type CorrectionStaffPushPayload,
} from './claim-correction-reminders.js';
import { CLAIM_CORRECTION_SMS_TEMPLATES } from './claim-correction-sms-templates.js';
import { helplineNotCallbackNumberWarning, preflightWarningMessage } from './claim-dlt-sms-send.js';

// ── Deps + payloads ────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The ladder's deps — the chases' own (the send, the KMS deps, the pool) + LD11's ONE switch, read at BOOT
 * (`CLAIM_NOMINEE_CALLS_CLEARED`) and passed in: ⛔ read under `packages/domain/src/claim`.
 */
export type ContactLadderDeps = Omit<ClaimCorrectionReminderDeps, 'push'> & {
  /** `-354` decision 5 — a call to a NOMINEE waits for G1 (roster Row 34). `false` ⇒ a nominee's ask is "post a letter". */
  readonly nomineeCallsCleared: boolean;
};

/** One ladder SMS — ids and dates ONLY (⛔ a number, a name, an address). */
export interface LadderSmsPayload {
  readonly ladderId: string;
  readonly claimCaseId: string;
  readonly step: 2 | 3;
  /** The IST date the sweep enqueued it for (the step's `sent_on`). */
  readonly sentOn: string;
}

export interface ContactLadderSweepResult {
  readonly refused: boolean;
  readonly scannedClaims: number;
  readonly started: number;
  readonly endedDelivered: number;
  readonly endedCall: number;
  readonly endedOther: number;
  readonly concluded: number;
  readonly enqueuedSms: number;
  readonly enqueuedPushes: number;
  readonly timedOutClaims: number;
}

type EnqueueBoss = Pick<QueueClient, 'send'>;

function alarmOf(deps: Pick<ContactLadderDeps, 'onAlarm'>): (m: string) => void {
  return deps.onAlarm ?? ((m: string): void => console.warn(m));
}

/** The SQLSTATEs of the plan's two timeouts. Review P14 — walks the FULL `.cause` chain, ⛔ one level only. */
function isPlanTimeout(err: unknown): boolean {
  const codeOf = (e: unknown): unknown => (typeof e === 'object' && e !== null ? (e as { readonly code?: unknown }).code : undefined);
  const causeOf = (e: unknown): unknown => (typeof e === 'object' && e !== null ? (e as { readonly cause?: unknown }).cause : undefined);
  let e: unknown = err;
  const seen = new Set<unknown>();
  while (e !== undefined && e !== null && !seen.has(e)) {
    const code = codeOf(e);
    if (code === '55P03' || code === '57014') return true;
    seen.add(e);
    e = causeOf(e);
  }
  return false;
}

const ALARM_SAMPLE_IDS = 5;
function sampleIds(list: readonly string[]): string {
  const shown = list.slice(0, ALARM_SAMPLE_IDS).join(', ');
  return list.length > ALARM_SAMPLE_IDS ? `${shown} (+${String(list.length - ALARM_SAMPLE_IDS)} more)` : shown;
}

/** Round-2 P25 — a claim id listed ONCE in an alarm (a claim can add itself per person and per ladder step). */
function uniqueIds(list: readonly string[]): string[] {
  return [...new Set(list)];
}

/** The candidate scan's PAGE size. */
export const CONTACT_LADDER_PAGE_SIZE = 500;
/** The HARD bound on candidate claims one tick visits (hitting it is ALARMED). */
export const CONTACT_LADDER_MAX_CLAIMS = 20_000;

// ── Per-tick counters ──────────────────────────────────────────────────────────────────────────────────────────

interface Tally {
  started: number;
  endedDelivered: number;
  endedCall: number;
  endedOther: number;
  concluded: number;
  readonly startedByPariwar: Map<string, number>;
  readonly hashUnavailableClaims: string[];
  readonly scheduledNotSentClaims: string[];
  readonly unassignedClaims: string[];
}

function newTally(): Tally {
  return {
    started: 0,
    endedDelivered: 0,
    endedCall: 0,
    endedOther: 0,
    concluded: 0,
    startedByPariwar: new Map(),
    hashUnavailableClaims: [],
    scheduledNotSentClaims: [],
    unassignedClaims: [],
  };
}

/** Round-2 P25 — a claim's own tally is merged ONLY once its plan returned (its transaction COMMITTED): ⛔ rolled-back work. */
function mergeTally(into: Tally, from: Tally): void {
  into.started += from.started;
  into.endedDelivered += from.endedDelivered;
  into.endedCall += from.endedCall;
  into.endedOther += from.endedOther;
  into.concluded += from.concluded;
  for (const [k, n] of from.startedByPariwar) into.startedByPariwar.set(k, (into.startedByPariwar.get(k) ?? 0) + n);
  into.hashUnavailableClaims.push(...from.hashUnavailableClaims);
  into.scheduledNotSentClaims.push(...from.scheduledNotSentClaims);
  into.unassignedClaims.push(...from.unassignedClaims);
}

function countEnd(t: Tally, state: string): void {
  if (state === 'ended_delivered') t.endedDelivered += 1;
  else if (state === 'ended_call') t.endedCall += 1;
  else t.endedOther += 1;
}

interface ClaimPlan {
  readonly sms: LadderSmsPayload[];
  readonly pushes: CorrectionStaffPushPayload[];
}

// ── The SWEEP ──────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * ⭐ THE DAILY LADDER SWEEP. See the module header. A per-claim try/catch — one claim's failure never costs another its
 * follow-up; the next tick retries it.
 */
export async function runContactLadderSweep(deps: ContactLadderDeps, boss: EnqueueBoss): Promise<ContactLadderSweepResult> {
  const alarm = alarmOf(deps);
  const now = deps.now?.() ?? new Date();
  const today = cycleCalendar.istDateOf(now);
  const allow: string[] | null = deps.pariwarAllowlist ? [...deps.pariwarAllowlist] : null;
  const empty: ContactLadderSweepResult = {
    refused: true,
    scannedClaims: 0,
    started: 0,
    endedDelivered: 0,
    endedCall: 0,
    endedOther: 0,
    concluded: 0,
    enqueuedSms: 0,
    enqueuedPushes: 0,
    timedOutClaims: 0,
  };
  if (allow !== null && process.env['NODE_ENV'] === 'production') {
    alarm('[jobs] contact-ladder: REFUSED — `pariwarAllowlist` is set while NODE_ENV is production (it is test-only); nothing was swept');
    return empty;
  }
  if (allow !== null && allow.length === 0) {
    alarm('[jobs] contact-ladder: REFUSED — `pariwarAllowlist` is EMPTY (it would sweep ⛔ no tenant); nothing was swept');
    return empty;
  }
  // ⭐ T24 — under an RLS-bound role every cross-tenant read returns ⛔ row SILENTLY: ⛔ ladder would ever start. Refuse.
  if (!(await smsDelivery.canReadAcrossPariwars(deps.pool))) {
    alarm(
      '[jobs] contact-ladder: contact_ladder.rls_bound_role — the pool role cannot read across Pariwars (roster Row 26); ' +
        '⛔ swept — every reported-undelivered reminder keeps counting as reaching the family until it can',
    );
    return empty;
  }

  const tally = newTally();
  let scannedClaims = 0;
  let enqueuedSms = 0;
  let enqueuedPushes = 0;
  let bounded = false;
  const timedOut: string[] = [];
  const since = cycleCalendar.addCalendarDays(today, -claimDomain.CONTACT_LADDER_SCAN_DAYS);

  for (const chase of ['correction', 'certificate'] as const) {
    let cursor: string | null = null;
    pages: for (;;) {
      const page = await listLadderCandidateClaims(deps.pool, { chase, since, after: cursor, limit: CONTACT_LADDER_PAGE_SIZE, allow });
      for (const row of page) {
        if (scannedClaims >= CONTACT_LADDER_MAX_CLAIMS) {
          bounded = true;
          break pages;
        }
        scannedClaims += 1;
        try {
          const claimTally = newTally();
          const plan =
            chase === 'correction'
              ? await withPariwarScope(deps.pool, row.pariwarId, (db: Db, client) => planCorrectionLadders(deps, db, client, row, today, claimTally))
              : await planCertificateLadders(deps, row, today, claimTally);
          mergeTally(tally, claimTally);
          for (const sms of plan.sms) {
            try {
              await boss.send(
                chase === 'correction' ? QUEUE_NAMES.CLAIM_CORRECTION_LADDER_SMS : QUEUE_NAMES.CLAIM_CERTIFICATE_LADDER_SMS,
                {
                  pariwarId: row.pariwarId,
                  requestId: `claim.contact_ladder:${sms.ladderId}:${today}`,
                  actorId: null,
                  traceId: `claim.contact_ladder:${sms.ladderId}:${today}`,
                  payload: sms,
                } satisfies JobEnvelope<LadderSmsPayload>,
                {
                  // ⚠ A LABEL only — the table (the per-ladder partial UNIQUE) is the dedup.
                  singletonKey: `${sms.ladderId}:${String(sms.step)}`,
                  retryLimit: CHILD_RETRY_LIMIT,
                  retryDelay: CHILD_RETRY_DELAY_SECONDS,
                  retryBackoff: true,
                },
              );
              enqueuedSms += 1;
            } catch (err) {
              alarm(`[jobs] contact-ladder: failed to enqueue a ladder SMS for claim ${row.claimCaseId} — ${String(err)}`);
            }
          }
          for (const push of plan.pushes) {
            try {
              await boss.send(
                QUEUE_NAMES.CLAIM_CORRECTION_STAFF_PUSH,
                {
                  pariwarId: row.pariwarId,
                  requestId: `claim.contact_ladder:${push.claimCaseId}:${today}`,
                  actorId: null,
                  traceId: `claim.contact_ladder:${push.claimCaseId}:${today}`,
                  payload: push,
                } satisfies JobEnvelope<CorrectionStaffPushPayload>,
                { singletonKey: `${push.claimCaseId}:${push.userId}:${push.sentOn}`, ...CORRECTION_PUSH_RETRY },
              );
              enqueuedPushes += 1;
            } catch (err) {
              alarm(`[jobs] contact-ladder: failed to enqueue a staff push for claim ${row.claimCaseId} — ${String(err)}`);
            }
          }
        } catch (err) {
          if (isPlanTimeout(err)) timedOut.push(row.claimCaseId);
          else alarm(`[jobs] contact-ladder: ${chase} claim ${row.claimCaseId} failed — ${String(err)}`);
        }
      }
      if (page.length < CONTACT_LADDER_PAGE_SIZE) break;
      cursor = page[page.length - 1]!.claimCaseId;
    }
  }

  // ── LD13 — the alarms (ids only) and the daily line (⛔ id) ──
  // Round-2 P25 — AC11's burst is per Pariwar per IST DAY, ⛔ per run: the day's count is read from the table (a retried
  // or second run the same day adds to it), and the alarm fires on the run whose starts CROSS the threshold — once a day.
  if (tally.startedByPariwar.size > 0) {
    // A failed count ⛔ fails the tick (its work is committed — a retry would start nothing and alarm nothing): it falls
    // back to this run's own starts, and says so.
    const dayCounts = await laddersStartedToday(deps.pool, [...tally.startedByPariwar.keys()]).catch((err: unknown) => {
      alarm(`[jobs] contact-ladder: the day's ladder-start count could not be read — the burst check used this run's starts only (${String(err)})`);
      return new Map<string, number>();
    });
    for (const [pariwarId, mine] of tally.startedByPariwar) {
      const n = Math.max(dayCounts.get(pariwarId) ?? 0, mine);
      if (n >= claimDomain.CONTACT_LADDER_BURST_THRESHOLD && n - mine < claimDomain.CONTACT_LADDER_BURST_THRESHOLD) {
        alarm(
          `[jobs] contact-ladder: contact_ladder.burst:${String(n)} — ${String(n)} ladders started today in Pariwar ${pariwarId} ` +
            '(a DLT scrub or template fault fails every text — check the delivery reports before the follow-ups go)',
        );
      }
    }
  }
  const hashUnavailable = uniqueIds(tally.hashUnavailableClaims);
  if (hashUnavailable.length > 0) {
    alarm(
      `[jobs] contact-ladder: contact_ladder.hash_unavailable — a person's current number could not be hashed on ` +
        `${String(hashUnavailable.length)} claim(s) (claims: ${sampleIds(hashUnavailable)})`,
    );
  }
  const scheduledNotSent = uniqueIds(tally.scheduledNotSentClaims);
  if (scheduledNotSent.length > 0) {
    alarm(
      `[jobs] contact-ladder: contact_ladder.scheduled_not_sent — a follow-up step was a scheduled reminder that never ` +
        `went, on ${String(scheduledNotSent.length)} claim(s) (claims: ${sampleIds(scheduledNotSent)})`,
    );
  }
  const unassigned = uniqueIds(tally.unassignedClaims);
  if (unassigned.length > 0) {
    alarm(
      `[jobs] contact-ladder: contact_ladder.escalation_unassigned — a concluded follow-up's call-or-letter ask has ⛔ live ` +
        `shepherd on ${String(unassigned.length)} claim(s) (claims: ${sampleIds(unassigned)})`,
    );
  }
  if (timedOut.length > 0) {
    alarm(
      `[jobs] contact-ladder: ${String(timedOut.length)} claim(s) hit the plan's lock_timeout (${CORRECTION_PLAN_LOCK_TIMEOUT}) ` +
        `or statement_timeout and were ⛔ NOT swept today (claims: ${sampleIds(timedOut)})`,
    );
  }
  if (bounded) alarm(`[jobs] contact-ladder: hit the hard bound of ${String(CONTACT_LADDER_MAX_CLAIMS)} claims — the rest were ⛔ NOT swept today`);
  console.info(
    `[jobs] contact-ladder: started ${String(tally.started)}, ended_delivered ${String(tally.endedDelivered)}, ` +
      `ended_call ${String(tally.endedCall)}, ended_other ${String(tally.endedOther)}, concluded ${String(tally.concluded)}, ` +
      `enqueued_pushes ${String(enqueuedPushes)}, timed_out_claims ${String(timedOut.length)}`,
  );
  return {
    refused: false,
    scannedClaims,
    started: tally.started,
    endedDelivered: tally.endedDelivered,
    endedCall: tally.endedCall,
    endedOther: tally.endedOther,
    concluded: tally.concluded,
    enqueuedSms,
    enqueuedPushes,
    timedOutClaims: timedOut.length,
  };
}

/**
 * ⚠ CROSS-TENANT — the BYPASSRLS pool only (the sweep checked it first). Round-2 P25 — the ladders STARTED today per
 * Pariwar (both chases), for AC11's per-day burst count: the IST day of the DATABASE clock — the clock `created_at` is
 * written by (⛔ the sweep's `now`, which only a test moves). Ids and counts only.
 */
async function laddersStartedToday(pool: pg.Pool, pariwarIds: readonly string[]): Promise<Map<string, number>> {
  const { rows } = await pool.query<{ pariwar_id: string; n: string }>(
    `SELECT pariwar_id, count(*) AS n FROM claim_contact_ladders
      WHERE pariwar_id = ANY($1::uuid[])
        AND created_at >= date_trunc('day', now() AT TIME ZONE '${CLAIM_CORRECTION_TZ}') AT TIME ZONE '${CLAIM_CORRECTION_TZ}'
      GROUP BY pariwar_id`,
    [pariwarIds],
  );
  return new Map(rows.map((r) => [r.pariwar_id, Number(r.n)]));
}

/**
 * ⚠ CROSS-TENANT — the BYPASSRLS pool only (the sweep checked it first). The candidate claims of ONE chase: a
 * `family_sms` row accepted since `since` and REPORTED undelivered (6.37b's record — joined on its `pariwar_id`, T12), a
 * RUNNING ladder, or an ask written since `since` (its push may still be owed). A `MATERIALIZED` CTE under the page's
 * LIMIT ([[project_in_subquery_limit_skip_locked_overclaim]]); keyset on `claim_case_id`.
 */
async function listLadderCandidateClaims(
  pool: pg.Pool,
  input: { readonly chase: 'correction' | 'certificate'; readonly since: string; readonly after: string | null; readonly limit: number; readonly allow: readonly string[] | null },
): Promise<{ readonly claimCaseId: string; readonly pariwarId: string }[]> {
  const table = input.chase === 'correction' ? 'claim_correction_reminders' : 'claim_certificate_reminders';
  const kind = input.chase === 'correction' ? 'cr' : 'ce';
  const { rows } = await pool.query<{ claim_case_id: string; pariwar_id: string }>(
    `WITH c AS MATERIALIZED (
       SELECT r.claim_case_id, r.pariwar_id FROM ${table} r
         JOIN sms_send_deliveries d ON d.send_kind = $1 AND d.send_row_id = r.reminder_id AND d.pariwar_id = r.pariwar_id
        WHERE r.purpose = 'family_sms' AND r.outcome = 'accepted' AND r.sent_on >= $2::date AND d.delivery_state = 'undelivered'
       UNION
       SELECT l.claim_case_id, l.pariwar_id FROM claim_contact_ladders l
        WHERE l.chase = $3 AND (l.state = 'running' OR l.escalated_on >= $2::date)
     )
     SELECT claim_case_id, pariwar_id FROM c
      WHERE ($4::uuid IS NULL OR claim_case_id > $4::uuid)
        AND ($6::uuid[] IS NULL OR pariwar_id = ANY($6::uuid[]))
      ORDER BY claim_case_id ASC
      LIMIT $5`,
    [kind, input.since, input.chase, input.after, input.limit, input.allow === null ? null : [...input.allow]],
  );
  return rows.map((r) => ({ claimCaseId: r.claim_case_id, pariwarId: r.pariwar_id }));
}

// ── The correction plan (under the TRUSTEE lock) ───────────────────────────────────────────────────────────────

/** The person's current number as the ladder reads it: a hash, `null` (⛔ sendable number), or `undefined` (⛔ known). */
function knownCurrentHash(s: claimDomain.ReturnPersonState | undefined): string | null | undefined {
  if (s === undefined || s.hashFailed === true) return undefined;
  if (s.currentNumberHash !== undefined) return s.currentNumberHash;
  // The version-unchanged convention: the epoch's last row's number stands (F6 — ⛔ a KMS call per person per day).
  return s.track.epochRows.at(-1)?.recipientNumberHash ?? undefined;
}

/**
 * Plan ONE claim's CORRECTION ladders for today, inside its scope transaction, under the trustee lock (the closure
 * request / decide's lock — LD5). Returns the ladder SMS to enqueue and any staff push owed for an ask on an ENDED run.
 */
async function planCorrectionLadders(
  deps: ContactLadderDeps,
  db: Db,
  client: pg.PoolClient,
  row: { readonly claimCaseId: string; readonly pariwarId: string },
  today: string,
  tally: Tally,
): Promise<ClaimPlan> {
  const pariwarId = ids.pariwarId(row.pariwarId);
  const claimCaseId = ids.claimId(row.claimCaseId);
  const alarm = alarmOf(deps);
  const sms: LadderSmsPayload[] = [];
  const pushes: CorrectionStaffPushPayload[] = [];
  await client.query(`SET LOCAL lock_timeout = '${CORRECTION_PLAN_LOCK_TIMEOUT}'`);
  await client.query(`SET LOCAL statement_timeout = '${CORRECTION_PLAN_STATEMENT_TIMEOUT}'`);
  await claimDomain.acquireCorrectionChaseLock(client, row.pariwarId, row.claimCaseId);

  const ret = await claimDomain.getLiveCorrectionReturn(db, pariwarId, claimCaseId);
  // A running ladder of a return that is no longer live ⇒ `ended_stopped:return_superseded` (its stops would say so).
  for (const l of await claimDomain.readClaimLadders(db, pariwarId, claimCaseId, 'correction')) {
    if (l.state === 'running' && (!ret || l.returnDecisionId !== ret.decisionId)) {
      if (await claimDomain.endContactLadder(db, { pariwarId, ladderId: l.ladderId, state: 'ended_stopped', detail: 'stopped:return_superseded' })) {
        countEnd(tally, 'ended_stopped');
      }
    }
  }
  if (!ret) return { sms, pushes };
  const returnDecisionId = ret.decisionId;
  const recipients = await claimDomain.readCorrectionRecipients(db, pariwarId, claimCaseId);
  const people = recipients.cannotRemind === null ? recipients.people : [];
  const states = await claimDomain.readReturnPersonStates(db, pariwarId, { claimCaseId, returnDecisionId }, people, {
    crypto: deps.encryption,
  });
  const stateOf = (personKey: string) => states.find((s) => s.person.personKey === personKey);
  const shepherd = await claimDomain.getLiveShepherd(db, pariwarId, claimCaseId);
  const daKey = shepherd ? `staff:${shepherd.shepherdActorId}` : 'staff:unassigned';
  const calls = await claimDomain.readClaimContactCalls(db, pariwarId, claimCaseId);
  const callsOf = (personKey: string) => calls.filter((c) => c.personKey === personKey);
  const read = async () => ({
    ladders: await claimDomain.readClaimLadders(db, pariwarId, claimCaseId, 'correction', returnDecisionId),
    rows: await claimDomain.readReturnFamilyRows(db, pariwarId, claimCaseId, returnDecisionId),
    ladderRows: await claimDomain.readReturnLadderSmsRows(db, pariwarId, claimCaseId, returnDecisionId),
  });
  let facts = await read();
  const origins = await claimDomain.readLadderOriginCreatedAt(db, pariwarId, 'correction', facts.ladders.map((l) => l.originRowId));

  /** The EXTRACTED stops for the ladder's / a row's run (I6) — a hash fault is ⛔ a stop (its own outcome). */
  const stopOf = async (runId: string, personKey: string): Promise<{ readonly stop: string | null; readonly hashFailed: boolean }> => {
    try {
      const check = await claimDomain.correctionFamilyStopReason(db, {
        pariwarId,
        claimCaseId,
        runId,
        personKey,
        crypto: deps.encryption,
        forLadder: true,
      });
      return { stop: check.stop, hashFailed: check.stop === null && check.personState.hashFailed === true };
    } catch (err) {
      if (err instanceof claimDomain.CorrectionNumberHashUnavailableError) return { stop: null, hashFailed: true };
      throw err;
    }
  };

  /** ONE due step of a running ladder (LD3, LD4): a child to send, or the step recorded here. */
  const advance = async (l: (typeof facts.ladders)[number], hashFailed: boolean): Promise<void> => {
    const due = claimDomain.dueLadderStep(l, today);
    if (due === null) return;
    if (due === 'conclude') {
      // `-350` ruling 1 — CONCLUDED undelivered (a failed hash concludes on the RECORDED number — LD5 — and alarms).
      if (!(await claimDomain.concludeContactLadder(db, { pariwarId, ladderId: l.ladderId, on: today, ...(hashFailed ? { detail: 'hash_unavailable' } : {}) }))) {
        return;
      }
      tally.concluded += 1;
      if (hashFailed) tally.hashUnavailableClaims.push(row.claimCaseId);
      const s = stateOf(l.personKey);
      const role = s?.person.role ?? (l.personKey === 'claimant' ? 'claimant' : 'nominee');
      const ask = claimDomain.ladderAsk({
        role,
        letterCapReached: s !== undefined && claimDomain.isPersonAtLetterCap(s),
        nomineeCallsCleared: deps.nomineeCallsCleared,
      });
      const w = await claimDomain.writeCorrectionLadderEscalation(db, { pariwarId, claimCaseId, ladder: l, today, districtAdminKey: daKey, ask });
      if (daKey === 'staff:unassigned') tally.unassignedClaims.push(row.claimCaseId);
      // LD9 (iii) — an ask on an ENDED run has ⛔ chase sweep to push it today: this sweep does (the day UNIQUE dedups).
      if (w.written && !w.runOpen && daKey !== 'staff:unassigned') {
        pushes.push({ claimCaseId: row.claimCaseId, runId: w.runId, slotDay: w.slotDay, userId: daKey.slice('staff:'.length), sentOn: today });
      }
      return;
    }
    const step = due;
    const dueOn = step === 2 ? l.sms2DueOn : l.sms3DueOn!;
    const resolve = (state: Exclude<schemaStepState, 'pending' | 'sent'>) =>
      claimDomain.resolveContactLadderStep(db, {
        pariwarId,
        ladderId: l.ladderId,
        step,
        state,
        on: today,
        rowId: null,
        nextOn: claimDomain.nextLadderStepDate(
          dueOn,
          step === 2 ? claimDomain.LADDER_SMS3_AFTER_DAYS : claimDomain.LADDER_CONCLUDE_AFTER_DAYS,
          today,
        ),
      });
    if (hashFailed) {
      await resolve('skipped:hash_unavailable');
      tally.hashUnavailableClaims.push(row.claimCaseId);
      return;
    }
    const run = await claimDomain.readCorrectionRun(db, pariwarId, l.runId);
    if (run === null) {
      // Review P16 — every other abnormal branch in this sweep alarms; this one silently no-opped.
      alarm(`[jobs] contact-ladder: due step unresolved — run ${l.runId} unreadable for ladder ${l.ladderId} (claim ${row.claimCaseId})`);
      return;
    }
    const runDay = claimDomain.correctionRunDay(run.day0, today);
    const scheduledToday =
      run.endedAt === null && claimDomain.correctionReminderSchedule(run.kind, run.day0).some((x) => x.kind === 'reminder' && x.day === runDay);
    const sentToNumberToday = claimDomain.correctionNumberTextedOn({
      numberHash: l.recipientNumberHash,
      on: today,
      exceptSubjectKey: claimDomain.ladderSmsSubjectKey(l.ladderId, step),
      currentHashOf: (personKey) => knownCurrentHash(stateOf(personKey)) ?? null,
      rows: facts.rows,
      ladderRows: facts.ladderRows,
    });
    const verdict = claimDomain.ladderStepGate({ chase: 'correction', runDay, paused: false, scheduledToday, sentToNumberToday });
    if (verdict === 'send') sms.push({ ladderId: l.ladderId, claimCaseId: row.claimCaseId, step, sentOn: today });
    else await resolve(verdict);
  };

  // ── (1) The RUNNING ladders: the ends, a satisfied step's row, the due step ──
  for (const l of facts.ladders.filter((x) => x.state === 'running')) {
    const { stop, hashFailed } = await stopOf(l.runId, l.personKey);
    const all = [...facts.rows, ...facts.ladderRows];
    const end = claimDomain.ladderEndReason({
      ladder: l,
      originCreatedAt: origins.get(l.originRowId) ?? l.createdAt,
      rows: all.filter((r) => r.recipientKey === l.personKey),
      satisfyingRows: all.filter((r) => r.reminderId !== undefined && (r.reminderId === l.sms2RowId || r.reminderId === l.sms3RowId)),
      calls: callsOf(l.personKey),
      currentNumberHash: hashFailed ? undefined : knownCurrentHash(stateOf(l.personKey)),
      stop,
    });
    if (end !== null) {
      if (await claimDomain.endContactLadder(db, { pariwarId, ladderId: l.ladderId, state: end.state, detail: end.detail })) countEnd(tally, end.state);
      continue;
    }
    await settleSatisfied(db, l, all, pariwarId, row.claimCaseId, tally, (personKey) => knownCurrentHash(stateOf(personKey)) ?? null);
    await advance(l, hashFailed);
  }

  // ── (2) The STARTS (LD5) ──
  facts = await read();
  for (const p of people) {
    const s = stateOf(p.personKey);
    if (s?.hashFailed === true) {
      tally.hashUnavailableClaims.push(row.claimCaseId);
      continue;
    }
    const current = knownCurrentHash(s);
    if (current === undefined || current === null) continue;
    const mine = facts.rows.filter((r) => r.recipientKey === p.personKey);
    const candidates = mine.filter(
      (r) => r.outcome === 'accepted' && r.deliveryState === 'undelivered' && r.sentOn >= cycleCalendar.addCalendarDays(today, -claimDomain.CONTACT_LADDER_SCAN_DAYS),
    );
    if (candidates.length === 0) continue;
    const stops = new Map<string, string | null>();
    for (const runId of new Set(candidates.map((r) => r.runId))) {
      const st = await stopOf(runId, p.personKey);
      stops.set(runId, st.hashFailed ? 'hash_unavailable' : st.stop);
    }
    const ladders = facts.ladders.filter((l) => l.personKey === p.personKey);
    const moreOrigins = await claimDomain.readLadderOriginCreatedAt(db, pariwarId, 'correction', ladders.map((l) => l.originRowId));
    const origin = claimDomain.planLadderStart({
      today,
      rows: mine,
      ladderRows: facts.ladderRows.filter((r) => r.recipientKey === p.personKey),
      currentNumberHash: current,
      ladders: ladders.map((l) => ({
        state: l.state,
        originRowId: l.originRowId,
        originCreatedAt: moreOrigins.get(l.originRowId) ?? l.createdAt,
        endedAt: l.endedAt,
        recipientNumberHash: l.recipientNumberHash,
      })),
      calls: callsOf(p.personKey),
      stopOfRun: (runId) => (stops.has(runId) ? stops.get(runId)! : 'unknown'), // ⚠ `??` would read a `null` (⛔ stop) as unknown
    });
    if (origin === null || origin.reminderId === undefined || origin.recipientNumberHash === null) continue;
    const started = await claimDomain.insertContactLadder(db, {
      pariwarId,
      claimCaseId,
      chase: 'correction',
      runId: origin.runId,
      returnDecisionId,
      personKey: p.personKey,
      recipientNumberHash: origin.recipientNumberHash,
      originRowId: origin.reminderId,
      originSentOn: origin.sentOn,
      whatsappStep: claimDomain.ladderWhatsappStep(p.role),
      sms2DueOn: claimDomain.ladderFirstDueOn(origin.sentOn, today),
    });
    if (started === null) continue;
    tally.started += 1;
    tally.startedByPariwar.set(row.pariwarId, (tally.startedByPariwar.get(row.pariwarId) ?? 0) + 1);
    // A ladder started on SMS 2's own date (a report seen the next morning) takes that step in THIS run.
    await advance(started, false);
  }

  // ── (3) LD9 (iii) — an ask on an ENDED run still un-pushed (the day's push went before it, or ⛔ push yet) ──
  pushes.push(...(await unpushedEndedRunAsks(client, db, pariwarId, claimCaseId, returnDecisionId, today, pushes)));
  return { sms, pushes };
}

type schemaStepState = 'pending' | 'sent' | 'satisfied' | `skipped:${string}`;

/**
 * LD4's next visit — a `satisfied` step (resolved on an EARLIER day) whose carrying row is ⛔ recorded yet: the row of
 * this chase that went to the ladder's NUMBER that day (any person, a `family_sms` or a `ladder_sms`, ⛔ a marker) is
 * recorded as the step's row; ⛔ such row ⇒ `skipped:scheduled_not_sent` (the clock runs on, ⛔ a resend) + alarm.
 */
async function settleSatisfied(
  db: Db,
  l: { readonly ladderId: string; readonly recipientNumberHash: string; readonly sms2State: string; readonly sms2On: string | null; readonly sms2RowId: string | null; readonly sms3State: string; readonly sms3On: string | null; readonly sms3RowId: string | null },
  rows: readonly { readonly reminderId?: string; readonly recipientKey: string; readonly sentOn: string; readonly outcome: string; readonly recipientNumberHash: string | null }[],
  pariwarId: ReturnType<typeof ids.pariwarId>,
  claimCaseId: string,
  tally: Tally,
  currentHashOf: (personKey: string) => string | null,
): Promise<void> {
  for (const step of [2, 3] as const) {
    const state = step === 2 ? l.sms2State : l.sms3State;
    const on = step === 2 ? l.sms2On : l.sms3On;
    const rowId = step === 2 ? l.sms2RowId : l.sms3RowId;
    if (state !== 'satisfied' || rowId !== null || on === null) continue;
    const carrying = rows.find((r) => {
      if (r.reminderId === undefined || r.sentOn !== on || r.outcome === 'skipped_superseded' || r.outcome === 'attempting') return false;
      const h = r.recipientNumberHash ?? currentHashOf(r.recipientKey);
      return h !== null && claimDomain.sameNumberHash(h, l.recipientNumberHash);
    });
    if (carrying !== undefined) {
      await claimDomain.settleSatisfiedContactLadderStep(db, { pariwarId, ladderId: l.ladderId, step, rowId: carrying.reminderId! });
      continue;
    }
    // ⛔ Yet: a row still `attempting` (the day's child in flight) is left for the next visit.
    if (rows.some((r) => r.sentOn === on && r.outcome === 'attempting')) continue;
    if (await claimDomain.settleSatisfiedContactLadderStep(db, { pariwarId, ladderId: l.ladderId, step, rowId: null })) {
      tally.scheduledNotSentClaims.push(claimCaseId);
    }
  }
}

/**
 * LD9 (iii) — every `recorded` `ladder_escalation` of the return on an ENDED run that ⛔ push has carried yet (⛔
 * `staff_push` for that recipient created after it) and whose recipient has ⛔ push today: a push to that row's own
 * recipient (⛔ the live District Admin, ⛔ `staff:unassigned`), on the return's LATEST run. An OPEN run's ask rides the
 * chase sweep's own `todays` query — so an early ladder push never claims the day before the chase writes its rows.
 */
async function unpushedEndedRunAsks(
  client: pg.PoolClient,
  db: Db,
  pariwarId: ReturnType<typeof ids.pariwarId>,
  claimCaseId: ReturnType<typeof ids.claimId>,
  returnDecisionId: string,
  today: string,
  already: readonly CorrectionStaffPushPayload[],
): Promise<CorrectionStaffPushPayload[]> {
  const { rows } = await client.query<{ recipient_key: string }>(
    `SELECT DISTINCT e.recipient_key FROM claim_correction_reminders e
       JOIN claim_correction_runs r ON r.run_id = e.run_id AND r.pariwar_id = e.pariwar_id
      WHERE e.pariwar_id = $1 AND e.claim_case_id = $2 AND r.return_decision_id = $3
        AND e.purpose = 'ladder_escalation' AND e.outcome = 'recorded' AND r.ended_at IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM claim_correction_reminders p
                         WHERE p.pariwar_id = e.pariwar_id AND p.claim_case_id = e.claim_case_id
                           AND p.recipient_key = e.recipient_key AND p.purpose = 'staff_push'
                           AND (p.created_at > e.created_at OR p.sent_on = $4::date))`,
    [pariwarId, claimCaseId, returnDecisionId, today],
  );
  const anchor = await claimDomain.latestRunOfReturn(db, pariwarId, returnDecisionId, today);
  if (anchor === null) return [];
  const anchorRun = await claimDomain.readCorrectionRun(db, pariwarId, anchor.runId);
  if (anchorRun === null || anchorRun.endedAt === null) return []; // an OPEN latest run — the chase sweep pushes it
  return rows
    .map((r) => r.recipient_key)
    .filter((k) => k.startsWith('staff:') && k !== 'staff:unassigned')
    .filter((k) => !already.some((p) => `staff:${p.userId}` === k))
    .map((k) => ({ claimCaseId: claimCaseId as string, runId: anchor.runId, slotDay: anchor.slotDay, userId: k.slice('staff:'.length), sentOn: today }));
}

// ── The certificate plan (hashes BEFORE the claim-row lock — CR7) ──────────────────────────────────────────────

/**
 * Plan ONE claim's CERTIFICATE ladders for today. Tx A reads the people (⛔ lock); the KMS hashes run with ⛔ transaction
 * open; tx B takes the CLAIM-ROW lock (bounded by `lock_timeout` FIRST), re-reads the record (moved ⇒ ⛔ plan today) and
 * acts — the same steps as the correction plan, over the certificate chase's COMPOSED stops.
 */
async function planCertificateLadders(
  deps: ContactLadderDeps,
  row: { readonly claimCaseId: string; readonly pariwarId: string },
  today: string,
  tally: Tally,
): Promise<ClaimPlan> {
  const pariwarId = ids.pariwarId(row.pariwarId);
  const claimCaseId = ids.claimId(row.claimCaseId);
  const sms: LadderSmsPayload[] = [];
  const pre = await withPariwarScope(deps.pool, row.pariwarId, (db: Db) => claimDomain.readCertificateRecipients(db, pariwarId, claimCaseId));
  const people = pre.cannotRemind === null ? pre.people : [];
  const hashes = await claimDomain.hashCertificateRecipients(people, row.pariwarId, deps.encryption);
  const hashOf = (personKey: string): string | null | undefined => {
    const h = hashes.get(personKey);
    return h === undefined || 'failed' in h ? undefined : h.hash;
  };

  await withPariwarScope(deps.pool, row.pariwarId, async (db: Db, client: pg.PoolClient) => {
    await client.query(`SET LOCAL lock_timeout = '${CORRECTION_PLAN_LOCK_TIMEOUT}'`);
    await client.query(`SET LOCAL statement_timeout = '${CORRECTION_PLAN_STATEMENT_TIMEOUT}'`);
    if ((await claimDomain.lockCertificateClaim(db, pariwarId, claimCaseId)) === null) return;
    const recipients = await claimDomain.readCertificateRecipients(db, pariwarId, claimCaseId);
    const before = new Map(people.map((p) => [p.personKey, p]));
    if (
      recipients.cannotRemind === null &&
      (recipients.people.length !== before.size || recipients.people.some((p) => !claimDomain.samePersonSource(p, before.get(p.personKey))))
    ) {
      return; // the record moved between the hash and the lock — ⛔ plan on stale hashes; tomorrow re-plans
    }
    const shepherd = await claimDomain.getLiveShepherd(db, pariwarId, claimCaseId);
    const daKey = shepherd ? `staff:${shepherd.shepherdActorId}` : 'staff:unassigned';
    const calls = await claimDomain.readClaimContactCalls(db, pariwarId, claimCaseId);
    const callsOf = (personKey: string) => calls.filter((c) => c.personKey === personKey);
    const read = async () => ({
      ladders: await claimDomain.readClaimLadders(db, pariwarId, claimCaseId, 'certificate'),
      rows: await claimDomain.readClaimCertificateFamilyRows(db, pariwarId, claimCaseId),
      ladderRows: await claimDomain.readClaimCertificateLadderSmsRows(db, pariwarId, claimCaseId),
    });
    let facts = await read();
    const origins = await claimDomain.readLadderOriginCreatedAt(db, pariwarId, 'certificate', facts.ladders.map((l) => l.originRowId));
    const stopOf = (runId: string, personKey: string) =>
      claimDomain.certificateLadderStopReason(db, { pariwarId, claimCaseId, runId, personKey, today, hashes });

    const advance = async (l: (typeof facts.ladders)[number], check: Awaited<ReturnType<typeof stopOf>>): Promise<void> => {
      const due = claimDomain.dueLadderStep(l, today);
      if (due === null || check.stop !== null) return;
      const hashFailed = hashOf(l.personKey) === undefined;
      if (due === 'conclude') {
        if (!(await claimDomain.concludeContactLadder(db, { pariwarId, ladderId: l.ladderId, on: today, ...(hashFailed ? { detail: 'hash_unavailable' } : {}) }))) {
          return;
        }
        tally.concluded += 1;
        if (hashFailed) tally.hashUnavailableClaims.push(row.claimCaseId);
        const person = check.person;
        const ask = claimDomain.ladderAsk({
          role: person.role,
          letterCapReached: claimDomain.certificateLetterCapReached(check.states, l.personKey),
          nomineeCallsCleared: deps.nomineeCallsCleared,
        });
        // ⭐ Written on conclusion WHETHER OR NOT the run is paused — a staff RECORD, ⛔ a family text (LD9).
        await claimDomain.writeCertificateLadderEscalation(db, { pariwarId, claimCaseId, ladder: l, today, districtAdminKey: daKey, ask });
        if (daKey === 'staff:unassigned') tally.unassignedClaims.push(row.claimCaseId);
        return;
      }
      const step = due;
      const dueOn = step === 2 ? l.sms2DueOn : l.sms3DueOn!;
      const resolve = (state: Exclude<schemaStepState, 'pending' | 'sent'>) =>
        claimDomain.resolveContactLadderStep(db, {
          pariwarId,
          ladderId: l.ladderId,
          step,
          state,
          on: today,
          rowId: null,
          nextOn: claimDomain.nextLadderStepDate(
            dueOn,
            step === 2 ? claimDomain.LADDER_SMS3_AFTER_DAYS : claimDomain.LADDER_CONCLUDE_AFTER_DAYS,
            today,
          ),
        });
      if (hashFailed) {
        await resolve('skipped:hash_unavailable');
        tally.hashUnavailableClaims.push(row.claimCaseId);
        return;
      }
      const scheduledToday =
        check.run.endedAt === null && !check.paused && claimDomain.CERTIFICATE_REMINDER_DAYS.includes(check.runDay);
      // Review P12b — mirror correction's `correctionNumberTextedOn` (which the name outlives: it is chase-agnostic)
      // so an in-flight `attempting` row to the SAME number (hash still NULL, recorded at finalise) counts too.
      const sentToNumberToday = claimDomain.correctionNumberTextedOn({
        numberHash: l.recipientNumberHash,
        on: today,
        exceptSubjectKey: claimDomain.ladderSmsSubjectKey(l.ladderId, step),
        currentHashOf: (personKey) => hashOf(personKey) ?? null,
        rows: facts.rows,
        ladderRows: facts.ladderRows,
      });
      const verdict = claimDomain.ladderStepGate({ chase: 'certificate', runDay: check.runDay, paused: check.paused, scheduledToday, sentToNumberToday });
      if (verdict === 'send') sms.push({ ladderId: l.ladderId, claimCaseId: row.claimCaseId, step, sentOn: today });
      else await resolve(verdict);
    };

    for (const l of facts.ladders.filter((x) => x.state === 'running')) {
      const check = await stopOf(l.runId, l.personKey);
      const all = [...facts.rows, ...facts.ladderRows];
      const end = claimDomain.ladderEndReason({
        ladder: l,
        originCreatedAt: origins.get(l.originRowId) ?? l.createdAt,
        rows: all.filter((r) => r.recipientKey === l.personKey),
        satisfyingRows: all.filter((r) => r.reminderId !== undefined && (r.reminderId === l.sms2RowId || r.reminderId === l.sms3RowId)),
        calls: callsOf(l.personKey),
        currentNumberHash: hashOf(l.personKey),
        stop: check.stop,
      });
      if (end !== null) {
        if (await claimDomain.endContactLadder(db, { pariwarId, ladderId: l.ladderId, state: end.state, detail: end.detail })) countEnd(tally, end.state);
        continue;
      }
      await settleSatisfied(db, l, all, pariwarId, row.claimCaseId, tally, (personKey) => hashOf(personKey) ?? null);
      await advance(l, check);
    }

    facts = await read();
    for (const p of recipients.cannotRemind === null ? recipients.people : []) {
      const current = hashOf(p.personKey);
      if (current === undefined) {
        tally.hashUnavailableClaims.push(row.claimCaseId);
        continue;
      }
      if (current === null) continue;
      const mine = facts.rows.filter((r) => r.recipientKey === p.personKey);
      const candidates = mine.filter(
        (r) => r.outcome === 'accepted' && r.deliveryState === 'undelivered' && r.sentOn >= cycleCalendar.addCalendarDays(today, -claimDomain.CONTACT_LADDER_SCAN_DAYS),
      );
      if (candidates.length === 0) continue;
      const stops = new Map<string, string | null>();
      for (const runId of new Set(candidates.map((r) => r.runId))) stops.set(runId, (await stopOf(runId, p.personKey)).stop);
      const ladders = facts.ladders.filter((l) => l.personKey === p.personKey);
      const moreOrigins = await claimDomain.readLadderOriginCreatedAt(db, pariwarId, 'certificate', ladders.map((l) => l.originRowId));
      const origin = claimDomain.planLadderStart({
        today,
        rows: mine,
        ladderRows: facts.ladderRows.filter((r) => r.recipientKey === p.personKey),
        currentNumberHash: current,
        ladders: ladders.map((l) => ({
          state: l.state,
          originRowId: l.originRowId,
          originCreatedAt: moreOrigins.get(l.originRowId) ?? l.createdAt,
          endedAt: l.endedAt,
          recipientNumberHash: l.recipientNumberHash,
        })),
        calls: callsOf(p.personKey),
        stopOfRun: (runId) => (stops.has(runId) ? stops.get(runId)! : 'unknown'), // ⚠ `??` would read a `null` (⛔ stop) as unknown
      });
      if (origin === null || origin.reminderId === undefined || origin.recipientNumberHash === null) continue;
      const started = await claimDomain.insertContactLadder(db, {
        pariwarId,
        claimCaseId,
        chase: 'certificate',
        runId: origin.runId,
        returnDecisionId: null,
        personKey: p.personKey,
        recipientNumberHash: origin.recipientNumberHash,
        originRowId: origin.reminderId,
        originSentOn: origin.sentOn,
        whatsappStep: claimDomain.ladderWhatsappStep(p.role),
        sms2DueOn: claimDomain.ladderFirstDueOn(origin.sentOn, today),
      });
      if (started === null) continue;
      tally.started += 1;
      tally.startedByPariwar.set(row.pariwarId, (tally.startedByPariwar.get(row.pariwarId) ?? 0) + 1);
      await advance(started, await stopOf(started.runId, started.personKey));
    }
  });
  return { sms, pushes: [] };
}

// ── The CHILDREN ───────────────────────────────────────────────────────────────────────────────────────────────

export type LadderSmsChildResult =
  | { readonly status: 'sent'; readonly outcome: string }
  | { readonly status: 'resolved'; readonly state: string }
  | { readonly status: 'ended'; readonly state: string }
  | { readonly status: 'skipped'; readonly reason: 'stale_slot' }
  | { readonly status: 'noop'; readonly reason: string };

/** The stale-day guard's key of THIS step's row (the ladder's origin run, the step's subject). */
async function ownLadderRowKey(db: Db, pariwarId: ReturnType<typeof ids.pariwarId>, p: LadderSmsPayload) {
  const l = await claimDomain.readContactLadder(db, pariwarId, p.ladderId);
  return l === null ? null : { ladder: l, subjectKey: claimDomain.ladderSmsSubjectKey(l.ladderId, p.step) };
}

/**
 * ⭐ ONE correction ladder SMS. The re-check and the claim happen in ONE transaction under the trustee lock
 * (`beginCorrectionLadderSend`); the decrypt, the config reads and the send happen AFTER its commit; the row moves to its
 * final state after the send by compare-and-set (the chase's own finaliser). A STALE child (enqueued for an earlier IST
 * day) ⛔ never sends that day's step today — its own `attempting` row is closed `error` like the chase child's.
 * @throws ClaimCorrectionTransientError  a transient failure (pg-boss retries the SAME job — it re-claims its own row)
 */
export async function runCorrectionLadderSmsChild(
  deps: ContactLadderDeps,
  envelope: JobEnvelope<LadderSmsPayload>,
  jobId: string,
): Promise<LadderSmsChildResult> {
  const alarm = alarmOf(deps);
  const now = deps.now?.() ?? new Date();
  const p = envelope.payload;
  const pid = envelope.pariwarId;
  if (pid === null || pid === '') {
    alarm(`[jobs] claim-correction-ladder-sms: missing pariwarId for ladder ${p.ladderId}`);
    return { status: 'noop', reason: 'missing_pariwar' };
  }
  const pariwarId = ids.pariwarId(pid);
  const claimCaseId = ids.claimId(p.claimCaseId);

  if (p.sentOn < cycleCalendar.istDateOf(now)) {
    const expired = await withPariwarScope(deps.pool, pid, async (db: Db, client) => {
      // Round-2 P26 — a bounded wait on the trustee lock, as the certificate child bounds its claim-row lock.
      await client.query(`SET LOCAL lock_timeout = '${CORRECTION_PLAN_LOCK_TIMEOUT}'`);
      await claimDomain.acquireCorrectionChaseLock(client, pid, p.claimCaseId);
      const k = await ownLadderRowKey(db, pariwarId, p);
      if (k === null) return false;
      const run = await claimDomain.readCorrectionRun(db, pariwarId, k.ladder.runId);
      if (run === null) {
        // Review P16 — the stale-slot check silently left an `attempting` row un-expired and un-alarmed.
        alarm(`[jobs] claim-correction-ladder-sms: stale-slot check — run ${k.ladder.runId} unreadable for ladder ${p.ladderId}`);
        return false;
      }
      const own = await claimDomain.readCorrectionReminder(db, {
        pariwarId,
        claimCaseId,
        runId: k.ladder.runId,
        slotDay: Math.max(0, claimDomain.correctionRunDay(run.day0, p.sentOn)),
        recipientKey: k.ladder.personKey,
        purpose: 'ladder_sms',
        subjectKey: k.subjectKey,
      });
      if (own === null || own.outcome !== 'attempting' || own.claimedByJob !== jobId) return false;
      return claimDomain.expireOwnCorrectionReminder(db, { pariwarId, reminderId: own.reminderId, jobId, detail: 'exhausted:crossed_midnight' });
    }).catch((err: unknown) => {
      // Fix-diff review — the stale-slot wait is bounded too; its timeout is the same transient retry as the begin's.
      if (isPlanTimeout(err)) {
        throw new ClaimCorrectionTransientError(`[jobs] claim-correction-ladder-sms: lock wait timed out (stale slot) for ladder ${p.ladderId} — retrying`);
      }
      throw err;
    });
    if (expired) {
      alarm(`[jobs] claim-correction-ladder-sms: ladder ${p.ladderId} (claim ${p.claimCaseId}) was still 'attempting' past IST midnight — recorded 'error'`);
    }
    return { status: 'skipped', reason: 'stale_slot' };
  }

  const begun = await withPariwarScope(deps.pool, pid, async (_db, client) => {
    // Round-2 P26 — ⛔ an unbounded wait behind a slow plan holding the trustee lock (a timeout is a transient retry).
    await client.query(`SET LOCAL lock_timeout = '${CORRECTION_PLAN_LOCK_TIMEOUT}'`);
    return claimDomain.beginCorrectionLadderSend(client, {
      pariwarId,
      claimCaseId,
      ladderId: p.ladderId,
      step: p.step,
      sentOn: p.sentOn,
      jobId,
      now,
      crypto: deps.encryption,
    });
  }).catch((err: unknown) => {
    if (isPlanTimeout(err)) {
      throw new ClaimCorrectionTransientError(`[jobs] claim-correction-ladder-sms: lock wait timed out for ladder ${p.ladderId} — retrying`);
    }
    throw err;
  });
  if (begun.kind === 'resolved') return { status: 'resolved', state: begun.state };
  if (begun.kind === 'ended') {
    // Round-2 P18 — an end found in the re-check can still expire THIS job's own attempt: alarm as the noop branch does.
    if (begun.expiredAttempt === true) {
      alarm(`[jobs] claim-correction-ladder-sms: ladder ${p.ladderId} (claim ${p.claimCaseId}) — an earlier attempt ran before the ladder ended; recorded 'error'`);
    }
    return { status: 'ended', state: begun.state };
  }
  if (begun.kind === 'noop') {
    if (begun.expiredAttempt === true) {
      alarm(`[jobs] claim-correction-ladder-sms: ladder ${p.ladderId} (claim ${p.claimCaseId}) — an earlier attempt ran before the re-check failed; recorded 'error'`);
    }
    return { status: 'noop', reason: begun.reason };
  }

  // ── After the commit: decrypt, hash, send ──
  const finalise = (fields: {
    outcome: 'accepted' | 'rejected_invalid_number' | 'rejected_unreachable' | 'no_target' | 'error';
    providerMessageId?: string | null;
    detail?: string | null;
    recipientNumberHash?: string | null;
  }) =>
    withPariwarScope(deps.pool, pid, (db: Db) =>
      claimDomain.finaliseCorrectionReminder(db, {
        pariwarId,
        reminderId: begun.reminderId,
        jobId,
        recipientVersionId: begun.person.versionId,
        ...fields,
      }),
    );
  const transient = async (detail: string): Promise<never> => {
    await withPariwarScope(deps.pool, pid, (db: Db) =>
      claimDomain.noteCorrectionReminderTransient(db, { pariwarId, reminderId: begun.reminderId, jobId, detail }),
    );
    throw new ClaimCorrectionTransientError(`[jobs] claim-correction-ladder-sms: transient ${detail} for ladder ${p.ladderId}`);
  };
  let e164: string | null;
  try {
    e164 = await claimDomain.resolveCorrectionMobile(begun.person.mobileCiphertext, begun.person.mobileSource, pid, deps.encryption);
  } catch {
    return transient('decrypt_failed:tier1');
  }
  if (e164 === null) {
    await finalise({ outcome: 'no_target', detail: 'no_target:no_sendable_number', recipientNumberHash: null });
    return { status: 'sent', outcome: 'no_target' };
  }
  let recipientNumberHash: string;
  try {
    recipientNumberHash = await claimDomain.correctionNumberHash(e164, pid, deps.encryption);
  } catch {
    return transient('hash_failed:tier1');
  }
  const result = await sendClaimCorrectionSms(deps, {
    message: 'reminder',
    locale: begun.contactLocale,
    pariwarId: pid,
    claimCaseId: p.claimCaseId,
    e164,
    rowId: begun.reminderId,
  });
  if (result.kind === 'transient') return transient(result.detail);
  if (result.helplineNotCallbackNumber === true) alarm(helplineNotCallbackNumberWarning(pid, 'correction follow-up reminder'));
  if (result.preflightWarning !== undefined) {
    const key = CLAIM_CORRECTION_SMS_TEMPLATES.reminder[begun.contactLocale].dltTemplateIdConfigKey;
    alarm(preflightWarningMessage(pid, 'correction follow-up reminder', key, result.preflightWarning));
  }
  if (result.outcome !== 'accepted' && result.alarm) {
    alarm(`[jobs] claim-correction-ladder-sms: ${result.detail} for claim ${p.claimCaseId} ladder ${p.ladderId} — recorded error (fail-closed)`);
  }
  const moved = await finalise({ outcome: result.outcome, providerMessageId: result.providerMessageId, detail: result.detail, recipientNumberHash });
  if (!moved) alarm(`[jobs] claim-correction-ladder-sms: the row for ladder ${p.ladderId} moved on before its finalise`);
  return { status: 'sent', outcome: result.outcome };
}

/**
 * ⭐ ONE certificate ladder SMS (CR6–CR8's shape): hash EVERY person's number and decrypt its OWN BEFORE the claim-row
 * lock; the re-check + claim under it (`beginCertificateLadderSend`); commit; send; compare-and-set. A KMS failure on the
 * person's OWN hash or decrypt is RETRIED (a transient throw before anything is claimed — round-2 P8); only on the FINAL
 * attempt does the re-check see the failure and record the step `skipped:hash_unavailable` (the hash never cleared that
 * morning). `attempt` is pg-boss's retry metadata (`includeMetadata`); without it every attempt counts as the final one.
 * @throws ClaimCorrectionTransientError  a transient failure
 */
export async function runCertificateLadderSmsChild(
  deps: ContactLadderDeps,
  envelope: JobEnvelope<LadderSmsPayload>,
  jobId: string,
  attempt?: CorrectionChildAttempt,
): Promise<LadderSmsChildResult> {
  const alarm = alarmOf(deps);
  const now = deps.now?.() ?? new Date();
  const p = envelope.payload;
  const pid = envelope.pariwarId;
  if (pid === null || pid === '') {
    alarm(`[jobs] claim-certificate-ladder-sms: missing pariwarId for ladder ${p.ladderId}`);
    return { status: 'noop', reason: 'missing_pariwar' };
  }
  const pariwarId = ids.pariwarId(pid);
  const claimCaseId = ids.claimId(p.claimCaseId);

  if (p.sentOn < cycleCalendar.istDateOf(now)) {
    const expired = await withPariwarScope(deps.pool, pid, async (db: Db, client: pg.PoolClient) => {
      await client.query(`SET LOCAL lock_timeout = '${CORRECTION_PLAN_LOCK_TIMEOUT}'`);
      if ((await claimDomain.lockCertificateClaim(db, pariwarId, claimCaseId)) === null) {
        // Round-2 P20 — mirrors the correction child (review P16): ⛔ a silent no-op on an abnormal branch.
        alarm(`[jobs] claim-certificate-ladder-sms: stale-slot check — claim ${p.claimCaseId} unreadable for ladder ${p.ladderId}`);
        return false;
      }
      const k = await ownLadderRowKey(db, pariwarId, p);
      if (k === null) return false;
      const run = await claimDomain.readCertificateRun(db, pariwarId, k.ladder.runId);
      if (run === null) {
        alarm(`[jobs] claim-certificate-ladder-sms: stale-slot check — run ${k.ladder.runId} unreadable for ladder ${p.ladderId}`);
        return false;
      }
      const own = await claimDomain.readCertificateReminder(db, {
        pariwarId,
        claimCaseId,
        runId: k.ladder.runId,
        slotDay: Math.max(0, claimDomain.certificateRunDay(run.day0, p.sentOn)),
        recipientKey: k.ladder.personKey,
        purpose: 'ladder_sms',
        subjectKey: k.subjectKey,
      });
      if (own === null || own.outcome !== 'attempting' || own.claimedByJob !== jobId) return false;
      return claimDomain.expireOwnCertificateReminder(db, { pariwarId, reminderId: own.reminderId, jobId, detail: 'exhausted:crossed_midnight' });
    });
    if (expired) {
      alarm(`[jobs] claim-certificate-ladder-sms: ladder ${p.ladderId} (claim ${p.claimCaseId}) was still 'attempting' past IST midnight — recorded 'error'`);
    }
    return { status: 'skipped', reason: 'stale_slot' };
  }

  // ── BEFORE the lock: the people, EVERY person's hash, and the ladder person's own number (CR7) ──
  const pre = await withPariwarScope(deps.pool, pid, async (db: Db) => ({
    recipients: await claimDomain.readCertificateRecipients(db, pariwarId, claimCaseId),
    ladder: await claimDomain.readContactLadder(db, pariwarId, p.ladderId),
  }));
  const people = pre.recipients.cannotRemind === null ? pre.recipients.people : [];
  const hashes = await claimDomain.hashCertificateRecipients(people, pid, deps.encryption);
  const me = pre.ladder === null ? undefined : people.find((x) => x.personKey === pre.ladder!.personKey);
  let e164: string | null = null;
  let myHashFailed = me !== undefined && 'failed' in (hashes.get(me.personKey) ?? { failed: true });
  if (me !== undefined && !myHashFailed) {
    try {
      e164 = await claimDomain.resolveCorrectionMobile(me.mobileCiphertext, me.mobileSource, pid, deps.encryption);
    } catch {
      myHashFailed = true;
    }
  }
  if (myHashFailed) {
    // Round-2 P8 — ⛔ one KMS blip skips the step: retried (nothing is claimed yet), like the certificate FAMILY child.
    // Only the FINAL attempt lets the re-check record `skipped:hash_unavailable` (the hash never cleared that morning).
    const finalAttempt = attempt === undefined || attempt.retryCount >= attempt.retryLimit;
    if (!finalAttempt) {
      throw new ClaimCorrectionTransientError(`[jobs] claim-certificate-ladder-sms: the number could not be hashed / read for ladder ${p.ladderId} — retrying`);
    }
    hashes.set(me!.personKey, { failed: true });
  }

  let begun: claimDomain.BeginLadderSendResult<claimDomain.CertificatePerson>;
  try {
    begun = await withPariwarScope(deps.pool, pid, async (_db: Db, client: pg.PoolClient) => {
      await client.query(`SET LOCAL lock_timeout = '${CORRECTION_PLAN_LOCK_TIMEOUT}'`);
      return claimDomain.beginCertificateLadderSend(client, {
        pariwarId,
        claimCaseId,
        ladderId: p.ladderId,
        step: p.step,
        sentOn: p.sentOn,
        jobId,
        now,
        prelock: { people, hashes },
      });
    });
  } catch (err) {
    if (err instanceof claimDomain.CertificateRecipientsMovedError) {
      throw new ClaimCorrectionTransientError(`[jobs] claim-certificate-ladder-sms: the contact record moved for ladder ${p.ladderId} — retrying`);
    }
    throw err;
  }
  if (begun.kind === 'resolved') return { status: 'resolved', state: begun.state };
  if (begun.kind === 'ended') {
    // Round-2 P18 — an end found in the re-check can still expire THIS job's own attempt: alarm as the noop branch does.
    if (begun.expiredAttempt === true) {
      alarm(`[jobs] claim-certificate-ladder-sms: ladder ${p.ladderId} (claim ${p.claimCaseId}) — an earlier attempt ran before the ladder ended; recorded 'error'`);
    }
    return { status: 'ended', state: begun.state };
  }
  if (begun.kind === 'noop') {
    if (begun.expiredAttempt === true) {
      alarm(`[jobs] claim-certificate-ladder-sms: ladder ${p.ladderId} (claim ${p.claimCaseId}) — an earlier attempt ran before the re-check failed; recorded 'error'`);
    }
    return { status: 'noop', reason: begun.reason };
  }
  if (e164 === null) {
    // The person's hash cleared but the number read back as nothing — NOTHING was sent. (Effectively unreachable: the hash
    // and the number decrypt from the SAME ciphertext.) A non-final attempt retries WITHOUT a transient note (a `detail`
    // would read as "an attempt ran" to the next re-check — K4); the FINAL attempt finalises the row `no_target`
    // (`no_target:no_sendable_number`) and the step stays `sent` — LD3's outcome table, exactly as the CORRECTION child
    // does (fix-diff review: one event recorded one way in both chases; the CAS matches any detail, so ⛔ row is stranded).
    const finalAttempt = attempt === undefined || attempt.retryCount >= attempt.retryLimit;
    if (!finalAttempt) {
      throw new ClaimCorrectionTransientError(`[jobs] claim-certificate-ladder-sms: no number for a claimed row on ladder ${p.ladderId} — retrying`);
    }
    const moved = await withPariwarScope(deps.pool, pid, (db: Db) =>
      claimDomain.finaliseCertificateReminder(db, {
        pariwarId,
        reminderId: begun.reminderId,
        jobId,
        outcome: 'no_target',
        detail: 'no_target:no_sendable_number',
      }),
    );
    if (!moved) alarm(`[jobs] claim-certificate-ladder-sms: the row for ladder ${p.ladderId} moved on before its finalise`);
    return { status: 'sent', outcome: 'no_target' };
  }

  const result = await sendClaimCorrectionSms(deps, {
    message: 'certificate_reminder',
    locale: begun.contactLocale,
    pariwarId: pid,
    claimCaseId: p.claimCaseId,
    e164,
    rowId: begun.reminderId,
  });
  if (result.kind === 'transient') {
    await withPariwarScope(deps.pool, pid, (db: Db) =>
      claimDomain.noteCertificateReminderTransient(db, { pariwarId, reminderId: begun.reminderId, jobId, detail: result.detail }),
    );
    throw new ClaimCorrectionTransientError(`[jobs] claim-certificate-ladder-sms: transient ${result.detail} for ladder ${p.ladderId}`);
  }
  if (result.helplineNotCallbackNumber === true) alarm(helplineNotCallbackNumberWarning(pid, 'certificate follow-up reminder'));
  if (result.preflightWarning !== undefined) {
    const key = CLAIM_CORRECTION_SMS_TEMPLATES.certificate_reminder[begun.contactLocale].dltTemplateIdConfigKey;
    alarm(preflightWarningMessage(pid, 'certificate follow-up reminder', key, result.preflightWarning));
  }
  if (result.outcome !== 'accepted' && result.alarm) {
    alarm(`[jobs] claim-certificate-ladder-sms: ${result.detail} for claim ${p.claimCaseId} ladder ${p.ladderId} — recorded error (fail-closed)`);
  }
  const moved = await withPariwarScope(deps.pool, pid, (db: Db) =>
    claimDomain.finaliseCertificateReminder(db, {
      pariwarId,
      reminderId: begun.reminderId,
      jobId,
      outcome: result.outcome,
      providerMessageId: result.providerMessageId,
      detail: result.detail,
    }),
  );
  if (!moved) alarm(`[jobs] claim-certificate-ladder-sms: the row for ladder ${p.ladderId} moved on before its finalise`);
  return { status: 'sent', outcome: result.outcome };
}

// ── Registration ───────────────────────────────────────────────────────────────────────────────────────────────

/** The daily cron — 10:00 IST (`-250` #5: *"One message a day, at 10:00 in the morning"*). */
export const CONTACT_LADDER_SWEEP_CRON = '0 10 * * *';

/** Register the three queues, their workers and the daily 10:00 IST sweep. */
export async function registerContactLadderWorkers(
  boss: QueueClient,
  deps: ContactLadderDeps,
  opts: { readonly sweepCron?: string; readonly tz?: string } = {},
): Promise<void> {
  // A transient throw fails THIS job (pg-boss retries it with the same id — it re-claims its own row); ⛔ a sibling's.
  // `includeMetadata` — a child reads its retry count (round-2 P8 / P21: the FINAL attempt records what never cleared).
  const child =
    (run: (d: ContactLadderDeps, e: JobEnvelope<LadderSmsPayload>, id: string, a?: CorrectionChildAttempt) => Promise<LadderSmsChildResult>) =>
    async (jobs: Job[]) => {
      const results = [];
      for (const job of jobs) {
        const meta = job as Job & { readonly retryCount?: unknown; readonly retryLimit?: unknown };
        const attempt =
          typeof meta.retryCount === 'number' && typeof meta.retryLimit === 'number'
            ? { retryCount: meta.retryCount, retryLimit: meta.retryLimit }
            : undefined;
        results.push(await run(deps, job.data as JobEnvelope<LadderSmsPayload>, job.id, attempt));
      }
      return { processed: results.length, results };
    };
  await boss.createQueue(QUEUE_NAMES.CLAIM_CORRECTION_LADDER_SMS);
  await boss.work(QUEUE_NAMES.CLAIM_CORRECTION_LADDER_SMS, { includeMetadata: true }, child(runCorrectionLadderSmsChild));
  await boss.createQueue(QUEUE_NAMES.CLAIM_CERTIFICATE_LADDER_SMS);
  await boss.work(QUEUE_NAMES.CLAIM_CERTIFICATE_LADDER_SMS, { includeMetadata: true }, child(runCertificateLadderSmsChild));
  // ⚠ The expiry set TWICE on purpose (6.19b's lesson): `createQueue` keeps an existing queue's default, `schedule` upserts.
  await boss.createQueue(QUEUE_NAMES.CLAIM_CONTACT_LADDER_SWEEP, { expireInSeconds: CORRECTION_SWEEP_EXPIRE_SECONDS });
  await boss.work(QUEUE_NAMES.CLAIM_CONTACT_LADDER_SWEEP, async (jobs: Job[]) => {
    try {
      const swept = await runContactLadderSweep(deps, boss);
      console.info('[jobs] contact-ladder tick', JSON.stringify({ jobs: jobs.length, ...swept }));
      return swept;
    } catch (err) {
      console.error('[jobs] contact-ladder tick failed', err);
      throw err;
    }
  });
  await boss.schedule(
    QUEUE_NAMES.CLAIM_CONTACT_LADDER_SWEEP,
    opts.sweepCron ?? CONTACT_LADDER_SWEEP_CRON,
    {},
    { tz: opts.tz ?? CLAIM_CORRECTION_TZ, ...CORRECTION_SWEEP_RETRY, expireInSeconds: CORRECTION_SWEEP_EXPIRE_SECONDS },
  );
}
