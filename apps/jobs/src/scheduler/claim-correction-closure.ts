// The claim-correction CLOSURE SWEEP and the CLOSURE-NOTICE child — Story 6.19c (Task 3; AC6, AC14, AC17;
// `2026-10-01-273` §3a, §5, §6; `-274` 2). The scan, the queues, the SMS send and the pushes; the per-claim work is
// the domain's (`claim/correction-closure-jobs.ts` — testable without pg-boss).
//
// ── What runs when (daily 10:00 IST, beside 6.19b's reminder sweep) ─────────────────────────────────────────────
// (A) The LIVE returns that have a run whose day 0 is ≥ 90 days ago — a bounded cross-tenant read on the BYPASSRLS
//     pool, alarmed at its cap — each planned in ONE scope transaction under the trustee lock (`planClosureReturn`,
//     with `lock_timeout` / `statement_timeout`; a timed-out claim is skipped for the day, counted, one alarm): the staff
//     case's day-90 escalation RECORD, the District Admin's closure reminders (family run days 90–96) and the day-97
//     Pariwar Admin escalation, and — while HELD — the Super Admin's 30-day and each directee's reminder.
// (B) The CLOSED closures whose notice is ⛔ done, or that closed within the letter chase's window — each planned the same
//     way (`planClosedClosure`): the notice's recipients still owed a final row are ENQUEUED (one child each); the
//     closure-letter chase rows are written.
// Then one staff PUSH per staff member with a 6.19c row today (the 6.19b push child — it lists both stories' items).
// ⭐ The Super Admins are read ONCE per Pariwar per tick on the BYPASSRLS pool (`listSuperAdmins` — a global grant lives
// under another Pariwar, so a scoped read cannot see it).
//
// ⭐ The CHILD (one closure notice): claim the person's ONE row under the lock (`beginClosureNoticeSend`), COMMIT, then
// decrypt → hash → send (6.19b's `sendClaimCorrectionSms`, message `closure_notice`) → compare-and-set; then mark the
// closure's notice done once every recipient has a final row. It throws ONLY on a transient failure (pg-boss retries the
// SAME job, which re-claims its own row at once — `attempt_count`). ⛔ Never a name in the message (invariant 4).
//
// ⛔⛔ NOTHING here requests, approves, declines, refuses or closes a claim (invariant 1). Its ONE write beyond reminder
// rows is the staff case's escalation RECORD (`-273` §3a), through the domain.

import { bindScopedDb, claim as claimDomain, cycleCalendar, ids, withPariwarScope, type Db } from '@twt/domain';
import { QUEUE_NAMES, type Job, type JobEnvelope, type QueueClient } from '@twt/queue';
import type pg from 'pg';

import {
  CORRECTION_PLAN_LOCK_TIMEOUT,
  CORRECTION_PLAN_STATEMENT_TIMEOUT,
  CORRECTION_PUSH_RETRY,
  CORRECTION_SWEEP_EXPIRE_SECONDS,
  CORRECTION_SWEEP_RETRY,
  CHILD_RETRY_DELAY_SECONDS,
  CHILD_RETRY_LIMIT,
  CLAIM_CORRECTION_TZ,
  ClaimCorrectionTransientError,
  sendClaimCorrectionSms,
  type ClaimCorrectionReminderDeps,
  type CorrectionStaffPushPayload,
} from './claim-correction-reminders.js';

/** Each scan's bound — hitting it is ALARMED (the next tick starts again from the oldest). */
export const DEFAULT_CLOSURE_SWEEP_LIMIT = 2000;
/** (B) — a closed closure stays in the scan while its notice is ⛔ done, or for this many days (the letter chase ends at
 *  day 13, its escalation written once). */
export const CLOSURE_LETTER_SCAN_DAYS = 14;

export interface ClosureNoticePayload {
  readonly closureId: string;
  readonly claimCaseId: string;
  readonly personKey: string;
}

