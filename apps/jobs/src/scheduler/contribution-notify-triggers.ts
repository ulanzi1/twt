// The three contribution-loop notification TRIGGERS — Story 8.8 (Tasks 5, 6, 7; AC1, AC2, AC3).
//
// The fan-out itself (the live `dispatch()` composition) is `./contribution-notify.ts`; this module is
// the pg-boss half — the queues, the batching saga, the cadence sweep, the copy assembly, and the
// per-member idempotency that makes at-least-once delivery safe. Split from the fan-out so the ONE
// definition of "how a member is reached" stays independent of "when and to whom we reach them".
//
// ── The three triggers ──────────────────────────────────────────────────────────────────────────────
//   1. CYCLE-OPEN (AC1) — observing Story 8.1's `alert.published` lifecycle event, dispatch one
//      `alert_published` notification per member assigned to a pool in that cycle, with `time_critical`
//      copied VERBATIM from the payload (8.1 resolved the AR-18 signal at the cycle-freeze instant;
//      re-deriving it here would break replay). Enqueue is primary, a bounded sweep is recovery — the
//      Story 8.1 D4 pattern, reused rather than reinvented.
//   2. DEADLINE REMINDERS (AC2) — a daily IST sweep firing on cycle-days 5 / 10 / 13 / 14 for every
//      `live` alert, with the tone band DERIVED from the same selector the My Pool card uses (D2), and
//      per-member suppression for anyone who has already acted (D3).
//   3. CONTRIBUTION CONFIRMED (AC3) — an exported enqueue seam Epic 9 calls. NO cron, NO recovery
//      sweep: `contribution.confirmed` is Epic 9's exclusive producer and is unbuilt, and a
//      producer-less scheduled worker is exactly the anti-pattern Story 5.6 named.
//
// ── Batching (D6) ───────────────────────────────────────────────────────────────────────────────────
// parent → one CHILD per pool → the child chunks its roster. N pools is bounded (~50 at the Story 7.9
// gate shape) and a pool roster is the chunkable unit. A single job per member at 4L scale would swamp
// pg-boss; a single job for the whole cycle would blow the visibility timeout. Both triggers share ONE
// child queue (the payload's `kind` selects the copy + the idempotency scope), so there is one fan-out
// path to reason about, not two.
//
// ── Idempotency ─────────────────────────────────────────────────────────────────────────────────────
// Every member send is claimed in the Story 1.12 keyed store on `(alert_id, member_id, scope)` — scope
// is `cycle_open`, `day_<n>`, or `confirmed`. A redelivered job, a retried batch, a same-IST-day second
// tick, a restart, or the recovery sweep therefore never produces a second send. A member who FAILED is
// released immediately so the retry is not made to wait out the TTL.

import {
  CONTRIBUTION_CONFIRMED_TEMPLATE_KEYS,
  CONTRIBUTION_LOOP_I18N_NAMESPACE,
  CONTRIBUTION_LOOP_TEMPLATE_KEYS,
  CONTRIBUTION_MISMATCH_TEMPLATE_KEYS,
  CYCLE_OPEN_TEMPLATE_KEYS,
  CYCLE_WINDOW_DAYS,
  DEADLINE_REMINDER_SEND_DAYS,
  buildContributionConfirmedPayloadData,
  buildContributionMismatchPayloadData,
  buildCycleOpenPayloadData,
  buildDeadlineReminderPayloadData,
  computeDaysRemaining,
  cycleDayFromCommittedAt,
  isDeadlineReminderSendDay,
  Alert,
  type DeadlineReminderSendDay,
} from '@twt/contracts';
import {
  contribution as contributionDomain,
  idempotency,
  ids,
  notifications,
  pool as poolDomain,
  withPariwarScope,
  type Db,
} from '@twt/domain';
import { DEFAULT_LOCALE, formatCurrency, t, type Locale } from '@twt/i18n';
import { QUEUE_NAMES, type Job, type JobEnvelope, type QueueClient } from '@twt/queue';

import {
  fanOutAlertToMembers,
  type ContributionNotifyDeps,
  type MemberFanOutResult,
} from './contribution-notify.js';

// ── Operational knobs (named config values, never inline magic numbers) ─────────────────────────────

/** Daily deadline-reminder sweep cadence (IST). One tick per day is the cadence AC2 specifies; the
 *  per-`(alert, member, cycle_day)` idempotency makes a second same-day tick a no-op regardless. */
export const DEFAULT_DEADLINE_REMINDER_SWEEP_CRON = '30 9 * * *'; // 09:30 IST
/** IST — the established `CYCLE_OPEN_ALERT_SWEEP_TZ` convention; never a UTC cron (architecture §scheduling). */
export const CONTRIBUTION_NOTIFY_TZ = 'Asia/Kolkata';

/** Cycle-open recovery-sweep cadence (IST). RECOVERY only — the post-commit enqueue is the hot path. */
export const DEFAULT_CYCLE_OPEN_NOTIFY_SWEEP_CRON = '40 * * * *'; // hourly at :40 IST

/** Max `live` alerts one deadline sweep run considers. Bounds the cross-tenant scan; a full batch is
 *  ALARMED (never a silent cap — the next tick picks up the remainder). */
export const DEFAULT_DEADLINE_SWEEP_ALERT_LIMIT = 500;

/** Max `live` alerts one cycle-open recovery-sweep run considers. Same shape as the deadline sweep's
 *  bound but tuned independently — the two sweeps run on different cadences and scan for different
 *  reasons, so one shared config knob must not force them to move together. */
export const DEFAULT_RECOVERY_SWEEP_ALERT_LIMIT = 500;

/** Members per child-worker chunk. The unit of progress inside one pool's roster. */
export const DEFAULT_MEMBER_CHUNK_SIZE = 200;

/** CONTRIBUTION_NOTIFY_POOL_BATCH child jobs processed concurrently in this process — the same
 *  `localConcurrency` mechanism `registerCycleSpawnWorkers` uses (cycle-spawn.ts:36/381). */
export const DEFAULT_POOL_BATCH_LOCAL_CONCURRENCY = 8;

/** Per-member idempotency claim TTL. MUST exceed the worst-case per-member fan-out (three dispatch
 *  rungs + a Telegram mirror, each a provider round-trip) with generous headroom — a claim that expired
 *  mid-send could be reclaimed by a concurrent retry and double-send. */
export const DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS = 300;

/** pg-boss retry policy for the CHILD fan-out job — stated EXPLICITLY at the enqueue site rather than
 *  inheriting an unstated default (D9: this is the durable half of AR-19's retry-with-backoff). */
export const CHILD_RETRY_LIMIT = 4;
export const CHILD_RETRY_DELAY_SECONDS = 60;

// ── Job payloads (NON-PII: ids, counts and enum tokens only — never a name, mobile or token) ────────

/** What kind of contribution-loop notification a child batch is sending. Selects the copy + the
 *  idempotency scope, so ONE child worker serves both scheduled triggers. */
export type ContributionNotifyKind = 'cycle_open' | 'deadline_reminder';

/** CYCLE_OPEN parent payload. `timeCritical` rides the payload because it is Story 8.1's to set — it is
 *  copied verbatim from the `alert.published` event and NEVER re-derived here (invariant 6). */
export interface ContributionNotifyParentPayload {
  readonly alertId: string;
  readonly cycleId: string;
  readonly timeCritical: boolean;
}

