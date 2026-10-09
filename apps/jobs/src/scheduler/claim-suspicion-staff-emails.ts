// The STAFF EMAIL of a `-239` suspicion refusal — the 15-minute SWEEP and the EMAIL CHILD (Story 6.25, Task 5; AC2, AC4–AC7;
// `2026-10-09-299` RE1–RE7, RE5-bis, RE10–RE13; ADR-0040).
//
// `-262` FQ3 A (Trustee-ratified): every Pariwar Admin of the Pariwar is emailed *"a claim was refused on suspicion of a nominee
// change — open the list"* — ⛔ no names, ⛔ no note (those stay in the console). ONCE per (claim, recipient), EVER (0152).
// ⭐ A notification, ⛔ never an approval step (`-239` consequence 3) — ⛔ NOTHING here refuses, closes, approves or decides a
// claim, writes a claim event or touches an identity table (Invariant 4; the no-decision fence).
//
// ── The sweep, every 15 minutes IST (RE10) ─────────────────────────────────────────────────────────────────────────────────
//   (1) the give-up — rows CREATED before 00:00 IST of (today − 2), still `attempting` AND past the 30-minute lease ⇒ `error` +
//       ONE alarm that says a prior attempt may have sent;
//   (2) RE7's CONFIG CHECK, BEFORE anything is enqueued: the provider's config gap, `ADMIN_APP_ORIGIN`, and the provider
//       PRE-FLIGHT (SES `GetAccount`: sending enabled AND out of the sandbox). A gap — or a pre-flight that itself fails — HOLDS
//       every pair: ⛔ enqueued, ⛔ written. The next run re-selects them (⛔ finished row) ⇒ once go-live sets the config, every
//       email still due is sent;
//   (3) page the domain's selector (keyset, the Pariwar allowlist) and enqueue ONE child per (claim, recipient) — ids only;
//   (4) ONE end-of-run alarm for the held pairs — the gap word, the count and the claim ids.
// ── The child ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
//   the config race guard (`held_config`, ⛔ row, ⛔ decrypt) → the CLAIMING transaction (`beginSuspicionStaffEmail` — the claim-row
//   lock, the one re-check, the row) → COMMIT → (⛔ KMS / network under the lock — Invariant 3) the address ciphertext (Q2) → the
//   decrypt → the address check → the render → the send → the compare-and-set. It throws ONLY on a transient failure (incl. a
//   HELD account / config fault — RE6), and pg-boss retries the SAME job, which re-claims its own row at once.
// ⚠ AT-LEAST-ONCE: a timeout, a provider 5xx or a crash after an accept may produce a second email — `may_have_sent` records it
// and EVERY finish on such a row is alarmed (`-298`'s principle, RE5-bis), `accepted` included.
// ⛔ No address, name or note in a payload, a log line or an alarm — ids and fixed words only (Invariant 2).
// ⚠ `onAlarm` is unwired for every job (deferred-work's 8.14 item) ⇒ these alarms are `console.warn` until roster Row 24 (e).

import { claim as claimDomain, encryption, ids, withPariwarScope, type Db } from '@twt/domain';
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
import { STAFF_EMAIL_SEND_TIMEOUT_MS, isSendableEmailAddress, type StaffEmailClient, type StaffEmailSendResult } from './staff-email-client.js';
import { resolveAdminAppOrigin } from './staff-email-config.js';
import { renderSuspicionStaffEmail, suspicionStaffEmailLink, type RenderedStaffEmail } from './suspicion-staff-email-templates.js';

// ── Operational knobs (RE10 — ⛔ 6.24b's 45 / 90 min, tuned for a DAILY sweep) ──────────────────────────────────────────────

/** Every 15 minutes, IST. */
export const STAFF_EMAIL_SWEEP_CRON = '*/15 * * * *';
/** The tick's wall-clock budget — below the expiry, which is below the cadence. */
export const STAFF_EMAIL_SWEEP_BUDGET_MS = 10 * 60 * 1000;
/** The sweep job's pg-boss expiry — ABOVE the budget, BELOW the 15-minute cadence (set on BOTH `createQueue` and `schedule`). */
export const STAFF_EMAIL_SWEEP_EXPIRE_SECONDS = 14 * 60;

