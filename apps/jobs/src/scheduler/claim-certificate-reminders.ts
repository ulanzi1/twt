// The REPLACEMENT-CERTIFICATE REMINDER — the daily SWEEP and the family-SMS CHILD — Story 6.19d (Task 4; AC1–AC3, AC5;
// `2026-10-03-276` CR2–CR8, CR10; `-275` Q1–Q4).
//
// ⭐ ITS OWN MACHINE (CR1): its own tables, its own queues, its own sweep — ⛔ never a kind on 6.19b's runs, ⛔ never an
// edit to 6.19b's / 6.19c's sweeps or children. It REUSES 6.19b's send (`sendClaimCorrectionSms`, with the third message
// `certificate_reminder`), its catch-up, its lease and its person-state evaluator (through the domain's adapter).
//
// ── The sweep (CR4), daily 10:00 IST ────────────────────────────────────────────────────────────────────────────
//   (1) the exhausted-row finaliser — `attempting` rows from a previous IST day → `error` (the hash KEPT, CR7);
//   (2) the UNION of (a) every OPEN certificate run, in or out of the window, and (b) every claim in the review window
//       with ⛔ no open run — both keyset-paged on the BYPASSRLS pool, under a hard bound and a wall-clock budget;
//   (3) per claim: read the facts and the people (scope tx A, ⛔ no lock) → hash EVERY person's current number (⛔ no
//       transaction open — CR7: ⛔ no KMS while holding the claim-row lock) → scope tx B: `SET LOCAL lock_timeout`, the
//       CLAIM-ROW lock, RE-PLAN, and act: open (ending the old run `superseded` — open wins), end (`completed` /
//       `certificate_received`), pause (⛔ nothing), or plan today's sends — the catch-up (the latest missed slot once,
//       `late`; older ones `skipped_superseded`), the delivered-letter stop per NUMBER, and the District Admin's letter
//       chase / day-13 escalation RECORDS (CR10 — ⛔ no staff push in 6.19d, a departure from D11).
//   ⭐ The status is computed PER CLAIM (`readDeathCertificateSnapshot` + `deathCertificateStatus`) — ⛔ never a bulk SQL
//   classifier (a second definition of the status).
// ── The child (CR6–CR8) ──────────────────────────────────────────────────────────────────────────────────────────
//   Hash EVERY person's number and decrypt its OWN number BEFORE the lock → scope tx: `lock_timeout`, the claim-row lock,
//   `beginCertificateFamilySend` (the re-check; one text per NUMBER; the per-number delivered-letter stop; the row claimed
//   `attempting` WITH its hash) → commit → send → compare-and-set the final outcome (`moved` checked). A KMS failure fails
//   CLOSED: retried, and on the FINAL attempt a recorded `error` row (`exhausted:hash_failed`, NULL hash) + an alarm.
// ⛔⛔ Nothing here refuses, closes, approves or time-limits a claim (invariant 1), and ⛔ nothing emits a claim event.
// ⛔ No number, name or address in a payload, a log line or an alarm — ids only.

import {
  claim as claimDomain,
  cycleCalendar,
  ids,
  withPariwarScope,
  type Db,
} from '@twt/domain';
import { QUEUE_NAMES, type Job, type JobEnvelope, type QueueClient } from '@twt/queue';
import type pg from 'pg';

import {
  CHILD_RETRY_DELAY_SECONDS,
  CHILD_RETRY_LIMIT,
  CLAIM_CORRECTION_TZ,
  CORRECTION_PLAN_LOCK_TIMEOUT,
  CORRECTION_PLAN_STATEMENT_TIMEOUT,
  CORRECTION_SWEEP_EXPIRE_SECONDS,
  CORRECTION_SWEEP_RETRY,
  DEFAULT_CORRECTION_SWEEP_BUDGET_MS,
  DEFAULT_CORRECTION_SWEEP_MAX_RUNS,
  DEFAULT_CORRECTION_SWEEP_RUN_LIMIT,
  ClaimCorrectionTransientError,
  sendClaimCorrectionSms,
  type ClaimCorrectionReminderDeps,
  type CorrectionChildAttempt,
} from './claim-correction-reminders.js';

/** The certificate machine's deps — 6.19b's, minus the staff push (CR10: ⛔ no staff push in 6.19d). */
export type ClaimCertificateReminderDeps = Omit<ClaimCorrectionReminderDeps, 'push'>;

/** The SMS child's payload — ids and dates ONLY (⛔ never a number, a name or an address). */
export interface CertificateFamilySmsPayload {
  readonly runId: string;
  readonly claimCaseId: string;
  readonly slotDay: number;
  readonly personKey: string;
  /** The IST date the sweep enqueued it for (`sent_on`). */
  readonly sentOn: string;
  readonly late: boolean;
}