/** POOL_BATCH child payload — one pool's worth of work for one trigger. */
export interface ContributionNotifyChildPayload {
  readonly kind: ContributionNotifyKind;
  readonly alertId: string;
  readonly cycleId: string;
  readonly poolId: string;
  readonly poolIndex: number;
  readonly poolCanonicalIdentifier: string;
  readonly claimCaseId: string;
  readonly fixedAmount: number;
  readonly poolCount: number;
  readonly memberIds: readonly string[];
  readonly timeCritical: boolean;
  /** Deadline reminders only — the cycle-day this batch is the reminder for (5 / 10 / 13 / 14). */
  readonly cycleDay?: DeadlineReminderSendDay;
  /** Deadline reminders only — the window close instant the copy is formatted against. */
  readonly deadlineAtIso?: string;
}

/** CONTRIBUTION_NOTIFY_CONFIRMED payload — the Epic-9 seam (AC3). */
export interface ContributionConfirmedNotifyPayload {
  readonly alertId: string;
  readonly poolId: string;
  readonly memberId: string;
  readonly amountPaise: number;
  readonly periodLabel: string;
}

/** CONTRIBUTION_NOTIFY_MISMATCH payload (Story 9.7, FR-30/FR-32) — the matcher's mismatch-branch seam. NON-PII:
 *  ids + the machine reason-code. NEVER a UTR / name / free text. No amount-comparison fields — the
 *  `contribution.reconciliation-mismatch` verdict never carries one (`wrong_pool` has no amounts at all). */
export interface ContributionMismatchNotifyPayload {
  readonly alertId: string;
  readonly poolId: string;
  readonly memberId: string;
  /** The machine reason-code (`wrong_pool` / `amount_mismatch` / …) — mapped to dignified copy, never rendered raw. */
  readonly reason: string;
}

/** Result of one child run (stored in the pg-boss job `output`). NON-PII — counts + channel tokens. */
export interface ContributionNotifyChildResult {
  readonly alertId: string;
  readonly poolId: string;
  readonly kind: ContributionNotifyKind;
  readonly attempted: number;
  readonly delivered: number;
  readonly suppressed: number;
  readonly alreadySent: number;
}

/** Why a member was skipped for a deadline reminder. RECORDED DISTINCTLY (D3 / ratified Decision 2):
 *  `already_confirmed` and `already_attested` must NEVER be conflated in analytics or any read model.
 *  Suppressing a nudge is a courtesy decision about interruption — it is NOT a promotion of yellow to
 *  green, and nothing about it touches `progress.confirmedCount`, the confirmed contributor list, or
 *  any "raised so far" figure. */
export type ReminderSuppressionReason = 'already_confirmed' | 'already_attested';

export interface ContributionNotifyTriggerDeps extends ContributionNotifyDeps {
  /** Members per chunk inside one pool's roster. */
  readonly memberChunkSize?: number;
  /** Per-member idempotency claim TTL (seconds). */
  readonly memberIdempotencyTtlSeconds?: number;
  /** Cycle-open recovery-sweep batch bound (alerts scanned per tick). */
  readonly recoverySweepAlertLimit?: number;
  /** Deadline-sweep batch bound (alerts scanned per tick). */
  readonly deadlineSweepAlertLimit?: number;
  /** How many CONTRIBUTION_NOTIFY_POOL_BATCH child jobs run concurrently in this process — the same
   *  `localConcurrency` mechanism `registerCycleSpawnWorkers` uses (cycle-spawn.ts:58/381). A cycle-open
   *  fan-out pages N pools (~50 at the Story 7.9 gate shape); processing them one pool at a time is what
   *  the §5.12 5-minute time-to-fan-out budget cannot afford. Defaults to
   *  {@link DEFAULT_POOL_BATCH_LOCAL_CONCURRENCY}. */
  readonly childConcurrency?: number;
  /**
   * Send-time locale. `hi` (Hindi-primary, `DEFAULT_LOCALE`) per architectural-freeze row 10 — every
   * member-visible surface defaults Hindi. Overridable so a test can assert the English parity copy.
   * A per-member locale preference is a later refinement; there is no member locale column today.
   */
  readonly locale?: Locale;
}

// ── Copy assembly (the producer resolves EVERYTHING member-facing — AC5) ────────────────────────────

const NS = { namespace: CONTRIBUTION_LOOP_I18N_NAMESPACE } as const;

/** The member-facing pool label: the curated Mahabharata name when the Pariwar configured one, else
 *  the letter code (the committed TWT-Bihar launch behaviour). */
function poolLabel(identity: notifications.ResolvedPoolIdentity): string {
  return identity.poolName ?? identity.poolLetterCode;
}

/** The PII-SHIELDED family label — first name + last INITIAL, never the full surname. Assembled
 *  IDENTICALLY to `ActiveContributionCard`'s `family`, so a push and the card name the same family the
 *  same way. */
function familyLabel(identity: notifications.ResolvedPoolIdentity): string {
  return identity.deceasedLastInitial
    ? `${identity.deceasedFirstName} ${identity.deceasedLastInitial}`
    : identity.deceasedFirstName;
}

/** The operational-numeral date string (Gregorian + Latin, amendment-A2) the reminder copy formats the
 *  window close against. UTC so it is deterministic and never drifts with a viewer timezone. */
