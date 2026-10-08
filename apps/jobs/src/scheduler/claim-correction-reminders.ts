// The claim-correction REMINDERS — the daily sweep, the family SMS and the staff push — Story 6.19b (Tasks 3, 4, 6;
// AC2, AC3, AC4; the shared spec's D3, D4, D7, D11, D20, D21, D26, D30, D32–D34 as amended by `2026-09-29-266` …
// `-271`).
//
// ── What runs when ────────────────────────────────────────────────────────────────────────────────────────────
// ⭐ The SWEEP (daily 10:00 IST) enumerates OPEN runs — a raw cross-tenant read on the BYPASSRLS pool, paged until
// exhausted under a hard run bound AND a wall-clock budget (each alarmed) — and, per run, in ONE scope transaction
// under the trustee lock, with `lock_timeout` 30 s and `statement_timeout` 120 s (a run that times out is SKIPPED for
// the day — counted, one aggregated alarm — and the tick goes on):
//   · ends the run when its return is no longer the live one (`superseded`) or it reached day 90 (`day_90`) — through
//     the domain's end-run, ⛔ never re-derived;
//   · ⭐ tier (a) `resubmitted` PAUSES the whole run (⛔ no send, ⛔ no record); tier (b) "the family's part is done"
//     pauses the FAMILY only (`-269` §2) — its SMS, the letter chase and the chase's + 13 escalation (`-268` §2, D2);
//     D30 (nobody nameable) stops ⛔ only `family_sms` and `letter_chase` (BY PURPOSE) — the District Admin is still
//     reminded, and the + 13 escalation and `letter_second_due` still run from the run's past rows;
//   · D3's CATCH-UP per person: the latest due slot with ⛔ no record is enqueued ONCE (`late` unless it is today's),
//     older missed slots are written `skipped_superseded` — ⛔ no burst;
//   · the STAFF rows are written by the sweep itself (a staff row sends nothing — the queue is the channel, AC4):
//     the District Admin's scheduled reminder (D34 — ONE per claim per day, the open run's days; D21 stops it once
//     every family recipient is letter-eligible AND delivered — or at the two-letter cap, `-273` §2), the staff run's
//     day-12 escalation to every Pariwar Admin, the letter chase (found-dead + 7 … + 12, escalated on + 13), and each
//     person's ONE `letter_second_due`;
//   · ⭐ THE LETTER TRACK IS PER RETURN (`-272` §2, `-273` §1/§2 — Story 6.19c Task 0a): each person's state (the
//     found-dead day, the delivered-letter stop — per CURRENT number) and the letter cap / second-letter reminder (per
//     PERSON, epoch-blind) read EVERY family / direction run of the live return; the chase / escalation /
//     `letter_second_due` dedup reads the return's staff rows and compares DATES (each row's own run `day0 + slot_day`),
//     ⛔ never slot days; a date carried from an earlier run whose slot falls BEFORE this run is written at TODAY's
//     slot (`late`) — ⛔ never a negative `slot_day` (23514 would roll the claim's whole plan back). ⚠ A carried
//     found-dead date may therefore escalate on DAY 1 of a reopened run — stated, ⛔ not a defect (AC18). A person at
//     the cap is ⛔ not chased for another letter;
//   · then one staff PUSH per staff member with a row today (deduped by its own `staff_push` row).
// ⚠ What the expiry claim really is: the job's pg-boss expiry (90 min) sits 45 minutes ABOVE the budget, and the
// budget is checked BETWEEN runs, so a tick overruns its budget by at most ONE run's tail. Each DATABASE wait in that
// tail is bounded (the plan's two timeouts — per lock wait and per statement, ⛔ not per run); its non-database work
// (the KMS number hashes) is ⛔ not — so "a long tick is never expired while still running" holds only while one
// run's statements and KMS calls stay well under 45 minutes, which nothing enforces.
// Before the runs: the EXHAUSTED-ROW FINALISER (a time bound — every row still `attempting` from a previous IST day
// becomes `error` + alarm; ⛔ no catch-up for it; ⚠ the module's ONE cross-tenant WRITE — see its DELIBERATE block),
// D26's `skipped_superseded` markers for runs ended by a mark change on one of their slot days, and the
// `rejected_unreachable` burst alarm (≥ 3 on one day — a content-level block).
//
// ⭐ The CHILD (one family SMS): re-check + claim in ONE transaction under the lock (the domain's
// `beginCorrectionFamilySend`), COMMIT, then decrypt → resolve config → send (10-second timeout) → compare-and-set.
// It throws ONLY on a transient failure (`rate_limited`, `api_unavailable`, a timeout, a Secret Manager fault that is
// ⛔ not a known config fault, a re-check that could not hash the current number), so pg-boss retries (the SAME job
// re-claims its own row at once). ⚠ At-least-once: recorded, ⛔ never hidden. A retry that crosses IST midnight still
// `attempting` is closed `error` (`exhausted:crossed_midnight`) + alarmed by the stale path — ⛔ never re-sent.
//
// ⛔ NOTHING here approves, refuses or closes a claim (invariant 1). ⛔ No name in any message (invariant 4).
// ⛔ Never `delivered` for an accept (invariant 3). ⛔ Job payloads carry ids — ⛔ never a number.

import { createHash } from 'node:crypto';

import {
  dispatch,
  type AuditPort,
  type ProviderRegistry,
  type RenderedMessageHash,
  type SmsAppClient,
} from '@twt/channels';
import { Alert } from '@twt/contracts';
import {
  claim as claimDomain,
  cycleCalendar,
  encryption,
  ids,
  notifications,
  withPariwarScope,
  type Db,
} from '@twt/domain';
import { QUEUE_NAMES, type Job, type JobEnvelope, type QueueClient } from '@twt/queue';
import type pg from 'pg';

import {
  CLAIM_CORRECTION_SMS_TEMPLATES,
  renderClaimCorrectionSms,
  type ClaimCorrectionSmsLocale,
  type ClaimCorrectionSmsMessage,
} from './claim-correction-sms-templates.js';
import { sendClaimDltSms, type ClaimCorrectionSmsResult } from './claim-dlt-sms-send.js';

// ── Operational knobs ────────────────────────────────────────────────────────────────────────────────────────

/** IST — never a UTC cron (architecture §scheduling). */
export const CLAIM_CORRECTION_TZ = 'Asia/Kolkata';
/** The open-run scan's PAGE size (and the D26 marker scan's batch — a full batch is ALARMED). */
export const DEFAULT_CORRECTION_SWEEP_RUN_LIMIT = 1000;
/** The HARD bound on open runs one tick sweeps — the scan pages until exhausted or this; hitting it is ALARMED. */
export const DEFAULT_CORRECTION_SWEEP_MAX_RUNS = 20_000;
/**
 * The tick's WALL-CLOCK budget: once a tick has run this long it stops paging (ALARMED) — the run bound alone does
 * ⛔ not bound the time (one run is a scope transaction + a lock + several reads; a slow DB stretches it). 45 minutes
 * covers the bound at ~135 ms a run.
 */
export const DEFAULT_CORRECTION_SWEEP_BUDGET_MS = 45 * 60 * 1000;
/**
 * ⚠ The sweep job's pg-boss expiry, stated — ⛔ never pg-boss 12's default 15 minutes, which would fail (and RETRY) a
 * long tick while it is still running ⇒ two overlapping sweeps. ABOVE the budget + one run's tail (the budget is
 * checked between runs; the tail's DB waits are bounded by the plan's timeouts below, its KMS calls are ⛔ not — see
 * the module header). pg-boss refuses an expiry of 24 hours or more.
 */
export const CORRECTION_SWEEP_EXPIRE_SECONDS = 90 * 60;
/**
 * The plan's scope-transaction bounds (`SET LOCAL`): a run waiting longer than this on the trustee lock (or any row
 * lock), or one statement running longer, is SKIPPED for the day (the tick goes on; counted + one aggregated alarm).
 */
export const CORRECTION_PLAN_LOCK_TIMEOUT = '30s';
export const CORRECTION_PLAN_STATEMENT_TIMEOUT = '120s';
/** A send is abandoned after this and counted `api_unavailable` — moved with the send core (RB4), re-exported here. */
export { CORRECTION_SEND_TIMEOUT_MS, type ClaimCorrectionSmsResult } from './claim-dlt-sms-send.js';
/** D26's marker window — runs ended `mark_changed` within this are checked for a slot-day marker. */
export const CORRECTION_MARK_CHANGE_LOOKBACK_MS = 36 * 60 * 60 * 1000;
/** `-269` §4 — one day's `rejected_unreachable` sends at or above this alarm (a content-level carrier block). */
export const CORRECTION_UNREACHABLE_BURST_THRESHOLD = 3;
/** The family SMS child's own retry policy — ⛔ not borrowed from `contribution-notify-triggers`'s (same VALUES
 * today by coincidence; declared here so a future edit to that unrelated feature cannot silently change this one). */
export const CHILD_RETRY_LIMIT = 4;
export const CHILD_RETRY_DELAY_SECONDS = 60;
/**
 * ⚠ The SWEEP and STAFF-PUSH retry policy, stated — ⛔ never pg-boss 12.19.1's default (2 IMMEDIATE retries,
 * `QUEUE_DEFAULTS`). Both are idempotent (the reminder table's UNIQUE; the push's own row).
 */
export const CORRECTION_SWEEP_RETRY = { retryLimit: 2, retryDelay: 60, retryBackoff: true } as const;
export const CORRECTION_PUSH_RETRY = { retryLimit: 2, retryDelay: 60, retryBackoff: true } as const;

// ── Payloads (NON-PII: ids and dates only — ⛔ never a number, a name or an address) ───────────────────────────

export interface CorrectionFamilySmsPayload {
  readonly runId: string;
  readonly claimCaseId: string;
  readonly slotDay: number;
  readonly personKey: string;
  /** The IST date the sweep enqueued it for (`sent_on`). */
  readonly sentOn: string;
  readonly late: boolean;
}

