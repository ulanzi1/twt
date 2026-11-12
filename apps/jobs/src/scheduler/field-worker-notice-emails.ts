// The EMAIL of each field worker move notice — the 15-minute SWEEP and the EMAIL CHILD (Story 13.1g, Task 4.1; AC3-AC5, AC9; decision
// `2026-11-12-463` AD3-AD6, AD13; ADR-0045). ⭐ A MIRROR of Story 11b.4a's `memorial-takedown-approver-emails.ts` (itself 6.25's
// `claim-suspicion-staff-emails.ts`) — the same config check + provider pre-flight, hold park, give-up, claiming transaction,
// compare-and-set and transient classes — over Story 13.1d's channel-neutral `field_worker_notices`, one send row per notice, EVER
// (`field_worker_notice_emails`, 0206); plus 6.25's link, origin and render handling.
//
// The Panel's `-443` Q1 A: "Both District Admins are told by email and in the admin console, including when the Pariwar Admin moves a
// worker." The email goes to the notice row's recipient ONLY (I6), re-checked by Q4 under the lock (AD5 — it removes, never adds), and
// carries ONE variable: the Move requests link (AD4, `field-worker-notice-email-templates.ts`). ⭐ THE Q-2 RULE (`-463`, word for word):
// every eligible notice is emailed, seen in the console or not, its request moved on or not — EXCEPT a notice that expires under the
// held-backlog cutoff (3 IST days): ⛔ email row by the cutoff ⇒ NEVER emailed; still `attempting` 3 IST days on ⇒ given up. The
// console still has every notice.
// ⭐ ADR-0045: the child reads the address through ADR-0040's Q2 (`readAdminEmailCiphertext`, its THIRD caller) AFTER its claiming commit
// and decrypts it in memory; the plaintext exists only until the provider call. ⛔ An address in a payload, a log line, a detail or an alarm.
// ⚠ AT-LEAST-ONCE, as 6.25: a possible double is RECORDED (`may_have_sent`) and alarmed, ⛔ never hidden.
//
// ⚠ THE DATABASE ROLE (AD13; roster Rows 26 and 24 (b)) — the steps and what each needs on the login that runs them:
//     role guard (sweep)                     pg_roles — public
//     selector (i) / (ii) (sweep)            SELECT field_worker_notices, field_worker_notice_emails — cross-Pariwar
//     park, give-up (sweep)                  SELECT + UPDATE field_worker_notice_emails — cross-Pariwar
//     begin: the notice (child)              SELECT field_worker_notices — one Pariwar
//     begin / finalise / note (child)        SELECT, INSERT (0206's six columns), UPDATE field_worker_notice_emails — one Pariwar
//     Q4 (child)                             SELECT users, admin_credentials, role_grants — identity (Row 24)
//     Q2 (child)                             SELECT admin_credentials.email_ciphertext — identity (Row 24)
// In dev / CI that login is the superuser, so every live test proves BEHAVIOUR, ⛔ production privilege. In production ⛔ login holds
// these today (0205 / 0206 grant `twt_app` only; BYPASSRLS waives no GRANT): the tick's FIRST step refuses a login that cannot read
// across Pariwars (ONE `rls_bound_role` alarm), and a `42501` from any step is ONE alarm carrying `code:42501` — sending in production
// waits for Row 26 (the posture) and Row 24 (b) (Q4 joins Q1 / Q2's jobs-login reads). The 13.1d escalation sweep's header (CR37) is the
// precedent. ⚠ DELIBERATE (G18): `withPariwarScope` sets `app.pariwar_id` and ⛔ role, so on a BYPASSRLS login RLS waives every child
// statement — tenant separation rests on the explicit `pariwar_id` predicate of each (`field-worker/notice-email.ts`).
// The shared jobs pool, as 11b.4a: the child holds ⛔ connection while writing on another.
// The queue names live in `@twt/queue`'s `QUEUE_NAMES` (the registry — DD-3); the constant below is a local alias for them.