function operationalDate(at: Date): string {
  const y = at.getUTCFullYear().toString().padStart(4, '0');
  const m = (at.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = at.getUTCDate().toString().padStart(2, '0');
  return `${d}-${m}-${y}`;
}

/** The common alert envelope. `created_by_actor` is `system` — the SIE/scheduler drives these sends. */
function envelope(input: {
  alertId: string;
  pariwarId: string;
  memberId: string;
  timeCritical: boolean;
  poolId: string;
  now: Date;
}) {
  return {
    alert_id: input.alertId,
    pariwar_id: input.pariwarId,
    member_id: input.memberId,
    time_critical: input.timeCritical,
    provenance_refs: { pool_id: input.poolId },
    created_at: input.now.toISOString(),
    created_by_actor: 'system',
  } as const;
}

/**
 * Build the cycle-open notification for ONE member (AC1). `payload_data` carries the pool letter code /
 * curated name, the deceased family's first-name + last-initial, and the formatted fixed amount,
 * rendered into the `{title, body}` announcement shape — the producer resolves every locale-, clock-
 * and tone-dependent string so the Epic 5 renderers stay pure (AC5).
 */
export function buildCycleOpenAlert(input: {
  readonly alertId: string;
  readonly pariwarId: string;
  readonly memberId: string;
  readonly poolId: string;
  readonly identity: notifications.ResolvedPoolIdentity;
  readonly timeCritical: boolean;
  readonly locale: Locale;
  readonly now: Date;
}): Alert {
  const { locale } = input;
  const params = {
    pool: poolLabel(input.identity),
    family: familyLabel(input.identity),
    // Operational figure ⇒ Latin numerals even inside Hindi copy (amendment-A2).
    amount: formatCurrency(input.identity.fixedAmount, 'en'),
  };
  return Alert.parse({
    ...envelope(input),
    alert_category: 'alert_published',
    payload_data: buildCycleOpenPayloadData({
      title: t(CYCLE_OPEN_TEMPLATE_KEYS.titleKey, params, { locale, ...NS }),
      body: t(CYCLE_OPEN_TEMPLATE_KEYS.bodyKey, params, { locale, ...NS }),
    }),
  });
}

/**
 * Build the deadline reminder for ONE member on ONE send day (AC2). The four send days carry four
 * DISTINCT messages, but the tone BAND is derived from Story 8.2's shipped `selectToneGradientKey`
 * (D2) — asserted by the coherence test, so the push a member receives on day D can never be more
 * urgent than the card they open on day D.
 */
export function buildDeadlineReminderAlert(input: {
  readonly alertId: string;
  readonly pariwarId: string;
  readonly memberId: string;
  readonly poolId: string;
  readonly identity: notifications.ResolvedPoolIdentity;
  readonly cycleDay: DeadlineReminderSendDay;
  readonly deadlineAt: Date;
  readonly timeCritical: boolean;
  readonly locale: Locale;
  readonly now: Date;
}): Alert {
  const { locale, cycleDay } = input;
  const keys = CONTRIBUTION_LOOP_TEMPLATE_KEYS[cycleDay];
  const params = {
    pool: poolLabel(input.identity),
    family: familyLabel(input.identity),
    days: String(Math.max(0, CYCLE_WINDOW_DAYS - cycleDay)),
    date: operationalDate(input.deadlineAt),
  };
  return Alert.parse({
    ...envelope(input),
    alert_category: 'deadline_reminder',
    payload_data: buildDeadlineReminderPayloadData({
      subject: t(keys.subjectKey, params, { locale, ...NS }),
      deadlineAt: input.deadlineAt,
      deadlineDisplay: t(keys.displayKey, params, { locale, ...NS }),
    }),
  });
}

/** Build the contribution-confirmed notification (AC3) — Epic 9's seam. */
export function buildContributionConfirmedAlert(input: {
  readonly alertId: string;
  readonly pariwarId: string;
  readonly memberId: string;
  readonly poolId: string;
  readonly amountPaise: number;
  readonly periodLabel: string;
  readonly locale: Locale;
  readonly now: Date;
}): Alert {
  return Alert.parse({
    ...envelope({ ...input, timeCritical: false }),
    alert_category: 'contribution_confirmed',
    payload_data: buildContributionConfirmedPayloadData({
      poolId: input.poolId,
      amountPaise: input.amountPaise,
      periodLabel: t(
        CONTRIBUTION_CONFIRMED_TEMPLATE_KEYS.periodLabelKey,
        { cycleRef: input.periodLabel },
        { locale: input.locale, ...NS },
      ),
    }),
  });
}

/**
 * Build the contribution-MISMATCH notification (Story 9.7, FR-30/FR-32 "member notified"). Resolves the
 * DIGNIFIED, locale-correct body from the machine reason-code (never the raw enum — the tone register, Story
 * 2.2), populates the reserved `contribution_mismatch` alert (`time_critical: false`), and lets
 * `deepLinkTargetForAlert` map it to `contributions/:pool_id`. Never alarming: "we couldn't match your
 * payment yet — here's how to fix it".
 */
export function buildContributionMismatchAlert(input: {
  readonly alertId: string;
  readonly pariwarId: string;
  readonly memberId: string;
  readonly poolId: string;
  readonly reason: string;
  readonly locale: Locale;
  readonly now: Date;
}): Alert {
  const bodyKey =
    input.reason === 'wrong_pool'
      ? CONTRIBUTION_MISMATCH_TEMPLATE_KEYS.wrong_pool
      : input.reason === 'amount_mismatch'
        ? CONTRIBUTION_MISMATCH_TEMPLATE_KEYS.amount_mismatch
        : CONTRIBUTION_MISMATCH_TEMPLATE_KEYS.generic;
  return Alert.parse({
    ...envelope({ ...input, timeCritical: false }),
    alert_category: 'contribution_mismatch',
    payload_data: buildContributionMismatchPayloadData({
      poolId: input.poolId,
      body: t(bodyKey, undefined, { locale: input.locale, ...NS }),
    }),
  });
}

// ── Enqueue seams ───────────────────────────────────────────────────────────────────────────────────

/** The envelope context every contribution-notify enqueue carries. */
export interface NotifyEnqueueContext {
  readonly pariwarId: string;
  readonly requestId: string;
  readonly actorId: string | null;
  readonly traceId: string;
}

/**
 * Enqueue the CYCLE-OPEN parent fan-out (send-only, at-least-once). singletonKey = alert_id so a
 * duplicate enqueue for the same cycle collapses; the per-member idempotency makes it safe regardless.
 * This is the ONE place the parent queue/envelope is constructed — the primary (post-commit, from the
 * cycle-open alert worker) seam AND the recovery sweep both call it.
 */
export async function enqueueContributionNotifyCycleOpen(
  boss: Pick<QueueClient, 'send'>,
  ctx: NotifyEnqueueContext,
  payload: ContributionNotifyParentPayload,
): Promise<void> {
  await boss.send(
    QUEUE_NAMES.CONTRIBUTION_NOTIFY_CYCLE_OPEN,
    { ...ctx, payload } satisfies JobEnvelope<ContributionNotifyParentPayload>,
    { singletonKey: payload.alertId },
  );
}

/**
 * Enqueue the contribution-CONFIRMED notification (AC3) — **the call Epic 9 makes post-commit when it
 * emits `contribution.confirmed`**. Exported from the `@twt/jobs` barrel so Epic 9's producer story
 * wires it without reaching into this module's internals.
 *
 * There is deliberately NO cron and NO recovery sweep behind this queue: `contribution.confirmed` has
 * exactly one producer (Epic 9's reconciliation matcher) and it is unbuilt, so a scheduled worker would
 * be a producer-less job — the anti-pattern Story 5.6 named. Contrast Story 8.1's sweep, which had a
 * REAL producer (`cycle.frozen`) to recover from. When Epic 9 lands, this fires with ZERO changes here.
 */
export async function enqueueContributionConfirmedNotification(
  boss: Pick<QueueClient, 'send'>,
  ctx: NotifyEnqueueContext,
  payload: ContributionConfirmedNotifyPayload,
): Promise<void> {
  await boss.send(
    QUEUE_NAMES.CONTRIBUTION_NOTIFY_CONFIRMED,
    { ...ctx, payload } satisfies JobEnvelope<ContributionConfirmedNotifyPayload>,
    {
      singletonKey: `${payload.alertId}:${payload.memberId}:confirmed`,
      // D9 — the same durable retry-with-backoff policy as the pool-batch child enqueue: this worker
      // uses the identical "throw when undelivered so pg-boss retries" pattern, and without an explicit
      // policy pg-boss defaults to NO retry, silently dropping a failed confirmed-notify send forever
      // (AC3 deliberately has no recovery sweep to heal it).
      retryLimit: CHILD_RETRY_LIMIT,
      retryDelay: CHILD_RETRY_DELAY_SECONDS,
      retryBackoff: true,
    },
  );
}

/**
 * Enqueue the contribution-MISMATCH notification (Story 9.7, FR-30/FR-32) — **the call the Story 9.4 matcher
 * worker makes POST-COMMIT, best-effort, when it emits `contribution.reconciliation-mismatch`**. Exported
 * from the `@twt/jobs` barrel so the matcher wires it without reaching into this module's internals
 * (the 8.8 confirmed-seam export precedent).
 *
 * Like the confirmed seam there is DELIBERATELY no cron and no recovery sweep behind this queue: the
 * matcher's own 4h recovery sweep re-runs the mismatch path, so a dropped notify heals on the next tick.
 * singletonKey includes the REASON so a NEW reason on a later verdict (wrong_pool → amount_mismatch)
 * re-notifies instead of collapsing into the stale prior send (mirrors the matcher's (pool,member,reason)
 * dedup). An explicit retry policy — pg-boss defaults to NO retry, which would silently drop a failed send.
 */
export async function enqueueContributionMismatchNotification(
  boss: Pick<QueueClient, 'send'>,
  ctx: NotifyEnqueueContext,
  payload: ContributionMismatchNotifyPayload,
): Promise<void> {
  await boss.send(
    QUEUE_NAMES.CONTRIBUTION_NOTIFY_MISMATCH,
    { ...ctx, payload } satisfies JobEnvelope<ContributionMismatchNotifyPayload>,
    {
      singletonKey: `${payload.alertId}:${payload.memberId}:mismatch:${payload.reason}`,
      retryLimit: CHILD_RETRY_LIMIT,
      retryDelay: CHILD_RETRY_DELAY_SECONDS,
      retryBackoff: true,
    },
  );
}

async function enqueuePoolBatch(
  boss: Pick<QueueClient, 'send'>,
  ctx: NotifyEnqueueContext,
  payload: ContributionNotifyChildPayload,
): Promise<void> {
  const scope = payload.kind === 'deadline_reminder' ? `:d${String(payload.cycleDay)}` : '';
  await boss.send(
    QUEUE_NAMES.CONTRIBUTION_NOTIFY_POOL_BATCH,
    { ...ctx, payload } satisfies JobEnvelope<ContributionNotifyChildPayload>,
    {
      singletonKey: `${payload.alertId}:${payload.poolId}${scope}`,
      // D9 — the DURABLE half of AR-19's retry-with-backoff. Stated explicitly at the enqueue site
      // rather than inheriting an unstated default: the in-process cascade runs `backoffMs: []`, so
      // ALL backoff lives here.
      retryLimit: CHILD_RETRY_LIMIT,
      retryDelay: CHILD_RETRY_DELAY_SECONDS,
      retryBackoff: true,
    },
  );
}

// ── Task 5: the cycle-open parent ───────────────────────────────────────────────────────────────────

/**
 * The CYCLE_OPEN parent worker. Pages the cycle's pools from the LATEST PERSISTED assignment snapshot
 * (`listCycleBindingCandidates` — promoted to an export by this story; writing a second "latest
 * snapshot per pool" derivation is the drift `contribution-binding.ts` explicitly guards against) and
 * fans out ONE child per pool. Re-running is safe: children are singleton-keyed and every member send
 * is idempotent.
 */
export async function runContributionNotifyParent(
  deps: ContributionNotifyTriggerDeps,
  boss: Pick<QueueClient, 'send'>,
  envelopeIn: JobEnvelope<ContributionNotifyParentPayload>,
): Promise<{ alertId: string; poolCount: number; membersQueued: number }> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const { pariwarId } = envelopeIn;
  const p = envelopeIn.payload;
  if (!pariwarId) {
    alarm(`[jobs] contribution-notify-parent: missing pariwarId for alert ${p.alertId}`);
    throw new Error(`[jobs] contribution-notify-parent: missing pariwarId for alert ${p.alertId}`);
  }

  const candidates = await withPariwarScope(deps.pool, pariwarId, (db: Db) =>
    poolDomain.listCycleBindingCandidates(
      db,
      ids.pariwarId(pariwarId),
      ids.cycleFreezeCommitId(p.cycleId),
    ),
  );

  const ctx: NotifyEnqueueContext = {
    pariwarId,
    requestId: envelopeIn.requestId,
    actorId: envelopeIn.actorId,
    traceId: envelopeIn.traceId,
  };

  let membersQueued = 0;
  for (const candidate of candidates) {
    await enqueuePoolBatch(boss, ctx, {
      kind: 'cycle_open',
      alertId: p.alertId,
      cycleId: p.cycleId,
      poolId: candidate.poolId,
      poolIndex: candidate.poolIndex,
      poolCanonicalIdentifier: candidate.poolCanonicalIdentifier,
      claimCaseId: candidate.claimCaseId,
      fixedAmount: candidate.fixedAmount,
      poolCount: candidates.length,
      memberIds: candidate.memberIds,
      timeCritical: p.timeCritical,
    });
    membersQueued += candidate.memberIds.length;
  }

  console.info(
    '[jobs] contribution-notify-parent',
    JSON.stringify({ alertId: p.alertId, poolCount: candidates.length, membersQueued }),
  );
  return { alertId: p.alertId, poolCount: candidates.length, membersQueued };
}

