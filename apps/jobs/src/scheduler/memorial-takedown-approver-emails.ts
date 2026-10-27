// The APPROVER EMAIL of a memorial take-down — the 15-minute SWEEP and the EMAIL CHILD (Story 11b.4a, Task 8.2; AC9;
// `2026-10-27-412` MP10 (b) / MP11; ADR-0043). ⭐ A MIRROR of Story 6.25's `claim-suspicion-staff-emails.ts` — the same config
// check + provider pre-flight, hold park, give-up, claiming transaction, compare-and-set and transient classes — on the take-down
// outbox (`memorial_takedown_approver_emails`).
//
// `-392` item 5 (Trustee-ratified, kept by `-395`): the approver is emailed when the helpline takes a memorial down. Every DISTINCT
// approver of every version the take-down withdrew is told (MP10 (b)) — each only of an approval they made. `-411` item 5: an
// approver who has left is ⛔ not emailed and ⛔ no one else is told; the request then holds ONE `no_target` row and ONE `error`
// log line `memorial.takedown.approver_unreachable` `{ pariwarId, requestId }` (MP11).
// ⭐ The message is PLAIN TEXT and FIXED: ⛔ no family name, ⛔ no deceased's name, ⛔ no words, ⛔ no link — the approver opens Memorial
// reviews in the Trust console. ⇒ ⛔ no `ADMIN_APP_ORIGIN` dependency (6.25's link needed one; this email has none).
// ⭐ ADR-0043: the child reads the address through ADR-0040's Q2 (`readAdminEmailCiphertext`) AFTER its claiming commit and decrypts
// it in memory; the plaintext exists only until the provider call. ⛔ No address in a payload, a log line or an alarm.
// ⚠ AT-LEAST-ONCE, as 6.25: a possible double is RECORDED (`may_have_sent`) and alarmed, ⛔ never hidden.
// The queue names live in `@twt/queue`'s `QUEUE_NAMES` (the registry — DD-3); the constant below is a local alias for them.

import { claim as claimDomain, encryption, ids, memorial, withPariwarScope, type Db } from '@twt/domain';
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
import { STAFF_EMAIL_SEND_TIMEOUT_MS, isSendableEmailAddress, type StaffEmailClient, type StaffEmailSendResult } from './staff-email-client.js';

/** The two queues — from the `QUEUE_NAMES` registry. */
export const MEMORIAL_TAKEDOWN_APPROVER_EMAIL_QUEUES = {
  SWEEP: QUEUE_NAMES.MEMORIAL_TAKEDOWN_APPROVER_EMAIL_SWEEP,
  SEND: QUEUE_NAMES.MEMORIAL_TAKEDOWN_APPROVER_EMAIL_SEND,
} as const;

const ALARM = '[jobs] memorial-takedown-approver-email';

/** The approved text (`-412` §3.6 — BigDev, "all as recommended"). ⛔ No name, ⛔ no words, ⛔ no link. */
export const MEMORIAL_TAKEDOWN_APPROVER_EMAIL_SUBJECT = 'A family memorial you approved was taken down';
export const MEMORIAL_TAKEDOWN_APPROVER_EMAIL_TEXT =
  "A family memorial you approved for a Sahyog Vivran page has been taken down by the helpline at the nominee's request. " +
  'You do not need to do anything. To see which, open Memorial reviews in the Trust console.';

export interface MemorialTakedownApproverEmailDeps {
  /** The BYPASSRLS service pool — the cross-tenant selector + give-up, and the `withPariwarScope` pool. */
  readonly pool: pg.Pool;
  /** The jobs KMS deps — the admin KEK (the admin email's decrypt, AFTER the claiming commit). */
  readonly encryption: encryption.FieldCryptoDeps;
  readonly staffEmail: StaffEmailClient;
  readonly now?: () => Date;
  readonly onAlarm?: (message: string) => void;
  /** The `error`-level structured log (MP11's `memorial.takedown.approver_unreachable`). Default `console.error`. */
  readonly onError?: (event: string, fields: { readonly pariwarId: string; readonly requestId: string }) => void;
  readonly runLimit?: number;
  readonly maxPairs?: number;
  readonly sweepBudgetMs?: number;
  readonly elapsedClockMs?: () => number;
  readonly sendTimeoutMs?: number;
  /** ⚠ TESTS ONLY — restrict every cross-tenant statement to these Pariwars. EMPTY or in production ⇒ REFUSED (alarmed). */
  readonly pariwarAllowlist?: readonly string[];
}