import { claim as claimDomain, encryption, fieldWorker, ids, smsDelivery, withPariwarScope, type Db } from '@twt/domain';
import { QUEUE_NAMES, type Job, type JobEnvelope, type QueueClient } from '@twt/queue';
import type pg from 'pg';

import {
  CHILD_RETRY_DELAY_SECONDS,
  CHILD_RETRY_LIMIT,
  CLAIM_CORRECTION_TZ,
  CORRECTION_SWEEP_RETRY,
  DEFAULT_CORRECTION_SWEEP_MAX_RUNS,
  DEFAULT_CORRECTION_SWEEP_RUN_LIMIT,
  ClaimCorrectionTransientError,
} from './claim-correction-reminders.js';
import { STAFF_EMAIL_SWEEP_BUDGET_MS, STAFF_EMAIL_SWEEP_CRON, STAFF_EMAIL_SWEEP_EXPIRE_SECONDS } from './claim-suspicion-staff-emails.js';
import { renderFieldWorkerNoticeEmail, fieldWorkerNoticeEmailLink, type RenderedFieldWorkerNoticeEmail } from './field-worker-notice-email-templates.js';
import { STAFF_EMAIL_SEND_TIMEOUT_MS, isSendableEmailAddress, type StaffEmailClient, type StaffEmailSendResult } from './staff-email-client.js';
import { resolveAdminAppOrigin } from './staff-email-config.js';

/** The two queues — from the `QUEUE_NAMES` registry. */
export const FIELD_WORKER_NOTICE_EMAIL_QUEUES = {
  SWEEP: QUEUE_NAMES.FIELD_WORKER_NOTICE_EMAIL_SWEEP,
  SEND: QUEUE_NAMES.FIELD_WORKER_NOTICE_EMAIL_SEND,
} as const;

const ALARM = '[jobs] field-worker-notice-email';

export interface FieldWorkerNoticeEmailDeps {
  /** The jobs pool — the cross-tenant selector, park and give-up, and the `withPariwarScope` pool (AD13: a login that reads across Pariwars). */
  readonly pool: pg.Pool;
  /** The jobs KMS deps — the admin KEK (the admin email's decrypt, AFTER the claiming commit). */
  readonly encryption: encryption.FieldCryptoDeps;
  readonly staffEmail: StaffEmailClient;
  /** `ADMIN_APP_ORIGIN` — the link's origin (https only; `resolveAdminAppOrigin`). Unset / invalid ⇒ every email HELD. */
  readonly adminAppOrigin: string | null | undefined;
  readonly now?: () => Date;
  readonly onAlarm?: (message: string) => void;
  readonly runLimit?: number;
  readonly maxNotices?: number;
  readonly sweepBudgetMs?: number;
  readonly elapsedClockMs?: () => number;
  readonly sendTimeoutMs?: number;
  /** ⚠ TESTS ONLY — restrict every cross-tenant statement to these Pariwars. EMPTY or in production ⇒ REFUSED (alarmed). */
  readonly pariwarAllowlist?: readonly string[];
}

/** The child's payload — ids ONLY (the notice; its Pariwar rides the envelope). */
export interface FieldWorkerNoticeEmailPayload {
  readonly noticeId: string;
}

function alarmOf(deps: FieldWorkerNoticeEmailDeps): (m: string) => void {
  return deps.onAlarm ?? ((m: string): void => console.warn(m));
}

const ALARM_SAMPLE_IDS = 5;
function sampleIds(list: readonly string[]): string {
  const shown = list.slice(0, ALARM_SAMPLE_IDS).join(', ');
  return list.length > ALARM_SAMPLE_IDS ? `${shown} (+${String(list.length - ALARM_SAMPLE_IDS)} more)` : shown;
}