const ALARM = '[jobs] claim-suspicion-staff-email';

/** The deps — declared HERE (⛔ a value import cycle with the client module). */
export interface ClaimSuspicionStaffEmailDeps {
  /** The BYPASSRLS service pool — the cross-tenant selector + give-up, and the `withPariwarScope` pool. */
  readonly pool: pg.Pool;
  /** The jobs KMS deps — the admin KEK (the admin email's decrypt, AFTER the claiming commit). */
  readonly encryption: encryption.FieldCryptoDeps;
  /** THE staff email client (`buildStaffEmailClient`, boot). */
  readonly staffEmail: StaffEmailClient;
  /** `ADMIN_APP_ORIGIN` as configured — validated on every run (RE7: ⛔ https or a path ⇒ treated as unset). */
  readonly adminAppOrigin: string | null | undefined;
  readonly now?: () => Date;
  readonly onAlarm?: (message: string) => void;
  readonly runLimit?: number;
  /** The HARD bound on pairs one tick sweeps — hitting it is ALARMED. */
  readonly maxPairs?: number;
  readonly sweepBudgetMs?: number;
  /** A MONOTONIC millisecond clock for the budget (default `performance.now`). */
  readonly elapsedClockMs?: () => number;
  readonly sendTimeoutMs?: number;
  /** ⚠ TESTS ONLY — restrict every cross-tenant statement to these Pariwars. EMPTY or in production ⇒ REFUSED (alarmed). */
  readonly pariwarAllowlist?: readonly string[];
}

/** The child's payload — ids ONLY (⛔ never an address). `recipientUserId` NULL = the claim-level `no_target` pair (RE4). */
export interface SuspicionStaffEmailPayload {
  readonly claimCaseId: string;
  readonly recipientUserId: string | null;
}

function alarmOf(deps: ClaimSuspicionStaffEmailDeps): (m: string) => void {
  return deps.onAlarm ?? ((m: string): void => console.warn(m));
}

const ALARM_SAMPLE_IDS = 5;
function sampleIds(list: readonly string[]): string {
  const shown = list.slice(0, ALARM_SAMPLE_IDS).join(', ');
  return list.length > ALARM_SAMPLE_IDS ? `${shown} (+${String(list.length - ALARM_SAMPLE_IDS)} more)` : shown;
}

/** RE7 — the config gap (⛔ the pre-flight): the provider's own gap, then the list link's origin. `null` when ready. */
function configGap(deps: ClaimSuspicionStaffEmailDeps): string | null {
  return deps.staffEmail.configGap() ?? (resolveAdminAppOrigin(deps.adminAppOrigin) === null ? 'config:admin_app_origin_invalid' : null);
}

// ── The SWEEP ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface SuspicionStaffEmailSweepResult {
  readonly scannedPairs: number;
  readonly enqueued: number;
  /** Pairs held by a config gap or a failed pre-flight (RE7) — ⛔ enqueued, ⛔ written. */
  readonly heldForConfig: number;
  readonly finalisedStuck: number;
  readonly budgetExhausted: boolean;
}

type EnqueueBoss = Pick<QueueClient, 'send'>;