/** CR10 — the District Admin's letter-chase offsets: 6.19b's (D20), reused — ⛔ never re-derived. */
const CHASE = {
  first: claimDomain.LETTER_CHASE_FIRST_OFFSET,
  last: claimDomain.LETTER_CHASE_LAST_OFFSET,
  escalation: claimDomain.LETTER_CHASE_ESCALATION_OFFSET,
} as const;

function alarmOf(deps: ClaimCertificateReminderDeps): (m: string) => void {
  return deps.onAlarm ?? ((m: string): void => console.warn(m));
}

/** The SQLSTATEs of the plan's two timeouts: `lock_not_available` (55P03) and `query_canceled` (57014). */
function isPlanTimeout(err: unknown): boolean {
  const codeOf = (e: unknown): unknown =>
    typeof e === 'object' && e !== null ? (e as { readonly code?: unknown }).code : undefined;
  const code = codeOf(err) ?? codeOf(typeof err === 'object' && err !== null ? (err as { readonly cause?: unknown }).cause : undefined);
  return code === '55P03' || code === '57014';
}

const ALARM_SAMPLE_IDS = 5;
function sampleIds(list: readonly string[]): string {
  const shown = list.slice(0, ALARM_SAMPLE_IDS).join(', ');
  return list.length > ALARM_SAMPLE_IDS ? `${shown} (+${String(list.length - ALARM_SAMPLE_IDS)} more)` : shown;
}

// ── The SWEEP ────────────────────────────────────────────────────────────────────────────────────────────────

export interface CertificateSweepResult {
  /** Claims visited (open runs + candidates). */
  readonly scannedClaims: number;
  readonly openedRuns: number;
  readonly endedRuns: number;
  readonly pausedRuns: number;
  readonly enqueuedSms: number;
  readonly staffRows: number;
  readonly finalisedStuck: number;
  /** Claims whose family cannot be reminded (⛔ no contact record / an agreement ⛔ live) — the list's flag. */
  readonly cannotRemind: number;
  readonly timedOutClaims: number;
  readonly budgetExhausted: boolean;
}

interface ClaimPlanOutcome {
  readonly opened: boolean;
  readonly ended: boolean;
  readonly paused: boolean;
  readonly cannotRemind: boolean;
  readonly sms: CertificateFamilySmsPayload[];
  readonly staffRows: number;
  readonly hashFailedPeople: number;
  readonly noWindowEntry: boolean;
  readonly recipientsMoved: boolean;
}

const IDLE: ClaimPlanOutcome = {
  opened: false,
  ended: false,
  paused: false,
  cannotRemind: false,
  sms: [],
  staffRows: 0,
  hashFailedPeople: 0,
  noWindowEntry: false,
  recipientsMoved: false,
};

type EnqueueBoss = Pick<QueueClient, 'send'>;

/**
 * ⭐ THE DAILY SWEEP (CR4). See the module header. A per-claim try/catch — one claim's failure never costs another its
 * reminder; the next tick retries it.
 */