// ── The shared child worker (both scheduled triggers) ────────────────────────────────────────────────

/** The idempotency scope token for one member send. */
function idempotencyScope(payload: ContributionNotifyChildPayload): string {
  return payload.kind === 'deadline_reminder' ? `day_${String(payload.cycleDay)}` : 'cycle_open';
}

function memberKey(alertId: string, memberId: string, scope: string): string {
  return `contribution.notify:${alertId}:${memberId}:${scope}`;
}

/**
 * The POOL_BATCH child worker. Resolves the pool's member-facing identity ONCE (not per member — the
 * join is per pool), builds one `Alert` per member, and fans each out through the live composition.
 *
 * THROWS when any member ended undelivered, so pg-boss retries with its own bounded exponential
 * backoff (D9). That is safe because every member who DID deliver is recorded in the idempotency store
 * and is skipped on the retry — a retry only re-attempts what actually failed.
 */
export async function runContributionNotifyChild(
  deps: ContributionNotifyTriggerDeps,
  envelopeIn: JobEnvelope<ContributionNotifyChildPayload>,
): Promise<ContributionNotifyChildResult> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const { pariwarId } = envelopeIn;
  const p = envelopeIn.payload;
  if (!pariwarId) {
    alarm(`[jobs] contribution-notify-child: missing pariwarId for alert ${p.alertId}`);
    throw new Error(`[jobs] contribution-notify-child: missing pariwarId for alert ${p.alertId}`);
  }
  if (p.kind === 'deadline_reminder' && p.cycleDay === undefined) {
    // A malformed payload, never a real send-day gap: `runDeadlineReminderSweep` always sets `cycleDay`
    // for a deadline_reminder child. Skip loudly rather than silently defaulting to day 5 while the
    // idempotency key becomes `day_undefined` (a member could then be nudged with the wrong-day copy).
    alarm(
      `[jobs] contribution-notify-child: deadline_reminder payload missing cycleDay for alert ` +
        `${p.alertId} pool ${p.poolId} — skipping this pool's notification; operator action required`,
    );
    return { alertId: p.alertId, poolId: p.poolId, kind: p.kind, attempted: 0, delivered: 0, suppressed: 0, alreadySent: 0 };
  }

  const now = deps.now?.() ?? new Date();
  const locale = deps.locale ?? DEFAULT_LOCALE;
  const chunkSize = Math.max(1, deps.memberChunkSize ?? DEFAULT_MEMBER_CHUNK_SIZE);
  const ttl = deps.memberIdempotencyTtlSeconds ?? DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS;
  const store = idempotency.createKeyedStore(deps.pool);
  const scope = idempotencyScope(p);

  // The pool's member-facing identity — resolved ONCE per pool. `null` means the claim / KYC profile /
  // name is unresolvable: a push naming no family is a DEFECTIVE artifact and inventing a placeholder
  // would be worse, so this pool is skipped LOUDLY rather than sent blank.
  const identity = await withPariwarScope(deps.pool, pariwarId, (db: Db) =>
    notifications.resolvePoolIdentity(
      db,
      deps.encryption,
      ids.pariwarId(pariwarId),
      {
        claimCaseId: ids.claimId(p.claimCaseId),
        poolIndex: p.poolIndex,
        poolCanonicalIdentifier: p.poolCanonicalIdentifier,
        fixedAmount: p.fixedAmount,
        poolCount: p.poolCount,
      },
    ),
  );
  if (!identity) {
    alarm(
      `[jobs] contribution-notify-child: pool identity unresolvable for pool ${p.poolId} ` +
        `(alert ${p.alertId}) — skipping this pool's notification rather than sending copy with no ` +
        `family named; operator action required`,
    );
    return { alertId: p.alertId, poolId: p.poolId, kind: p.kind, attempted: 0, delivered: 0, suppressed: 0, alreadySent: 0 };
  }

  // (AC2 / D3) Reminder suppression — a member who has already ACTED is not nudged. Resolved per POOL
  // in ONE batched read, never per member at 4L scale.
  const suppressedMembers =
    p.kind === 'deadline_reminder'
      ? await resolveReminderSuppressions(deps, pariwarId, p)
      : new Map<string, ReminderSuppressionReason>();

  const deadlineAt = ((): Date => {
    if (!p.deadlineAtIso) return now;
    const parsed = new Date(p.deadlineAtIso);
    if (Number.isNaN(parsed.getTime())) {
      alarm(
        `[jobs] contribution-notify-child: invalid deadlineAtIso "${p.deadlineAtIso}" for alert ` +
          `${p.alertId} — falling back to now rather than rendering "NaN-NaN-NaN" in member-facing copy`,
      );
      return now;
    }
    return parsed;
  })();
  const alertFor = (memberId: string): Alert =>
    p.kind === 'deadline_reminder'
      ? buildDeadlineReminderAlert({
          alertId: p.alertId,
          pariwarId,
          memberId,
          poolId: p.poolId,
          identity,
          cycleDay: p.cycleDay ?? DEADLINE_REMINDER_SEND_DAYS[0],
          deadlineAt,
          timeCritical: p.timeCritical,
          locale,
          now,
        })
      : buildCycleOpenAlert({
          alertId: p.alertId,
          pariwarId,
          memberId,
          poolId: p.poolId,
          identity,
          timeCritical: p.timeCritical,
          locale,
          now,
        });

  let attempted = 0;
  let delivered = 0;
  let alreadySent = 0;
  const failed: string[] = [];

  for (let i = 0; i < p.memberIds.length; i += chunkSize) {
    const chunk = p.memberIds.slice(i, i + chunkSize);

    // Claim each member BEFORE sending — the claim IS the at-most-once guarantee.
    const claimed: string[] = [];
    for (const memberId of chunk) {
      if (suppressedMembers.has(memberId)) continue;
      const key = memberKey(p.alertId, memberId, scope);
      const outcome = await store.claim(key, ttl);
      if (outcome === 'acquired') claimed.push(memberId);
      else alreadySent += 1;
    }
    if (claimed.length === 0) continue;

    attempted += claimed.length;
    const { results, undelivered } = await fanOutAlertToMembers(deps, alertFor, claimed, pariwarId, now);

    const undeliveredSet = new Set(undelivered);
    for (const memberId of claimed) {
      const key = memberKey(p.alertId, memberId, scope);
      if (undeliveredSet.has(memberId)) {
        // Release the claim so the pg-boss retry can re-attempt immediately instead of waiting the TTL.
        await store.release(key).catch((err: unknown) => {
          alarm(`[jobs] contribution-notify-child: failed to release a member claim — ${String(err)}`);
        });
      } else {
        delivered += 1;
        const record = results.find((r) => r.memberId === memberId);
        await store
          .recordResult(key, nonPiiRecord(record))
          .catch((err: unknown) => {
            alarm(`[jobs] contribution-notify-child: failed to record a member result — ${String(err)}`);
          });
      }
    }
    failed.push(...undelivered);
  }

  const result: ContributionNotifyChildResult = {
    alertId: p.alertId,
    poolId: p.poolId,
    kind: p.kind,
    attempted,
    delivered,
    suppressed: suppressedMembers.size,
    alreadySent,
  };
  console.info('[jobs] contribution-notify-child', JSON.stringify(result));

  if (failed.length > 0) {
    // D9 — the durable half of AR-19. The members who DID deliver are recorded, so this retry re-sends
    // nothing to them; only the failed members are re-attempted.
    throw new Error(
      `[jobs] contribution-notify-child: ${String(failed.length)} member(s) undelivered for alert ` +
        `${p.alertId} pool ${p.poolId} — throwing so pg-boss retries with its own backoff`,
    );
  }
  return result;
}