/** ⭐ THE 15-MINUTE SWEEP. See the module header. A per-pair try/catch around the enqueue — the next tick retries it. */
export async function runSuspicionStaffEmailSweep(deps: ClaimSuspicionStaffEmailDeps, boss: EnqueueBoss): Promise<SuspicionStaffEmailSweepResult> {
  const alarm = alarmOf(deps);
  const now = deps.now?.() ?? new Date();
  const limit = Math.max(1, deps.runLimit ?? DEFAULT_CORRECTION_SWEEP_RUN_LIMIT);
  const maxPairs = Math.max(1, deps.maxPairs ?? DEFAULT_CORRECTION_SWEEP_MAX_RUNS);
  const clockMs = deps.elapsedClockMs ?? ((): number => performance.now());
  const startedMs = clockMs();
  const budgetMs = Math.max(0, deps.sweepBudgetMs ?? STAFF_EMAIL_SWEEP_BUDGET_MS);
  const allow: string[] | null = deps.pariwarAllowlist ? [...deps.pariwarAllowlist] : null;
  const empty: SuspicionStaffEmailSweepResult = { scannedPairs: 0, enqueued: 0, heldForConfig: 0, finalisedStuck: 0, budgetExhausted: false };
  if (allow !== null && process.env['NODE_ENV'] === 'production') {
    alarm(`${ALARM}-sweep: REFUSED — \`pariwarAllowlist\` is set while NODE_ENV is production (it is test-only); nothing was swept`);
    return empty;
  }
  if (allow !== null && allow.length === 0) {
    alarm(`${ALARM}-sweep: REFUSED — \`pariwarAllowlist\` is EMPTY (it would sweep ⛔ no tenant); nothing was swept`);
    return empty;
  }

  // (1) THE GIVE-UP — a CROSS-TENANT WRITE on the BYPASSRLS pool, DELIBERATELY (the block at `expireExhaustedSuspicionStaffEmails`).
  const stuck = await claimDomain.expireExhaustedSuspicionStaffEmails(deps.pool, {
    cutoff: claimDomain.suspicionStaffEmailReclaimCutoff(now),
    now,
    allow,
  });
  if (stuck.length > 0) {
    alarm(
      `${ALARM}-sweep: gave up ${String(stuck.length)} email(s) still 'attempting' after ${String(claimDomain.SUSPICION_STAFF_EMAIL_RECLAIM_DAYS)} ` +
        `IST days — recorded 'error' (exhausted:attempting_three_days); a prior attempt may have sent ` +
        `(claims: ${sampleIds([...new Set(stuck.map((s) => s.claimCaseId as string))])})`,
    );
  }

  // (2) RE7 — the config check + the provider pre-flight, ONCE per run. ⭐ ANY failure of the pre-flight itself also holds.
  let gap = configGap(deps);
  if (gap === null) {
    try {
      const pre = await deps.staffEmail.preflight({ timeoutMs: deps.sendTimeoutMs ?? STAFF_EMAIL_SEND_TIMEOUT_MS });
      gap = pre.ok ? null : pre.detail;
    } catch {
      gap = 'preflight:failed';
    }
  }

  let scannedPairs = 0;
  let enqueued = 0;
  let budgetExhausted = false;
  let bounded = false;
  const held: string[] = [];
  let after: claimDomain.SuspicionStaffEmailCursor | null = null;
  sweep: for (;;) {
    const page = await claimDomain.selectDueSuspicionStaffEmails(deps.pool, { after, limit, allow });
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
        held.push(due.claimCaseId);
        continue;
      }
      // (3) ONE child per (claim, recipient).
      const label = `${due.claimCaseId}:${due.recipientUserId ?? 'none'}`;
      try {
        await boss.send(
          QUEUE_NAMES.CLAIM_SUSPICION_STAFF_EMAIL_SEND,
          {
            pariwarId: due.pariwarId,
            requestId: `claim.suspicion_staff_email:${label}`,
            actorId: null,
            traceId: `claim.suspicion_staff_email:${label}`,
            payload: { claimCaseId: due.claimCaseId, recipientUserId: due.recipientUserId },
          } satisfies JobEnvelope<SuspicionStaffEmailPayload>,
          {
            // ⚠ A LABEL only — the table's UNIQUE + the lease are the dedup.
            singletonKey: label,
            retryLimit: CHILD_RETRY_LIMIT,
            retryDelay: CHILD_RETRY_DELAY_SECONDS,
            retryBackoff: true,
          },
        );
        enqueued += 1;
      } catch (err) {
        alarm(`${ALARM}-sweep: failed to enqueue the email for claim ${due.claimCaseId} (recipient ${due.recipientUserId ?? 'none'}) — ${err instanceof Error ? err.name : 'error'}`);
      }
    }
    if (page.scanned < Math.min(limit, claimDomain.SUSPICION_STAFF_EMAIL_PAGE_CAP) || page.last === null) break;
    after = page.last;
  }

  // (4) ONE end-of-run alarm for every pair a config gap held — the gap word, the count and the claim ids.
  if (held.length > 0) {
    alarm(
      `${ALARM}-sweep: ${String(held.length)} email(s) HELD — ${gap ?? 'config'}; ⛔ nothing was enqueued or written for them, and ` +
        `they will be sent once it is fixed (claims: ${sampleIds([...new Set(held)])})`,
    );
  }
  if (budgetExhausted) {
    alarm(`${ALARM}-sweep: ran out of its ${String(Math.round(budgetMs / 60_000))}-minute budget after ${String(scannedPairs)} pair(s) — the rest wait for the next 15-minute tick`);
  } else if (bounded) {
    alarm(`${ALARM}-sweep: hit the hard bound of ${String(maxPairs)} pairs — the rest wait for the next 15-minute tick`);
  }
  return { scannedPairs, enqueued, heldForConfig: held.length, finalisedStuck: stuck.length, budgetExhausted };
}