/** The CLASS of a thrown error — a SQLSTATE (`code:42501`), else its name (13.1d's escalation sweep, CR33 / CR37). */
function faultClass(err: unknown): string {
  const e = err as { code?: unknown; sqlstate?: unknown } | null | undefined;
  for (const c of [e?.code, e?.sqlstate]) {
    if (typeof c === 'string' && /^[A-Z0-9_]{3,24}$/.test(c)) return `code:${c}`;
  }
  return err instanceof Error ? err.name : typeof err;
}

/** The config gap (⛔ the pre-flight): the provider's own gap, then the link's origin (6.25's). `null` when ready. */
function configGap(deps: FieldWorkerNoticeEmailDeps): string | null {
  return deps.staffEmail.configGap() ?? (resolveAdminAppOrigin(deps.adminAppOrigin) === null ? 'config:admin_app_origin_invalid' : null);
}

// ── The SWEEP ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface FieldWorkerNoticeEmailSweepResult {
  /** The login cannot read across Pariwars (AD13) — nothing selected, parked, given up or sent. */
  readonly refused: boolean;
  /** A step threw (e.g. `code:42501`) — ONE alarm, the tick ended. */
  readonly failed: string | null;
  readonly scannedNotices: number;
  readonly enqueued: number;
  readonly heldForConfig: number;
  readonly finalisedStuck: number;
  readonly budgetExhausted: boolean;
}

type EnqueueBoss = Pick<QueueClient, 'send'>;