/** Strip a fan-out record to the fields safe to persist in the idempotency store (channels + booleans;
 *  never an address, never a rendered message). */
function nonPiiRecord(record: MemberFanOutResult | undefined): Record<string, unknown> {
  if (!record) return { delivered: false };
  return {
    delivered: record.delivered,
    deliveredChannel: record.deliveredChannel,
    bridged: record.bridged,
    costSuppressedChannels: record.costSuppressedChannels,
    telegramMirrored: record.telegramMirrored,
    trail: record.trail.map((e) => `${e.channel}:${String(e.attempt)}:${e.outcome}`),
  };
}

/**
 * Resolve which members of this pool must NOT be nudged (AC2 / D3 / ratified Decision 2). A member with
 * a `contribution.confirmed` (green) OR a `contribution.utr-attested` (yellow) for the pool has ACTED;
 * telling them "please contribute" is factually wrong and corrodes the trust register. The two reasons
 * are recorded DISTINCTLY and must never be conflated.
 *
 * This is a courtesy decision about interruption ONLY. It does not, and must not, promote, count or
 * display a yellow attestation as confirmed — nothing here touches `progress.confirmedCount`, the
 * confirmed contributor list, or any "raised so far" figure (epics.md:2935-2941).
 */
async function resolveReminderSuppressions(
  deps: ContributionNotifyTriggerDeps,
  pariwarId: string,
  p: ContributionNotifyChildPayload,
): Promise<Map<string, ReminderSuppressionReason>> {
  const suppressed = new Map<string, ReminderSuppressionReason>();
  const acted = await withPariwarScope(deps.pool, pariwarId, (db: Db) =>
    contributionDomain.listActedMemberIdsForPool(db, {
      pariwarId: ids.pariwarId(pariwarId),
      alertId: ids.alertId(p.alertId),
      poolId: ids.poolId(p.poolId),
    }),
  );
  // `confirmed` wins when a member is in BOTH sets — it is the stronger, later fact.
  for (const memberId of acted.attested) suppressed.set(memberId, 'already_attested');
  for (const memberId of acted.confirmed) suppressed.set(memberId, 'already_confirmed');
  return suppressed;
}

// ── Task 5: the cycle-open RECOVERY sweep (the 8.1 D4 pattern — enqueue primary, sweep recovery) ────