export async function runCertificateReminderSweep(
  deps: ClaimCertificateReminderDeps,
  boss: EnqueueBoss,
): Promise<CertificateSweepResult> {
  const alarm = alarmOf(deps);
  const now = deps.now?.() ?? new Date();
  const today = cycleCalendar.istDateOf(now);
  const limit = Math.max(1, deps.runLimit ?? DEFAULT_CORRECTION_SWEEP_RUN_LIMIT);
  const maxClaims = Math.max(1, deps.maxRuns ?? DEFAULT_CORRECTION_SWEEP_MAX_RUNS);
  const clockMs = deps.elapsedClockMs ?? ((): number => performance.now());
  const startedMs = clockMs();
  const budgetMs = Math.max(0, deps.sweepBudgetMs ?? DEFAULT_CORRECTION_SWEEP_BUDGET_MS);
  const allow: string[] | null = deps.pariwarAllowlist ? [...deps.pariwarAllowlist] : null;
  const empty: CertificateSweepResult = {
    scannedClaims: 0,
    openedRuns: 0,
    endedRuns: 0,
    pausedRuns: 0,
    enqueuedSms: 0,
    staffRows: 0,
    finalisedStuck: 0,
    cannotRemind: 0,
    timedOutClaims: 0,
    budgetExhausted: false,
  };
  if (allow !== null && process.env['NODE_ENV'] === 'production') {
    alarm('[jobs] claim-certificate-sweep: REFUSED — `pariwarAllowlist` is set while NODE_ENV is production (it is test-only); nothing was swept');
    return empty;
  }
  if (allow !== null && allow.length === 0) {
    alarm('[jobs] claim-certificate-sweep: REFUSED — `pariwarAllowlist` is EMPTY (it would sweep ⛔ no tenant); nothing was swept');
    return empty;
  }

  // (1) THE EXHAUSTED-ROW FINALISER — a CROSS-TENANT WRITE on the BYPASSRLS pool, deliberately (6.19b's family-9
  // reasoning: a time bound over every tenant's rows; its predicate and effect read and write ⛔ nothing tenant-derived).
  // The hash is KEPT (CR7) — an exhausted `error` row carries the number attempted.
  const stuck = await deps.pool.query<{ claim_case_id: string }>(
    `UPDATE claim_certificate_reminders
        SET outcome = 'error',
            first_detail = COALESCE(first_detail, detail),
            detail = 'exhausted:attempting_past_day',
            updated_at = clock_timestamp()
      WHERE outcome = 'attempting' AND claimed_at < $1
        AND ($2::uuid[] IS NULL OR pariwar_id = ANY($2::uuid[]))
      RETURNING claim_case_id`,
    [cycleCalendar.istMidnightAt(today), allow],
  );
  if (stuck.rows.length > 0) {
    alarm(
      `[jobs] claim-certificate-sweep: finalised ${String(stuck.rows.length)} reminder(s) still 'attempting' from a previous IST ` +
        `day to 'error' (claims: ${sampleIds([...new Set(stuck.rows.map((r) => r.claim_case_id))])})`,
    );
  }

  // (2) THE CLAIMS — open runs first, then the candidates (a claim with an open run is ⛔ never a candidate).
  let scannedClaims = 0;
  let openedRuns = 0;
  let endedRuns = 0;
  let pausedRuns = 0;
  let enqueuedSms = 0;
  let staffRows = 0;
  let cannotRemind = 0;
  let budgetExhausted = false;
  let bounded = false;
  const timedOut: string[] = [];
  const hashFailedClaims: string[] = [];
  const noWindowEntry: string[] = [];
  const movedClaims: string[] = [];

  const visit = async (row: { readonly claimCaseId: string; readonly pariwarId: string }): Promise<void> => {
    scannedClaims += 1;
    try {
      const out = await planClaim(deps, row, today, alarm);
      if (out.opened) openedRuns += 1;
      if (out.ended) endedRuns += 1;
      if (out.paused) pausedRuns += 1;
      if (out.cannotRemind) cannotRemind += 1;
      staffRows += out.staffRows;
      if (out.hashFailedPeople > 0) hashFailedClaims.push(row.claimCaseId);
      if (out.noWindowEntry) noWindowEntry.push(row.claimCaseId);
      if (out.recipientsMoved) movedClaims.push(row.claimCaseId);
      for (const sms of out.sms) {
        try {
          await boss.send(
            QUEUE_NAMES.CLAIM_CERTIFICATE_FAMILY_SMS,
            {
              pariwarId: row.pariwarId,
              requestId: `claim.certificate:${sms.runId}:${today}`,
              actorId: null,
              traceId: `claim.certificate:${sms.runId}:${today}`,
              payload: sms,
            } satisfies JobEnvelope<CertificateFamilySmsPayload>,
            {
              // ⚠ A LABEL only — the `standard` policy enforces ⛔ no singleton uniqueness; the table is the dedup.
              singletonKey: `${sms.runId}:${String(sms.slotDay)}:${sms.personKey}:family_sms:`,
              retryLimit: CHILD_RETRY_LIMIT,
              retryDelay: CHILD_RETRY_DELAY_SECONDS,
              retryBackoff: true,
            },
          );
          enqueuedSms += 1;
        } catch (err) {
          alarm(`[jobs] claim-certificate-sweep: failed to enqueue a family SMS for run ${sms.runId} — ${String(err)}`);
        }
      }
    } catch (err) {
      if (isPlanTimeout(err)) timedOut.push(row.claimCaseId);
      else alarm(`[jobs] claim-certificate-sweep: claim ${row.claimCaseId} failed — ${String(err)}`);
    }
  };

  const overBudget = (): boolean => {
    if (clockMs() - startedMs > budgetMs) budgetExhausted = true;
    return budgetExhausted;
  };

  // (2a) the OPEN runs, keyset on `run_id`.
  let runCursor: string | null = null;
  openRuns: for (;;) {
    const page = await claimDomain.listOpenCertificateRunsPage(deps.pool, { afterRunId: runCursor, limit, allow });
    for (const r of page) {
      if (scannedClaims >= maxClaims) {
        bounded = true;
        break openRuns;
      }
      if (overBudget()) break openRuns;
      await visit({ claimCaseId: r.claimCaseId, pariwarId: r.pariwarId });
    }
    if (page.length < Math.min(limit, claimDomain.CERTIFICATE_SWEEP_PAGE_CAP)) break;
    runCursor = page[page.length - 1]!.runId;
  }
  // (2b) the CANDIDATES, keyset on `claim_case_id` — ⚠ re-reads ⛔ no claim (2a) visited: the query excludes every
  // claim with an open run, and (2a) only ENDS runs or opens them on claims it visits (a claim (2a) ended today
  // re-appears here, re-planned under the lock — idempotent).
  let claimCursor: string | null = null;
  if (!budgetExhausted && !bounded) {
    candidates: for (;;) {
      const page = await claimDomain.listCertificateCandidateClaimsPage(deps.pool, { afterClaimCaseId: claimCursor, limit, allow });
      for (const c of page) {
        if (scannedClaims >= maxClaims) {
          bounded = true;
          break candidates;
        }
        if (overBudget()) break candidates;
        await visit(c);
      }
      if (page.length < Math.min(limit, claimDomain.CERTIFICATE_SWEEP_PAGE_CAP)) break;
      claimCursor = page[page.length - 1]!.claimCaseId;
    }
  }

  if (hashFailedClaims.length > 0) {
    alarm(
      `[jobs] claim-certificate-sweep: a person's current number could not be hashed on ${String(hashFailedClaims.length)} ` +
        `claim(s) — today's plan used each one's last row's number (claims: ${sampleIds(hashFailedClaims)})`,
    );
  }
  if (noWindowEntry.length > 0) {
    alarm(
      `[jobs] claim-certificate-sweep: ${String(noWindowEntry.length)} claim(s) in the review window with ⛔ no certificate have ⛔ no ` +
        `'claim.peer_mesh_pinged' event — ⛔ no run opened, ⛔ no day 0 guessed (claims: ${sampleIds(noWindowEntry)})`,
    );
  }
  if (movedClaims.length > 0) {
    // ⚠ Code review, 2026-10-03: this also fires when ⛔ nothing in the contact record itself changed — only the
    // plan's eligibility classification (`mayRemind`) flipped between the pre-lock read and the re-plan under the
    // lock (a legitimate timing window, ⛔ not necessarily an edit). Worded to cover both causes.
    alarm(
      `[jobs] claim-certificate-sweep: the recipients (or the plan's eligibility) moved between the hash and the lock ` +
        `on ${String(movedClaims.length)} claim(s) — ⛔ no family SMS planned for them today (claims: ${sampleIds(movedClaims)})`,
    );
  }
  if (timedOut.length > 0) {
    alarm(
      `[jobs] claim-certificate-sweep: ${String(timedOut.length)} claim(s) hit the plan's lock_timeout (${CORRECTION_PLAN_LOCK_TIMEOUT}) ` +
        `or statement_timeout and were ⛔ NOT swept today (claims: ${sampleIds(timedOut)})`,
    );
  }
  if (budgetExhausted) {
    alarm(
      `[jobs] claim-certificate-sweep: ran out of its ${String(Math.round(budgetMs / 60_000))}-minute budget after ` +
        `${String(scannedClaims)} claim(s) — the rest were ⛔ NOT swept today`,
    );
  } else if (bounded) {
    alarm(`[jobs] claim-certificate-sweep: hit the hard bound of ${String(maxClaims)} claims — the rest were ⛔ NOT swept today`);
  }

  const result: CertificateSweepResult = {
    scannedClaims,
    openedRuns,
    endedRuns,
    pausedRuns,
    enqueuedSms,
    staffRows,
    finalisedStuck: stuck.rows.length,
    cannotRemind,
    timedOutClaims: timedOut.length,
    budgetExhausted,
  };
  console.info('[jobs] claim-certificate-sweep', JSON.stringify(result));
  return result;
}