/** pg-boss's retry metadata for one child delivery (`work(…, { includeMetadata: true })`). */
export interface CorrectionChildAttempt {
  /** 0 on the first attempt, then 1 … `retryLimit`. */
  readonly retryCount: number;
  readonly retryLimit: number;
}

export interface CorrectionStaffPushPayload {
  readonly claimCaseId: string;
  readonly runId: string;
  readonly slotDay: number;
  readonly userId: string;
  readonly sentOn: string;
}

// ── Deps ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface ClaimCorrectionReminderDeps {
  /** The BYPASSRLS service pool — the cross-tenant scans and the `withPariwarScope` pool (⚠ `max: 2` in boot). */
  readonly pool: pg.Pool;
  /** Tier-1 decrypt + the number hash (the jobs KMS deps). */
  readonly encryption: encryption.FieldCryptoDeps;
  /** THE one global SMS gateway client (`buildContributionProviderResolver`). */
  readonly smsAppClient: SmsAppClient;
  /** Config NAME → value, `null` = "not provisioned"; THROWS on a Secret Manager outage (`resolveSmsDltConfig`). */
  readonly resolveConfig: (configKey: string) => Promise<string | null>;
  /** The staff push's `dispatch()` seams. */
  readonly push: {
    readonly audit: AuditPort;
    readonly hashRendered: RenderedMessageHash;
    readonly resolveProviders?: (key: { pariwarId: string; category: Alert['alert_category'] }) => Promise<ProviderRegistry>;
  };
  readonly now?: () => Date;
  readonly onAlarm?: (message: string) => void;
  /** The open-run scan's PAGE size (the D26 marker scan's batch, too). */
  readonly runLimit?: number;
  /** The HARD bound on open runs one tick sweeps (pages until exhausted or this) — hitting it is ALARMED. */
  readonly maxRuns?: number;
  /** The tick's wall-clock budget (default `DEFAULT_CORRECTION_SWEEP_BUDGET_MS`) — running out is ALARMED. */
  readonly sweepBudgetMs?: number;
  /**
   * A MONOTONIC millisecond clock for the budget (default `performance.now`) — ⛔ never `now`, which the tests pin to
   * a fixed IST date and which a wall-clock step could move backwards.
   */
  readonly elapsedClockMs?: () => number;
  readonly sendTimeoutMs?: number;
  /**
   * ⚠ TESTS ONLY — restrict every cross-tenant statement of the sweep (the exhausted-row finaliser, the burst count,
   * the D26 marker scan, the open-run scan) to these Pariwars, so a live suite's far-future clock cannot end or
   * finalise ANOTHER suite's runs in the shared database. Production leaves it unset (every tenant). ⚠ An EMPTY list
   * is REFUSED (the sweep does nothing and alarms) — ⛔ never a silently disabled sweep; so is ANY list while
   * `NODE_ENV` is `production` (⛔ never a silently narrowed production sweep).
   */
  readonly pariwarAllowlist?: readonly string[];
}

type EnqueueBoss = Pick<QueueClient, 'send'>;

function alarmOf(deps: ClaimCorrectionReminderDeps): (m: string) => void {
  return deps.onAlarm ?? ((m: string): void => console.warn(m));
}

// ── The exported SEND (6.19c calls it for the closure notice — D32) ─────────────────────────────────────────

/**
 * ⭐ SEND ONE CLAIM-CORRECTION SMS (D7 — a DIRECT DLT SMS to an explicit E.164 number; ⛔ not `dispatch()`, ⛔ not an
 * Alert). Since Story 6.24b (RB4) a WRAPPER over the shared core `sendClaimDltSms` (`claim-dlt-sms-send.ts`), which holds
 * the fail-closed rules and the provider-result classification ONCE — behaviour byte-identical (proved by
 * `claim-correction-send.test.ts`, UNEDITED). This wrapper keeps the 6.19 registry lookup and the `{ reference, helpline }`
 * render.
 */
export async function sendClaimCorrectionSms(
  deps: Pick<ClaimCorrectionReminderDeps, 'smsAppClient' | 'resolveConfig' | 'sendTimeoutMs'>,
  input: {
    readonly message: ClaimCorrectionSmsMessage;
    readonly locale: ClaimCorrectionSmsLocale;
    readonly pariwarId: string;
    readonly claimCaseId: string;
    /** The E.164 recipient — decrypted by the caller, ⛔ never logged. */
    readonly e164: string;
  },
): Promise<ClaimCorrectionSmsResult> {
  const template = CLAIM_CORRECTION_SMS_TEMPLATES[input.message][input.locale];
  return sendClaimDltSms(deps, {
    dltTemplateIdConfigKey: template.dltTemplateIdConfigKey,
    pariwarId: input.pariwarId,
    e164: input.e164,
    render: (helpline) =>
      renderClaimCorrectionSms(input.message, input.locale, {
        reference: claimDomain.claimShortReference(input.claimCaseId),
        helpline,
      }),
  });
}

// ── The CHILD — one family SMS ──────────────────────────────────────────────────────────────────────────────

/** A transient failure — thrown so pg-boss retries the SAME job (which re-claims its own row at once). */
export class ClaimCorrectionTransientError extends Error {
  public readonly name = 'ClaimCorrectionTransientError';
}

export type CorrectionFamilySmsChildResult =
  | { readonly status: 'sent'; readonly outcome: string }
  /** `stale_slot` is the jobs-side skip: a child enqueued for an EARLIER IST day (see the child). */
  | { readonly status: 'skipped'; readonly reason: claimDomain.CorrectionSkipReason | 'stale_slot' }
  | { readonly status: 'noop'; readonly reason: string };

/**
 * ⭐ ONE family SMS (AC2/AC3). The re-check and the claim happen in ONE transaction under the trustee lock
 * (`beginCorrectionFamilySend`) on the ONE client of that scope tx; the decrypt, the config reads and the send happen
 * AFTER its commit (the jobs domain pool is `max: 2` — ⛔ never a second checkout inside the lock); the row moves to
 * its final state after the send by compare-and-set. A failed re-check completes ⛔ without throwing.
 * @throws ClaimCorrectionTransientError  a transient failure (pg-boss retries)
 */