/**
 * The cycle-open notification RECOVERY sweep. Scans `live` alerts (cross-tenant, on the BYPASSRLS
 * service pool) and re-enqueues the parent for any whose fan-out has NOT yet reached every expected
 * member — a dropped/failed primary enqueue, OR a PARTIAL fan-out where some pools succeeded and others
 * never got enqueued. RECOVERY-ONLY: the post-commit enqueue in `cycle-open-alert.ts` is the normal
 * route, exactly as Story 8.1's D4 models it.
 *
 * ── Coverage, not just "any trace" ──────────────────────────────────────────────────────────────────
 * Every member send claims `contribution.notify:<alert_id>:<member_id>:cycle_open` in the Story 1.12
 * keyed store, and that record is PERMANENT once `recordResult` completes. The probe compares the COUNT
 * of matching keys for an alert against the alert's TOTAL expected member count (summed across every
 * pool via `listCycleBindingCandidates`), and re-enqueues whenever coverage is incomplete — not merely
 * when it is zero. (Comparing against "any key exists at all" is unsound: if the parent enqueues
 * children for some pools before failing on the rest, one successfully-notified pool permanently
 * satisfies that probe and the pools that never got enqueued are never healed.) Re-enqueueing the parent
 * again is safe even for pools that already fully succeeded — every member send is idempotent per
 * `(alert_id, member_id, scope)`, so a re-run only ever re-attempts members who were never recorded.
 *
 * A cycle whose pools are all empty (zero expected members) is skipped outright.
 */
export async function runContributionNotifyRecoverySweep(
  deps: ContributionNotifyTriggerDeps,
  boss: Pick<QueueClient, 'send'>,
): Promise<number> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const runAt = deps.now?.() ?? new Date();
  const limit = Math.max(1, deps.recoverySweepAlertLimit ?? DEFAULT_RECOVERY_SWEEP_ALERT_LIMIT);

  const { rows } = await deps.pool.query<{
    alert_id: string;
    cycle_id: string;
    pariwar_id: string;
    notified_members: string;
  }>(
    `SELECT a.alert_id, a.cycle_id, a.pariwar_id,
            (SELECT count(*) FROM idempotency_keys k
              WHERE k.key LIKE 'contribution.notify:' || a.alert_id || ':%:cycle_open') AS notified_members
       FROM alerts a
      WHERE a.current_state = 'live'
      ORDER BY a.cycle_id ASC
      LIMIT $1`,
    [limit],
  );

  let reEnqueued = 0;
  for (const row of rows) {
    try {
      const candidates = await withPariwarScope(deps.pool, row.pariwar_id, (db: Db) =>
        poolDomain.listCycleBindingCandidates(
          db,
          ids.pariwarId(row.pariwar_id),
          ids.cycleFreezeCommitId(row.cycle_id),
        ),
      );
      const expectedMembers = candidates.reduce((sum, c) => sum + c.memberIds.length, 0);
      const notifiedMembers = Number(row.notified_members);
      if (expectedMembers === 0 || notifiedMembers >= expectedMembers) continue;

      await enqueueContributionNotifyCycleOpen(
        boss,
        {
          pariwarId: row.pariwar_id,
          // Per-attempt component (the sweep run's own timestamp) so every hourly retry for the same
          // stuck alert is distinguishable in logs/tracing — a static id makes N retries indistinguishable.
          requestId: `contribution.notify.sweep:${row.alert_id}:${String(runAt.getTime())}`,
          actorId: null,
          traceId: `contribution.notify.sweep:${row.alert_id}:${String(runAt.getTime())}`,
        },
        {
          alertId: row.alert_id,
          cycleId: row.cycle_id,
          // The sweep does NOT know the AR-18 signal (it is on the alert.published payload, not the
          // projection). `false` is the fail-safe: it can only cost the degraded-mode SMS BRIDGE on a
          // recovered cycle, never cause an unwanted bulk-SMS send. The primary post-commit enqueue —
          // which does carry the real signal — is the route that runs in practice.
          timeCritical: false,
        },
      );
      reEnqueued += 1;
    } catch (err) {
      alarm(
        `[jobs] contribution-notify-sweep: failed to re-enqueue the fan-out for alert ${row.alert_id} — ${String(err)}`,
      );
    }
  }

  if (rows.length >= limit) {
    alarm(
      `[jobs] contribution-notify-sweep: hit the ${String(limit)}-alert batch cap — more un-notified ` +
        `live alerts remain; the next tick will pick them up`,
    );
  }
  console.info(
    '[jobs] contribution-notify-sweep',
    JSON.stringify({ reEnqueued, scanned: rows.length, limit }),
  );
  return reEnqueued;
}

// ── Task 6: the deadline-reminder cadence sweep ─────────────────────────────────────────────────────

/**
 * The daily deadline-reminder sweep (AC2). Scans `live` alerts cross-tenant on the BYPASSRLS service
 * pool (the one deliberate cross-tenant exception Story 8.1 already models), computes each cycle's day
 * from the cycle-freeze `committed_at` + `CYCLE_WINDOW_DAYS` — the SAME D5 seam
 * `computeDaysRemaining` gives the My Pool card, so the reminder and the card can never disagree about
 * where in the window a member is — and enqueues per-pool children ONLY on cycle-days 5 / 10 / 13 / 14.
 *
 * NO holiday / close-of-cycle policy is encoded here, and none belongs here. Story 8.9 adds a
 * reconciliation-TAIL window; the contribution close stays a hard Day-15 close (FR-22) — the tail is
 * post-close reconciliation timing only (@twt/domain `cycleCalendar` + the @twt/contracts
 * `ReconciliationTailWindow` seam), consumed by Epic 9's matcher-tail scheduler, never by this sweep.
 * The reminder cadence is deliberately calendar-BLIND: a member's deadline does not move for a holiday.
 */