/** ⭐ THE 15-MINUTE SWEEP — step 0 the role guard, then 6.25's steps (1)–(4) on the notice send table. It always resolves. */
export async function runFieldWorkerNoticeEmailSweep(deps: FieldWorkerNoticeEmailDeps, boss: EnqueueBoss): Promise<FieldWorkerNoticeEmailSweepResult> {
  const alarm = alarmOf(deps);
  const now = deps.now?.() ?? new Date();
  const limit = Math.max(1, deps.runLimit ?? DEFAULT_CORRECTION_SWEEP_RUN_LIMIT);
  const maxNotices = Math.max(1, deps.maxNotices ?? DEFAULT_CORRECTION_SWEEP_MAX_RUNS);
  const clockMs = deps.elapsedClockMs ?? ((): number => performance.now());
  const startedMs = clockMs();
  const budgetMs = Math.max(0, deps.sweepBudgetMs ?? STAFF_EMAIL_SWEEP_BUDGET_MS);
  const allow: string[] | null = deps.pariwarAllowlist ? [...deps.pariwarAllowlist] : null;
  const empty = { refused: false, failed: null, scannedNotices: 0, enqueued: 0, heldForConfig: 0, finalisedStuck: 0, budgetExhausted: false };
  if (allow !== null && process.env['NODE_ENV'] === 'production') {
    alarm(`${ALARM}-sweep: REFUSED — \`pariwarAllowlist\` is set while NODE_ENV is production (it is test-only); nothing was swept`);
    return empty;
  }
  if (allow !== null && allow.length === 0) {
    alarm(`${ALARM}-sweep: REFUSED — \`pariwarAllowlist\` is EMPTY (it would sweep ⛔ tenant); nothing was swept`);
    return empty;
  }

  let scannedNotices = 0;
  let enqueued = 0;
  let budgetExhausted = false;
  let bounded = false;
  let parked = 0;
  let stuck: readonly { readonly noticeId: string; readonly pariwarId: string }[] = [];
  const held: string[] = [];
  let gap: string | null = null;
  try {
    // (0) AD13 — a login that cannot read across Pariwars selects nothing and would say "nothing due": refuse, ONE alarm.
    if (!(await smsDelivery.canReadAcrossPariwars(deps.pool))) {
      alarm(
        `${ALARM}-sweep: field_worker_notice_email.rls_bound_role — the pool role cannot read across Pariwars (roster Row 26); ⛔ swept — ` +
          'a notice not emailed within 3 IST days is never emailed (the Q-2 rule); the console still has it',
      );
      return { ...empty, refused: true };
    }

    // (1) The config check + the provider pre-flight, ONCE per run; ANY failure of the pre-flight itself also holds.
    gap = configGap(deps);
    if (gap === null) {
      try {
        const pre = await deps.staffEmail.preflight({ timeoutMs: deps.sendTimeoutMs ?? STAFF_EMAIL_SEND_TIMEOUT_MS });
        gap = pre.ok ? null : pre.detail;
      } catch {
        gap = 'preflight:failed';
      }
    }

    // (2) A HELD run PARKS its stale in-flight rows; an UN-held run gives up. Both CROSS-TENANT WRITES, deliberately (the domain).
    if (gap !== null) {
      parked = await fieldWorker.parkHeldFieldWorkerNoticeEmails(deps.pool, { now, allow });
    } else {
      stuck = await fieldWorker.expireExhaustedFieldWorkerNoticeEmails(deps.pool, { cutoff: fieldWorker.fieldWorkerNoticeEmailReclaimCutoff(now), now, allow });
    }
    if (stuck.length > 0) {
      alarm(
        `${ALARM}-sweep: gave up ${String(stuck.length)} email(s) still 'attempting' after ${String(fieldWorker.FIELD_WORKER_NOTICE_EMAIL_RECLAIM_DAYS)} ` +
          `IST days — recorded 'error' (exhausted:attempting_three_days); a prior attempt may have sent (notices: ${sampleIds(stuck.map((s) => s.noticeId))})`,
      );
    }

    let after: string | null = null;
    sweep: for (;;) {
      const page = await fieldWorker.selectDueFieldWorkerNoticeEmails(deps.pool, { after, limit, now, allow });
      for (const due of page.due) {
        if (scannedNotices >= maxNotices) {
          bounded = true;
          break sweep;
        }
        if (clockMs() - startedMs > budgetMs) {
          budgetExhausted = true;
          break sweep;
        }
        scannedNotices += 1;
        // A HELD run writes ⛔ NEW row (TR5): the notice stays due; past the cutoff it ages out unsent (the Q-2 rule's exception (i)).
        if (gap !== null) {
          held.push(due.noticeId);
          continue;
        }
        // (3) ONE child per notice.
        try {
          await boss.send(
            FIELD_WORKER_NOTICE_EMAIL_QUEUES.SEND,
            {
              pariwarId: due.pariwarId,
              requestId: `field_worker.notice_email:${due.noticeId}`,
              actorId: null,
              traceId: `field_worker.notice_email:${due.noticeId}`,
              payload: { noticeId: due.noticeId },
            } satisfies JobEnvelope<FieldWorkerNoticeEmailPayload>,
            // ⚠ A LABEL only — the table's PRIMARY KEY + the notice lock + the lease are the dedup.
            { singletonKey: due.noticeId, retryLimit: CHILD_RETRY_LIMIT, retryDelay: CHILD_RETRY_DELAY_SECONDS, retryBackoff: true },
          );
          enqueued += 1;
        } catch (err) {
          alarm(`${ALARM}-sweep: failed to enqueue the email for notice ${due.noticeId} — ${err instanceof Error ? err.name : 'error'}; the next sweep derives it again`);
        }
      }
      if (page.scanned < Math.min(limit, fieldWorker.FIELD_WORKER_NOTICE_EMAIL_PAGE_CAP) || page.last === null) break;
      after = page.last;
    }
  } catch (err) {
    // AD13 — a `42501` (the production login before Row 26), or any other step's fault: ONE alarm with its class; the tick ends.
    const failed = faultClass(err);
    alarm(`${ALARM}-sweep: field_worker_notice_email.sweep_failed:${failed} — this tick emailed nothing more (roster Row 26 if code:42501)`);
    return { refused: false, failed, scannedNotices, enqueued, heldForConfig: held.length, finalisedStuck: stuck.length, budgetExhausted };
  }

  // (4) ONE end-of-run alarm for every notice a config gap held — the operator's signal (an outage of 3+ IST days loses them by design).
  if (held.length > 0) {
    alarm(
      `${ALARM}-sweep: ${String(held.length)} email(s) HELD — ${gap ?? 'config'}; this run enqueued ⛔ child for them ` +
        `(${String(parked)} in-flight row(s) newly parked); they are retried once it is fixed, unless they reach the ` +
        `${String(fieldWorker.FIELD_WORKER_NOTICE_EMAIL_RECLAIM_DAYS)}-IST-day cutoff first (notices: ${sampleIds(held)})`,
    );
  }
  if (budgetExhausted) {
    alarm(`${ALARM}-sweep: ran out of its ${String(Math.round(budgetMs / 60_000))}-minute budget after ${String(scannedNotices)} notice(s) — the rest wait for the next tick`);
  } else if (bounded) {
    alarm(`${ALARM}-sweep: hit the hard bound of ${String(maxNotices)} notices — the rest wait for the next tick`);
  }
  return { refused: false, failed: null, scannedNotices, enqueued, heldForConfig: held.length, finalisedStuck: stuck.length, budgetExhausted };
}