/**
 * Plan ONE claim for today (the sweep's step 3). Tx A reads (⛔ no lock); the KMS hashes run with ⛔ no transaction
 * open; tx B takes the claim-row lock (bounded by `lock_timeout` FIRST), re-plans, and acts.
 */
async function planClaim(
  deps: ClaimCertificateReminderDeps,
  row: { readonly claimCaseId: string; readonly pariwarId: string },
  today: string,
  alarm: (m: string) => void,
): Promise<ClaimPlanOutcome> {
  const pariwarId = ids.pariwarId(row.pariwarId);
  const claimCaseId = ids.claimId(row.claimCaseId);

  // ── Tx A — the facts and the people (⛔ no lock, ⛔ no KMS) ──
  const pre = await withPariwarScope(deps.pool, row.pariwarId, async (db: Db) => {
    const facts = await claimDomain.readCertificatePlanFacts(db, pariwarId, claimCaseId);
    if (facts === null) return null;
    const plan = claimDomain.planCertificateRun(facts, today);
    const mayRemind = plan.kind === 'continue' || (plan.kind === 'open' && !plan.completeAtOnce);
    const recipients = mayRemind ? await claimDomain.readCertificateRecipients(db, pariwarId, claimCaseId) : null;
    return { plan, recipients };
  });
  if (pre === null) return IDLE;
  if (pre.plan.kind === 'none') return pre.plan.alarm === 'no_window_entry' ? { ...IDLE, noWindowEntry: true } : IDLE;

  // ── The hashes — EVERY person's current number, BEFORE the lock (CR7) ──
  const people = pre.recipients?.cannotRemind === null ? pre.recipients.people : [];
  const hashes = await claimDomain.hashCertificateRecipients(people, row.pariwarId, deps.encryption);
  const hashFailedPeople = [...hashes.values()].filter((h) => 'failed' in h).length;

  // ── Tx B — the claim-row lock, the re-plan, the act ──
  return withPariwarScope(deps.pool, row.pariwarId, async (db: Db, client: pg.PoolClient): Promise<ClaimPlanOutcome> => {
    await client.query(`SET LOCAL lock_timeout = '${CORRECTION_PLAN_LOCK_TIMEOUT}'`);
    await client.query(`SET LOCAL statement_timeout = '${CORRECTION_PLAN_STATEMENT_TIMEOUT}'`);
    if ((await claimDomain.lockCertificateClaim(db, pariwarId, claimCaseId)) === null) return IDLE;
    const facts = await claimDomain.readCertificatePlanFacts(db, pariwarId, claimCaseId);
    if (facts === null) return IDLE;
    const plan = claimDomain.planCertificateRun(facts, today);
    const base = { ...IDLE, hashFailedPeople };

    let run: { readonly runId: string; readonly day0: string } | null = null;
    let opened = false;
    switch (plan.kind) {
      case 'none':
        return plan.alarm === 'no_window_entry' ? { ...base, noWindowEntry: true } : base;
      case 'end':
        return { ...base, ended: await claimDomain.endCertificateRun(db, { pariwarId, claimCaseId, runId: plan.runId, reason: plan.reason }) };
      case 'pause':
        // ⛔ No send, ⛔ no record; the calendar runs on (CR5).
        return { ...base, paused: true };
      case 'open': {
        const res = await claimDomain.openCertificateRun(client, { pariwarId, claimCaseId, plan, today });
        if (res.status !== 'opened') return base;
        opened = true;
        if (res.run.endedAt !== null) return { ...base, opened: true }; // opened AND completed at once — ⛔ no send
        run = { runId: res.run.runId, day0: res.run.day0 };
        break;
      }
      case 'continue': {
        const open = facts.openRun!;
        run = { runId: open.runId, day0: open.day0 };
        break;
      }
      default: {
        const unreachable: never = plan;
        throw new Error(`[jobs] claim-certificate-sweep: unhandled plan.kind ${JSON.stringify(unreachable)}`);
      }
    }

    // ── Today's sends for the open run (CR4, CR6, CR8) ──
    const runDay = claimDomain.certificateRunDay(run.day0, today);
    const recipients = await claimDomain.readCertificateRecipients(db, pariwarId, claimCaseId);
    if (recipients.cannotRemind !== null) {
      // ⛔ No family send, ⛔ no record, ⛔ no chase (a letter cannot be recorded either) — the list's flag (CR6).
      return { ...base, opened, cannotRemind: true };
    }
    const before = new Map(people.map((p) => [p.personKey, p]));
    if (
      recipients.people.length !== before.size ||
      recipients.people.some((p) => !claimDomain.samePersonSource(p, before.get(p.personKey)))
    ) {
      // The record moved between the hash and the lock — ⛔ plan nothing on stale hashes; tomorrow re-plans.
      return { ...base, opened, recipientsMoved: true };
    }
    const rows = await claimDomain.readClaimCertificateFamilyRows(db, pariwarId, claimCaseId);
    const letters = await claimDomain.readClaimCertificateLetters(db, pariwarId, claimCaseId);
    const states = claimDomain.evaluateCertificatePersonStates(recipients.people, rows, letters, hashes);

    const sms: CertificateFamilySmsPayload[] = [];
    for (const s of states) {
      if (s.numberLetterDelivered) continue; // `-250` #1 — per NUMBER (CR6)
      const recorded = claimDomain.certificateRecordedDays(rows, run.runId, s.personKey);
      const cu = claimDomain.certificateCatchUp(recorded, runDay);
      for (const day of cu.skip) {
        await claimDomain.insertFinalCertificateReminder(db, {
          pariwarId,
          claimCaseId,
          runId: run.runId,
          slotDay: day,
          sentOn: today,
          recipientKey: s.personKey,
          purpose: 'family_sms',
          subjectKey: '',
          outcome: 'skipped_superseded',
          detail: 'catch_up',
        });
      }
      if (cu.send) {
        sms.push({ runId: run.runId, claimCaseId: row.claimCaseId, slotDay: cu.send.day, personKey: s.personKey, sentOn: today, late: cu.send.late });
      }
    }

    // ── The District Admin's letter chase + the day-13 escalation RECORD (CR10) ──
    let written = 0;
    const staffPlans = claimDomain.planCertificateStaffChase({
      day0: run.day0,
      today,
      people: states,
      staffRows: await claimDomain.readClaimCertificateStaffRows(db, pariwarId, claimCaseId),
      districtAdminKey: await districtAdminKey(db, pariwarId, claimCaseId),
      pariwarAdminKeys: await pariwarAdminKeys(db, pariwarId, alarm),
      chase: CHASE,
    });
    for (const p of staffPlans) {
      const unassigned = p.recipientKey === 'staff:unassigned';
      const inserted = await claimDomain.insertFinalCertificateReminder(db, {
        pariwarId,
        claimCaseId,
        runId: run.runId,
        slotDay: p.slotDay,
        sentOn: today,
        recipientKey: p.recipientKey,
        purpose: p.purpose,
        subjectKey: p.subjectKey,
        outcome: unassigned ? 'no_target' : 'recorded',
        late: p.late,
        detail: unassigned ? 'no_target:no_staff_recipient' : null,
      });
      if (inserted) {
        written += 1;
        if (unassigned) {
          alarm(
            `[jobs] claim-certificate-sweep: ⛔ no ${p.purpose === 'letter_escalation' ? 'Pariwar Admin' : 'live shepherd'} for claim ` +
              `${row.claimCaseId} — the ${p.purpose} is recorded with no one to see it`,
          );
        }
      }
    }
    return { ...base, opened, sms, staffRows: written };
  });
}