export interface ClosureSweepResult {
  readonly returnsScanned: number;
  readonly closuresScanned: number;
  readonly staffCasesEscalated: number;
  readonly staffRows: number;
  readonly noticesEnqueued: number;
  readonly pushesEnqueued: number;
  readonly timedOut: number;
}

type EnqueueBoss = Pick<QueueClient, 'send'>;

function alarmOf(deps: ClaimCorrectionReminderDeps): (m: string) => void {
  return deps.onAlarm ?? ((m: string): void => console.warn(m));
}

const PLAN_TIMEOUT_SQLSTATES: ReadonlySet<string> = new Set(['55P03', '57014']);
function isPlanTimeout(err: unknown): boolean {
  const codeOf = (e: unknown): unknown => (typeof e === 'object' && e !== null ? (e as { readonly code?: unknown }).code : undefined);
  const code = codeOf(err) ?? codeOf(typeof err === 'object' && err !== null ? (err as { readonly cause?: unknown }).cause : undefined);
  return typeof code === 'string' && PLAN_TIMEOUT_SQLSTATES.has(code);
}

/** Bound the plan's scope transaction FIRST (a held trustee lock elsewhere must ⛔ stall the tick). */
async function bounded(client: pg.PoolClient): Promise<void> {
  await client.query(`SET LOCAL lock_timeout = '${CORRECTION_PLAN_LOCK_TIMEOUT}'`);
  await client.query(`SET LOCAL statement_timeout = '${CORRECTION_PLAN_STATEMENT_TIMEOUT}'`);
}

/**
 * ⭐ THE DAILY CLOSURE SWEEP. See the module header. Per-claim try/catch — one claim's failure never costs another its
 * reminder; the next tick retries it.
 */