export async function runCorrectionFamilySmsChild(
  deps: ClaimCorrectionReminderDeps,
  envelope: JobEnvelope<CorrectionFamilySmsPayload>,
  jobId: string,
  /** pg-boss's retry metadata for THIS delivery (`includeMetadata`); absent ⇒ treated as the first attempt. */
  attempt?: CorrectionChildAttempt,
): Promise<CorrectionFamilySmsChildResult> {
  const alarm = alarmOf(deps);
  const now = deps.now?.() ?? new Date();
  const p = envelope.payload;
  const pid = envelope.pariwarId;
  if (pid === null || pid === '') {
    alarm(`[jobs] claim-correction-sms: missing pariwarId for run ${p.runId}`);
    return { status: 'noop', reason: 'missing_pariwar' };
  }
  const pariwarId = ids.pariwarId(pid);
  const claimCaseId = ids.claimId(p.claimCaseId);

  // ⭐ A STALE child — enqueued for an EARLIER IST day (a redelivery, a backlog) — ⛔ never sends that day's slot
  // today: today's sweep owns today (its catch-up re-plans the slot), so a late send here would be a SECOND text
  // the same day. ⛔ No marker is written for a slot it never claimed (S2 — a marker would hide the slot from the
  // catch-up). THIS job's own `attempting` row (a retry that crossed midnight) is finalised EXACTLY like the
  // exhausted-row finaliser (J8): `error` + `exhausted:crossed_midnight`, its transient detail KEPT in `first_detail`
  // (an `api_unavailable` may have been a send that landed — ⚠ at-least-once, recorded), ⛔ no catch-up for it, and an
  // alarm — ⛔ never a silent `skipped_superseded` that would hide the attempt.
  if (p.sentOn < cycleCalendar.istDateOf(now)) {
    const expired = await withPariwarScope(deps.pool, pid, async (db: Db, client) => {
      await claimDomain.acquireCorrectionChaseLock(client, pid, p.claimCaseId);
      const own = await claimDomain.readCorrectionReminder(db, {
        pariwarId,
        claimCaseId,
        runId: p.runId,
        slotDay: p.slotDay,
        recipientKey: p.personKey,
        purpose: 'family_sms',
        subjectKey: '',
      });
      if (own === null || own.outcome !== 'attempting' || own.claimedByJob !== jobId) return false;
      return claimDomain.expireOwnCorrectionReminder(db, {
        pariwarId,
        reminderId: own.reminderId,
        jobId,
        detail: 'exhausted:crossed_midnight',
      });
    });
    if (expired) {
      alarm(
        `[jobs] claim-correction-sms: run ${p.runId} slot ${String(p.slotDay)} (claim ${p.claimCaseId}) was still ` +
          `'attempting' past IST midnight — recorded 'error' (exhausted:crossed_midnight), ⛔ no catch-up for it`,
      );
    }
    return { status: 'skipped', reason: 'stale_slot' };
  }

  const begin = () => withPariwarScope(deps.pool, pid, (_db, client) =>
    claimDomain.beginCorrectionFamilySend(client, {
      pariwarId,
      claimCaseId,
      runId: p.runId,
      slotDay: p.slotDay,
      personKey: p.personKey,
      sentOn: p.sentOn,
      late: p.late,
      jobId,
      now,
      // I4 — the re-check hashes the person's CURRENT number (under the lock) so a 6.20-corrected number is ⛔ never
      // silenced by the OLD number's delivered letter or found-dead marker (`-271` §1); the send's decrypt is still
      // after the commit.
      crypto: deps.encryption,
    }),
  );
  let begun: Awaited<ReturnType<typeof begin>>;
  try {
    begun = await begin();
  } catch (err) {
    if (err instanceof claimDomain.CorrectionNumberHashUnavailableError) {
      // The re-check could ⛔ not hash the CURRENT number while an earlier epoch's delivered letter is all that would
      // stop the send — its transaction rolled back (⛔ no row), so retry. ⚠ ⛔ No row ⇒ ⛔ no finaliser would ever
      // surface a hash that never clears — alarm (ids only), but ⛔ not on every retry: on the FIRST attempt, and on
      // the FINAL one (when pg-boss's metadata says so) — the one after which nobody retries it.
      const retryCount = attempt?.retryCount ?? 0;
      const finalAttempt = attempt !== undefined && attempt.retryCount >= attempt.retryLimit;
      if (finalAttempt) {
        alarm(
          `[jobs] claim-correction-sms: the current number could not be hashed in the re-check for run ${p.runId} ` +
            `slot ${String(p.slotDay)} (claim ${p.claimCaseId}) on the FINAL attempt — giving up; ⛔ no row, so the next ` +
            `sweep's catch-up re-plans the slot`,
        );
      } else if (retryCount === 0) {
        alarm(
          `[jobs] claim-correction-sms: the current number could not be hashed in the re-check for run ${p.runId} ` +
            `slot ${String(p.slotDay)} (claim ${p.claimCaseId}) — retrying`,
        );
      }
      throw new ClaimCorrectionTransientError(`[jobs] claim-correction-sms: transient hash_failed:tier1 (re-check) for run ${p.runId}`);
    }
    throw err;
  }
  if (begun.kind === 'skipped') {
    // K4 — the re-check failed on a RETRY of an attempt that already ran (its row carried a transient detail): the
    // domain expired that row `error` (`exhausted:recheck_<reason>`, the transient detail kept in `first_detail`)
    // instead of hiding it as `skipped_superseded`. ⚠ The earlier attempt may have reached the phone (at-least-once,
    // recorded) — alarm, ids only.
    if (begun.expiredAttempt === true) {
      alarm(
        `[jobs] claim-correction-sms: run ${p.runId} slot ${String(p.slotDay)} (claim ${p.claimCaseId}) — the re-check ` +
          `now fails (${begun.reason}) after an attempt already ran; its row was recorded 'error' ` +
          `(exhausted:recheck_${begun.reason}), ⛔ no catch-up for it — the earlier attempt may have sent`,
      );
    }
    return { status: 'skipped', reason: begun.reason };
  }
  if (begun.kind === 'noop') return { status: 'noop', reason: begun.reason };

  // ── After the commit: decrypt, hash, send ─────────────────────────────────────────────────────────────────
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
    throw new ClaimCorrectionTransientError(`[jobs] claim-correction-sms: transient ${detail} for run ${p.runId}`);
  };

  let e164: string | null;
  try {
    e164 = await claimDomain.resolveCorrectionMobile(
      begun.person.mobileCiphertext,
      begun.person.mobileSource,
      pid,
      deps.encryption,
    );
  } catch {
    // A KMS outage or an unreadable envelope — retried; if it never clears, the finaliser records `error` tomorrow.
    return transient('decrypt_failed:tier1');
  }
  if (e164 === null) {
    // A vacated version's null mobile, an erasure sentinel or a malformed number ⇒ `no_target` WITHOUT a send (D20).
    await finalise({ outcome: 'no_target', detail: 'no_target:no_sendable_number', recipientNumberHash: null });
    return { status: 'sent', outcome: 'no_target' };
  }
  let recipientNumberHash: string;
  try {
    recipientNumberHash = await claimDomain.correctionNumberHash(e164, pid, deps.encryption);
  } catch {
    // A KMS / HMAC failure — classified and retried like the decrypt (⛔ never an unclassified throw with no cause).
    return transient('hash_failed:tier1');
  }

  const result = await sendClaimCorrectionSms(deps, {
    message: 'reminder',
    locale: begun.contactLocale,
    pariwarId: pid,
    claimCaseId: p.claimCaseId,
    e164,
  });
  if (result.kind === 'transient') return transient(result.detail);
  if (result.outcome !== 'accepted' && result.alarm) {
    alarm(`[jobs] claim-correction-sms: ${result.detail} for claim ${p.claimCaseId} run ${p.runId} — recorded error (fail-closed)`);
  }
  const moved = await finalise({
    outcome: result.outcome,
    providerMessageId: result.providerMessageId,
    detail: result.detail,
    recipientNumberHash,
  });
  if (!moved) alarm(`[jobs] claim-correction-sms: the row for run ${p.runId} slot ${String(p.slotDay)} moved on before its finalise`);
  return { status: 'sent', outcome: result.outcome };
}

// ── The STAFF PUSH — one per (claim, staff member, IST date) ─────────────────────────────────────────────────

const CORRECTION_PUSH_ALERT_NAMESPACE = '9d1f3b6a-2c47-4e8b-b5a0-6f0e1c2d3a4b';