export async function runDeadlineReminderSweep(
  deps: ContributionNotifyTriggerDeps,
  boss: Pick<QueueClient, 'send'>,
): Promise<{ scanned: number; enqueuedPools: number }> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const now = deps.now?.() ?? new Date();
  const limit = Math.max(1, deps.deadlineSweepAlertLimit ?? DEFAULT_DEADLINE_SWEEP_ALERT_LIMIT);

  // Ordered by cycle_id for deterministic, repeatable progress through the backlog (the 8.1 sweep's
  // ordered-scan finding). The bound is a fixed integer literal — no caller influences it.
  const { rows } = await deps.pool.query<{ alert_id: string; cycle_id: string; pariwar_id: string }>(
    `SELECT a.alert_id, a.cycle_id, a.pariwar_id
       FROM alerts a
      WHERE a.current_state = 'live'
      ORDER BY a.cycle_id ASC
      LIMIT $1`,
    [limit],
  );

  let enqueuedPools = 0;
  for (const row of rows) {
    try {
      const committedAt = await withPariwarScope(deps.pool, row.pariwar_id, (db: Db) =>
        poolDomain.getCycleFreezeCommittedAt(db, ids.cycleFreezeCommitId(row.cycle_id)),
      );
      if (committedAt === null) {
        alarm(
          `[jobs] deadline-reminder-sweep: no cycle-freeze commit for cycle ${row.cycle_id} — skipping ` +
            `(a live alert with no freeze row is a data defect, not a send decision)`,
        );
        continue;
      }
      const cycleDay = cycleDayFromCommittedAt(committedAt, now);
      if (!isDeadlineReminderSendDay(cycleDay)) continue;

      // UTC-safe: `committedAt` + N whole days in milliseconds, never `setDate`/`getDate` (those run in
      // the process's LOCAL timezone and would silently disagree with `operationalDate`'s UTC math).
      const deadlineAt = new Date(committedAt.getTime() + CYCLE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

      const candidates = await withPariwarScope(deps.pool, row.pariwar_id, (db: Db) =>
        poolDomain.listCycleBindingCandidates(
          db,
          ids.pariwarId(row.pariwar_id),
          ids.cycleFreezeCommitId(row.cycle_id),
        ),
      );

      const ctx: NotifyEnqueueContext = {
        pariwarId: row.pariwar_id,
        requestId: `contribution.deadline_reminder:${row.alert_id}:${String(cycleDay)}`,
        actorId: null,
        traceId: `contribution.deadline_reminder:${row.alert_id}:${String(cycleDay)}`,
      };
      for (const candidate of candidates) {
        try {
          await enqueuePoolBatch(boss, ctx, {
            kind: 'deadline_reminder',
            alertId: row.alert_id,
            cycleId: row.cycle_id,
            poolId: candidate.poolId,
            poolIndex: candidate.poolIndex,
            poolCanonicalIdentifier: candidate.poolCanonicalIdentifier,
            claimCaseId: candidate.claimCaseId,
            fixedAmount: candidate.fixedAmount,
            poolCount: candidates.length,
            memberIds: candidate.memberIds,
            // A reminder is NEVER time-critical: `time_critical` is the AR-18 cycle-open degraded-mode
            // signal, and claiming it here would both bypass cost-optimization and (via the bridge
            // primitive's category guard being the only thing stopping it) misrepresent the alert.
            timeCritical: false,
            cycleDay,
            deadlineAtIso: deadlineAt.toISOString(),
          });
          enqueuedPools += 1;
        } catch (err) {
          // ONE pool's enqueue failing must never cost its SIBLING pools this tick's reminder — each
          // pool-batch is independently singleton-keyed on `${alertId}:${poolId}:d${cycleDay}`, and this
          // exact cycle-day never recurs, so a whole-alert catch would silently lose that pool's reminder.
          alarm(
            `[jobs] deadline-reminder-sweep: failed to enqueue reminders for alert ${row.alert_id} pool ` +
              `${candidate.poolId} — ${String(err)}`,
          );
        }
      }
    } catch (err) {
      // The alert's DB reads failing must never abort the sweep — the next tick retries it.
      alarm(
        `[jobs] deadline-reminder-sweep: failed to compute/enqueue reminders for alert ${row.alert_id} — ${String(err)}`,
      );
    }
  }

  if (rows.length >= limit) {
    alarm(
      `[jobs] deadline-reminder-sweep: hit the ${String(limit)}-alert batch cap — more live alerts ` +
        `remain; the next tick will pick them up (raise deadlineSweepAlertLimit if this recurs)`,
    );
  }
  console.info(
    '[jobs] deadline-reminder-sweep',
    JSON.stringify({ scanned: rows.length, enqueuedPools, limit }),
  );
  return { scanned: rows.length, enqueuedPools };
}

// ── Task 7: the contribution-confirmed worker (the Epic-9 seam) ─────────────────────────────────────

/**
 * The CONTRIBUTION_NOTIFY_CONFIRMED worker (AC3). Builds the `contribution_confirmed` alert
 * (`time_critical: false`) and runs the SAME live fan-out. Idempotent per `(alert_id, member_id,
 * 'confirmed')`.
 *
 * Note the deep-link consequence: `deepLinkTargetForAlert` maps this category to
 * `contributions/:pool_id` (deep-link.ts:93-98), so the push lands on the member's own contribution
 * surface — no contracts change needed and none made.
 */
export async function runContributionConfirmedNotify(
  deps: ContributionNotifyTriggerDeps,
  envelopeIn: JobEnvelope<ContributionConfirmedNotifyPayload>,
): Promise<{ alertId: string; memberId: string; delivered: boolean; alreadySent: boolean }> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const { pariwarId } = envelopeIn;
  const p = envelopeIn.payload;
  if (!pariwarId) {
    alarm(`[jobs] contribution-confirmed-notify: missing pariwarId for alert ${p.alertId}`);
    throw new Error(`[jobs] contribution-confirmed-notify: missing pariwarId for alert ${p.alertId}`);
  }

  const now = deps.now?.() ?? new Date();
  const locale = deps.locale ?? DEFAULT_LOCALE;
  const store = idempotency.createKeyedStore(deps.pool);
  const ttl = deps.memberIdempotencyTtlSeconds ?? DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS;
  const key = memberKey(p.alertId, p.memberId, 'confirmed');

  if ((await store.claim(key, ttl)) !== 'acquired') {
    return { alertId: p.alertId, memberId: p.memberId, delivered: false, alreadySent: true };
  }

  const alert = buildContributionConfirmedAlert({
    alertId: p.alertId,
    pariwarId,
    memberId: p.memberId,
    poolId: p.poolId,
    amountPaise: p.amountPaise,
    periodLabel: p.periodLabel,
    locale,
    now,
  });

  const { results, undelivered } = await fanOutAlertToMembers(
    deps,
    () => alert,
    [p.memberId],
    pariwarId,
    now,
  );

  if (undelivered.length > 0) {
    await store.release(key).catch((err: unknown) => {
      alarm(`[jobs] contribution-confirmed-notify: failed to release the member claim — ${String(err)}`);
    });
    throw new Error(
      `[jobs] contribution-confirmed-notify: undelivered for alert ${p.alertId} — throwing so pg-boss retries`,
    );
  }
  await store.recordResult(key, nonPiiRecord(results[0])).catch((err: unknown) => {
    alarm(`[jobs] contribution-confirmed-notify: failed to record the member result — ${String(err)}`);
  });
  return { alertId: p.alertId, memberId: p.memberId, delivered: true, alreadySent: false };
}

/**
 * The CONTRIBUTION_NOTIFY_MISMATCH worker (Story 9.7, FR-30/FR-32). Builds the `contribution_mismatch` alert
 * (`time_critical: false`) and runs the SAME live fan-out as the confirmed notify. Idempotent per
 * `(alert_id, member_id, 'mismatch:<reason>')` — a re-flag with a NEW reason re-notifies; a redelivery of
 * the same reason does not.
 *
 * The deep-link consequence: `deepLinkTargetForAlert` maps `contribution_mismatch` to `contributions/:pool_id`
 * (deep-link.ts:93-98), so the push lands on the member's own contribution surface (which routes to the
 * `<SelfVerifySurface>` when the pill is red) — no contracts change needed and none made.
 */