export async function runCorrectionClosureSweep(
  deps: ClaimCorrectionReminderDeps,
  boss: EnqueueBoss,
): Promise<ClosureSweepResult> {
  const alarm = alarmOf(deps);
  const now = deps.now?.() ?? new Date();
  const today = cycleCalendar.istDateOf(now);
  const limit = Math.max(1, deps.runLimit ?? DEFAULT_CLOSURE_SWEEP_LIMIT);
  const allow: string[] | null = deps.pariwarAllowlist ? [...deps.pariwarAllowlist] : null;
  const empty: ClosureSweepResult = {
    returnsScanned: 0,
    closuresScanned: 0,
    staffCasesEscalated: 0,
    staffRows: 0,
    noticesEnqueued: 0,
    pushesEnqueued: 0,
    timedOut: 0,
  };
  if (allow !== null && (process.env['NODE_ENV'] === 'production' || allow.length === 0)) {
    alarm('[jobs] claim-correction-closure-sweep: REFUSED — `pariwarAllowlist` is test-only and ⛔ empty; nothing was swept');
    return empty;
  }
  let staffRows = 0;
  let staffCasesEscalated = 0;
  let noticesEnqueued = 0;
  let pushesEnqueued = 0;
  const timedOut: string[] = [];

  // ⭐ The Super Admins ONCE per Pariwar per tick, on the BYPASSRLS pool (global grants live under another Pariwar).
  const superAdminCache = new Map<string, readonly string[]>();
  const superAdminsOf = async (pariwarId: string): Promise<readonly string[]> => {
    const cached = superAdminCache.get(pariwarId);
    if (cached !== undefined) return cached;
    const client = await deps.pool.connect();
    try {
      const found = await claimDomain.listSuperAdmins(bindUnscoped(client), ids.pariwarId(pariwarId));
      if (found.truncated) alarm(`[jobs] claim-correction-closure-sweep: MORE than 50 Super Admins — the reminder list is incomplete`);
      const list = found.entries.map((e) => e.userId);
      superAdminCache.set(pariwarId, list);
      return list;
    } finally {
      client.release();
    }
  };

  const enqueuePushes = async (pariwarId: string, claimCaseId: string, anchor: { runId: string; slotDay: number } | null, userIds: readonly string[]) => {
    if (anchor === null) return;
    for (const userId of userIds) {
      try {
        await boss.send(
          QUEUE_NAMES.CLAIM_CORRECTION_STAFF_PUSH,
          {
            pariwarId,
            requestId: `claim.correction.closure:${claimCaseId}:${today}`,
            actorId: null,
            traceId: `claim.correction.closure:${claimCaseId}:${today}`,
            payload: { claimCaseId, runId: anchor.runId, slotDay: anchor.slotDay, userId, sentOn: today },
          } satisfies JobEnvelope<CorrectionStaffPushPayload>,
          { singletonKey: `${claimCaseId}:${userId}:${today}`, ...CORRECTION_PUSH_RETRY },
        );
        pushesEnqueued += 1;
      } catch (err) {
        alarm(`[jobs] claim-correction-closure-sweep: failed to enqueue a staff push for claim ${claimCaseId} — ${String(err)}`);
      }
    }
  };

  // (A) The LIVE returns with a run ≥ 90 days old (the held claims are among them — every escalation follows day 90).
  const returns = await deps.pool.query<{ claim_case_id: string; pariwar_id: string }>(
    `SELECT DISTINCT d.claim_case_id, d.pariwar_id, min(d.decided_at) OVER (PARTITION BY d.claim_case_id) AS decided
       FROM claim_state_trustee_decisions d
       JOIN claim_correction_runs r ON r.return_decision_id = d.decision_id
      WHERE d.phase = 'correction_return' AND d.outcome = 'returned_for_correction' AND d.superseded_at IS NULL
        AND r.day0 <= ($1::date - 90)
        AND ($3::uuid[] IS NULL OR d.pariwar_id = ANY($3::uuid[]))
      ORDER BY decided, d.claim_case_id
      LIMIT $2`,
    [today, limit + 1, allow],
  );
  if (returns.rows.length > limit) {
    alarm(`[jobs] claim-correction-closure-sweep: the live-return scan hit its ${String(limit)} bound — the claims past it were ⛔ swept today`);
  }
  for (const row of returns.rows.slice(0, limit)) {
    try {
      const superAdminUserIds = await superAdminsOf(row.pariwar_id);
      const plan = await withPariwarScope(deps.pool, row.pariwar_id, async (_db: Db, client) => {
        await bounded(client);
        return claimDomain.planClosureReturn(client, {
          pariwarId: ids.pariwarId(row.pariwar_id),
          claimCaseId: ids.claimId(row.claim_case_id),
          now,
          superAdminUserIds,
        });
      });
      staffRows += plan.staffRowsWritten;
      if (plan.escalatedStaffCase) staffCasesEscalated += 1;
      await enqueuePushes(row.pariwar_id, row.claim_case_id, plan.anchor, plan.pushUserIds);
    } catch (err) {
      if (isPlanTimeout(err)) timedOut.push(row.claim_case_id);
      else alarm(`[jobs] claim-correction-closure-sweep: claim ${row.claim_case_id} failed — ${String(err)}`);
    }
  }

  // (B) The CLOSED closures — the notice outbox still due, or within the letter chase's window.
  // Code review patch (2026-10-02): the cutoff is now an explicit IST-midnight INSTANT (`istMidnightAt`), ⛔ a bare
  // `$1::date - N` SQL expression. `closed_at` is `timestamptz`; the old expression implicitly cast the computed
  // `date` to `timestamptz` using the SESSION's timezone (not necessarily IST), drifting the boundary by up to
  // 5.5 hours from the IST-day semantics this module's own header documents (the daily 10:00 IST tick).
  const letterScanCutoff = cycleCalendar.istMidnightAt(cycleCalendar.addCalendarDays(today, -CLOSURE_LETTER_SCAN_DAYS));
  const closures = await deps.pool.query<{ closure_id: string; claim_case_id: string; pariwar_id: string }>(
    `SELECT closure_id, claim_case_id, pariwar_id FROM claim_correction_closures
      WHERE state = 'closed'
        AND (closure_notice_done_at IS NULL
             OR (cardinality(closure_letter_person_keys) > 0 AND closed_at >= $3::timestamptz))
        AND ($2::uuid[] IS NULL OR pariwar_id = ANY($2::uuid[]))
      ORDER BY closed_at, closure_id
      LIMIT $1`,
    [limit + 1, allow, letterScanCutoff],
  );
  if (closures.rows.length > limit) {
    alarm(`[jobs] claim-correction-closure-sweep: the closed-closure scan hit its ${String(limit)} bound — the closures past it were ⛔ swept today`);
  }
  for (const row of closures.rows.slice(0, limit)) {
    try {
      const plan = await withPariwarScope(deps.pool, row.pariwar_id, async (_db: Db, client) => {
        await bounded(client);
        return claimDomain.planClosedClosure(client, {
          pariwarId: ids.pariwarId(row.pariwar_id),
          claimCaseId: ids.claimId(row.claim_case_id),
          closureId: row.closure_id,
          now,
        });
      });
      staffRows += plan.staffRowsWritten;
      for (const personKey of plan.noticeRecipients) {
        try {
          await boss.send(
            QUEUE_NAMES.CLAIM_CORRECTION_CLOSURE_NOTICE,
            {
              pariwarId: row.pariwar_id,
              requestId: `claim.correction.closure_notice:${row.closure_id}:${personKey}`,
              actorId: null,
              traceId: `claim.correction.closure_notice:${row.closure_id}:${personKey}`,
              payload: { closureId: row.closure_id, claimCaseId: row.claim_case_id, personKey },
            } satisfies JobEnvelope<ClosureNoticePayload>,
            {
              // ⚠ A LABEL only — the ONCE key on the reminder table is the dedup.
              singletonKey: `${row.closure_id}:${personKey}:closure_notice`,
              retryLimit: CHILD_RETRY_LIMIT,
              retryDelay: CHILD_RETRY_DELAY_SECONDS,
              retryBackoff: true,
            },
          );
          noticesEnqueued += 1;
        } catch (err) {
          alarm(`[jobs] claim-correction-closure-sweep: failed to enqueue a closure notice for closure ${row.closure_id} — ${String(err)}`);
        }
      }
      await enqueuePushes(row.pariwar_id, row.claim_case_id, plan.anchor, plan.pushUserIds);
    } catch (err) {
      if (isPlanTimeout(err)) timedOut.push(row.claim_case_id);
      else alarm(`[jobs] claim-correction-closure-sweep: closure ${row.closure_id} (claim ${row.claim_case_id}) failed — ${String(err)}`);
    }
  }

  if (timedOut.length > 0) {
    alarm(
      `[jobs] claim-correction-closure-sweep: ${String(timedOut.length)} claim(s) hit the plan's lock / statement timeout and were ⛔ swept today (claims: ${timedOut
        .slice(0, 5)
        .join(', ')}${timedOut.length > 5 ? ` (+${String(timedOut.length - 5)} more)` : ''})`,
    );
  }
  const result: ClosureSweepResult = {
    returnsScanned: Math.min(returns.rows.length, limit),
    closuresScanned: Math.min(closures.rows.length, limit),
    staffCasesEscalated,
    staffRows,
    noticesEnqueued,
    pushesEnqueued,
    timedOut: timedOut.length,
  };
  console.info('[jobs] claim-correction-closure-sweep', JSON.stringify(result));
  return result;
}