// ── The CHILD — one email ──────────────────────────────────────────────────────────────────────────────────────────────────

export type SuspicionStaffEmailChildResult =
  | { readonly status: 'sent'; readonly outcome: 'accepted' | 'rejected' }
  | { readonly status: 'error'; readonly detail: string }
  | { readonly status: 'held_config'; readonly reason: string }
  | { readonly status: 'skipped'; readonly reason: 'already_final' | 'held_by_other' | 'not_due' | 'recheck_failed' }
  | { readonly status: 'no_target' }
  | { readonly status: 'noop'; readonly reason: string };

/**
 * ⭐ ONE email. See the module header. A failed re-check completes ⛔ without throwing.
 * @throws ClaimCorrectionTransientError  a transient failure (pg-boss retries the SAME job)
 */
export async function runSuspicionStaffEmailChild(
  deps: ClaimSuspicionStaffEmailDeps,
  envelope: JobEnvelope<SuspicionStaffEmailPayload>,
  jobId: string,
): Promise<SuspicionStaffEmailChildResult> {
  const alarm = alarmOf(deps);
  const clock = (): Date => deps.now?.() ?? new Date();
  const p = envelope.payload;
  const pid = envelope.pariwarId;
  if (pid === null || pid === '') {
    alarm(`${ALARM}: missing pariwarId for claim ${p.claimCaseId}`);
    return { status: 'noop', reason: 'missing_pariwar' };
  }
  const pariwarId = ids.pariwarId(pid);
  const claimCaseId = ids.claimId(p.claimCaseId);
  const recipientUserId = p.recipientUserId === null ? null : ids.userId(p.recipientUserId);
  const tag = `email for claim ${p.claimCaseId} (recipient ${p.recipientUserId ?? 'none'})`;

  // RE7's RACE GUARD — the sweep's config check again, BEFORE a row or a decrypt (config may have vanished since).
  const gap = configGap(deps);
  if (gap !== null) {
    alarm(`${ALARM}: the ${tag} is HELD — ${gap}; ⛔ nothing written (the next sweep re-selects it)`);
    return { status: 'held_config', reason: gap };
  }
  const origin = resolveAdminAppOrigin(deps.adminAppOrigin)!;

  // ── The CLAIMING transaction: the claim-row lock, the re-check, the row. ⛔ A catch inside it (RE11). ──
  const begun = await withPariwarScope(deps.pool, pariwarId, (_db: Db, client: pg.PoolClient) =>
    claimDomain.beginSuspicionStaffEmail(client, { pariwarId, claimCaseId, recipientUserId, jobId, now: clock() }),
  );
  if (begun.kind === 'already_final' || begun.kind === 'held_by_other' || begun.kind === 'not_due') {
    return { status: 'skipped', reason: begun.kind };
  }
  if (begun.kind === 'expired') {
    // `-297` §2 — a claiming commit happened, so an email MAY have gone: ALWAYS alarmed (ids + the detail only).
    alarm(`${ALARM}: the ${tag} — the re-check now fails after an attempt was claimed; recorded 'error' (${begun.detail}); a prior attempt may have sent`);
    return { status: 'skipped', reason: 'recheck_failed' };
  }
  if (begun.kind === 'no_target') {
    // RE4 — ⛔ eligible Pariwar Admin: ONE claim-level row, ONE alarm — the list stays the only notice for this claim.
    alarm(`${ALARM}: ⛔ eligible Pariwar Admin for claim ${p.claimCaseId} — recorded 'no_target' (no_pariwar_admin); the console list is the only notice`);
    return { status: 'no_target' };
  }

  // ── After the commit (Invariant 3): ⛔ KMS / network under the claim-row lock ──
  const inScope = <T>(fn: (d: Db) => Promise<T>): Promise<T> => withPariwarScope(deps.pool, pariwarId, fn);
  const finalise = async (input: { readonly outcome: 'accepted' | 'rejected' | 'error'; readonly providerMessageId?: string | null; readonly detail?: string | null }) => {
    const done = await inScope((d) => claimDomain.finaliseSuspicionStaffEmail(d, { pariwarId, noticeId: begun.noticeId, jobId, ...input }));
    if (done === null) {
      alarm(`${ALARM}: the row of the ${tag} moved on before its finalise (the outcome was ${input.outcome})`);
      return;
    }
    // ⭐ `-298`'s principle / RE5-bis — ANY finish (`accepted` included) on a row that says a prior attempt may have sent.
    if (done.mayHaveSent) {
      alarm(`${ALARM}: the ${tag} finished '${input.outcome}' on attempt ${String(begun.attemptCount)} — a prior attempt may have sent`);
    }
  };
  const transient = async (r: { readonly detail: string; readonly held: boolean; readonly mayHaveSent: boolean }): Promise<never> => {
    const noted = await inScope((d) =>
      claimDomain.noteSuspicionStaffEmailTransient(d, { pariwarId, noticeId: begun.noticeId, jobId, detail: r.detail, mayHaveSent: r.mayHaveSent, now: clock() }),
    );
    if (noted === 0) alarm(`${ALARM}: the row of the ${tag} moved on before its transient note (${r.detail})`);
    // RE6 — a HELD account / config fault alarms ONCE per row per DISTINCT fault (⛔ per pg-boss attempt).
    else if (r.held && r.detail !== begun.previousDetail) {
      alarm(`${ALARM}: the ${tag} is HELD by a provider account / config fault — ${r.detail}; it stays 'attempting' and retries (⛔ final)`);
    }
    throw new ClaimCorrectionTransientError(`${ALARM}: transient ${r.detail} for claim ${p.claimCaseId}`);
  };
  const preCall = (step: 'read_failed' | 'decrypt_failed' | 'render_failed') =>
    transient({ detail: claimDomain.suspicionStaffEmailDetail({ kind: 'pre_call', step }), held: false, mayHaveSent: false });
  const noAddress = async (reason: 'no_address' | 'invalid_address'): Promise<SuspicionStaffEmailChildResult> => {
    const d = claimDomain.suspicionStaffEmailDetail({ kind: 'error', reason });
    await finalise({ outcome: 'error', detail: d });
    alarm(`${ALARM}: the ${tag} was NOT sent — ${d}; recorded 'error'`);
    return { status: 'error', detail: d };
  };

  // ADR-0040 Q2 — the address ciphertext, AS STORED, for ONE user.
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

  let rendered: RenderedStaffEmail;
  try {
    rendered = renderSuspicionStaffEmail({ link: suspicionStaffEmailLink(origin, pariwarId) });
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

/** Register the two queues, their workers and the 15-minute IST sweep. `bootAlarm` (RE7 A) is raised ONCE here. */
export async function registerClaimSuspicionStaffEmailWorkers(
  boss: QueueClient,
  deps: ClaimSuspicionStaffEmailDeps,
  opts: { readonly sweepCron?: string; readonly tz?: string; readonly bootAlarm?: string | null } = {},
): Promise<void> {
  const alarm = alarmOf(deps);
  if (opts.bootAlarm) {
    alarm(`${ALARM}: the staff email client is HELD at boot — ${opts.bootAlarm}; every email waits until it is fixed (boot proceeds)`);
  }
  await boss.createQueue(QUEUE_NAMES.CLAIM_SUSPICION_STAFF_EMAIL_SEND);
  // ⭐ `batchSize: 1` EXPLICITLY — pg-boss 12.19.1 already defaults to it, so a throw fails only its own job; stated so a changed
  // default cannot silently make one job's transient failure abort its batch-mates (6.24b round 3's batch-loop item).
  await boss.work(QUEUE_NAMES.CLAIM_SUSPICION_STAFF_EMAIL_SEND, { batchSize: 1 }, async (jobs: Job[]) => {
    const results = [];
    for (const job of jobs) {
      try {
        results.push(await runSuspicionStaffEmailChild(deps, job.data as JobEnvelope<SuspicionStaffEmailPayload>, job.id));
      } catch (err) {
        // ⭐ The designed transient-retry signal (RE6's HELD class included) is alarmed internally, once per distinct fault —
        // ⛔ double-alarm it here. Anything else is UNEXPECTED (e.g. `beginSuspicionStaffEmail`'s "should never happen" data
        // fault) and would otherwise exhaust pg-boss's retries in silence (unlike the sweep tick's own try/catch below).
        // ⛔ `err.message` / stack here — unlike `detail`, it is ⛔ sanitised (Invariant 2); the job id + the error NAME only
        // (the job's own data, incl. the claim/recipient ids, is already in pg-boss's own job record under `job.id`).
        if (!(err instanceof ClaimCorrectionTransientError)) {
          alarm(`${ALARM}: job ${job.id} FAILED unexpectedly (non-transient) — ${err instanceof Error ? err.name : 'error'} (pg-boss retries it)`);
        }
        throw err;
      }
    }
    return { processed: results.length, results };
  });

  // ⚠ The expiry is set TWICE on purpose (6.19b's lesson): `createQueue` keeps an existing queue's default, while `schedule`
  // upserts its options on every boot and pg-boss copies them onto each job it fires.
  await boss.createQueue(QUEUE_NAMES.CLAIM_SUSPICION_STAFF_EMAIL_SWEEP, { expireInSeconds: STAFF_EMAIL_SWEEP_EXPIRE_SECONDS });
  await boss.work(QUEUE_NAMES.CLAIM_SUSPICION_STAFF_EMAIL_SWEEP, async (jobs: Job[]) => {
    try {
      const swept = await runSuspicionStaffEmailSweep(deps, boss);
      console.info(`${ALARM}-sweep tick`, JSON.stringify({ jobs: jobs.length, ...swept }));
      return swept;
    } catch (err) {
      // ⭐ Through `alarm()` (⛔ `console.error`) — a real transport, once wired, sees a failed tick (6.24b round 3's item).
      alarm(`${ALARM}-sweep: the tick FAILED — ${err instanceof Error ? err.name : 'error'} (pg-boss retries it)`);
      throw err;
    }
  });
  await boss.schedule(
    QUEUE_NAMES.CLAIM_SUSPICION_STAFF_EMAIL_SWEEP,
    opts.sweepCron ?? STAFF_EMAIL_SWEEP_CRON,
    {},
    { tz: opts.tz ?? CLAIM_CORRECTION_TZ, ...CORRECTION_SWEEP_RETRY, expireInSeconds: STAFF_EMAIL_SWEEP_EXPIRE_SECONDS },
  );
}