export async function runContributionMismatchNotify(
  deps: ContributionNotifyTriggerDeps,
  envelopeIn: JobEnvelope<ContributionMismatchNotifyPayload>,
): Promise<{ alertId: string; memberId: string; delivered: boolean; alreadySent: boolean }> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const { pariwarId } = envelopeIn;
  const p = envelopeIn.payload;
  if (!pariwarId) {
    alarm(`[jobs] contribution-mismatch-notify: missing pariwarId for alert ${p.alertId}`);
    throw new Error(`[jobs] contribution-mismatch-notify: missing pariwarId for alert ${p.alertId}`);
  }

  const now = deps.now?.() ?? new Date();
  const locale = deps.locale ?? DEFAULT_LOCALE;
  const store = idempotency.createKeyedStore(deps.pool);
  const ttl = deps.memberIdempotencyTtlSeconds ?? DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS;
  const key = memberKey(p.alertId, p.memberId, `mismatch:${p.reason}`);

  if ((await store.claim(key, ttl)) !== 'acquired') {
    return { alertId: p.alertId, memberId: p.memberId, delivered: false, alreadySent: true };
  }

  const alert = buildContributionMismatchAlert({
    alertId: p.alertId,
    pariwarId,
    memberId: p.memberId,
    poolId: p.poolId,
    reason: p.reason,
    locale,
    now,
  });

  const { results, undelivered } = await fanOutAlertToMembers(deps, () => alert, [p.memberId], pariwarId, now);

  if (undelivered.length > 0) {
    await store.release(key).catch((err: unknown) => {
      alarm(`[jobs] contribution-mismatch-notify: failed to release the member claim — ${String(err)}`);
    });
    throw new Error(
      `[jobs] contribution-mismatch-notify: undelivered for alert ${p.alertId} — throwing so pg-boss retries`,
    );
  }
  await store.recordResult(key, nonPiiRecord(results[0])).catch((err: unknown) => {
    alarm(`[jobs] contribution-mismatch-notify: failed to record the member result — ${String(err)}`);
  });
  return { alertId: p.alertId, memberId: p.memberId, delivered: true, alreadySent: false };
}

// ── Registration ────────────────────────────────────────────────────────────────────────────────────

/**
 * Register every contribution-loop notification queue + worker + cron. The CHILD queue is created
 * BEFORE the parent + the sweep so it exists when either enqueues onto it (the established
 * `registerCycleSpawnWorkers` ordering precedent).
 */
export async function registerContributionNotifyWorkers(
  boss: QueueClient,
  deps: ContributionNotifyTriggerDeps,
  opts: { sweepCron?: string; recoverySweepCron?: string; sweepTz?: string } = {},
): Promise<void> {
  await boss.createQueue(QUEUE_NAMES.CONTRIBUTION_NOTIFY_POOL_BATCH);
  // localConcurrency — the same `registerCycleSpawnWorkers` precedent (cycle-spawn.ts:36/381): N pool
  // children processed concurrently in this process rather than one pool at a time. Without it, a
  // cycle-open fan-out across ~50 pools runs fully serially, which is exactly what the §5.12 5-minute
  // time-to-fan-out budget cannot afford.
  await boss.work(
    QUEUE_NAMES.CONTRIBUTION_NOTIFY_POOL_BATCH,
    { localConcurrency: deps.childConcurrency ?? DEFAULT_POOL_BATCH_LOCAL_CONCURRENCY },
    async (jobs: Job[]) => {
      const results: ContributionNotifyChildResult[] = [];
      for (const job of jobs) {
        results.push(
          await runContributionNotifyChild(deps, job.data as JobEnvelope<ContributionNotifyChildPayload>),
        );
      }
      return { processed: results.length, results };
    },
  );

  await boss.createQueue(QUEUE_NAMES.CONTRIBUTION_NOTIFY_CYCLE_OPEN);
  await boss.work(QUEUE_NAMES.CONTRIBUTION_NOTIFY_CYCLE_OPEN, async (jobs: Job[]) => {
    const results = [];
    for (const job of jobs) {
      results.push(
        await runContributionNotifyParent(
          deps,
          boss,
          job.data as JobEnvelope<ContributionNotifyParentPayload>,
        ),
      );
    }
    return { processed: results.length, results };
  });

  // The Epic-9 seam: a queue + a worker, with NO cron and NO recovery sweep (AC3).
  await boss.createQueue(QUEUE_NAMES.CONTRIBUTION_NOTIFY_CONFIRMED);
  await boss.work(QUEUE_NAMES.CONTRIBUTION_NOTIFY_CONFIRMED, async (jobs: Job[]) => {
    const results = [];
    for (const job of jobs) {
      results.push(
        await runContributionConfirmedNotify(
          deps,
          job.data as JobEnvelope<ContributionConfirmedNotifyPayload>,
        ),
      );
    }
    return { processed: results.length, results };
  });

  // The Story 9.7 mismatch seam: a queue + a worker, with NO cron and NO recovery sweep (FR-30/FR-32).
  // The Story 9.4 matcher's own 4h recovery sweep re-runs the mismatch path, so a dropped notify heals.
  await boss.createQueue(QUEUE_NAMES.CONTRIBUTION_NOTIFY_MISMATCH);
  await boss.work(QUEUE_NAMES.CONTRIBUTION_NOTIFY_MISMATCH, async (jobs: Job[]) => {
    const results = [];
    for (const job of jobs) {
      results.push(
        await runContributionMismatchNotify(deps, job.data as JobEnvelope<ContributionMismatchNotifyPayload>),
      );
    }
    return { processed: results.length, results };
  });

  // The cycle-open RECOVERY cron (IST) — hourly, because a cycle-open push is time-sensitive (the
  // §5.12 5-minute budget) and a daily heal would miss the whole window.
  await boss.createQueue(QUEUE_NAMES.CONTRIBUTION_NOTIFY_CYCLE_OPEN_SWEEP);
  await boss.work(QUEUE_NAMES.CONTRIBUTION_NOTIFY_CYCLE_OPEN_SWEEP, async (jobs: Job[]) => {
    try {
      const reEnqueued = await runContributionNotifyRecoverySweep(deps, boss);
      console.info('[jobs] contribution-notify-sweep tick', JSON.stringify({ jobs: jobs.length, reEnqueued }));
      return { reEnqueued };
    } catch (err) {
      console.error('[jobs] contribution-notify-sweep tick failed', err);
      throw err;
    }
  });
  await boss.schedule(
    QUEUE_NAMES.CONTRIBUTION_NOTIFY_CYCLE_OPEN_SWEEP,
    opts.recoverySweepCron ?? DEFAULT_CYCLE_OPEN_NOTIFY_SWEEP_CRON,
    {},
    { tz: opts.sweepTz ?? CONTRIBUTION_NOTIFY_TZ },
  );

  // The daily deadline-reminder cadence cron (IST).
  await boss.createQueue(QUEUE_NAMES.CONTRIBUTION_DEADLINE_REMINDER_SWEEP);
  await boss.work(QUEUE_NAMES.CONTRIBUTION_DEADLINE_REMINDER_SWEEP, async (jobs: Job[]) => {
    try {
      const swept = await runDeadlineReminderSweep(deps, boss);
      console.info('[jobs] deadline-reminder-sweep tick', JSON.stringify({ jobs: jobs.length, ...swept }));
      return swept;
    } catch (err) {
      console.error('[jobs] deadline-reminder-sweep tick failed', err);
      throw err;
    }
  });
  await boss.schedule(
    QUEUE_NAMES.CONTRIBUTION_DEADLINE_REMINDER_SWEEP,
    opts.sweepCron ?? DEFAULT_DEADLINE_REMINDER_SWEEP_CRON,
    {},
    { tz: opts.sweepTz ?? CONTRIBUTION_NOTIFY_TZ },
  );
}

/** Re-exported so a consumer computing the card's days-remaining and this module's cycle-day cannot
 *  reach for two different helpers. Story 8.9 replaces the underlying window for both at once. */
export { computeDaysRemaining };