async function districtAdminKey(db: Db, pariwarId: ReturnType<typeof ids.pariwarId>, claimCaseId: ReturnType<typeof ids.claimId>): Promise<string> {
  const shepherd = await claimDomain.getLiveShepherd(db, pariwarId, claimCaseId);
  return shepherd ? `staff:${shepherd.shepherdActorId}` : 'staff:unassigned';
}

async function pariwarAdminKeys(
  db: Db,
  pariwarId: ReturnType<typeof ids.pariwarId>,
  alarm: (m: string) => void,
): Promise<string[]> {
  const admins = await claimDomain.listAdminsByRole(db, pariwarId, 'pariwar_admin');
  if (admins.truncated) {
    alarm(`[jobs] claim-certificate-sweep: pariwar ${pariwarId} has MORE than 50 active Pariwar Admins — the escalation record is incomplete`);
  }
  return admins.entries.length > 0 ? admins.entries.map((a) => `staff:${a.userId}`) : ['staff:unassigned'];
}

// ── The CHILD — one certificate SMS ───────────────────────────────────────────────────────────────────────────

export type CertificateFamilySmsChildResult =
  | { readonly status: 'sent'; readonly outcome: string }
  | { readonly status: 'skipped'; readonly reason: claimDomain.CertificateSkipReason | 'stale_slot' }
  | { readonly status: 'noop'; readonly reason: string };