/** The child's payload — ids ONLY. `recipientUserId` NULL = the request-level `no_target` pair (MP11). */
export interface MemorialTakedownApproverEmailPayload {
  readonly requestId: string;
  readonly recipientUserId: string | null;
}

function alarmOf(deps: MemorialTakedownApproverEmailDeps): (m: string) => void {
  return deps.onAlarm ?? ((m: string): void => console.warn(m));
}

const ALARM_SAMPLE_IDS = 5;
function sampleIds(list: readonly string[]): string {
  const shown = list.slice(0, ALARM_SAMPLE_IDS).join(', ');
  return list.length > ALARM_SAMPLE_IDS ? `${shown} (+${String(list.length - ALARM_SAMPLE_IDS)} more)` : shown;
}

// ── The SWEEP ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface MemorialTakedownApproverEmailSweepResult {
  readonly scannedPairs: number;
  readonly enqueued: number;
  readonly heldForConfig: number;
  readonly finalisedStuck: number;
  readonly budgetExhausted: boolean;
}

type EnqueueBoss = Pick<QueueClient, 'send'>;

/** ⭐ THE 15-MINUTE SWEEP — 6.25's steps (1)–(4), on the take-down outbox. */
export async function runMemorialTakedownApproverEmailSweep(
  deps: MemorialTakedownApproverEmailDeps,
  boss: EnqueueBoss,
): Promise<MemorialTakedownApproverEmailSweepResult> {
  const alarm = alarmOf(deps);
  const now = deps.now?.() ?? new Date();
  const limit = Math.max(1, deps.runLimit ?? DEFAULT_CORRECTION_SWEEP_RUN_LIMIT);
  const maxPairs = Math.max(1, deps.maxPairs ?? DEFAULT_CORRECTION_SWEEP_MAX_RUNS);
  const clockMs = deps.elapsedClockMs ?? ((): number => performance.now());
  const startedMs = clockMs();
  const budgetMs = Math.max(0, deps.sweepBudgetMs ?? STAFF_EMAIL_SWEEP_BUDGET_MS);
  const allow: string[] | null = deps.pariwarAllowlist ? [...deps.pariwarAllowlist] : null;
  const empty: MemorialTakedownApproverEmailSweepResult = { scannedPairs: 0, enqueued: 0, heldForConfig: 0, finalisedStuck: 0, budgetExhausted: false };
  if (allow !== null && process.env['NODE_ENV'] === 'production') {
    alarm(`${ALARM}-sweep: REFUSED — \`pariwarAllowlist\` is set while NODE_ENV is production (it is test-only); nothing was swept`);
    return empty;
  }
  if (allow !== null && allow.length === 0) {
    alarm(`${ALARM}-sweep: REFUSED — \`pariwarAllowlist\` is EMPTY (it would sweep ⛔ no tenant); nothing was swept`);
    return empty;
  }

  // (1) The config check + the provider pre-flight, ONCE per run; ANY failure of the pre-flight itself also holds.
  let gap = deps.staffEmail.configGap();
  if (gap === null) {
    try {
      const pre = await deps.staffEmail.preflight({ timeoutMs: deps.sendTimeoutMs ?? STAFF_EMAIL_SEND_TIMEOUT_MS });
      gap = pre.ok ? null : pre.detail;
    } catch {
      gap = 'preflight:failed';
    }
  }

  // (2) A HELD run PARKS its stale in-flight rows; an UN-held run gives up. Both CROSS-TENANT WRITES, deliberately (the domain).
  let parked = 0;
  let stuck: readonly { readonly requestId: string; readonly recipientUserId: string | null }[] = [];
  if (gap !== null) {
    parked = await memorial.parkHeldMemorialTakedownApproverEmails(deps.pool, { now, allow });
  } else {
    stuck = await memorial.expireExhaustedMemorialTakedownApproverEmails(deps.pool, {
      cutoff: memorial.memorialTakedownApproverEmailReclaimCutoff(now),
      now,
      allow,
    });
  }
  if (stuck.length > 0) {
    alarm(
      `${ALARM}-sweep: gave up ${String(stuck.length)} email(s) still 'attempting' after ${String(memorial.MEMORIAL_TAKEDOWN_APPROVER_EMAIL_RECLAIM_DAYS)} ` +
        `IST days — recorded 'error' (exhausted:attempting_three_days); a prior attempt may have sent ` +
        `(requests: ${sampleIds([...new Set(stuck.map((s) => s.requestId))])})`,
    );
  }

  let scannedPairs = 0;
  let enqueued = 0;
  let budgetExhausted = false;
  let bounded = false;
  const held: string[] = [];
  let after: memorial.MemorialTakedownApproverEmailCursor | null = null;
  sweep: for (;;) {
    const page = await memorial.selectDueMemorialTakedownApproverEmails(deps.pool, { after, limit, allow });
    for (const due of page.due) {
      if (scannedPairs >= maxPairs) {
        bounded = true;
        break sweep;
      }
      if (clockMs() - startedMs > budgetMs) {
        budgetExhausted = true;
        break sweep;
      }
      scannedPairs += 1;
      if (gap !== null) {
        held.push(due.requestId);
        continue;
      }
      // (3) ONE child per (request, recipient).
      const label = `${due.requestId}:${due.recipientUserId ?? 'none'}`;
      try {
        await boss.send(
          MEMORIAL_TAKEDOWN_APPROVER_EMAIL_QUEUES.SEND,
          {
            pariwarId: due.pariwarId,
            requestId: `memorial.takedown_approver_email:${label}`,
            actorId: null,
            traceId: `memorial.takedown_approver_email:${label}`,
            payload: { requestId: due.requestId, recipientUserId: due.recipientUserId },
          } satisfies JobEnvelope<MemorialTakedownApproverEmailPayload>,
          // ⚠ A LABEL only — the table's UNIQUE + the request lock + the lease are the dedup.
          { singletonKey: label, retryLimit: CHILD_RETRY_LIMIT, retryDelay: CHILD_RETRY_DELAY_SECONDS, retryBackoff: true },
        );
        enqueued += 1;
      } catch (err) {
        alarm(
          `${ALARM}-sweep: failed to enqueue the email for request ${due.requestId} (recipient ${due.recipientUserId ?? 'none'}) — ` +
            `${err instanceof Error ? err.name : 'error'}; the next sweep derives it again`,
        );
      }
    }
    if (page.scanned < Math.min(limit, memorial.MEMORIAL_TAKEDOWN_APPROVER_EMAIL_PAGE_CAP) || page.last === null) break;
    after = page.last;
  }

  // (4) ONE end-of-run alarm for every pair a config gap held.
  if (held.length > 0) {
    alarm(
      `${ALARM}-sweep: ${String(held.length)} email(s) HELD — ${gap ?? 'config'}; this run enqueued ⛔ no child for them ` +
        `(${String(parked)} in-flight row(s) newly parked), and they will be retried once it is fixed ` +
        `(requests: ${sampleIds([...new Set(held)])})`,
    );
  }
  // ⭐ "The rest wait for the next tick" is TRUE because the selector gates PER (request, recipient): a pair this run did not reach holds
  // ⛔ no row and is derived again — it was FALSE while one sibling's row hid its whole request (review R2).
  if (budgetExhausted) {
    alarm(`${ALARM}-sweep: ran out of its ${String(Math.round(budgetMs / 60_000))}-minute budget after ${String(scannedPairs)} pair(s) — the rest wait for the next tick`);
  } else if (bounded) {
    alarm(`${ALARM}-sweep: hit the hard bound of ${String(maxPairs)} pairs — the rest wait for the next tick`);
  }
  return { scannedPairs, enqueued, heldForConfig: held.length, finalisedStuck: stuck.length, budgetExhausted };
}