// ── The CHILD — one email ──────────────────────────────────────────────────────────────────────────────────────────────────

export type FieldWorkerNoticeEmailChildResult =
  | { readonly status: 'sent'; readonly outcome: 'accepted' | 'rejected' }
  | { readonly status: 'error'; readonly detail: string }
  | { readonly status: 'held_config'; readonly reason: string }
  | { readonly status: 'skipped'; readonly reason: 'already_final' | 'held_by_other' | 'not_eligible' | 'recheck_failed' }
  | { readonly status: 'noop'; readonly reason: string };

/**
 * ⭐ ONE email. A recipient who is ⛔ eligible (Q4) completes ⛔ without throwing.
 * @throws ClaimCorrectionTransientError  a transient failure (pg-boss retries the SAME job, which re-claims its own row) — incl. a DB fault of
 *   the claiming transaction (e.g. `42501` on a login Row 26 has not granted), which writes nothing it could not.
 */
export async function runFieldWorkerNoticeEmailChild(
  deps: FieldWorkerNoticeEmailDeps,
  envelope: JobEnvelope<FieldWorkerNoticeEmailPayload>,
  jobId: string,
): Promise<FieldWorkerNoticeEmailChildResult> {
  const alarm = alarmOf(deps);
  const clock = (): Date => deps.now?.() ?? new Date();
  const p = envelope.payload;
  const pid = envelope.pariwarId;
  if (pid === null || pid === '') {
    alarm(`${ALARM}: missing pariwarId for notice ${p.noticeId}`);
    return { status: 'noop', reason: 'missing_pariwar' };
  }
  const pariwarId = ids.pariwarId(pid);
  const tag = `email for notice ${p.noticeId}`;

  // The race guard — the config gap again, BEFORE a row or a decrypt (config may have vanished since).
  const gap = configGap(deps);
  if (gap !== null) {
    alarm(`${ALARM}: the ${tag} is HELD — ${gap}; ⛔ nothing written (the next sweep re-selects it)`);
    return { status: 'held_config', reason: gap };
  }
  const origin = resolveAdminAppOrigin(deps.adminAppOrigin)!;

  // ── The CLAIMING transaction: the notice lock, Q4, the row. ⛔ A catch inside it. ──
  let begun: fieldWorker.BeginFieldWorkerNoticeEmailResult;
  try {
    begun = await withPariwarScope(deps.pool, pariwarId, (_db: Db, client: pg.PoolClient) =>
      fieldWorker.beginFieldWorkerNoticeEmail(client, { pariwarId, noticeId: p.noticeId, jobId, now: clock() }),
    );
  } catch (err) {
    // The transaction rolled back — nothing written. A `42501` here is the production login before Row 26 (AD13).
    alarm(`${ALARM}: the claim of the ${tag} failed (${faultClass(err)}); ⛔ nothing written, pg-boss retries it`);
    throw new ClaimCorrectionTransientError(`${ALARM}: claim failed ${faultClass(err)} for notice ${p.noticeId}`);
  }
  if (begun.kind === 'already_final' || begun.kind === 'held_by_other') return { status: 'skipped', reason: begun.kind };
  if (begun.kind === 'skipped') return { status: 'skipped', reason: 'not_eligible' };
  if (begun.kind === 'expired') {
    alarm(`${ALARM}: the ${tag} — the recipient is no longer eligible after an attempt was claimed; recorded 'error' (${begun.detail}); a prior attempt may have sent`);
    return { status: 'skipped', reason: 'recheck_failed' };
  }

  // ── After the commit: ⛔ KMS / network under the notice lock ──
  const inScope = <T>(fn: (d: Db) => Promise<T>): Promise<T> => withPariwarScope(deps.pool, pariwarId, fn);
  const finalise = async (input: { readonly outcome: 'accepted' | 'rejected' | 'error'; readonly providerMessageId?: string | null; readonly detail?: string | null }) => {
    const done = await inScope((d) => fieldWorker.finaliseFieldWorkerNoticeEmail(d, { pariwarId, noticeId: begun.noticeId, jobId, ...input }));
    if (done === null) {
      alarm(`${ALARM}: the row of the ${tag} moved on before its finalise (the outcome was ${input.outcome})`);
      return;
    }
    if (done.mayHaveSent) {
      alarm(`${ALARM}: the ${tag} finished '${input.outcome}' on attempt ${String(begun.attemptCount)} — a prior attempt may have sent`);
    }
  };
  const transient = async (r: { readonly detail: string; readonly held: boolean; readonly mayHaveSent: boolean }): Promise<never> => {
    const noted = await inScope((d) =>
      fieldWorker.noteFieldWorkerNoticeEmailTransient(d, { pariwarId, noticeId: begun.noticeId, jobId, detail: r.detail, mayHaveSent: r.mayHaveSent, now: clock() }),
    );
    if (noted === 0) alarm(`${ALARM}: the row of the ${tag} moved on before its transient note (${r.detail})`);
    // A HELD account / config fault alarms ONCE per row per DISTINCT fault (⛔ per pg-boss attempt).
    else if (r.held && r.detail !== begun.previousDetail) {
      alarm(`${ALARM}: the ${tag} is HELD by an account / config / deployment fault — ${r.detail}; it stays 'attempting' and retries (⛔ final)`);
    }
    throw new ClaimCorrectionTransientError(`${ALARM}: transient ${r.detail} for notice ${p.noticeId}`);
  };
  // 6.25 round 3 — a DECRYPT or RENDER failure can be DETERMINISTIC, so it alarms like a HELD fault; a Q2 read failure is a DB blip.
  const preCall = (step: 'read_failed' | 'decrypt_failed' | 'render_failed') =>
    transient({ detail: fieldWorker.fieldWorkerNoticeEmailDetail({ kind: 'pre_call', step }), held: step !== 'read_failed', mayHaveSent: false });
  const noAddress = async (reason: 'no_address' | 'invalid_address'): Promise<FieldWorkerNoticeEmailChildResult> => {
    const d = fieldWorker.fieldWorkerNoticeEmailDetail({ kind: 'error', reason });
    await finalise({ outcome: 'error', detail: d });
    alarm(`${ALARM}: the ${tag} was NOT sent — ${d}; recorded 'error'`);
    return { status: 'error', detail: d };
  };

  // ADR-0040 Q2, its THIRD caller under ADR-0045 — the address ciphertext, AS STORED, for the notice's ONE recipient.
  let ciphertext: string | null;
  try {
    ciphertext = await inScope((d) => claimDomain.readAdminEmailCiphertext(d, begun.recipientUserId));
  } catch {
    return preCall('read_failed');
  }
  if (ciphertext === null) return noAddress('no_address');
  let address: string;
  try {
    address = (await encryption.decryptAdminEmail(ciphertext, deps.encryption)).trim();
  } catch {
    return preCall('decrypt_failed');
  }
  if (address === '') return noAddress('no_address');
  if (!isSendableEmailAddress(address)) return noAddress('invalid_address');

  let rendered: RenderedFieldWorkerNoticeEmail;
  try {
    rendered = renderFieldWorkerNoticeEmail(begun.noticeKind, { link: fieldWorkerNoticeEmailLink(origin, pariwarId) });
  } catch {
    return preCall('render_failed');
  }

  // ── The send ──
  const result: StaffEmailSendResult = await deps.staffEmail.send(
    { to: address, subject: rendered.subject, text: rendered.text, reference: begun.noticeId },
    { timeoutMs: deps.sendTimeoutMs ?? STAFF_EMAIL_SEND_TIMEOUT_MS },
  );
  if (result.kind === 'transient') return transient(result);
  if (result.outcome === 'rejected') {
    await finalise({ outcome: 'rejected', detail: result.detail });
    alarm(`${ALARM}: the ${tag} was REJECTED by the provider — ${result.detail}; recorded 'rejected'`);
    return { status: 'sent', outcome: 'rejected' };
  }
  await finalise({ outcome: 'accepted', providerMessageId: result.providerMessageId });
  return { status: 'sent', outcome: 'accepted' };
}