function uuidV5(namespaceUuid: string, name: string): string {
  const nsBytes = Buffer.from(namespaceUuid.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1').update(Buffer.concat([nsBytes, Buffer.from(name, 'utf8')])).digest();
  const bytes = hash.subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const h = bytes.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/**
 * The staff items ONE daily push lists — 6.19b's and (Story 6.19c) the closure's: the District Admin's closure reminders
 * and the escalations, the Super Admin's review / staff-case reminders, a directee's, the closure-letter chase.
 */
export const STAFF_PUSH_ITEM_PURPOSES: readonly string[] = [
  'staff_reminder',
  'letter_chase',
  'letter_second_due',
  'escalation',
  ...claimDomain.CLOSURE_STAFF_PURPOSES,
];

/** The staff push's copy — ENGLISH (staff copy is English-only), name-free, naming the correction queue. */
export function correctionStaffPushText(items: readonly { readonly purpose: string }[], reference: string): {
  readonly title: string;
  readonly body: string;
} {
  const n = items.length;
  // Story 6.19c — its escalations (the day-97 closure escalation, the staff case to the Super Admin, the closure-letter
  // chase's day 13) read as escalations too.
  const escalated = items.some((i) =>
    ['escalation', 'closure_escalation', 'staff_case_escalation', 'closure_letter_escalation'].includes(i.purpose),
  );
  return {
    title: escalated ? `Claim ${reference}: a correction chase needs you` : `Claim ${reference}: correction reminder`,
    body: `${String(n)} item${n === 1 ? '' : 's'} due today on claim ${reference}. Open the correction queue in the admin app.`,
  };
}

/**
 * The staff push's Alert — PURE (pinned by a unit test): a deterministic id per (claim, staff member, IST date), the
 * deceased member as the SUBJECT (D11 — the push goes to the staff member's device, ⛔ never the member's),
 * `time_critical: false` (⛔ never the AR-18 override), `alert_published` (push-eligible; Telegram is never reached —
 * the delivery resolver names push alone).
 */
export function correctionStaffPushAlert(input: {
  readonly pariwarId: string;
  readonly claimCaseId: string;
  readonly userId: string;
  readonly sentOn: string;
  readonly deceasedMemberId: string;
  readonly items: readonly { readonly purpose: string }[];
  readonly now: Date;
}): Alert {
  const text = correctionStaffPushText(input.items, claimDomain.claimShortReference(input.claimCaseId));
  return Alert.parse({
    alert_id: uuidV5(CORRECTION_PUSH_ALERT_NAMESPACE, `${input.claimCaseId}:${input.userId}:${input.sentOn}`),
    pariwar_id: input.pariwarId,
    member_id: input.deceasedMemberId,
    time_critical: false,
    provenance_refs: {},
    created_at: input.now.toISOString(),
    created_by_actor: 'system',
    alert_category: 'alert_published',
    payload_data: { title: text.title, body: text.body },
  });
}

export type CorrectionStaffPushResult =
  | { readonly status: 'pushed'; readonly outcome: 'accepted' | 'no_target' | 'error' }
  | { readonly status: 'noop'; readonly reason: string };

/**
 * ⭐ ONE daily staff push per (claim, staff member, IST date) (AC4, D11, D34). Claims its own `staff_push` row (the
 * partial UNIQUE on `(claim_case_id, recipient_key, sent_on)` — a sweep retry after a same-day mark switch cannot key
 * a second push on the new run), reads that day's staff rows for the member, then pushes through `dispatch()` narrowed
 * to push (`resolveDelivery: () => ({ push: target })` — ⛔ not `fanOutAlert`, ⛔ no Telegram mirror). Admin device
 * tokens live under `ADMIN_GLOBAL_NAMESPACE`, read in a scope set to it. ⛔ No token ⇒ `no_target` with ⛔ no alarm
 * (the day-one state). ⚠ INERT ON DAY ONE — ⛔ no admin client registers a device token yet.
 */
export async function runCorrectionStaffPush(
  deps: ClaimCorrectionReminderDeps,
  envelope: JobEnvelope<CorrectionStaffPushPayload>,
  jobId: string,
): Promise<CorrectionStaffPushResult> {
  const now = deps.now?.() ?? new Date();
  const p = envelope.payload;
  const pid = envelope.pariwarId;
  if (pid === null || pid === '') {
    alarmOf(deps)(`[jobs] claim-correction-push: missing pariwarId for claim ${p.claimCaseId}`);
    return { status: 'noop', reason: 'missing_pariwar' };
  }
  const pariwarId = ids.pariwarId(pid);
  const claimCaseId = ids.claimId(p.claimCaseId);
  const recipientKey = `staff:${p.userId}`;

  const claimed = await withPariwarScope(deps.pool, pid, async (db: Db, client) => {
    await claimDomain.acquireCorrectionChaseLock(client, pid, p.claimCaseId);
    const c = await claimDomain.claimCorrectionReminder(db, {
      pariwarId,
      claimCaseId,
      runId: p.runId,
      slotDay: p.slotDay,
      recipientKey,
      purpose: 'staff_push',
      subjectKey: '',
      sentOn: p.sentOn,
      late: false,
      jobId,
      now,
    });
    if (c.status !== 'claimed') return { c, items: [] as { purpose: string }[], deceased: null as string | null };
    const { rows } = await client.query<{ purpose: string }>(
      `SELECT purpose FROM claim_correction_reminders
        WHERE pariwar_id = $1 AND claim_case_id = $2 AND recipient_key = $3 AND sent_on = $4
          AND outcome = 'recorded' AND purpose = ANY($5::text[])`,
      [pid, p.claimCaseId, recipientKey, p.sentOn, STAFF_PUSH_ITEM_PURPOSES],
    );
    const claimRow = await claimDomain.readCorrectionClaimRow(db, pariwarId, claimCaseId);
    return { c, items: rows, deceased: claimRow?.deceasedMemberId ?? null };
  });
  if (claimed.c.status !== 'claimed') return { status: 'noop', reason: claimed.c.status };
  const reminderId = claimed.c.reminderId;
  const finalise = (outcome: 'accepted' | 'no_target' | 'error', detail: string | null, providerMessageId: string | null = null) =>
    withPariwarScope(deps.pool, pid, (db: Db) =>
      claimDomain.finaliseCorrectionReminder(db, { pariwarId, reminderId, jobId, outcome, detail, providerMessageId }),
    );

  if (claimed.items.length === 0 || claimed.deceased === null) {
    await finalise('no_target', 'no_target:no_items_today');
    return { status: 'pushed', outcome: 'no_target' };
  }

  const targets = await withPariwarScope(deps.pool, encryption.ADMIN_GLOBAL_NAMESPACE, (db: Db) =>
    notifications.resolvePushTargets(db, deps.encryption, encryption.ADMIN_GLOBAL_NAMESPACE, 'admin', p.userId),
  );
  if (targets.length === 0) {
    // The day-one state — ⛔ no admin device token. ⛔ No alarm (it would fire daily for every claim).
    await finalise('no_target', 'no_target:no_admin_device_token');
    return { status: 'pushed', outcome: 'no_target' };
  }

  const alert = correctionStaffPushAlert({
    pariwarId: pid,
    claimCaseId: p.claimCaseId,
    userId: p.userId,
    sentOn: p.sentOn,
    deceasedMemberId: claimed.deceased,
    items: claimed.items,
    now,
  });
  const providers = deps.push.resolveProviders
    ? await deps.push.resolveProviders({ pariwarId: pid, category: 'alert_published' })
    : undefined;
  let accepted = false;
  let providerMessageId: string | null = null;
  for (const target of targets) {
    const outcome = await dispatch(alert, {
      ...(providers ? { providers } : {}),
      resolveDelivery: () => Promise.resolve({ push: target }),
      hashRendered: deps.push.hashRendered,
      audit: deps.push.audit,
    });
    const attempt = outcome.attempts.find((a) => a.channel === 'push');
    if (attempt?.outcome === 'sent') {
      accepted = true;
      providerMessageId = attempt.result?.providerMessageId ?? providerMessageId;
    }
  }
  await finalise(accepted ? 'accepted' : 'error', accepted ? null : 'push:not_accepted', providerMessageId);
  return { status: 'pushed', outcome: accepted ? 'accepted' : 'error' };
}

// ── The SWEEP ────────────────────────────────────────────────────────────────────────────────────────────────

export interface CorrectionSweepResult {
  readonly scannedRuns: number;
  readonly endedRuns: number;
  readonly enqueuedSms: number;
  readonly staffRows: number;
  readonly enqueuedPushes: number;
  readonly finalisedStuck: number;
  readonly markers: number;
  /** Runs whose plan hit `lock_timeout` / `statement_timeout` — SKIPPED for the day (one aggregated alarm). */
  readonly timedOutRuns: number;
  /** The tick ran out of its wall-clock budget and stopped paging (alarmed). */
  readonly budgetExhausted: boolean;
}

/** The SQLSTATEs of the plan's two timeouts: `lock_not_available` (55P03) and `query_canceled` (57014). */
const PLAN_TIMEOUT_SQLSTATES: ReadonlySet<string> = new Set(['55P03', '57014']);

/** Did a plan fail on one of its scope-transaction timeouts? Reads `code`, else a wrapping error's `cause.code`. */
function isPlanTimeout(err: unknown): boolean {
  const codeOf = (e: unknown): unknown =>
    typeof e === 'object' && e !== null ? (e as { readonly code?: unknown }).code : undefined;
  const code = codeOf(err) ?? codeOf(typeof err === 'object' && err !== null ? (err as { readonly cause?: unknown }).cause : undefined);
  return typeof code === 'string' && PLAN_TIMEOUT_SQLSTATES.has(code);
}

/** At most this many claim ids are named in one aggregated alarm (the count is always exact). */
const ALARM_SAMPLE_IDS = 5;

function sampleIds(list: readonly string[]): string {
  const shown = list.slice(0, ALARM_SAMPLE_IDS).join(', ');
  return list.length > ALARM_SAMPLE_IDS ? `${shown} (+${String(list.length - ALARM_SAMPLE_IDS)} more)` : shown;
}

/**
 * ⭐ THE DAILY SWEEP (AC2, AC4). See the module header for what it does and in what order. A per-run try/catch — one
 * claim's failure (⚠ `resolveClaimCorrectionState` re-throws anything that is not one of its three "not yet"
 * errors) never costs another claim its reminder; the next tick retries it.
 */
export async function runCorrectionReminderSweep(
  deps: ClaimCorrectionReminderDeps,
  boss: EnqueueBoss,
): Promise<CorrectionSweepResult> {
  const alarm = alarmOf(deps);
  const now = deps.now?.() ?? new Date();
  const today = cycleCalendar.istDateOf(now);
  const limit = Math.max(1, deps.runLimit ?? DEFAULT_CORRECTION_SWEEP_RUN_LIMIT);
  // ⚠ The bound is the caller's — ⛔ never raised to the page size: a page is CLAMPED down to what is left under it
  // (`Math.min(limit, maxRuns - scannedRuns)` in the scan below).
  const maxRuns = Math.max(1, deps.maxRuns ?? DEFAULT_CORRECTION_SWEEP_MAX_RUNS);
  const clockMs = deps.elapsedClockMs ?? ((): number => performance.now());
  const startedMs = clockMs();
  const budgetMs = Math.max(0, deps.sweepBudgetMs ?? DEFAULT_CORRECTION_SWEEP_BUDGET_MS);
  // `null` ⇒ every tenant (production); a list ⇒ only those Pariwars (tests — see `pariwarAllowlist`).
  const allow: string[] | null = deps.pariwarAllowlist ? [...deps.pariwarAllowlist] : null;
  const refused = (why: string): CorrectionSweepResult => {
    alarm(`[jobs] claim-correction-sweep: REFUSED — ${why}; nothing was swept`);
    return {
      scannedRuns: 0,
      endedRuns: 0,
      enqueuedSms: 0,
      staffRows: 0,
      enqueuedPushes: 0,
      finalisedStuck: 0,
      markers: 0,
      timedOutRuns: 0,
      budgetExhausted: false,
    };
  };
  if (allow !== null && process.env['NODE_ENV'] === 'production') {
    // ⛔ The allowlist is TEST-ONLY: set in production it would silently narrow every cross-tenant statement (the
    // finaliser, the burst count, D26, the open-run scan) to a few tenants. Refuse it, loudly — every tick.
    return refused('`pariwarAllowlist` is set while NODE_ENV is production (it is test-only)');
  }
  if (allow !== null && allow.length === 0) {
    // ⛔ An empty allowlist would match ⛔ no tenant — every statement a silent no-op, the sweep disabled with a green
    // tick. Refuse it, loudly.
    return refused('`pariwarAllowlist` is EMPTY (it would sweep ⛔ no tenant)');
  }

  // (1) THE EXHAUSTED-ROW FINALISER — a time bound, ⛔ not a retry count: the retry horizon (60 s with backoff over 4
  //     tries) is minutes, ⛔ never a day. `error` is FINAL — ⛔ no catch-up for that slot.
  // ── DELIBERATE: a CROSS-TENANT WRITE on the BYPASSRLS pool (family 9) ─────────────────────────────────────────
  // Every other write in this module runs inside `withPariwarScope` (RLS + the trustee lock); this ONE statement
  // does ⛔ not. WHY: it is a time bound over EVERY tenant's rows, and its predicate (`attempting` + claimed before
  // today's IST midnight) and its effect (→ `error`, the detail moved to `first_detail`) read and write ⛔ nothing
  // tenant-derived — ⛔ no PII, ⛔ no cross-row join, ⛔ no value from one tenant reaches another. A per-tenant loop
  // would first need a cross-tenant READ to enumerate the Pariwars (the same bypass), then N scope transactions to
  // apply one predicate. ⚠ It takes ⛔ no trustee lock: a row still `attempting` from a previous IST day is past every
  // retry and lease (10 minutes), so ⛔ no live job can hold it; a job that somehow finalises it later loses its
  // compare-and-set (`finaliseCorrectionReminder` keys on `attempting`). RE-EXAMINE when: the statement ever writes
  // a value derived from another row or tenant, the pool loses BYPASSRLS, a per-tenant scheduler exists, or the
  // retry / lease horizon approaches a day.
  const stuck = await deps.pool.query<{ reminder_id: string; claim_case_id: string }>(
    `UPDATE claim_correction_reminders
        SET outcome = 'error',
            first_detail = COALESCE(first_detail, detail),
            detail = 'exhausted:attempting_past_day',
            updated_at = clock_timestamp()
      WHERE outcome = 'attempting' AND claimed_at < $1
        AND ($2::uuid[] IS NULL OR pariwar_id = ANY($2::uuid[]))
      RETURNING reminder_id, claim_case_id`,
    [cycleCalendar.istMidnightAt(today), allow],
  );
  if (stuck.rows.length > 0) {
    alarm(
      `[jobs] claim-correction-sweep: finalised ${String(stuck.rows.length)} reminder(s) still 'attempting' from a previous ` +
        `IST day to 'error' (claims: ${[...new Set(stuck.rows.map((r) => r.claim_case_id))].join(', ')})`,
    );
  }

  // (2) `-269` §4 — a BURST of `rejected_unreachable` on one day (evaluated the next morning). `carrier_reject` also
  //     covers spam filters: a content-level block would make everyone letter-eligible. Letter-eligibility is ⛔ not
  //     undone — a letter is only added reach.
  const yesterday = cycleCalendar.addCalendarDays(today, -1);
  const burst = await deps.pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM claim_correction_reminders
      WHERE purpose = 'family_sms' AND outcome = 'rejected_unreachable' AND sent_on = $1
        AND ($2::uuid[] IS NULL OR pariwar_id = ANY($2::uuid[]))`,
    [yesterday, allow],
  );
  const burstCount = burst.rows[0]?.n ?? 0;
  if (burstCount >= CORRECTION_UNREACHABLE_BURST_THRESHOLD) {
    alarm(
      `[jobs] claim-correction-sweep: ${String(burstCount)} family SMS on ${yesterday} were refused by the network ` +
        `(rejected_unreachable) — check the DLT content / sender for a carrier-level block`,
    );
  }

  // (3) D26 — a run ended by a mark change ON ONE OF ITS SLOT DAYS: `skipped_superseded` for each recipient with ⛔ no
  //     row for that slot (an existing row is left as it is; the child's re-check already stopped the send).
  let markers = 0;
  // `LIMIT limit + 1` — the extra row is a PROBE only (never processed): it tells a full batch from a capped one, so
  // the alarm fires only when runs were really left out (⛔ at exactly `limit`).
  const changed = await deps.pool.query<{ run_id: string; claim_case_id: string; pariwar_id: string }>(
    `SELECT run_id, claim_case_id, pariwar_id FROM claim_correction_runs
      WHERE end_reason = 'mark_changed' AND ended_at > $1
        AND ($3::uuid[] IS NULL OR pariwar_id = ANY($3::uuid[]))
      ORDER BY ended_at ASC, run_id ASC
      LIMIT $2`,
    [new Date(now.getTime() - CORRECTION_MARK_CHANGE_LOOKBACK_MS), limit + 1, allow],
  );
  for (const row of changed.rows.slice(0, limit)) {
    try {
      markers += await withPariwarScope(deps.pool, row.pariwar_id, (db: Db) => writeMarkChangeMarkers(db, row));
    } catch (err) {
      alarm(`[jobs] claim-correction-sweep: D26 markers failed for run ${row.run_id} — ${String(err)}`);
    }
  }
  if (changed.rows.length > limit) {
    // ⛔ Never a silent cap: the runs past the batch (the NEWEST mark changes) got ⛔ no marker this tick — they stay
    // in the 36-hour window, so the next tick still sees them unless the backlog persists.
    alarm(
      `[jobs] claim-correction-sweep: the D26 marker scan hit its ${String(limit)}-run batch — runs ended by a mark ` +
        `change after the batch got ⛔ no marker this tick (raise the run limit if this recurs)`,
    );
  }

  // (4) THE OPEN RUNS — paged (keyset on `opened_at, run_id`) until EXHAUSTED within the tick, under a hard bound.
  let endedRuns = 0;
  let enqueuedSms = 0;
  let staffRows = 0;
  let enqueuedPushes = 0;
  let scannedRuns = 0;
  /** The claims whose plan hit a scope-transaction timeout (skipped today) — ONE aggregated alarm after the scan. */
  const timedOutClaims: string[] = [];
  /** I6 — people whose CURRENT number could not be hashed, and their claims — ONE aggregated alarm per tick. */
  let hashFailedPeople = 0;
  const hashFailedClaims: string[] = [];
  // ⭐ The cursor is the last row's RUN ID; its `opened_at` is read and compared SERVER-SIDE (a scalar row subquery) —
  // ⛔ never round-tripped through JS (a Date truncates microseconds) or `::text` (its format follows the session's
  // DateStyle / TimeZone). `opened_at` never changes, and the subquery ignores `ended_at`, so a cursor run that this
  // very tick ENDED still anchors the next page. ⚠ A cursor run DELETED mid-tick (a claim's cascade) makes the
  // comparison NULL ⇒ an EMPTY page — ⛔ indistinguishable from "exhausted" by the page alone, so an empty page after a
  // cursor checks the cursor row is still there, and a missing one is ALARMED (the runs after it were ⛔ not swept).
  let cursor: string | null = null;
  let exhausted = false;
  let cursorLost = false;
  let budgetExhausted = false;
  const openPage = (afterRunId: string | null, size: number) =>
    deps.pool.query<{ run_id: string; claim_case_id: string; pariwar_id: string }>(
      `SELECT r.run_id, r.claim_case_id, r.pariwar_id FROM claim_correction_runs r
        WHERE r.ended_at IS NULL
          AND ($1::uuid IS NULL
               OR (r.opened_at, r.run_id) > (SELECT c.opened_at, c.run_id FROM claim_correction_runs c WHERE c.run_id = $1::uuid))
          AND ($3::uuid[] IS NULL OR r.pariwar_id = ANY($3::uuid[]))
        ORDER BY r.opened_at ASC, r.run_id ASC
        LIMIT $2`,
      [afterRunId, size, allow],
    );
  /** Is the keyset cursor's run row GONE (deleted mid-tick)? `false` for no cursor. */
  const cursorGone = async (afterRunId: string | null): Promise<boolean> => {
    if (afterRunId === null) return false;
    const { rows } = await deps.pool.query<{ present: boolean }>(
      'SELECT EXISTS (SELECT 1 FROM claim_correction_runs WHERE run_id = $1::uuid) AS present',
      [afterRunId],
    );
    return rows[0]?.present !== true;
  };
  pages: while (scannedRuns < maxRuns) {
    const size = Math.min(limit, maxRuns - scannedRuns);
    const page = await openPage(cursor, size);
    for (const row of page.rows) {
      if (clockMs() - startedMs > budgetMs) {
        // ⛔ Never past the budget: pg-boss would expire (and retry) a tick still running ⇒ overlapping sweeps.
        budgetExhausted = true;
        break pages;
      }
      scannedRuns += 1;
      try {
        const plan = await withPariwarScope(deps.pool, row.pariwar_id, (db: Db, client) =>
          planRun(deps, db, client, row, now, today, alarm),
        );
        if (plan.ended) endedRuns += 1;
        staffRows += plan.staffRows;
        if (plan.hashFailedPeople > 0) {
          hashFailedPeople += plan.hashFailedPeople;
          hashFailedClaims.push(row.claim_case_id);
        }
        const ctx = { pariwarId: row.pariwar_id, requestId: `claim.correction:${row.run_id}:${today}`, actorId: null, traceId: `claim.correction:${row.run_id}:${today}` };
        for (const sms of plan.sms) {
          try {
            await boss.send(
              QUEUE_NAMES.CLAIM_CORRECTION_FAMILY_SMS,
              { ...ctx, payload: sms } satisfies JobEnvelope<CorrectionFamilySmsPayload>,
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
            alarm(`[jobs] claim-correction-sweep: failed to enqueue a family SMS for run ${row.run_id} — ${String(err)}`);
          }
        }
        for (const push of plan.pushes) {
          try {
            await boss.send(
              QUEUE_NAMES.CLAIM_CORRECTION_STAFF_PUSH,
              { ...ctx, payload: push } satisfies JobEnvelope<CorrectionStaffPushPayload>,
              { singletonKey: `${push.claimCaseId}:${push.userId}:${push.sentOn}`, ...CORRECTION_PUSH_RETRY },
            );
            enqueuedPushes += 1;
          } catch (err) {
            alarm(`[jobs] claim-correction-sweep: failed to enqueue a staff push for claim ${row.claim_case_id} — ${String(err)}`);
          }
        }
      } catch (err) {
        if (isPlanTimeout(err)) {
          // The plan waited past `lock_timeout` (a trustee lock held elsewhere) or a statement ran past
          // `statement_timeout`: its transaction rolled back (⛔ nothing written), the run is SKIPPED today and the
          // tick goes on — counted here, alarmed ONCE below (⛔ one alarm per run).
          timedOutClaims.push(row.claim_case_id);
        } else {
          alarm(`[jobs] claim-correction-sweep: run ${row.run_id} (claim ${row.claim_case_id}) failed — ${String(err)}`);
        }
      }
    }
    const last = page.rows[page.rows.length - 1];
    if (page.rows.length < size || last === undefined) {
      if (page.rows.length === 0 && (await cursorGone(cursor))) cursorLost = true;
      else exhausted = true;
      break;
    }
    cursor = last.run_id;
  }
  if (hashFailedPeople > 0) {
    // I6 — the person's CURRENT number could not be hashed (an unreadable envelope, a KMS blip): their reset check fell
    // back to the latest row's number for today. ONE alarm per tick (⛔ per person per run), ids only — ⛔ never a number.
    alarm(
      `[jobs] claim-correction-sweep: the current number of ${String(hashFailedPeople)} person(s) on ` +
        `${String(hashFailedClaims.length)} claim(s) could not be hashed — today's reset check used each one's last ` +
        `row's number (claims: ${sampleIds(hashFailedClaims)})`,
    );
  }
  if (timedOutClaims.length > 0) {
    alarm(
      `[jobs] claim-correction-sweep: ${String(timedOutClaims.length)} run(s) hit the plan's lock_timeout ` +
        `(${CORRECTION_PLAN_LOCK_TIMEOUT}) or statement_timeout (${CORRECTION_PLAN_STATEMENT_TIMEOUT}) and were ⛔ NOT ` +
        `swept today (claims: ${sampleIds(timedOutClaims)})`,
    );
  }
  const boundAlarm = (): void =>
    // ⚠ Honest about the cost: the next tick starts again from the OLDEST open run, so the runs past the bound are
    // ⛔ not "picked up next tick" — the NEWEST runs starve every day until the bound is raised.
    alarm(
      `[jobs] claim-correction-sweep: hit the hard bound of ${String(maxRuns)} open runs — the runs opened after it were ` +
        `⛔ NOT swept today, and every tick starts again from the oldest, so they starve until the bound is raised`,
    );
  const cursorAlarm = (): void =>
    alarm(
      `[jobs] claim-correction-sweep: the keyset cursor run ${String(cursor)} was DELETED mid-tick — the scan stopped ` +
        `after ${String(scannedRuns)} open run(s); any runs opened after it were ⛔ NOT swept today`,
    );
  if (budgetExhausted) {
    alarm(
      `[jobs] claim-correction-sweep: ran out of its ${String(Math.round(budgetMs / 60_000))}-minute budget after ` +
        `${String(scannedRuns)} open run(s) — the runs after them were ⛔ NOT swept today, and every tick starts again ` +
        `from the oldest, so they starve until the sweep is made faster or the budget raised`,
    );
  } else if (cursorLost) {
    cursorAlarm();
  } else if (!exhausted) {
    // The bound stopped the scan: a 1-row PROBE tells "more runs left out" from "exactly the bound".
    if ((await openPage(cursor, 1)).rows.length > 0) boundAlarm();
    else if (await cursorGone(cursor)) cursorAlarm();
  }
  const result: CorrectionSweepResult = {
    scannedRuns,
    endedRuns,
    enqueuedSms,
    staffRows,
    enqueuedPushes,
    finalisedStuck: stuck.rows.length,
    markers,
    timedOutRuns: timedOutClaims.length,
    budgetExhausted,
  };
  console.info('[jobs] claim-correction-sweep', JSON.stringify(result));
  return result;
}