/**
 * ⭐ ONE certificate SMS (CR6–CR8). See the module header. A failed re-check completes ⛔ without throwing.
 * @throws ClaimCorrectionTransientError  a transient failure (pg-boss retries the SAME job)
 */
export async function runCertificateFamilySmsChild(
  deps: ClaimCertificateReminderDeps,
  envelope: JobEnvelope<CertificateFamilySmsPayload>,
  jobId: string,
  attempt?: CorrectionChildAttempt,
): Promise<CertificateFamilySmsChildResult> {
  const alarm = alarmOf(deps);
  const now = deps.now?.() ?? new Date();
  const p = envelope.payload;
  const pid = envelope.pariwarId;
  if (pid === null || pid === '') {
    alarm(`[jobs] claim-certificate-sms: missing pariwarId for run ${p.runId}`);
    return { status: 'noop', reason: 'missing_pariwar' };
  }
  const pariwarId = ids.pariwarId(pid);
  const claimCaseId = ids.claimId(p.claimCaseId);
  const key = {
    pariwarId,
    claimCaseId,
    runId: p.runId,
    slotDay: p.slotDay,
    recipientKey: p.personKey,
    purpose: 'family_sms' as const,
    subjectKey: '',
  };

  // ⭐ A STALE child (enqueued for an EARLIER IST day) ⛔ never sends that day's slot today: today's sweep owns today.
  // THIS job's own `attempting` row (a retry that crossed midnight) → `error`, `exhausted:crossed_midnight` + alarm.
  if (p.sentOn < cycleCalendar.istDateOf(now)) {
    const expired = await withPariwarScope(deps.pool, pid, async (db: Db, client: pg.PoolClient) => {
      await client.query(`SET LOCAL lock_timeout = '${CORRECTION_PLAN_LOCK_TIMEOUT}'`);
      await claimDomain.lockCertificateClaim(db, pariwarId, claimCaseId);
      const own = await claimDomain.readCertificateReminder(db, key);
      if (own === null || own.outcome !== 'attempting' || own.claimedByJob !== jobId) return false;
      return claimDomain.expireOwnCertificateReminder(db, { pariwarId, reminderId: own.reminderId, jobId, detail: 'exhausted:crossed_midnight' });
    });
    if (expired) {
      alarm(
        `[jobs] claim-certificate-sms: run ${p.runId} slot ${String(p.slotDay)} (claim ${p.claimCaseId}) was still 'attempting' ` +
          `past IST midnight — recorded 'error' (exhausted:crossed_midnight), ⛔ no catch-up for it`,
      );
    }
    return { status: 'skipped', reason: 'stale_slot' };
  }

  // ── BEFORE the lock: the people, EVERY person's hash, and THIS person's own number (CR7 — ⛔ no KMS under it) ──
  const recipients = await withPariwarScope(deps.pool, pid, (db: Db) =>
    claimDomain.readCertificateRecipients(db, pariwarId, claimCaseId),
  );
  const people = recipients.cannotRemind === null ? recipients.people : [];
  const hashes = await claimDomain.hashCertificateRecipients(people, pid, deps.encryption);
  const me = people.find((x) => x.personKey === p.personKey);
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
    const finalAttempt = attempt !== undefined && attempt.retryCount >= attempt.retryLimit;
    if (finalAttempt) {
      // ⭐ CR8 — a RECORDED `error` row (NULL hash, `exhausted:hash_failed`): non-evidential, and a recorded day, so it is
      // ⛔ never caught up `late` tomorrow.
      const written = await withPariwarScope(deps.pool, pid, async (_db: Db, client: pg.PoolClient) => {
        await client.query(`SET LOCAL lock_timeout = '${CORRECTION_PLAN_LOCK_TIMEOUT}'`);
        return claimDomain.recordCertificateHashFailure(client, {
          pariwarId,
          claimCaseId,
          runId: p.runId,
          slotDay: p.slotDay,
          personKey: p.personKey,
          sentOn: p.sentOn,
          late: p.late,
        });
      });
      alarm(
        `[jobs] claim-certificate-sms: the number for run ${p.runId} slot ${String(p.slotDay)} (claim ${p.claimCaseId}) could not ` +
          `be decrypted or hashed on the FINAL attempt — ${written ? "recorded 'error' (exhausted:hash_failed)" : 'a row already existed'}`,
      );
      return { status: 'noop', reason: 'hash_failed' };
    }
    if ((attempt?.retryCount ?? 0) === 0) {
      alarm(`[jobs] claim-certificate-sms: the number for run ${p.runId} slot ${String(p.slotDay)} (claim ${p.claimCaseId}) could not be hashed — retrying`);
    }
    throw new ClaimCorrectionTransientError(`[jobs] claim-certificate-sms: transient hash_failed:tier1 for run ${p.runId}`);
  }

  // ── Under the claim-row lock: the re-check and the claim ──
  let begun: claimDomain.BeginCertificateFamilySendResult;
  try {
    begun = await withPariwarScope(deps.pool, pid, async (_db: Db, client: pg.PoolClient) => {
      await client.query(`SET LOCAL lock_timeout = '${CORRECTION_PLAN_LOCK_TIMEOUT}'`);
      return claimDomain.beginCertificateFamilySend(client, {
        pariwarId,
        claimCaseId,
        runId: p.runId,
        slotDay: p.slotDay,
        personKey: p.personKey,
        sentOn: p.sentOn,
        late: p.late,
        jobId,
        now,
        prelock: { people, hashes },
      });
    });
  } catch (err) {
    if (err instanceof claimDomain.CertificateRecipientsMovedError) {
      throw new ClaimCorrectionTransientError(`[jobs] claim-certificate-sms: the contact record moved for run ${p.runId} — retrying`);
    }
    throw err;
  }
  if (begun.kind === 'skipped') {
    if (begun.expiredAttempt === true) {
      alarm(
        `[jobs] claim-certificate-sms: run ${p.runId} slot ${String(p.slotDay)} (claim ${p.claimCaseId}) — the re-check now fails ` +
          `(${begun.reason}) after an attempt already ran; recorded 'error' (exhausted:recheck_${begun.reason})`,
      );
    }
    return { status: 'skipped', reason: begun.reason };
  }
  if (begun.kind === 'noop') return { status: 'noop', reason: begun.reason };
  if (begun.kind === 'no_target') return { status: 'sent', outcome: 'no_target' };
  if (e164 === null) {
    // Unreachable: a person whose number resolves to nothing has a NULL hash and got `no_target` above.
    throw new ClaimCorrectionTransientError(`[jobs] claim-certificate-sms: no number for a claimed row on run ${p.runId}`);
  }

  // ── After the commit: send, then compare-and-set ──
  const result = await sendClaimCorrectionSms(deps, {
    message: 'certificate_reminder',
    locale: begun.contactLocale,
    pariwarId: pid,
    claimCaseId: p.claimCaseId,
    e164,
  });
  if (result.kind === 'transient') {
    await withPariwarScope(deps.pool, pid, (db: Db) =>
      claimDomain.noteCertificateReminderTransient(db, { pariwarId, reminderId: begun.reminderId, jobId, detail: result.detail }),
    );
    throw new ClaimCorrectionTransientError(`[jobs] claim-certificate-sms: transient ${result.detail} for run ${p.runId}`);
  }
  if (result.outcome !== 'accepted' && result.alarm) {
    alarm(`[jobs] claim-certificate-sms: ${result.detail} for claim ${p.claimCaseId} run ${p.runId} — recorded error (fail-closed)`);
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
  if (!moved) {
    alarm(`[jobs] claim-certificate-sms: the row for run ${p.runId} slot ${String(p.slotDay)} moved on before its finalise (the outcome was ${result.outcome})`);
  }
  return { status: 'sent', outcome: result.outcome };
}