// ── The CHILD — one email ──────────────────────────────────────────────────────────────────────────────────────────────────

export type MemorialTakedownApproverEmailChildResult =
  | { readonly status: 'sent'; readonly outcome: 'accepted' | 'rejected' }
  | { readonly status: 'error'; readonly detail: string }
  | { readonly status: 'held_config'; readonly reason: string }
  | { readonly status: 'skipped'; readonly reason: 'already_final' | 'held_by_other' | 'not_due' | 'recheck_failed' }
  | { readonly status: 'no_target' }
  | { readonly status: 'noop'; readonly reason: string };

/**
 * ⭐ ONE email. A failed re-check completes ⛔ without throwing.
 * @throws ClaimCorrectionTransientError  a transient failure (pg-boss retries the SAME job, which re-claims its own row)
 */
export async function runMemorialTakedownApproverEmailChild(
  deps: MemorialTakedownApproverEmailDeps,
  envelope: JobEnvelope<MemorialTakedownApproverEmailPayload>,
  jobId: string,
): Promise<MemorialTakedownApproverEmailChildResult> {
  const alarm = alarmOf(deps);
  const clock = (): Date => deps.now?.() ?? new Date();
  const p = envelope.payload;
  const pid = envelope.pariwarId;
  if (pid === null || pid === '') {
    alarm(`${ALARM}: missing pariwarId for request ${p.requestId}`);
    return { status: 'noop', reason: 'missing_pariwar' };
  }
  const pariwarId = ids.pariwarId(pid);
  const recipientUserId = p.recipientUserId === null ? null : ids.userId(p.recipientUserId);
  const tag = `email for take-down request ${p.requestId} (recipient ${p.recipientUserId ?? 'none'})`;

  // The race guard — the provider's config gap again, BEFORE a row or a decrypt.
  const gap = deps.staffEmail.configGap();
  if (gap !== null) {
    alarm(`${ALARM}: the ${tag} is HELD — ${gap}; ⛔ nothing written (the next sweep re-selects it)`);
    return { status: 'held_config', reason: gap };
  }

  // ── The CLAIMING transaction: the request lock, the re-check, the row. ⛔ No catch inside it. ──
  const begun = await withPariwarScope(deps.pool, pariwarId, (_db: Db, client: pg.PoolClient) =>
    memorial.beginMemorialTakedownApproverEmail(client, { pariwarId, requestId: p.requestId, recipientUserId, jobId, now: clock() }),
  );
  if (begun.kind === 'already_final' || begun.kind === 'held_by_other' || begun.kind === 'not_due') {
    return { status: 'skipped', reason: begun.kind };
  }
  if (begun.kind === 'expired') {
    alarm(`${ALARM}: the ${tag} — the re-check now fails after an attempt was claimed; recorded 'error' (${begun.detail}); a prior attempt may have sent`);
    return { status: 'skipped', reason: 'recheck_failed' };
  }
  if (begun.kind === 'no_target') {
    // MP11 — ⛔ no eligible approver: ONE request-level row, ONE `error` line (ids only), ⛔ no substitute recipient (`-411` item 5).
    (deps.onError ?? ((event, fields) => console.error(event, JSON.stringify(fields))))('memorial.takedown.approver_unreachable', {
      pariwarId: pid,
      requestId: p.requestId,
    });
    return { status: 'no_target' };
  }

  // ── After the commit: ⛔ no KMS / network under the request lock ──
  const inScope = <T>(fn: (d: Db) => Promise<T>): Promise<T> => withPariwarScope(deps.pool, pariwarId, fn);
  const finalise = async (input: { readonly outcome: 'accepted' | 'rejected' | 'error'; readonly providerMessageId?: string | null; readonly detail?: string | null }) => {
    const done = await inScope((d) => memorial.finaliseMemorialTakedownApproverEmail(d, { pariwarId, noticeId: begun.noticeId, jobId, ...input }));
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
      memorial.noteMemorialTakedownApproverEmailTransient(d, { pariwarId, noticeId: begun.noticeId, jobId, detail: r.detail, mayHaveSent: r.mayHaveSent, now: clock() }),
    );
    if (noted === 0) alarm(`${ALARM}: the row of the ${tag} moved on before its transient note (${r.detail})`);
    else if (r.held && r.detail !== begun.previousDetail) {
      alarm(`${ALARM}: the ${tag} is HELD by an account / config / deployment fault — ${r.detail}; it stays 'attempting' and retries (⛔ not final)`);
    }
    throw new ClaimCorrectionTransientError(`${ALARM}: transient ${r.detail} for request ${p.requestId}`);
  };
  const preCall = (step: 'read_failed' | 'decrypt_failed') =>
    transient({ detail: memorial.memorialTakedownApproverEmailDetail({ kind: 'pre_call', step }), held: step !== 'read_failed', mayHaveSent: false });
  const noAddress = async (reason: 'no_address' | 'invalid_address'): Promise<MemorialTakedownApproverEmailChildResult> => {
    const d = memorial.memorialTakedownApproverEmailDetail({ kind: 'error', reason });
    await finalise({ outcome: 'error', detail: d });
    alarm(`${ALARM}: the ${tag} was NOT sent — ${d}; recorded 'error'`);
    return { status: 'error', detail: d };
  };

  // ADR-0040 Q2, its SECOND caller under ADR-0043 — the address ciphertext, AS STORED, for ONE user.
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

  // ── The send ──
  const result: StaffEmailSendResult = await deps.staffEmail.send(
    { to: address, subject: MEMORIAL_TAKEDOWN_APPROVER_EMAIL_SUBJECT, text: MEMORIAL_TAKEDOWN_APPROVER_EMAIL_TEXT, reference: begun.noticeId },
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

/** Register the two queues, their workers and the 15-minute IST sweep (6.25's cadence, budget and expiry). */
export async function registerMemorialTakedownApproverEmailWorkers(
  boss: QueueClient,
  deps: MemorialTakedownApproverEmailDeps,
  opts: { readonly sweepCron?: string; readonly tz?: string } = {},
): Promise<void> {
  const alarm = alarmOf(deps);
  await boss.createQueue(MEMORIAL_TAKEDOWN_APPROVER_EMAIL_QUEUES.SEND);
  await boss.work(MEMORIAL_TAKEDOWN_APPROVER_EMAIL_QUEUES.SEND, { batchSize: 1 }, async (jobs: Job[]) => {
    const results = [];
    for (const job of jobs) {
      try {
        results.push(await runMemorialTakedownApproverEmailChild(deps, job.data as JobEnvelope<MemorialTakedownApproverEmailPayload>, job.id));
      } catch (err) {
        if (!(err instanceof ClaimCorrectionTransientError)) {
          alarm(`${ALARM}: job ${job.id} FAILED unexpectedly (non-transient) — ${err instanceof Error ? err.name : 'error'} (pg-boss retries it)`);
        }
        throw err;
      }
    }
    return { processed: results.length, results };
  });
  await boss.createQueue(MEMORIAL_TAKEDOWN_APPROVER_EMAIL_QUEUES.SWEEP, { expireInSeconds: STAFF_EMAIL_SWEEP_EXPIRE_SECONDS });
  await boss.work(MEMORIAL_TAKEDOWN_APPROVER_EMAIL_QUEUES.SWEEP, async (jobs: Job[]) => {
    try {
      const swept = await runMemorialTakedownApproverEmailSweep(deps, boss);
      console.info(`${ALARM}-sweep tick`, JSON.stringify({ jobs: jobs.length, ...swept }));
      return swept;
    } catch (err) {
      alarm(`${ALARM}-sweep: the tick FAILED — ${err instanceof Error ? err.name : 'error'} (pg-boss retries it)`);
      throw err;
    }
  });
  await boss.schedule(
    MEMORIAL_TAKEDOWN_APPROVER_EMAIL_QUEUES.SWEEP,
    opts.sweepCron ?? STAFF_EMAIL_SWEEP_CRON,
    {},
    { tz: opts.tz ?? CLAIM_CORRECTION_TZ, ...CORRECTION_SWEEP_RETRY, expireInSeconds: STAFF_EMAIL_SWEEP_EXPIRE_SECONDS },
  );
}