/**
 * A Drizzle handle on a BYPASSRLS pool client with ⛔ no scope set — the Super Admin read ONLY (`listSuperAdmins`: a
 * global grant lives under another Pariwar). ── DELIBERATE: a cross-tenant READ (family 9), ids and display names
 * only, ⛔ written to nothing; the module's other reads run inside `withPariwarScope`.
 */
function bindUnscoped(client: pg.PoolClient): Db {
  return bindScopedDb(client);
}

export type ClosureNoticeChildResult =
  | { readonly status: 'sent'; readonly outcome: string }
  | { readonly status: 'skipped'; readonly reason: string }
  | { readonly status: 'noop'; readonly reason: string };

/**
 * ⭐ ONE closure notice (`-273` §5). The claim happens in ONE transaction under the trustee lock
 * (`beginClosureNoticeSend`); the decrypt, the config reads and the send AFTER its commit; the row moves final by
 * compare-and-set; then the closure's notice is marked done once every recipient has a final row.
 * @throws ClaimCorrectionTransientError  a transient failure (pg-boss retries the SAME job)
 */
export async function runClosureNoticeChild(
  deps: ClaimCorrectionReminderDeps,
  envelope: JobEnvelope<ClosureNoticePayload>,
  jobId: string,
): Promise<ClosureNoticeChildResult> {
  const alarm = alarmOf(deps);
  const now = deps.now?.() ?? new Date();
  const p = envelope.payload;
  const pid = envelope.pariwarId;
  if (pid === null || pid === '') {
    alarm(`[jobs] claim-correction-closure-notice: missing pariwarId for closure ${p.closureId}`);
    return { status: 'noop', reason: 'missing_pariwar' };
  }
  const pariwarId = ids.pariwarId(pid);
  const claimCaseId = ids.claimId(p.claimCaseId);
  const begun = await withPariwarScope(deps.pool, pid, (_db, client) =>
    claimDomain.beginClosureNoticeSend(client, { pariwarId, claimCaseId, closureId: p.closureId, personKey: p.personKey, jobId, now }),
  );
  const complete = () =>
    withPariwarScope(deps.pool, pid, (db: Db) => claimDomain.completeClosureNoticeIfDone(db, pariwarId, p.closureId));
  if (begun.kind === 'noop') return { status: 'noop', reason: begun.reason };
  if (begun.kind === 'skipped') {
    await complete();
    return { status: 'skipped', reason: begun.reason };
  }

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
    throw new ClaimCorrectionTransientError(`[jobs] claim-correction-closure-notice: transient ${detail} for closure ${p.closureId}`);
  };

  let e164: string | null;
  try {
    e164 = await claimDomain.resolveCorrectionMobile(begun.person.mobileCiphertext, begun.person.mobileSource, pid, deps.encryption);
  } catch {
    return transient('decrypt_failed:tier1');
  }
  if (e164 === null) {
    const movedNoTarget = await finalise({ outcome: 'no_target', detail: 'no_target:no_sendable_number', recipientNumberHash: null });
    // Code review patch (2026-10-02): check `moved` here too, like the success path below — a lost CAS means a
    // DIFFERENT invocation already finalised (or re-claimed) this row, so reporting `sent` here would claim an
    // outcome this attempt never actually wrote. `complete()` itself stays safe either way: it re-queries the
    // real pending set from the DB, never the caller's belief (`completeClosureNoticeIfDone`).
    if (!movedNoTarget) {
      alarm(`[jobs] claim-correction-closure-notice: the row for closure ${p.closureId} moved on before its no_target finalise`);
      await complete();
      return { status: 'skipped', reason: 'moved_before_finalise' };
    }
    await complete();
    return { status: 'sent', outcome: 'no_target' };
  }
  let recipientNumberHash: string;
  try {
    recipientNumberHash = await claimDomain.correctionNumberHash(e164, pid, deps.encryption);
  } catch {
    return transient('hash_failed:tier1');
  }
  const result = await sendClaimCorrectionSms(deps, {
    message: 'closure_notice',
    locale: begun.contactLocale,
    pariwarId: pid,
    claimCaseId: p.claimCaseId,
    e164,
  });
  if (result.kind === 'transient') return transient(result.detail);
  if (result.outcome !== 'accepted' && result.alarm) {
    alarm(`[jobs] claim-correction-closure-notice: ${result.detail} for claim ${p.claimCaseId} closure ${p.closureId} — recorded error (fail-closed)`);
  }
  const moved = await finalise({
    outcome: result.outcome,
    providerMessageId: result.providerMessageId,
    detail: result.detail,
    recipientNumberHash,
  });
  await complete();
  // Code review patch (2026-10-02): a lost CAS (`!moved`) means a different invocation already finalised (or
  // re-claimed) this row — this attempt's own `result.outcome` was never actually written, so reporting `sent`
  // would claim an outcome that isn't the row's real state. `complete()` above stays correct either way.
  if (!moved) {
    alarm(`[jobs] claim-correction-closure-notice: the row for closure ${p.closureId} moved on before its finalise`);
    return { status: 'skipped', reason: 'moved_before_finalise' };
  }
  return { status: 'sent', outcome: result.outcome };
}