/** D26's markers for ONE run ended `mark_changed` (see the sweep's step 3). Returns how many were written. */
async function writeMarkChangeMarkers(
  db: Db,
  row: { run_id: string; claim_case_id: string; pariwar_id: string },
): Promise<number> {
  const pariwarId = ids.pariwarId(row.pariwar_id);
  const claimCaseId = ids.claimId(row.claim_case_id);
  const run = await claimDomain.readCorrectionRun(db, pariwarId, row.run_id);
  if (run === null || run.endedAt === null) return 0;
  const endedOn = cycleCalendar.istDateOf(run.endedAt);
  const day = claimDomain.correctionRunDay(run.day0, endedOn);
  const slot = claimDomain
    .correctionReminderSchedule(run.kind, run.day0)
    .find((s) => s.kind === 'reminder' && s.day === day);
  if (slot === undefined) return 0;
  let n = 0;
  const base = { pariwarId, claimCaseId, runId: run.runId, slotDay: day, sentOn: endedOn } as const;
  if (run.kind === 'family' || run.kind === 'direction') {
    const recipients = await claimDomain.readCorrectionRecipients(db, pariwarId, claimCaseId);
    for (const person of recipients.people) {
      if (
        await claimDomain.insertFinalCorrectionReminder(db, {
          ...base,
          recipientKey: person.personKey,
          purpose: 'family_sms',
          subjectKey: '',
          outcome: 'skipped_superseded',
          detail: 'mark_changed',
        })
      ) {
        n += 1;
      }
    }
  }
  return n;
}