// ── Registration ─────────────────────────────────────────────────────────────────────────────────────────────

/** The daily cron — 10:00 IST (`-250` #5's hour, adopted by `-259` cl.1). */
export const CERTIFICATE_REMINDER_SWEEP_CRON = '0 10 * * *';

/** Register the two queues, their workers and the daily 10:00 IST sweep (CR4). */
export async function registerClaimCertificateReminderWorkers(
  boss: QueueClient,
  deps: ClaimCertificateReminderDeps,
  opts: { readonly sweepCron?: string; readonly tz?: string } = {},
): Promise<void> {
  await boss.createQueue(QUEUE_NAMES.CLAIM_CERTIFICATE_FAMILY_SMS);
  // `includeMetadata` — the child reads its retry count (the final attempt records a hash failure).
  await boss.work(QUEUE_NAMES.CLAIM_CERTIFICATE_FAMILY_SMS, { includeMetadata: true }, async (jobs: Job[]) => {
    const results = [];
    for (const job of jobs) {
      const meta = job as Job & { readonly retryCount?: unknown; readonly retryLimit?: unknown };
      const attempt =
        typeof meta.retryCount === 'number' && typeof meta.retryLimit === 'number'
          ? { retryCount: meta.retryCount, retryLimit: meta.retryLimit }
          : undefined;
      results.push(
        await runCertificateFamilySmsChild(deps, job.data as JobEnvelope<CertificateFamilySmsPayload>, job.id, attempt),
      );
    }
    return { processed: results.length, results };
  });

  // ⚠ The expiry is set TWICE on purpose (6.19b's lesson): `createQueue` keeps an existing queue's default, while
  // `schedule` upserts its options on every boot and pg-boss copies them onto each job it fires.
  await boss.createQueue(QUEUE_NAMES.CLAIM_CERTIFICATE_REMINDER_SWEEP, { expireInSeconds: CORRECTION_SWEEP_EXPIRE_SECONDS });
  await boss.work(QUEUE_NAMES.CLAIM_CERTIFICATE_REMINDER_SWEEP, async (jobs: Job[]) => {
    try {
      const swept = await runCertificateReminderSweep(deps, boss);
      console.info('[jobs] claim-certificate-sweep tick', JSON.stringify({ jobs: jobs.length, ...swept }));
      return swept;
    } catch (err) {
      console.error('[jobs] claim-certificate-sweep tick failed', err);
      throw err;
    }
  });
  await boss.schedule(
    QUEUE_NAMES.CLAIM_CERTIFICATE_REMINDER_SWEEP,
    opts.sweepCron ?? CERTIFICATE_REMINDER_SWEEP_CRON,
    {},
    { tz: opts.tz ?? CLAIM_CORRECTION_TZ, ...CORRECTION_SWEEP_RETRY, expireInSeconds: CORRECTION_SWEEP_EXPIRE_SECONDS },
  );
}