// ── Registration ───────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Register the two queues, their workers and the 15-minute IST sweep (6.25's cadence, budget and expiry). The staff-email client's and
 * the origin's boot alarms are raised ONCE, by 6.25's register (the SAME client and origin).
 */
export async function registerFieldWorkerNoticeEmailWorkers(
  boss: QueueClient,
  deps: FieldWorkerNoticeEmailDeps,
  opts: { readonly sweepCron?: string; readonly tz?: string } = {},
): Promise<void> {
  const alarm = alarmOf(deps);
  await boss.createQueue(FIELD_WORKER_NOTICE_EMAIL_QUEUES.SEND);
  await boss.work(FIELD_WORKER_NOTICE_EMAIL_QUEUES.SEND, { batchSize: 1 }, async (jobs: Job[]) => {
    const results = [];
    for (const job of jobs) {
      try {
        results.push(await runFieldWorkerNoticeEmailChild(deps, job.data as JobEnvelope<FieldWorkerNoticeEmailPayload>, job.id));
      } catch (err) {
        if (!(err instanceof ClaimCorrectionTransientError)) {
          alarm(`${ALARM}: job ${job.id} FAILED unexpectedly (non-transient) — ${err instanceof Error ? err.name : 'error'} (pg-boss retries it)`);
        }
        throw err;
      }
    }
    return { processed: results.length, results };
  });
  await boss.createQueue(FIELD_WORKER_NOTICE_EMAIL_QUEUES.SWEEP, { expireInSeconds: STAFF_EMAIL_SWEEP_EXPIRE_SECONDS });
  await boss.work(FIELD_WORKER_NOTICE_EMAIL_QUEUES.SWEEP, async (jobs: Job[]) => {
    const swept = await runFieldWorkerNoticeEmailSweep(deps, boss);
    console.info(`${ALARM}-sweep tick`, JSON.stringify({ jobs: jobs.length, ...swept }));
    return swept;
  });
  await boss.schedule(
    FIELD_WORKER_NOTICE_EMAIL_QUEUES.SWEEP,
    opts.sweepCron ?? STAFF_EMAIL_SWEEP_CRON,
    {},
    { tz: opts.tz ?? CLAIM_CORRECTION_TZ, ...CORRECTION_SWEEP_RETRY, expireInSeconds: STAFF_EMAIL_SWEEP_EXPIRE_SECONDS },
  );
}