interface RunPlan {
  readonly ended: boolean;
  readonly sms: CorrectionFamilySmsPayload[];
  readonly pushes: CorrectionStaffPushPayload[];
  readonly staffRows: number;
  /** I6 — how many people's CURRENT number could not be hashed (the sweep aggregates them into ONE alarm). */
  readonly hashFailedPeople: number;
}

/**
 * Plan ONE open run for today (the sweep's step 4) inside its scope transaction, under the trustee lock: end it, or
 * pause it, or write its staff rows and return the family SMS and staff pushes to enqueue. The transaction is bounded
 * FIRST (`SET LOCAL lock_timeout` / `statement_timeout`) — a timeout throws 55P03 / 57014, the scope transaction rolls
 * back, and the sweep skips the run for the day (counted, one aggregated alarm).
 */
async function planRun(
  deps: ClaimCorrectionReminderDeps,
  db: Db,
  client: pg.PoolClient,
  row: { run_id: string; claim_case_id: string; pariwar_id: string },
  now: Date,
  today: string,
  alarm: (m: string) => void,
): Promise<RunPlan> {
  const pariwarId = ids.pariwarId(row.pariwar_id);
  const claimCaseId = ids.claimId(row.claim_case_id);
  const idle: RunPlan = { ended: false, sms: [], pushes: [], staffRows: 0, hashFailedPeople: 0 };
  // ⭐ BEFORE the lock: a trustee lock held elsewhere (a long letter write, a stuck session) must ⛔ not stall the whole
  // tick. `SET LOCAL` — scoped to THIS transaction only (the pooled client is ⛔ left with it).
  await client.query(`SET LOCAL lock_timeout = '${CORRECTION_PLAN_LOCK_TIMEOUT}'`);
  await client.query(`SET LOCAL statement_timeout = '${CORRECTION_PLAN_STATEMENT_TIMEOUT}'`);
  await claimDomain.acquireCorrectionChaseLock(client, row.pariwar_id, row.claim_case_id);
  const run = await claimDomain.readCorrectionRun(db, pariwarId, row.run_id);
  if (run === null || run.endedAt !== null) return idle;

  // ── The stop predicate (D4), through the domain's helpers — ⛔ never re-derived ──────────────────────────────
  const ret = await claimDomain.getLiveCorrectionReturn(db, pariwarId, claimCaseId);
  if (!ret || ret.decisionId !== run.returnDecisionId) {
    await claimDomain.endCorrectionRun(client, { pariwarId, claimCaseId, runId: run.runId, reason: 'superseded' });
    return { ...idle, ended: true };
  }
  if (claimDomain.isCorrectionRunExpired(run.day0, today)) {
    await claimDomain.endCorrectionRun(client, { pariwarId, claimCaseId, runId: run.runId, reason: 'day_90' });
    return { ...idle, ended: true };
  }
  const d = claimDomain.correctionRunDay(run.day0, today);
  /** The live return's IST date — the floor of every letter date the writers accept (K2's "before the return"). */
  const returnedOn = cycleCalendar.istDateOf(ret.decidedAt);

  // ── The pause tiers (`-269` §2) ─────────────────────────────────────────────────────────────────────────────
  const claimRow = await claimDomain.readCorrectionClaimRow(db, pariwarId, claimCaseId);
  if (claimRow === null) return idle;
  const correction = await claimDomain.resolveClaimCorrectionState(
    db,
    pariwarId,
    claimCaseId,
    ids.memberId(claimRow.deceasedMemberId),
    claimRow.currentState,
  );
  if (correction.resubmitted) return idle; // tier (a): the WHOLE run pauses — ⛔ no send, ⛔ no record
  const familyPaused = (await claimDomain.readFamilyPartDoneAt(db, pariwarId, claimCaseId, ret.decidedAt)) !== null;

  const schedule = claimDomain.correctionReminderSchedule(run.kind, run.day0);
  const reminderDays = schedule.filter((s) => s.kind === 'reminder').map((s) => s.day);
  const shepherd = await claimDomain.getLiveShepherd(db, pariwarId, claimCaseId);
  const daKey = shepherd ? `staff:${shepherd.shepherdActorId}` : 'staff:unassigned';
  const staffRowsNow = await claimDomain.readRunStaffRows(db, pariwarId, run.runId);
  const isFamilyRun = run.kind === 'family' || run.kind === 'direction';
  let staffRows = 0;

  const writeStaff = async (fields: {
    slotDay: number;
    recipientKey: string;
    purpose: 'staff_reminder' | 'letter_chase' | 'letter_second_due' | 'escalation';
    subjectKey: string;
    late: boolean;
  }): Promise<void> => {
    const unassigned = fields.recipientKey === 'staff:unassigned';
    const inserted = await claimDomain.insertFinalCorrectionReminder(db, {
      pariwarId,
      claimCaseId,
      runId: run.runId,
      sentOn: today,
      ...fields,
      outcome: unassigned ? 'no_target' : 'recorded',
      detail: unassigned ? 'no_target:no_staff_recipient' : null,
    });
    if (inserted) {
      staffRows += 1;
      if (unassigned) {
        alarm(`[jobs] claim-correction-sweep: ⛔ no ${fields.purpose === 'escalation' ? 'Pariwar Admin' : 'live shepherd'} for claim ${row.claim_case_id} — the ${fields.purpose} is on the queue with no one to push`);
      }
    }
  };
  const pariwarAdmins = async (): Promise<string[]> => {
    const admins = await claimDomain.listAdminsByRole(db, pariwarId, 'pariwar_admin');
    if (admins.truncated) {
      alarm(`[jobs] claim-correction-sweep: pariwar ${pariwarId} has MORE than 50 active Pariwar Admins — the escalation push list is incomplete`);
    }
    return admins.entries.length > 0 ? admins.entries.map((a) => `staff:${a.userId}`) : ['staff:unassigned'];
  };

  // ── The family (AC3): recipients, per-person state, D30 ──────────────────────────────────────────────────────
  // ⭐ BY PURPOSE (AC2): D30 ("cannot remind") stops ONLY `family_sms` and `letter_chase` — the letter track's +13
  // escalation and `letter_second_due` still run, from each person's state evaluated over the RETURN's PAST rows
  // (⛔ no recipients to decrypt, ⛔ no crypto: the latest row's number stands).
  // ⭐ The per-person state is the RETURN's (`-272` §2 — every family / direction run's rows and letters); the D3
  // catch-up below stays this RUN's own schedule (`familyRows` — this run's slot days only).
  const sms: CorrectionFamilySmsPayload[] = [];
  /** The people who can be reminded NOW (the family SMS, D21) — empty under D30. */
  let reachable: claimDomain.ReturnPersonState[] = [];
  /** Every person the letter track considers: the reachable people, or under D30 everyone with a past row/letter. */
  let tracked: {
    readonly personKey: string;
    readonly track: claimDomain.PersonRunState;
    readonly lettersInReturn: number;
    readonly firstDeliveredInReturnOn: string | null;
  }[] = [];
  let familyCanBeReminded = false;
  let hashFailedPeople = 0;
  const familyRows = isFamilyRun ? await claimDomain.readRunFamilyRows(db, pariwarId, run.runId) : [];
  if (isFamilyRun) {
    const recipients = await claimDomain.readCorrectionRecipients(db, pariwarId, claimCaseId);
    familyCanBeReminded = recipients.cannotRemind === null;
    if (familyCanBeReminded) {
      reachable = await claimDomain.readReturnPersonStates(db, pariwarId, run, recipients.people, { crypto: deps.encryption });
      // I6 — a person's CURRENT number could not be hashed (an unreadable envelope, a KMS blip): their reset check fell
      // back to the latest row's number for today. COUNTED — the sweep alarms ONCE per tick (ids only).
      hashFailedPeople = reachable.filter((s) => s.hashFailed === true).length;
      tracked = reachable.map((s) => ({
        personKey: s.person.personKey,
        track: s.track,
        lettersInReturn: s.lettersInReturn,
        firstDeliveredInReturnOn: s.firstDeliveredInReturnOn,
      }));
    } else {
      // ⭐ Under D30 there is ⛔ no recipient set, so "who is tracked" comes from the RETURN's PAST rows and letters —
      // minus every person whose LATEST family row (by TIME, across the return's runs) is the child's
      // `not_a_recipient` skip (removed from the recipient set before D30 arrived: ⛔ no escalation or second-letter
      // reminder about someone no longer a recipient).
      // ⚠ RECORDED LIMITATIONS (⛔ not derivable without a recipient set or a number to hash):
      //   · a person removed WITHOUT a `not_a_recipient` row (removed between two sweeps, ⛔ no child ran for them
      //     after) is still tracked;
      //   · ⛔ no current number is hashed (D30 has ⛔ no recipient to decrypt), so each person's epoch is their
      //     latest evidential row's — a 6.20 number change DURING D30 is ⛔ not seen (the old number's found-dead
      //     day and delivered letter stand) until the family is remindable again and the sweep re-hashes.
      const returnRows = await claimDomain.readReturnFamilyRows(db, pariwarId, claimCaseId, run.returnDecisionId);
      const returnLetters = await claimDomain.readReturnFamilyLetters(db, pariwarId, claimCaseId, run.returnDecisionId);
      const { rows: latest } = await client.query<{ recipient_key: string; outcome: string; detail: string | null }>(
        `SELECT DISTINCT ON (rem.recipient_key) rem.recipient_key, rem.outcome, rem.detail
           FROM claim_correction_reminders rem
           JOIN claim_correction_runs r ON r.run_id = rem.run_id AND r.pariwar_id = rem.pariwar_id
          WHERE rem.pariwar_id = $1 AND rem.claim_case_id = $2 AND rem.purpose = 'family_sms'
            AND r.return_decision_id = $3 AND r.kind IN ('family', 'direction')
          ORDER BY rem.recipient_key, rem.sent_on DESC, rem.created_at DESC`,
        [row.pariwar_id, row.claim_case_id, run.returnDecisionId],
      );
      const removed = new Set(
        latest
          .filter((r) => r.outcome === 'skipped_superseded' && r.detail === 'not_a_recipient')
          .map((r) => r.recipient_key),
      );
      const keys = [...new Set([...returnRows.map((r) => r.recipientKey), ...returnLetters.map((l) => l.personKey)])]
        .filter((k) => !removed.has(k))
        .sort();
      tracked = keys.map((personKey) => {
        const myLetters = returnLetters.filter((l) => l.personKey === personKey);
        return {
          personKey,
          track: claimDomain.evaluatePersonRunState(
            returnRows.filter((r) => r.recipientKey === personKey),
            myLetters,
          ),
          ...claimDomain.personReturnLetterFacts(myLetters),
        };
      });
    }
  }

  if (isFamilyRun && familyCanBeReminded && !familyPaused) {
    for (const { person, track } of reachable) {
      if (track.letterDelivered) continue; // `-250` #1 — a recorded delivery stops that person's reminders (per return)
      const recorded = new Set(familyRows.filter((r) => r.recipientKey === person.personKey).map((r) => r.slotDay));
      const cu = claimDomain.correctionCatchUp(reminderDays, recorded, d);
      for (const day of cu.skip) {
        await claimDomain.insertFinalCorrectionReminder(db, {
          pariwarId,
          claimCaseId,
          runId: run.runId,
          slotDay: day,
          sentOn: today,
          recipientKey: person.personKey,
          purpose: 'family_sms',
          subjectKey: '',
          outcome: 'skipped_superseded',
          detail: 'catch_up',
        });
      }
      if (cu.send) {
        sms.push({ runId: run.runId, claimCaseId: row.claim_case_id, slotDay: cu.send.day, personKey: person.personKey, sentOn: today, late: cu.send.late });
      }
    }
  }

  // ── The District Admin's scheduled reminder (D34), stopped by D21 ───────────────────────────────────────────
  // D21 reads the REACHABLE people only: under D30 there is ⛔ no recipient set to be "every recipient", so the
  // District Admin keeps being reminded (the D30 fix is theirs). ⭐ D21's replacement now reads the RETURN (`-272` §2):
  // a person is "delivered" when a letter delivered in ANY family run of the return reached their current number — or
  // when they are at the two-letter cap (`-273` §2: a second letter exists only after the first's delivery).
  const everyoneDelivered =
    isFamilyRun &&
    reachable.length > 0 &&
    reachable.every((s) => claimDomain.isPersonAtLetterCap(s) || (s.track.foundDeadOn !== null && s.track.letterDelivered));
  if (!everyoneDelivered) {
    const recordedStaff = new Set(staffRowsNow.filter((r) => r.purpose === 'staff_reminder').map((r) => r.slotDay));
    const cu = claimDomain.correctionCatchUp(reminderDays, recordedStaff, d);
    // ⚠ ⛔ No `skipped_superseded` markers for staff slots: the D34 day key would collide, and a staff row is ⛔ an
    // attempt at anyone — the queue always shows the item.
    if (cu.send) await writeStaff({ slotDay: cu.send.day, recipientKey: daKey, purpose: 'staff_reminder', subjectKey: '', late: cu.send.late });
  }

  // ── The staff run's day-12 escalation to every Pariwar Admin (`-258` detail 2) ──────────────────────────────
  // ⚠ ⛔ NOT gated on tier (b): `-268` §2 governs the LETTER chase's + 13 step only (D2, 2026-10-01).
  if (run.kind === 'staff' && d >= claimDomain.STAFF_RUN_ESCALATION_DAY) {
    const done = staffRowsNow.some((r) => r.purpose === 'escalation' && r.slotDay === claimDomain.STAFF_RUN_ESCALATION_DAY && r.subjectKey === '');
    if (!done) {
      for (const key of await pariwarAdmins()) {
        await writeStaff({ slotDay: claimDomain.STAFF_RUN_ESCALATION_DAY, recipientKey: key, purpose: 'escalation', subjectKey: '', late: d > claimDomain.STAFF_RUN_ESCALATION_DAY });
      }
    }
  }

  // ── The letter track (D20, D21): the chase, its escalation, and the ONE second-letter reminder per person ──
  // By purpose: the chase needs a remindable family and ⛔ tier (b); the + 13 escalation needs ⛔ tier (b) (D2 —
  // `-268` §2: "the family's part is done" ⇒ ⛔ no letter chase, its escalation included) but ⛔ not a remindable
  // family (D30); `letter_second_due` needs neither. ⭐ PER RETURN (`-272` §2): the dedup reads the return's staff rows
  // and compares DATES (`slotDate` — each row's own run `day0 + slot_day`), ⛔ never slot days. ⭐ POST-RESET (`-271`
  // §1): the chase and the escalation dedupe within the person's CURRENT number epoch only — a row dated ON or BEFORE
  // the current found-dead day belongs to an OLD number, so a second found-dead period is chased and escalated afresh.
  // ⭐ `-273` §2: a person at the two-letter cap is ⛔ not chased (⛔ no `letter_chase`, ⛔ no + 13 escalation), and the
  // second-letter reminder is owed ONCE per person per return (epoch-blind).
  if (isFamilyRun) {
    const runSlotOf = (date: string): number => claimDomain.correctionRunDay(run.day0, date);
    /**
     * The slot a dated staff row is written at: the date's own slot in THIS run, or — a date carried from an EARLIER
     * run of the return, whose slot is negative here — TODAY's slot (the `6.19b K2` form). ⛔ Never negative.
     */
    const slotForDate = (date: string): number => {
      const s = runSlotOf(date);
      return s >= 0 ? s : Math.max(0, d);
    };
    const returnStaff = await claimDomain.readReturnLetterTrackStaffRows(db, pariwarId, claimCaseId, run.returnDecisionId);
    for (const { personKey, track, lettersInReturn, firstDeliveredInReturnOn } of tracked) {
      const mine = returnStaff.filter((r) => r.subjectKey === personKey);
      const capped = claimDomain.isPersonAtLetterCap({ lettersInReturn });
      if (track.foundDeadOn !== null && !capped) {
        const foundDeadOn = track.foundDeadOn;
        const fd = claimDomain.calendarDaysBetween(foundDeadOn, today);
        if (familyCanBeReminded && !track.letterDelivered && !familyPaused && fd >= claimDomain.LETTER_CHASE_FIRST_OFFSET) {
          // The chase: found-dead + 7 … + 12, EVERY due day (D20/`-231` C: "daily through + 12", ⛔ not once total —
          // tier (b) and D30 stop it). D3's catch-up over DATES: the latest due date is sent unless a chase row of
          // this epoch already stands for it (or later — a carried row clamped to its sweep's day). ⚠ ⛔ No
          // `skipped_superseded` markers for the gap days (the staff_reminder precedent): `letter_chase_day_uq` is
          // keyed on `(claim, recipient, subject, purpose, sent_on)` — ⛔ no slot — so backfilled rows stamped with
          // TODAY's date would collide; a staff row is ⛔ an attempt at anyone, and the queue always shows the item.
          const latestDue = cycleCalendar.addCalendarDays(
            foundDeadOn,
            Math.min(fd, claimDomain.LETTER_CHASE_LAST_OFFSET),
          );
          const covered = mine.some(
            (r) => r.purpose === 'letter_chase' && r.slotDate > foundDeadOn && r.slotDate >= latestDue,
          );
          const slot = slotForDate(latestDue);
          if (!covered && slot < claimDomain.CORRECTION_RUN_HORIZON_DAYS) {
            await writeStaff({
              slotDay: slot,
              recipientKey: daKey,
              purpose: 'letter_chase',
              subjectKey: personKey,
              late: latestDue < today,
            });
          }
        }
        if (!track.letterDelivered && !familyPaused && fd >= claimDomain.LETTER_CHASE_ESCALATION_OFFSET) {
          // "Thereafter" (`-231` C) — ONE escalation to every Pariwar Admin on found-dead + 13, per number epoch.
          const escDate = cycleCalendar.addCalendarDays(foundDeadOn, claimDomain.LETTER_CHASE_ESCALATION_OFFSET);
          // ⚠ STRICTLY after the found-dead DATE (`>`): an OLD epoch's + 13 escalation can sit ON the new epoch's
          // found-dead day (the old number died 13 days before the new one) — it must ⛔ not suppress the new one.
          const has = mine.some((r) => r.purpose === 'escalation' && r.slotDate > foundDeadOn);
          const slot = slotForDate(escDate);
          if (!has && slot < claimDomain.CORRECTION_RUN_HORIZON_DAYS) {
            for (const key of await pariwarAdmins()) {
              await writeStaff({ slotDay: slot, recipientKey: key, purpose: 'escalation', subjectKey: personKey, late: escDate < today });
            }
          }
        }
      }
      if (firstDeliveredInReturnOn !== null) {
        // D21 / `-231` D — ONE reminder at the first letter's delivery + 30, unless a second letter is already posted
        // (`-273` §2(d): once per person per RETURN, epoch-blind — whichever run the delivery was recorded in).
        const firstDelivered = firstDeliveredInReturnOn;
        const due = cycleCalendar.addCalendarDays(firstDelivered, claimDomain.SECOND_LETTER_DUE_AFTER_DAYS);
        const has = mine.some((r) => r.purpose === 'letter_second_due');
        const slot = runSlotOf(due);
        if (!capped && due <= today && slot < claimDomain.CORRECTION_RUN_HORIZON_DAYS && !has) {
          if (slot >= 0) {
            // The run's own slot (slot 0 — the run's day 0 — is a valid slot, ⛔ never rejected).
            await writeStaff({ slotDay: slot, recipientKey: daKey, purpose: 'letter_second_due', subjectKey: personKey, late: due < today });
          } else if (firstDelivered >= returnedOn) {
            // ⭐ K2 (fifth-pass review) — a CORRECT date whose + 30 falls before THIS run: a letter delivered during an
            // EARLIER family run of the same return (family → staff → family). The reminder is still OWED — written
            // `late` at TODAY's slot (a real, `recorded` reminder, pushed like any other), ⛔ never a marker and ⛔ never
            // an alarm about a date that is right. ⚠ ⛔ Never at the negative slot itself: `slot_day_check` (23514) is
            // ⛔ absorbed by `ON CONFLICT` and would roll the whole plan back.
            await writeStaff({ slotDay: Math.max(0, d), recipientKey: daKey, purpose: 'letter_second_due', subjectKey: personKey, late: true });
          } else {
            // ⛔ A delivery dated BEFORE the live return — impossible through the writers (a letter is ⛔ posted before
            // the return's date, ⛔ delivered before it was posted), so a wrong-year typo or a legacy row. Skip the
            // reminder and say so ONCE: ⭐ a `skipped_superseded` MARKER at TODAY's slot records the decision, and the
            // `has` check above sees it tomorrow ⇒ ⛔ no daily re-alarm. It sits on `letter_second_due` only (a one-shot
            // purpose with ⛔ no catch-up — it can ⛔ never hide a `family_sms` slot from D3's catch-up, S2), and it is
            // ⛔ not `recorded`, so ⛔ no push and ⛔ no queue item pretends a reminder was made.
            const marked = await claimDomain.insertFinalCorrectionReminder(db, {
              pariwarId,
              claimCaseId,
              runId: run.runId,
              slotDay: Math.max(0, d),
              sentOn: today,
              recipientKey: daKey,
              purpose: 'letter_second_due',
              subjectKey: personKey,
              outcome: 'skipped_superseded',
              detail: 'delivery_before_run',
            });
            if (marked) {
              alarm(
                `[jobs] claim-correction-sweep: ⛔ skipped the second-letter reminder for ${personKey} on claim ` +
                  `${row.claim_case_id} — its delivery date ${firstDelivered} is BEFORE the return ` +
                  `(${returnedOn}); run ${run.runId} (check the recorded delivery date)`,
              );
            }
          }
        }
      }
    }
  }

  // ── One push per staff member with a recorded row TODAY on this claim (the push dedups on its own row) ───────
  const { rows: todays } = await client.query<{ recipient_key: string }>(
    `SELECT DISTINCT recipient_key FROM claim_correction_reminders
      WHERE pariwar_id = $1 AND claim_case_id = $2 AND sent_on = $3 AND outcome = 'recorded'
        AND purpose IN ('staff_reminder', 'letter_chase', 'letter_second_due', 'escalation')`,
    [row.pariwar_id, row.claim_case_id, today],
  );
  const pushes = todays
    .map((r) => r.recipient_key)
    .filter((k) => k.startsWith('staff:') && k !== 'staff:unassigned')
    .map((k) => ({ claimCaseId: row.claim_case_id, runId: run.runId, slotDay: d, userId: k.slice('staff:'.length), sentOn: today }));

  void now;
  return { ended: false, sms, pushes, staffRows, hashFailedPeople };
}