/** Register the closure sweep (daily 10:00 IST) and the closure-notice child. */
export async function registerClaimCorrectionClosureWorkers(
  boss: QueueClient,
  deps: ClaimCorrectionReminderDeps,
  opts: { readonly sweepCron?: string; readonly tz?: string } = {},
): Promise<void> {
  await boss.createQueue(QUEUE_NAMES.CLAIM_CORRECTION_CLOSURE_NOTICE);
  // Code review patch (2026-10-02), investigated and NOT changed: pg-boss's `work()` has no per-job
  // complete/fail signal inside one callback invocation — `#processJobs` (pg-boss 12.19.1, manager.js) calls
  // `this.complete(name, jobIds, ...)` or `this.fail(name, jobIds, err)` for the WHOLE batch based on whether
  // the single `callback(jobs)` promise resolved or rejected. A `try/catch` INSIDE this loop that swallows one
  // job's error and continues would make the callback RESOLVE, which marks every job in the batch — including
  // the one that actually failed — complete (worse than today: that job would never retry). `batchSize` defaults
  // to 1 and is not overridden here, so `jobs` is a single-element array today and this is not reachable; true
  // per-job isolation at `batchSize > 1` needs an explicit per-job `boss.complete()`/`boss.fail()` call inside
  // the loop (bypassing the callback's own resolve/reject), which is an architecture change, not a patch —
  // carried in `deferred-work.md`.
  await boss.work(QUEUE_NAMES.CLAIM_CORRECTION_CLOSURE_NOTICE, async (jobs: Job[]) => {
    const results = [];
    for (const job of jobs) {
      results.push(await runClosureNoticeChild(deps, job.data as JobEnvelope<ClosureNoticePayload>, job.id));
    }
    return { processed: results.length, results };
  });
  // ⚠ The expiry set TWICE on purpose (6.19b's reasoning): `createQueue` keeps an existing queue's default; `schedule`
  // upserts its options onto every job it fires.
  await boss.createQueue(QUEUE_NAMES.CLAIM_CORRECTION_CLOSURE_SWEEP, { expireInSeconds: CORRECTION_SWEEP_EXPIRE_SECONDS });
  await boss.work(QUEUE_NAMES.CLAIM_CORRECTION_CLOSURE_SWEEP, async (jobs: Job[]) => {
    try {
      const swept = await runCorrectionClosureSweep(deps, boss);
      console.info('[jobs] claim-correction-closure-sweep tick', JSON.stringify({ jobs: jobs.length, ...swept }));
      return swept;
    } catch (err) {
      console.error('[jobs] claim-correction-closure-sweep tick failed', err);
      throw err;
    }
  });
  await boss.schedule(
    QUEUE_NAMES.CLAIM_CORRECTION_CLOSURE_SWEEP,
    opts.sweepCron ?? claimDomain.CORRECTION_REMINDER_SWEEP_CRON,
    {},
    { tz: opts.tz ?? CLAIM_CORRECTION_TZ, ...CORRECTION_SWEEP_RETRY, expireInSeconds: CORRECTION_SWEEP_EXPIRE_SECONDS },
  );
}