// ── Registration ─────────────────────────────────────────────────────────────────────────────────────────────

/** Register the three queues, their workers, and the daily 10:00 IST sweep (AC2). */
export async function registerClaimCorrectionReminderWorkers(
  boss: QueueClient,
  deps: ClaimCorrectionReminderDeps,
  opts: { readonly sweepCron?: string; readonly tz?: string } = {},
): Promise<void> {
  await boss.createQueue(QUEUE_NAMES.CLAIM_CORRECTION_FAMILY_SMS);
  // `includeMetadata` — the child reads its retry count (it alarms a re-check hash failure on the first and the final
  // attempt only, ⛔ never on every retry).
  await boss.work(QUEUE_NAMES.CLAIM_CORRECTION_FAMILY_SMS, { includeMetadata: true }, async (jobs: Job[]) => {
    const results = [];
    for (const job of jobs) {
      const meta = job as Job & { readonly retryCount?: unknown; readonly retryLimit?: unknown };
      const attempt =
        typeof meta.retryCount === 'number' && typeof meta.retryLimit === 'number'
          ? { retryCount: meta.retryCount, retryLimit: meta.retryLimit }
          : undefined;
      // A transient throw fails THIS job (pg-boss retries it with the same id); ⛔ never a sibling's.
      results.push(
        await runCorrectionFamilySmsChild(deps, job.data as JobEnvelope<CorrectionFamilySmsPayload>, job.id, attempt),
      );
    }
    return { processed: results.length, results };
  });

  await boss.createQueue(QUEUE_NAMES.CLAIM_CORRECTION_STAFF_PUSH);
  await boss.work(QUEUE_NAMES.CLAIM_CORRECTION_STAFF_PUSH, async (jobs: Job[]) => {
    const results = [];
    for (const job of jobs) {
      results.push(await runCorrectionStaffPush(deps, job.data as JobEnvelope<CorrectionStaffPushPayload>, job.id));
    }
    return { processed: results.length, results };
  });

  // ⚠ The expiry is set TWICE on purpose: `createQueue` is `ON CONFLICT DO NOTHING` (an already-created queue keeps
  // its 15-minute default), while `schedule` UPSERTS its options on every boot and pg-boss copies them onto each job
  // it fires (`expire_seconds` per job overrides the queue's) — so a deployed queue gets the stated expiry too.
  await boss.createQueue(QUEUE_NAMES.CLAIM_CORRECTION_REMINDER_SWEEP, { expireInSeconds: CORRECTION_SWEEP_EXPIRE_SECONDS });
  await boss.work(QUEUE_NAMES.CLAIM_CORRECTION_REMINDER_SWEEP, async (jobs: Job[]) => {
    try {
      const swept = await runCorrectionReminderSweep(deps, boss);
      console.info('[jobs] claim-correction-sweep tick', JSON.stringify({ jobs: jobs.length, ...swept }));
      return swept;
    } catch (err) {
      console.error('[jobs] claim-correction-sweep tick failed', err);
      throw err;
    }
  });
  await boss.schedule(
    QUEUE_NAMES.CLAIM_CORRECTION_REMINDER_SWEEP,
    opts.sweepCron ?? claimDomain.CORRECTION_REMINDER_SWEEP_CRON,
    {},
    { tz: opts.tz ?? CLAIM_CORRECTION_TZ, ...CORRECTION_SWEEP_RETRY, expireInSeconds: CORRECTION_SWEEP_EXPIRE_SECONDS },
  );
}
