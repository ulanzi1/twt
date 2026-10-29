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
// FD-P1: the SMS-producing kinds (day 10 / escalated pending match) instead enqueue bounded eight-member jobs, each with
// its own retry clock. The registered handler also splits legacy full-roster jobs before any sends.
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
  cycleDeadlineAt,
  DEADLINE_REMINDER_SEND_DAYS,
  PENDING_MATCH_RETRY_TEMPLATE_KEYS,
  buildContributionConfirmedPayloadData,
  buildContributionMismatchPayloadData,
  buildCycleOpenPayloadData,
  buildDeadlineReminderPayloadData,
  buildPendingMatchRetryPayloadData,
  computeDaysRemaining,
  cycleDayFromCommittedAt,
  isDeadlineReminderSendDay,
  operationalDate,
  Alert,
  type DeadlineReminderSendDay,
  type PendingMatchRetryTier,
} from '@twt/contracts';
import {
  alert as alertDomain,
  contribution as contributionDomain,
  idempotency,
  ids,
  // Story 8.16 — the presentation-mode accessor. A VALUE import into the existing `@twt/domain`
  // import, adding no package edge (this module already imports four other namespaces from it) and no
  // module-init cycle.
  kyc as kycDomain,
  member as memberDomain,
  notifications,
  pool as poolDomain,
  smsDelivery,
  withPariwarScope,
  type Db,
} from '@twt/domain';
import { DEFAULT_LOCALE, formatCurrency, t, type Locale } from '@twt/i18n';
import { QUEUE_NAMES, type Job, type JobEnvelope, type QueueClient } from '@twt/queue';
import { createHash } from 'node:crypto';

import { isFinalFanOutAttempt, type FanOutCall } from './alert-sms-details.js';
import {
  BRIDGE_ALARM_WINDOW_MS,
  alarmBridgeOnce,
  fanOutAlertToMembers,
  isCycleOpenBridgeTextEligible,
  onceForJob,
  resetBridgeAlarms,
  serializeFanOutResult,
  type ContributionNotifyDeps,
} from './contribution-notify.js';
import { smsPoolLabel, type ContributionSmsLocale } from './contribution-sms-templates.js';
import { smsMemberName } from './sms-member-name.js';

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

/** FD-P1 — the ACTUAL retry unit for SMS-producing pool jobs. Splitting only the in-handler claim loop does not bound a retry's
 * wait behind the rest of its pool. Eight members leave room for finalise retries as well as the gateway / connection waits;
 * the 30-minute row age limit still applies to outages and queue delays. Non-SMS pool jobs retain their existing payloads.
 * Story 5.11b (F6): it is also the lit kind's claim CHUNK — members are claimed per chunk BEFORE their sequential fan-out, under
 * the 300 s claim TTL. The WORST case per member is ~40-50 s (the 10 s send + three finalise tries at up to 10 s each + push +
 * WhatsApp), so even 8 members (~320-400 s) can outlive the TTL: a lapsed claim risks a duplicate PUSH, never a second text (the send
 * ROW stops that). F6 stays OPEN (deferred-work). Review 2026-10-26, R4-P10: the old 16-member chunk was inert once jobs held <= 8. */
export const LIT_KIND_JOB_MEMBER_LIMIT = 8;

/** CONTRIBUTION_NOTIFY_POOL_BATCH child jobs processed concurrently in this process — the same
 *  `localConcurrency` mechanism `registerCycleSpawnWorkers` uses (cycle-spawn.ts:36/381). */
export const DEFAULT_POOL_BATCH_LOCAL_CONCURRENCY = 8;

/** Per-member idempotency claim TTL. MUST exceed the worst-case per-member fan-out (three dispatch
 *  rungs + a Telegram mirror, each a provider round-trip) with generous headroom — a claim that expired
 *  mid-send could be reclaimed by a concurrent retry and double-send. */
export const DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS = 300;

/**
 * Story 5.8b — code review 2026-10-28 (third pass): how long the key of a member recorded with an OWED closure (`bridgeRowOpen`) is
 * kept — set at `recordResult` (`extendTtlSeconds`), ⛔ at the claim. A `deferred` bridge row is re-sendable for
 * {@link smsDelivery.ALERT_SMS_DEFERRED_MAX_AGE_MS} (30 min) after its rate-limited try; the record is written after that try, so 30 min
 * + 15 min keeps it until the row has aged out: a vacuum between attempts cannot turn the closure-only retry into a full re-fan (a
 * second push, a text from the still-fresh row). The second pass claimed EVERY bridged member for 45 min instead: a key left `pending`
 * (a crash, a failed release or record) then held a time-critical push 1–2¾ h. Every claim is the base TTL again. COST: an owed
 * member's key lives 45 min. RESIDUAL: a `recordResult` that FAILS for such a member leaves the base-TTL `pending` key — the closure
 * may be lost, and a re-run after it lapses may text a member the push told (alarmed by name: `alert_sms.bridge_closure_unrecorded`).
 * The same holds — ⛔ alarmed — when the attempt CRASHES, or its 300 s claim lapses mid-job (F6), after the push delivered but before
 * the closure or the record: a retry past the base TTL re-claims the member and, text first, sends from a still-fresh `deferred` row
 * (deferred-work, F9 — the price of not holding every bridged push 45 min).
 */
export const OWED_CLOSURE_KEY_TTL_SECONDS = smsDelivery.ALERT_SMS_DEFERRED_MAX_AGE_MS / 1000 + 15 * 60;

/** Code review 2026-10-28 (second pass) — a bridge-name alarm is raised ONCE per (alert, pool, kind) per this window, ⛔ per job.
 *  Third pass: the memo is shared (`alarmBridgeOnce`) — the overlay and the switch alarms use it too, per (alert, kind). */
export const BRIDGE_NAME_ALARM_WINDOW_MS = BRIDGE_ALARM_WINDOW_MS;

/** @internal `contribution-notify-triggers.test.ts` only — the memo is per process; each leg starts with none raised. */
export function resetBridgeNameAlarms(): void {
  resetBridgeAlarms();
}

/** pg-boss retry policy for the CHILD fan-out job — stated EXPLICITLY at the enqueue site rather than
 *  inheriting an unstated default (D9: this is the durable half of AR-19's retry-with-backoff). */
export const CHILD_RETRY_LIMIT = 4;
export const CHILD_RETRY_DELAY_SECONDS = 60;

/** Pending-match retry cadence sweep (IST) — Story 9.10 AC2. Hourly so the 4h/24h tier boundaries are
 *  always caught within the hour; offset from the cycle-open recovery sweep (`:40`) and the deadline-
 *  reminder sweep (09:30 daily) so the three crons don't all fire on the same minute. */
export const DEFAULT_PENDING_MATCH_RETRY_SWEEP_CRON = '50 * * * *'; // hourly at :50 IST

/** Max reconciling (`live`/`closed`) alerts one pending-match sweep run considers (Story 9.10). Mirrors
 *  the deadline sweep's bound shape, tuned independently — a full batch is ALARMED, never silently capped. */
export const DEFAULT_PENDING_MATCH_SWEEP_ALERT_LIMIT = 500;

/** Soft-tier threshold (Story 9.10 AC2 / PRD FR-35): an unresolved `contribution.utr-attested` older than
 *  this gets ONE gentle "still checking" push. */
export const PENDING_MATCH_SOFT_REMINDER_AGE_MS = 4 * 60 * 60 * 1000;

/** Escalated-tier threshold (Story 9.10 AC2 / PRD FR-35): an unresolved attestation older than this gets
 *  ONE additional, firmer push — in addition to the soft tier it will already have received. */
export const PENDING_MATCH_ESCALATION_AGE_MS = 24 * 60 * 60 * 1000;

/** The once-ever idempotency TTL for the two pending-match tiers (Story 9.10 AC3 — "the once-ever
 *  nuance"). MUST be weeks-scale, NEVER {@link DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS} (300s): the sweep
 *  re-checks HOURLY across the whole ~20-day reconciliation window, and durability comes from the CLAIM's
 *  TTL length, not from `recordResult` alone — a completed row still expires (and gets vacuumed) at its
 *  ORIGINAL `expires_at`, `status` notwithstanding. Sized to outlive the reconciliation window with
 *  generous headroom. */
export const PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

// ── Job payloads (NON-PII: ids, counts and enum tokens only — never a name, mobile or token) ────────

/** What kind of contribution-loop notification a child batch is sending. Selects the copy + the
 *  idempotency scope, so ONE child worker serves every POOL_BATCH trigger. `pending_match` /
 *  `pending_match_escalated` (Story 9.10) ride this SAME pool-batch path (the 8.8 D6 "one fan-out path to
 *  reason about" principle) — the sweep pre-splits a pool's pending-match members by tier BEFORE
 *  enqueueing, so a child batch is always a single kind/tier, never mixed. */
export type ContributionNotifyKind = 'cycle_open' | 'deadline_reminder' | 'pending_match' | 'pending_match_escalated';

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
  /** Story 5.11 (FS14 (a)) — members no rung reached: recorded `in_app_only`, ⛔ retried. */
  readonly inAppOnly: number;
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
  /** Pending-match sweep batch bound (reconciling alerts scanned per tick, Story 9.10). */
  readonly pendingMatchSweepAlertLimit?: number;
  /** Per-kind idempotency TTL override for the two pending-match tiers (Story 9.10 AC3). Defaults to
   *  {@link PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS} — weeks-scale, NOT the day-N reminders' 300s default. */
  readonly pendingMatchIdempotencyTtlSeconds?: number;
  /** How many CONTRIBUTION_NOTIFY_POOL_BATCH child jobs run concurrently in this process — the same
   *  `localConcurrency` mechanism `registerCycleSpawnWorkers` uses (cycle-spawn.ts:58/381). A cycle-open
   *  fan-out pages N pools (~50 at the Story 7.9 gate shape); processing them one pool at a time is what
   *  the §5.12 5-minute time-to-fan-out budget cannot afford. Defaults to
   *  {@link DEFAULT_POOL_BATCH_LOCAL_CONCURRENCY}. */
  readonly childConcurrency?: number;
  /**
   * Send-time locale. `hi` (Hindi-primary, `DEFAULT_LOCALE`) per architectural-freeze row 10 — every
   * member-visible surface defaults Hindi. Overridable so a test can assert the English parity copy.
   * (2026-10-23, row 6-35: the member can now choose a language in the app — `members.preferred_locale` — but this sender does ⛔ read it; the LS11 deferred item "Senders that ignore the member's chosen language (row 6-35)".)
   * ⭐ Story 5.11b (FS5 (a)): true for the PUSH only now — the three TEXTS go in each member's own language
   * (`readMemberTextLanguages`), so a member who chose English may get a Hindi push and an English text (recorded).
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

/**
 * The family label — the deceased family's name in the Pariwar's chosen form.
 *
 * ⭐ STORY 8.16 — THERE IS NO JOIN LEFT HERE. The label used to assemble first-name + last-initial and
 * relied on assembling it "identically to `ActiveContributionCard`'s `family`" so a push and the card
 * would name the same family the same way. That identity was a CONVENTION four call sites had to keep;
 * it is now a property of the resolver, which decides the form once under the ruled mode.
 *
 * ⚠ Kept as a named function rather than inlined because it feeds TWO render sites — the cycle-open
 * body and the deadline-reminder subject — and a reader looking for "where the push names the family"
 * should find one place, not two field accesses.
 */
function familyLabel(identity: notifications.ResolvedPoolIdentity): string {
  return identity.deceasedDisplayName;
}

// `operationalDate` (the reminder's DD-MM-YYYY window-close date) MOVED unchanged to `@twt/contracts` (Story 5.14, AC4) — the
// last-day channel post and the admin "Posts" list show the same date from the one helper.

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
 * curated name, the deceased family's name in the Pariwar's chosen form, and the formatted fixed amount,
 * rendered into the `{title, body}` announcement shape — the producer resolves every locale-, clock-
 * and tone-dependent string so the Epic 5 renderers stay pure (AC5).
 *
 * ⭐ Story 5.8b (FS1 (a), FS6 / `-414` Q2 A, FS7 (a); `2026-10-28-415`) — a TIME-CRITICAL cycle-open (the Pariwar declared degraded at
 * the freeze) also carries the degraded-mode bridge's text block (`cycle_open_bridge`): the pool in the TEXT's language
 * (`smsPoolLabel`) and the family's name in the two boxes the child fitted ONCE per job (`smsMemberName` — `full` or `shortened`).
 * ⛔ block when `timeCritical` is false (the contract refuses one there), when `smsLocale` is absent or null (⛔ passport), when the
 * member is under the death overlay (`deathReported` — FS4 (d)), or when `smsNameBoxes` is absent or null (the name does not fit
 * even shortened, or a box would be empty). Code review 2026-10-28 (second pass): those are asked of AC6's ONE predicate
 * (`isCycleOpenBridgeTextEligible`); the send-time conjuncts (the target, the switch) are the fan-out's.
 */
export function buildCycleOpenAlert(input: {
  readonly alertId: string;
  readonly pariwarId: string;
  readonly memberId: string;
  readonly poolId: string;
  readonly identity: notifications.ResolvedPoolIdentity;
  readonly timeCritical: boolean;
  readonly locale: Locale;
  /** Story 5.8b — the bridge TEXT's language: the member's (`readMemberTextLanguages`). Absent or `null` ⇒ ⛔ text. */
  readonly smsLocale?: ContributionSmsLocale | null;
  /** Story 5.8b — the family's name in the two 30-letter boxes (fitted once per job). Absent or `null` ⇒ ⛔ text. */
  readonly smsNameBoxes?: readonly [string, string] | null;
  /** Story 5.8b (FS4 (d)) — the member's own death has been reported (the `account-frozen` overlay). `true` ⇒ ⛔ text. */
  readonly deathReported?: boolean;
  readonly now: Date;
}): Alert {
  const { locale } = input;
  const smsLocale = input.smsLocale ?? null;
  const boxes = input.smsNameBoxes ?? null;
  // AC6 — the ONE predicate. The target and the switch are decided at the send (the fan-out's (1b)); `true` here carries the block to it.
  const bridgeText = isCycleOpenBridgeTextEligible({
    bridged: input.timeCritical,
    deathReported: input.deathReported ?? false,
    textLanguage: smsLocale,
    nameBoxes: boxes,
    smsTarget: true,
    switchOn: true,
  });
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
      ...(bridgeText && smsLocale !== null && boxes !== null
        ? {
            sms: {
              message: 'cycle_open_bridge',
              locale: smsLocale,
              values: { pool: smsPoolLabel(input.identity, smsLocale), member1: boxes[0], member2: boxes[1] },
            },
          }
        : {}),
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
  /**
   * Story 5.11b (FS5 (a)) — the language of the day-10 TEXT: the member's (`readMemberTextLanguages`). Absent ⇒ `locale`;
   * `null` ⇒ ⛔ text (the Pariwar has ⛔ passport — the language is unresolvable; ⛔ a guess).
   */
  readonly smsLocale?: ContributionSmsLocale | null;
  readonly now: Date;
}): Alert {
  const { locale, cycleDay } = input;
  const smsLocale = input.smsLocale === undefined ? locale : input.smsLocale;
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
      // Story 5.11 (FS1 (d), FS7 (a)): ONLY day 10 is texted — the date is the push's own `params.date`; the pool label is FS13's.
      // Story 5.11b (FS5 (a)): in the member's language — the pool value rebuilt for it (the date is locale-free).
      ...(cycleDay === 10 && smsLocale !== null
        ? {
            sms: {
              message: 'deadline_not_recorded',
              locale: smsLocale,
              values: { pool: smsPoolLabel(input.identity, smsLocale), date: params.date },
            },
          }
        : {}),
    }),
  });
}

/**
 * Build ONE pending-match RETRY notification for ONE member on ONE tier (Story 9.10, AC2/AC3/AC4). Rides
 * the SAME `deadline_reminder` dispatch category as the day-N cadence (mechanics reuse — non-time-
 * critical, the push→WA→SMS ladder, the 30-min cost-optimization window, never Telegram-mirror-eligible),
 * but with DISTINCT, non-deadline copy (never "please contribute before day X" — a pending-match member
 * has already paid/attested) and a `pool_id` on the payload so the deep link routes to the member's own
 * contribution surface (`deep-link.ts`'s `deadline_reminder` case), not the generic renewals landing.
 */
export function buildPendingMatchRetryAlert(input: {
  readonly alertId: string;
  readonly pariwarId: string;
  readonly memberId: string;
  readonly poolId: string;
  readonly identity: notifications.ResolvedPoolIdentity;
  readonly tier: PendingMatchRetryTier;
  readonly locale: Locale;
  /** Story 5.11b (FS5 (a)) — the escalated TEXT's language (see `buildDeadlineReminderAlert`). Absent ⇒ `locale`; `null` ⇒ ⛔ text. */
  readonly smsLocale?: ContributionSmsLocale | null;
  readonly now: Date;
}): Alert {
  const { locale, tier } = input;
  const smsLocale = input.smsLocale === undefined ? locale : input.smsLocale;
  const keys = PENDING_MATCH_RETRY_TEMPLATE_KEYS[tier];
  const params = { pool: poolLabel(input.identity) };
  return Alert.parse({
    ...envelope({ ...input, timeCritical: false }),
    alert_category: 'deadline_reminder',
    payload_data: buildPendingMatchRetryPayloadData({
      subject: t(keys.subjectKey, params, { locale, ...NS }),
      display: t(keys.displayKey, params, { locale, ...NS }),
      poolId: input.poolId,
      now: input.now,
      // Story 5.11 (FS1 (d)): ONLY the escalated tier is texted ("still not confirmed"); the soft tier is not.
      ...(tier === 'escalated' && smsLocale !== null
        ? { sms: { message: 'payment_not_confirmed', locale: smsLocale, values: { pool: smsPoolLabel(input.identity, smsLocale) } } }
        : {}),
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
  /** Story 5.11b (FS5 (a)) — the TEXT's language (see `buildDeadlineReminderAlert`). Absent ⇒ `locale`; `null` ⇒ ⛔ text. */
  readonly smsLocale?: ContributionSmsLocale | null;
  readonly now: Date;
}): Alert {
  const smsLocale = input.smsLocale === undefined ? input.locale : input.smsLocale;
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
      // Story 5.11 (FS1 (d)): ONE text for every reason — it has no variable (Story 5.11b: in the member's language).
      ...(smsLocale !== null ? { sms: { message: 'payment_not_matched' as const, locale: smsLocale, values: {} } } : {}),
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
      // uses the identical "throw when the fan-out failed so pg-boss retries" pattern, and without an explicit
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

/** A single pool job is `send`; a split pool's bounded jobs go in ONE atomic `insert` (R4-P2). */
type PoolBatchEnqueueBoss = Pick<QueueClient, 'send' | 'insert'>;

async function enqueuePoolBatch(
  boss: PoolBatchEnqueueBoss,
  ctx: NotifyEnqueueContext,
  payload: ContributionNotifyChildPayload,
  sourceJobId?: string,
): Promise<number> {
  const scope =
    payload.kind === 'deadline_reminder'
      ? `:d${String(payload.cycleDay)}`
      : payload.kind === 'pending_match' || payload.kind === 'pending_match_escalated'
        ? `:${payload.kind}`
        : '';
  const lit = isLitPoolPayload(payload);
  const batches = lit && payload.memberIds.length > LIT_KIND_JOB_MEMBER_LIMIT
    ? Array.from({ length: Math.ceil(payload.memberIds.length / LIT_KIND_JOB_MEMBER_LIMIT) }, (_, i) => ({
        ...payload,
        memberIds: payload.memberIds.slice(i * LIT_KIND_JOB_MEMBER_LIMIT, (i + 1) * LIT_KIND_JOB_MEMBER_LIMIT),
      }))
    : [payload];
  const jobs = batches.map((batch) => {
    // singletonKey is only a label on this STANDARD queue. Legacy conversion needs a durable primary-key conflict,
    // including after a prefix child completes. Scope the deterministic id to the source job so later sweep intents
    // retain independent retries. Include the roster and tenant to distinguish every conversion's children.
    const rosterKey = lit ? `:members:${createHash('sha256').update(batch.memberIds.join(',')).digest('hex')}` : '';
    const digest = sourceJobId === undefined ? undefined : createHash('sha256')
      .update(JSON.stringify(['contribution-notify-split-v1', sourceJobId, ctx.pariwarId, payload.alertId, payload.poolId, scope, batch.memberIds]))
      .digest('hex');
    const childId = digest === undefined ? undefined
      : `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-8${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
    return {
      data: { ...ctx, payload: batch } satisfies JobEnvelope<ContributionNotifyChildPayload>,
      options: {
        ...(childId === undefined ? {} : { id: childId }),
        singletonKey: `${payload.alertId}:${payload.poolId}${scope}${rosterKey}`,
        // D9 — the DURABLE half of AR-19's retry-with-backoff. Stated explicitly at the enqueue site
        // rather than inheriting an unstated default: the in-process cascade runs `backoffMs: []`, so
        // ALL backoff lives here.
        retryLimit: CHILD_RETRY_LIMIT,
        retryDelay: CHILD_RETRY_DELAY_SECONDS,
        retryBackoff: true,
      },
    };
  });
  if (jobs.length === 1) {
    await boss.send(QUEUE_NAMES.CONTRIBUTION_NOTIFY_POOL_BATCH, jobs[0]!.data, jobs[0]!.options);
    return 1;
  }
  // Review 2026-10-26 (R4-P2): a split pool is enqueued in ONE `insert` statement — all of its bounded jobs or none, in one
  // round trip. Sequential sends could keep a prefix and lose the rest of a cycle-day that never recurs, while the caller's
  // alarm said the whole pool failed. pg-boss inserts with `ON CONFLICT DO NOTHING`, so a deterministic (legacy) id still
  // cannot recreate a child that exists.
  await boss.insert(
    QUEUE_NAMES.CONTRIBUTION_NOTIFY_POOL_BATCH,
    jobs.map((job) => ({ ...job.options, data: job.data })),
  );
  return batches.length;
}

/**
 * The LIT kinds of this worker — those whose alert may carry a text block, so their members' TEXT languages are read and their
 * pool splits into bounded jobs: day 10, the escalated pending-match tier, and (Story 5.8b, FS5 (a)) a TIME-CRITICAL cycle-open —
 * the degraded-mode bridge. A non-time-critical cycle-open is ⛔ lit (⛔ text, the whole-pool job as before).
 */
function isLitPoolPayload(payload: ContributionNotifyChildPayload): boolean {
  return (
    (payload.kind === 'deadline_reminder' && payload.cycleDay === 10) ||
    payload.kind === 'pending_match_escalated' ||
    (payload.kind === 'cycle_open' && payload.timeCritical)
  );
}

// ── Task 5: the cycle-open parent ───────────────────────────────────────────────────────────────────

/**
 * The CYCLE_OPEN parent worker. Pages the cycle's pools from the LATEST PERSISTED assignment snapshot
 * (`listCycleBindingCandidates` — promoted to an export by this story; writing a second "latest
 * snapshot per pool" derivation is the drift `contribution-binding.ts` explicitly guards against) and
 * fans out ONE child per pool (a lit kind's pool: its bounded jobs, in one atomic insert). Re-running never sends a member a
 * second TEXT (the alert SMS send row) and the keyed-store claim guards the push while it holds — a lapsed claim risks a duplicate
 * PUSH (F6). ⛔ because of `singletonKey`, which is only a label on this STANDARD queue and dedupes nothing (review 2026-10-26,
 * R4-P5; narrow review of R4).
 */
export async function runContributionNotifyParent(
  deps: ContributionNotifyTriggerDeps,
  boss: PoolBatchEnqueueBoss,
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

/** The idempotency scope token for one member send. `pending_match` / `pending_match_escalated` are the
 *  AC3 tier tokens — each fires at most once EVER per `(alert_id, member_id, tier)`. */
function idempotencyScope(payload: ContributionNotifyChildPayload): string {
  if (payload.kind === 'deadline_reminder') return `day_${String(payload.cycleDay)}`;
  if (payload.kind === 'pending_match' || payload.kind === 'pending_match_escalated') return payload.kind;
  return 'cycle_open';
}

function memberKey(alertId: string, memberId: string, scope: string): string {
  return `contribution.notify:${alertId}:${memberId}:${scope}`;
}

/**
 * The POOL_BATCH child worker. Resolves the pool's member-facing identity ONCE (not per member — the
 * join is per pool), builds one `Alert` per member, and fans each out through the live composition.
 *
 * THROWS when any member's fan-out failed, so pg-boss retries with its own bounded exponential
 * backoff (D9). Delivered and terminal `in_app_only` members are recorded and skipped on retry.
 * Story 5.11 review R1 option 1: former fixture successes become `in_app_only`; failures that
 * previously retried (including no available SMS target) still release their claim and throw (I4).
 */
export async function runContributionNotifyChild(
  deps: ContributionNotifyTriggerDeps,
  envelopeIn: JobEnvelope<ContributionNotifyChildPayload>,
  /** Story 5.11b (FS9) — the pg-boss job (its id and, with `includeMetadata`, its retry count). Absent ⇒ the final attempt. */
  job?: NotifyJobAttempt,
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
    return { alertId: p.alertId, poolId: p.poolId, kind: p.kind, attempted: 0, delivered: 0, inAppOnly: 0, suppressed: 0, alreadySent: 0 };
  }

  const now = deps.now?.() ?? new Date();
  const locale = deps.locale ?? DEFAULT_LOCALE;
  // Story 5.11b (FS5) — the LIT kinds of this worker (day 10, the escalated tier and — Story 5.8b — the bridged cycle-open): their
  // TEXT goes in each member's language.
  const litKind = isLitPoolPayload(p);
  // Story 5.8b — the degraded-mode bridge's cycle-open (time-critical) builds the `cycle_open_bridge` block.
  const bridgeText = p.kind === 'cycle_open' && p.timeCritical;
  if (litKind && deps.alertSms !== undefined && p.memberIds.length > LIT_KIND_JOB_MEMBER_LIMIT) {
    const message = `[jobs] contribution-notify-child: oversized SMS job for alert ${p.alertId} pool ${p.poolId} must be split before fan-out`;
    alarm(message);
    throw new Error(message);
  }
  // Story 5.11b (F6) — a lit kind's claim chunk is its job bound (8) once a real send is wired; at the worst case it can still
  // outlive the 300 s claim TTL (a duplicate PUSH, never a second text — see LIT_KIND_JOB_MEMBER_LIMIT).
  const baseChunk = Math.max(1, deps.memberChunkSize ?? DEFAULT_MEMBER_CHUNK_SIZE);
  const chunkSize = litKind && deps.alertSms !== undefined ? Math.min(baseChunk, LIT_KIND_JOB_MEMBER_LIMIT) : baseChunk;
  // Per-kind TTL (Story 9.10 AC3 — "the once-ever nuance"): the two pending-match tiers durability-need a
  // weeks-scale claim, never the day-N reminders' 300s default (which would lapse — and get vacuumed —
  // well before the next HOURLY sweep tick, re-nudging the member every hour).
  const baseTtl =
    p.kind === 'pending_match' || p.kind === 'pending_match_escalated'
      ? deps.pendingMatchIdempotencyTtlSeconds ?? PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS
      : deps.memberIdempotencyTtlSeconds ?? DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS;
  // Story 5.8b — code review 2026-10-28 (third pass): a bridged member is claimed at the base TTL again; only an OWED closure's record
  // outlives its `deferred` row (`OWED_CLOSURE_KEY_TTL_SECONDS`, at `recordResult`).
  const ttl = baseTtl;
  const store = idempotency.createKeyedStore(deps.pool);
  const scope = idempotencyScope(p);

  // The pool's member-facing identity — resolved ONCE per child job. FD-P1's bounded SMS jobs repeat this read per batch;
  // non-SMS jobs still carry the whole pool. `null` means the claim / KYC profile /
  // name is unresolvable: a push naming no family is a DEFECTIVE artifact and inventing a placeholder
  // would be worse, so this pool is skipped LOUDLY rather than sent blank.
  //
  // ⭐ STORY 8.16 — THE PRESENTATION MODE IS READ HERE, ONCE PER POOL, AND PASSED IN. It is NEVER read
  // inside the resolver (`2026-09-02-181` cl.2). Both reads share this ONE `withPariwarScope` round
  // trip, and both alert builders below close over the single resolved `identity` — so the mode read
  // count tracks child jobs, never the individual members in this worker's fan-out.
  //
  // ⚠⛔ THE ONE THING NOT TO "OPTIMISE": do not move the mode read below the member chunking loop.
  // It is one per-PARIWAR read per job; moving it into that loop would multiply it by the job's chunks.
  // ⭐ REVIEW FIX (8.16, round 2) — tracked OUTSIDE the callback so the generic "pool identity
  // unresolvable" alarm below fires at most ONCE per failure, never twice for the SAME cause. A bare
  // `return null` from the catch below is indistinguishable, at the `if (!identity)` check, from
  // `resolvePoolIdentity` itself returning null — without this flag both alarms fire, and the SECOND
  // (generic) one overwrites the specific "presentation-mode read failed" cause with a misleading one.
  let presentationModeFailed = false;
  // Story 5.11b (FS5 (a)) — the members' TEXT languages, read in THIS scope (⛔ extra connection); `null` ⇒ ⛔ passport.
  let textLanguages: ReadonlyMap<string, ContributionSmsLocale> | null = new Map();
  // Story 5.8b (FS4 (d), I10) — the members under the `account-frozen` (death-claim) overlay NOW: ⛔ bridge text for them (their push /
  // WhatsApp is unchanged). ONE set-based read per job, in THIS scope; ⛔ in the roster (AI-7-2).
  let deathFrozen: ReadonlySet<string> = new Set();
  // Code review 2026-10-28 (second pass): the overlay read FAILS SOFT — ⛔ a guess about who has died, so EVERY bridge text of this
  // job is omitted (the push unchanged), ONE name-free alarm. It used to throw the whole job, the push included.
  let deathReadFault: string | null = null;
  const faultClassOf = (err: unknown): string => {
    const code = (err as { code?: unknown } | null)?.code;
    return typeof code === 'string' && /^[A-Z0-9_]{3,24}$/.test(code) ? `code:${code}` : err instanceof Error ? err.name : typeof err;
  };
  const identity = await withPariwarScope(deps.pool, pariwarId, async (db: Db, client) => {
    if (litKind) {
      textLanguages = await memberDomain.readMemberTextLanguages(db, { pariwarId: ids.pariwarId(pariwarId), memberIds: p.memberIds });
    }
    if (bridgeText) {
      // A SAVEPOINT: a failed statement aborts the scope transaction, and the identity reads below share it.
      await client.query('SAVEPOINT bridge_death_overlay');
      try {
        deathFrozen = await memberDomain.listAccountFrozenMemberIds(db, p.memberIds, now);
        await client.query('RELEASE SAVEPOINT bridge_death_overlay');
      } catch (err) {
        const fault = faultClassOf(err);
        try {
          await client.query('ROLLBACK TO SAVEPOINT bridge_death_overlay');
        } catch (rollbackErr) {
          // Code review 2026-10-28 (third pass): a broken connection — the rollback's error must not REPLACE the read's (name-free).
          alarm(
            `[jobs] contribution-notify-child: alert_sms.bridge_overlay_rollback_failed — the death-overlay read failed [${fault}] and its ` +
              `savepoint could not be rolled back [${faultClassOf(rollbackErr)}] for alert ${p.alertId} pool ${p.poolId} — the job is retried`,
          );
          throw rollbackErr;
        }
        deathReadFault = fault;
      }
    }
    // ⭐ REVIEW FIX (8.16) — this read must degrade the SAME way `resolvePoolIdentity` degrades every
    // OTHER unresolvable input on this path (decrypt, letter code, curated name): skip THIS pool's
    // notification, never let a transient read throw the whole child job. Without this, a DB blip on
    // the presentation-mode row would break the exact fail-soft contract the resolver's own header
    // documents for everything else it touches.
    let presentationMode;
    try {
      presentationMode = await kycDomain.resolvePublicNamePresentationMode(db, ids.pariwarId(pariwarId));
    } catch (err) {
      presentationModeFailed = true;
      alarm(
        `[jobs] contribution-notify-child: presentation-mode read failed for pool ${p.poolId} ` +
          `(alert ${p.alertId}) — skipping this pool's notification rather than guessing the name ` +
          `form; operator action required: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
    return notifications.resolvePoolIdentity(
      db,
      deps.encryption,
      ids.pariwarId(pariwarId),
      presentationMode,
      {
        claimCaseId: ids.claimId(p.claimCaseId),
        poolIndex: p.poolIndex,
        poolCanonicalIdentifier: p.poolCanonicalIdentifier,
        fixedAmount: p.fixedAmount,
        poolCount: p.poolCount,
      },
    );
  });
  if (!identity) {
    if (!presentationModeFailed) {
      alarm(
        `[jobs] contribution-notify-child: pool identity unresolvable for pool ${p.poolId} ` +
          `(alert ${p.alertId}) — skipping this pool's notification rather than sending copy with no ` +
          `family named; operator action required`,
      );
    }
    return { alertId: p.alertId, poolId: p.poolId, kind: p.kind, attempted: 0, delivered: 0, inAppOnly: 0, suppressed: 0, alreadySent: 0 };
  }

  if (litKind && textLanguages === null) {
    // ⛔ a guess: every member's text is omitted for this job (the rung ends `sms_message_not_lit`; the push is unchanged).
    alarm(
      `[jobs] contribution-notify-child: alert_sms.locale_unresolved — pariwar ${pariwarId} has ⛔ passport row; ⛔ text for ` +
        `alert ${p.alertId} pool ${p.poolId} (the push still goes)`,
    );
  }
  // Assigned inside the scope callback — read through a cast (TS keeps the `null` it was declared with).
  const overlayFault = deathReadFault as string | null;
  const smsLocaleOf = (memberId: string): ContributionSmsLocale | null => {
    const languages = textLanguages as ReadonlyMap<string, ContributionSmsLocale> | null;
    if (languages === null) return null;
    return languages.get(memberId.toLowerCase()) ?? null;
  };

  // Story 5.8b (`-414` Q2 A; `-379` step (4)) — the family's name for the bridge text, fitted ONCE per job (the label is the pool's,
  // the same string the push uses): `full` or `shortened` ⇒ the two boxes; `too_long` ⇒ ⛔ text for this job's members and ONE
  // name-free alarm carrying the COUNT (⛔ the name, a box or a shortened form — T11). A box that would be empty (a 1-letter label)
  // omits the text too, ⛔ throw.
  // ⭐ Code review 2026-10-28 (second pass): each name alarm is raised ONCE per (alert, pool) per window — ⛔ per ≤8-member job, retry or
  // re-fan — and counts only the members who would otherwise be texted (⛔ under the overlay, a known text language); none ⇒ ⛔ alarm.
  // An EMPTY label (or one that leaves a box empty) alarms too: it used to disable the bridge in silence. Third pass: the count is the
  // FIRST job's, so it reads "at least"; the overlay alarm is deduped too, per (alert, kind).
  let bridgeBoxes: readonly [string, string] | null = null;
  if (bridgeText) {
    if (overlayFault !== null) {
      alarmBridgeOnce(
        alarm,
        `${p.alertId}:bridge_overlay_unavailable`,
        now.getTime(),
        `[jobs] contribution-notify-child: alert_sms.bridge_overlay_unavailable — the death-overlay read failed [${overlayFault}]; ⛔ bridge ` +
          `text for at least ${String(p.memberIds.length)} member(s) of alert ${p.alertId} (first seen: pool ${p.poolId}) this attempt (the ` +
          `push still goes; an un-reached member is retried; not repeated for this alert for ${String(BRIDGE_ALARM_WINDOW_MS / 3_600_000)} h)`,
      );
    }
    const label = familyLabel(identity);
    const fitted = label.trim() === '' ? null : smsMemberName(label);
    const wouldText = overlayFault !== null ? 0 : p.memberIds.filter((m) => !deathFrozen.has(m.toLowerCase()) && smsLocaleOf(m) !== null).length;
    const nameAlarm = (kind: string, why: string): void => {
      if (wouldText === 0) return;
      alarmBridgeOnce(
        alarm,
        `${p.alertId}:${p.poolId}:${kind}`,
        now.getTime(),
        `[jobs] contribution-notify-child: alert_sms.${kind} — at least ${String(wouldText)} member(s) of alert ${p.alertId} pool ${p.poolId} get ` +
          `⛔ bridge text: ${why} (the push still goes; not repeated for this pool for ${String(BRIDGE_NAME_ALARM_WINDOW_MS / 3_600_000)} h)`,
      );
    };
    if (fitted?.kind === 'too_long') {
      nameAlarm('bridge_name_too_long', "the family's name does not fit two boxes even shortened");
    } else if (fitted === null || fitted.boxes[0] === '' || fitted.boxes[1] === '') {
      nameAlarm('bridge_name_empty', "the family's name is empty or leaves a box empty");
    } else {
      bridgeBoxes = fitted.boxes;
    }
    if (deathFrozen.size > 0) {
      console.info(
        '[jobs] contribution-notify-child',
        JSON.stringify({ alertId: p.alertId, poolId: p.poolId, bridgeTextOmittedAccountFrozen: deathFrozen.size }),
      );
    }
  }

  // (AC2 / D3) Reminder suppression — a member who has already ACTED is not nudged. Resolved per JOB in
  // ONE batched read, never per member at 4L scale: a whole-pool job reads its pool, a bounded (lit) job
  // reads only its own <= 8 members (AP-P2; R4-P1).
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
  const alertFor = (memberId: string): Alert => {
    if (p.kind === 'deadline_reminder') {
      return buildDeadlineReminderAlert({
        alertId: p.alertId,
        pariwarId,
        memberId,
        poolId: p.poolId,
        identity,
        cycleDay: p.cycleDay ?? DEADLINE_REMINDER_SEND_DAYS[0],
        deadlineAt,
        timeCritical: p.timeCritical,
        locale,
        ...(litKind ? { smsLocale: smsLocaleOf(memberId) } : {}),
        now,
      });
    }
    if (p.kind === 'pending_match' || p.kind === 'pending_match_escalated') {
      return buildPendingMatchRetryAlert({
        alertId: p.alertId,
        pariwarId,
        memberId,
        poolId: p.poolId,
        identity,
        tier: p.kind === 'pending_match' ? 'soft' : 'escalated',
        locale,
        ...(litKind ? { smsLocale: smsLocaleOf(memberId) } : {}),
        now,
      });
    }
    return buildCycleOpenAlert({
      alertId: p.alertId,
      pariwarId,
      memberId,
      poolId: p.poolId,
      identity,
      timeCritical: p.timeCritical,
      locale,
      ...(bridgeText
        ? {
            // A failed overlay read omits every block (⛔ a guess) — read here as "reported" for each member.
            deathReported: overlayFault !== null || deathFrozen.has(memberId.toLowerCase()),
            smsLocale: smsLocaleOf(memberId),
            smsNameBoxes: bridgeBoxes,
          }
        : {}),
      now,
    });
  };

  // Story 5.8b (AC12) — the bridge's Super Admin switch is read ONCE per job, at its first bridge attempt (⛔ per member).
  const jobDeps: ContributionNotifyTriggerDeps =
    bridgeText && deps.readBridgeSwitch ? { ...deps, readBridgeSwitch: onceForJob(deps.readBridgeSwitch) } : deps;

  let attempted = 0;
  let delivered = 0;
  let inAppOnly = 0;
  let alreadySent = 0;
  const failed: string[] = [];

  // Story 5.8b review (P2-1; FS3.1 (a)) — a member the ladder DELIVERED whose `deferred` bridge row could not be given up is recorded
  // (its claim kept: ⛔ a second push) and OWED: this job is retried for the closure alone. On that retry the member's claim is
  // `already_claimed`; its recorded result says `bridgeRowOpen`, so the closure — and ONLY the closure — is tried again.
  const closureOwed: string[] = [];
  const giveUpDeferred = bridgeText ? deps.alertSms?.giveUpDeferred : undefined;
  const settleOwedClosure = async (memberId: string, key: string): Promise<void> => {
    if (!giveUpDeferred) return;
    let owed: boolean;
    try {
      const recorded = await store.inspect(key);
      const result = recorded?.result as { bridgeRowOpen?: unknown; delivered?: unknown } | null | undefined;
      // Code review 2026-10-28 (third pass): only a DELIVERED member owes one (⛔ a terminal row for a member nothing reached).
      owed = recorded?.status === 'completed' && result?.bridgeRowOpen === true && result.delivered !== false;
    } catch (err) {
      alarm(`[jobs] contribution-notify-child: a recorded member's result could not be read for alert ${p.alertId} — ${String(err)} (retrying)`);
      closureOwed.push(memberId);
      return;
    }
    if (!owed) return;
    // Fix review (2026-10-28): the overlay read failed THIS attempt ⇒ ⛔ block to write the terminal row from — still OWED (⛔ dropped).
    if (overlayFault !== null) {
      closureOwed.push(memberId);
      return;
    }
    const closure = await giveUpDeferred({ alert: alertFor(memberId), call: fanOutCall(job, scope) });
    // `no_block` here owes nothing: this attempt's overlay read succeeded, so the alert carries every block it can (third pass).
    if (closure === 'failed') closureOwed.push(memberId);
  };

  for (let i = 0; i < p.memberIds.length; i += chunkSize) {
    const chunk = p.memberIds.slice(i, i + chunkSize);

    // Claim each member BEFORE sending — the claim IS the at-most-once guarantee.
    const claimed: string[] = [];
    for (const memberId of chunk) {
      if (suppressedMembers.has(memberId)) continue;
      const key = memberKey(p.alertId, memberId, scope);
      const outcome = await store.claim(key, ttl);
      if (outcome === 'acquired') claimed.push(memberId);
      else {
        alreadySent += 1;
        await settleOwedClosure(memberId, key);
      }
    }
    if (claimed.length === 0) continue;

    attempted += claimed.length;
    const call: FanOutCall = bridgeText && overlayFault !== null ? { ...fanOutCall(job, scope), bridgeBlockUnavailable: true } : fanOutCall(job, scope);
    const { results, retry } = await fanOutAlertToMembers(jobDeps, alertFor, claimed, pariwarId, now, call);

    const retrySet = new Set(retry);
    for (const memberId of claimed) {
      const key = memberKey(p.alertId, memberId, scope);
      const record = results.find((r) => r.memberId === memberId);
      if (retrySet.has(memberId) || !record) {
        // Review round 2 patch review (Q4): a member with NO result is a defect, ⛔ a terminal outcome — retried, as the
        // moderation notifier does. Unreachable today (`fanOutAlertToMembers` puts every member in `results` or `retry`).
        if (!retrySet.has(memberId)) {
          alarm(`[jobs] contribution-notify-child: the fan-out returned no result for member ${memberId} — retrying`);
          failed.push(memberId);
        }
        // Release the claim so the pg-boss retry can re-attempt immediately instead of waiting the TTL.
        await store.release(key).catch((err: unknown) => {
          alarm(`[jobs] contribution-notify-child: failed to release a member claim — ${String(err)}`);
        });
      } else {
        if (record.delivered) delivered += 1;
        else inAppOnly += 1; // FS14 (a) — recorded, the claim KEPT (a pending-match member is not nudged again)
        if (record.bridgeRowOpen) closureOwed.push(memberId);
        // Code review 2026-10-28 (third pass): an OWED closure's record outlives the `deferred` row (`OWED_CLOSURE_KEY_TTL_SECONDS`).
        const recorded = record.bridgeRowOpen
          ? store.recordResult(key, serializeFanOutResult(record), { extendTtlSeconds: OWED_CLOSURE_KEY_TTL_SECONDS })
          : store.recordResult(key, serializeFanOutResult(record));
        await recorded.catch((err: unknown) => {
          alarm(`[jobs] contribution-notify-child: failed to record a member result — ${String(err)}`);
          if (record.bridgeRowOpen) {
            // The DOUBLE fault: the key stays `pending` (base TTL), so a retry reads ⛔ owed closure — it may be lost.
            alarm(
              `[jobs] contribution-notify-child: alert_sms.bridge_closure_unrecorded — a bridged member the push reached owes a bridge-row ` +
                `closure, and its result could not be recorded, for alert ${p.alertId} pool ${p.poolId}: the closure may be LOST, and a re-run ` +
                `once the claim lapses may TEXT a member the push already told`,
            );
          }
        });
      }
    }
    failed.push(...retry);
  }

  const result: ContributionNotifyChildResult = {
    alertId: p.alertId,
    poolId: p.poolId,
    kind: p.kind,
    attempted,
    delivered,
    inAppOnly,
    suppressed: suppressedMembers.size,
    alreadySent,
  };
  console.info('[jobs] contribution-notify-child', JSON.stringify(result));

  // Story 5.8b review (P2-1) — an owed closure retries the job (⛔ a push: those members are recorded). On the FINAL attempt it is
  // left to the row's own 30-minute expiry (a later lookup gives an expired `deferred` row up instead of sending it) — alarmed. Code
  // review 2026-10-28 (third pass): the owed member's RECORD outlives that window (`OWED_CLOSURE_KEY_TTL_SECONDS`), so ⛔ re-run can
  // claim them before it. The residuals: a terminal row that could not be WRITTEN (⛔ row at all) through every attempt — once the key
  // lapses, F9's re-fan finds ⛔ row (named in the alarm) — and a record that failed (`bridge_closure_unrecorded`).
  const closureRetry = closureOwed.length > 0 && !isFinalFanOutAttempt(fanOutCall(job, scope));
  if (closureOwed.length > 0 && !closureRetry) {
    alarm(
      `[jobs] contribution-notify-child: ${String(closureOwed.length)} member(s)' bridge text record could not be closed (or ` +
        `checked) on the FINAL attempt for alert ${p.alertId} pool ${p.poolId} — a deferred row is left to expire (30 minutes after ` +
        `its rate-limited try; the claim outlives it); where ⛔ row could be written, a re-fan after the claim lapses may text a ` +
        `member the push already told`,
    );
  }
  if (failed.length > 0 || closureRetry) {
    // D9 — the durable half of AR-19. The members who DID deliver are recorded, so this retry re-sends
    // nothing to them; only the failed members are re-attempted (and an owed bridge-row closure — Story 5.8b review P2-1).
    throw new Error(
      `[jobs] contribution-notify-child: ${String(failed.length)} member(s) failed` +
        (closureRetry ? ` and ${String(closureOwed.length)} deferred bridge text(s) are still to be given up` : '') +
        ` for alert ${p.alertId} pool ${p.poolId} — throwing so pg-boss retries with its own backoff`,
    );
  }
  return result;
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
  // Review 2026-10-26 (R4-P1): ONLY a bounded day-10 job narrows the read to its members (this read runs for
  // `deadline_reminder` only). A day 5 / 13 / 14 job carries the WHOLE roster — up to 4L in one pool — so it reads the pool
  // unfiltered, as before AP-P2.
  const bounded = isLitPoolPayload(p) && p.memberIds.length <= LIT_KIND_JOB_MEMBER_LIMIT;
  const acted = await withPariwarScope(deps.pool, pariwarId, (db: Db) =>
    contributionDomain.listActedMemberIdsForPool(db, {
      pariwarId: ids.pariwarId(pariwarId),
      alertId: ids.alertId(p.alertId),
      poolId: ids.poolId(p.poolId),
      ...(bounded ? { memberIds: p.memberIds } : {}),
    }),
  );
  // `confirmed` wins when a member is in BOTH sets — it is the stronger, later fact.
  const members = new Set(p.memberIds);
  for (const memberId of acted.attested) if (members.has(memberId)) suppressed.set(memberId, 'already_attested');
  for (const memberId of acted.confirmed) if (members.has(memberId)) suppressed.set(memberId, 'already_confirmed');
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
      // ⭐ Story 5.8b (FS10 (a), I9) — in the SAME scope, and ONLY when the alert is re-enqueued: the AR-18 signal re-derived by the
      // read `openCycleAlert` makes (the freeze `committed_at`), so a recovered cycle is bridged exactly as its first pass was.
      const { expectedMembers, timeCritical } = await withPariwarScope(deps.pool, row.pariwar_id, async (db: Db) => {
        const candidates = await poolDomain.listCycleBindingCandidates(
          db,
          ids.pariwarId(row.pariwar_id),
          ids.cycleFreezeCommitId(row.cycle_id),
        );
        const expected = candidates.reduce((sum, c) => sum + c.memberIds.length, 0);
        if (expected === 0 || Number(row.notified_members) >= expected) return { expectedMembers: expected, timeCritical: null };
        const signal = await alertDomain.resolveCycleOpenTimeCritical(db, row.cycle_id);
        return { expectedMembers: expected, timeCritical: signal?.timeCritical ?? null };
      });
      const notifiedMembers = Number(row.notified_members);
      if (expectedMembers === 0 || notifiedMembers >= expectedMembers) continue;
      if (timeCritical === null) {
        // A `live` alert whose cycle has ⛔ `cycle.frozen` event — unreachable (the alert is minted from that event). ⛔ guess bridged.
        alarm(`[jobs] contribution-notify-sweep: alert ${row.alert_id} cycle ${row.cycle_id} has no cycle.frozen event — re-enqueued un-bridged`);
      }

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
          // Story 5.8b (FS10 (a)) replaced 8.8's documented fail-safe `false` (*"it can only cost the degraded-mode SMS BRIDGE on a
          // recovered cycle"*): the signal is RE-DERIVED above from the freeze instant — the members a first pass lost while the
          // infrastructure was down are exactly the ones the bridge exists for. The send row keeps it at most one text per member.
          timeCritical: timeCritical ?? false,
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
  boss: PoolBatchEnqueueBoss,
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

      // UTC-safe: `committedAt` + N whole days in milliseconds (`cycleDeadlineAt` — Story 5.14 moved the arithmetic to contracts so
      // the channel post and the admin list compute it the same way).
      const deadlineAt = cycleDeadlineAt(committedAt);

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
          // ONE pool's enqueue failing must never cost its SIBLING pools this tick's reminder — each pool is
          // enqueued on its own (a split day-10 pool in ONE atomic insert, so a failure here PROBABLY enqueued none
          // of its jobs — an insert that committed and then lost its reply is the exception; R4-P2), and this exact
          // cycle-day never recurs, so a whole-alert catch would silently lose that pool's reminder. (`singletonKey`
          // is only a label on this standard queue — R4-P5.)
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

// ── Task 3 (Story 9.10): the pending-match retry cadence sweep ──────────────────────────────────────

/**
 * The pending-match RETRY cadence sweep (Story 9.10, AC2/AC3/AC4/AC5/AC6) — the FIFTH contribution-notify
 * trigger, riding the SAME `runDeadlineReminderSweep`-shaped template: cross-tenant BYPASSRLS scan,
 * `ORDER BY cycle_id`, bounded + alarmed batch, per-pool try/catch so one pool's failure never costs its
 * siblings.
 *
 * ── Why `live` AND `closed` (unlike the deadline sweep's `live`-only) ─────────────────────────────────
 * A payment attested near the Day-15 close can still be pending-match INTO the reconciliation TAIL
 * (Story 8.9 + the Story 9.4/9.5 matcher runs on live+closed cycles). This mirrors the Story 9.8
 * review-read bound (`live`/`closed`, excluding `settled` done + pre-live) — intentionally duplicated as
 * a literal here rather than extracted to a shared const (each read owns its own tenant/state predicate
 * by convention; see Dev Notes "Reconciliation window").
 *
 * Per pool: resolve AC-1's pending-match members ({@link contributionDomain.listPendingMatchMembersForPool}),
 * bucket each by tier off `now − oldestUnresolvedAttestedAt` (AC2's thresholds), and `enqueuePoolBatch`
 * PER (pool, tier) — never a single mixed batch — so the child worker's `kind` selects exactly one tier's
 * copy + idempotency scope. A member ≥24h is ONLY escalated (they will already hold the soft-tier claim
 * from an earlier tick); the child's per-member idempotency claim is what actually enforces "at most once
 * ever" (AC3) — this sweep is free to re-submit the same member every tick and the claim absorbs it.
 */
export async function runPendingMatchRetrySweep(
  deps: ContributionNotifyTriggerDeps,
  boss: PoolBatchEnqueueBoss,
): Promise<{ scanned: number; enqueuedBatches: number }> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const now = deps.now?.() ?? new Date();
  const limit = Math.max(1, deps.pendingMatchSweepAlertLimit ?? DEFAULT_PENDING_MATCH_SWEEP_ALERT_LIMIT);

  const { rows } = await deps.pool.query<{ alert_id: string; cycle_id: string; pariwar_id: string }>(
    `SELECT a.alert_id, a.cycle_id, a.pariwar_id
       FROM alerts a
      WHERE a.current_state IN ('live', 'closed')
      ORDER BY a.cycle_id ASC
      LIMIT $1`,
    [limit],
  );

  let enqueuedBatches = 0;
  for (const row of rows) {
    try {
      const candidates = await withPariwarScope(deps.pool, row.pariwar_id, (db: Db) =>
        poolDomain.listCycleBindingCandidates(
          db,
          ids.pariwarId(row.pariwar_id),
          ids.cycleFreezeCommitId(row.cycle_id),
        ),
      );

      const ctx: NotifyEnqueueContext = {
        pariwarId: row.pariwar_id,
        // Per-tick component so every hourly retry for the same reconciling alert is distinguishable in
        // logs/tracing — a static id makes N ticks indistinguishable (the recovery-sweep precedent).
        requestId: `contribution.pending_match_retry:${row.alert_id}:${String(now.getTime())}`,
        actorId: null,
        traceId: `contribution.pending_match_retry:${row.alert_id}:${String(now.getTime())}`,
      };

      for (const candidate of candidates) {
        try {
          const pending = await withPariwarScope(deps.pool, row.pariwar_id, (db: Db) =>
            contributionDomain.listPendingMatchMembersForPool(db, {
              pariwarId: ids.pariwarId(row.pariwar_id),
              alertId: ids.alertId(row.alert_id),
              poolId: ids.poolId(candidate.poolId),
            }),
          );
          if (pending.length === 0) continue;

          // Bucket by tier off the OLDEST unresolved attestation (AC1/AC2) — a member ≥24h is ONLY
          // escalated, never double-enqueued into the soft tier too.
          const softMemberIds: string[] = [];
          const escalatedMemberIds: string[] = [];
          for (const member of pending) {
            const ageMs = now.getTime() - member.oldestUnresolvedAttestedAt.getTime();
            if (ageMs >= PENDING_MATCH_ESCALATION_AGE_MS) escalatedMemberIds.push(member.memberId);
            else if (ageMs >= PENDING_MATCH_SOFT_REMINDER_AGE_MS) softMemberIds.push(member.memberId);
          }

          const tierBatches: ReadonlyArray<{ kind: ContributionNotifyKind; memberIds: readonly string[] }> = [
            { kind: 'pending_match', memberIds: softMemberIds },
            { kind: 'pending_match_escalated', memberIds: escalatedMemberIds },
          ];
          for (const batch of tierBatches) {
            if (batch.memberIds.length === 0) continue;
            enqueuedBatches += await enqueuePoolBatch(boss, ctx, {
              kind: batch.kind,
              alertId: row.alert_id,
              cycleId: row.cycle_id,
              poolId: candidate.poolId,
              poolIndex: candidate.poolIndex,
              poolCanonicalIdentifier: candidate.poolCanonicalIdentifier,
              claimCaseId: candidate.claimCaseId,
              fixedAmount: candidate.fixedAmount,
              poolCount: candidates.length,
              memberIds: batch.memberIds,
              // NEVER time-critical (AC6) — a retry nudge must never trip the AR-20 degraded-mode bridge.
              timeCritical: false,
            });
          }
        } catch (err) {
          // ONE pool's enqueue failing must never cost its SIBLING pools this tick's reminder.
          alarm(
            `[jobs] pending-match-retry-sweep: failed to enqueue reminders for alert ${row.alert_id} pool ` +
              `${candidate.poolId} — ${String(err)}`,
          );
        }
      }
    } catch (err) {
      // The alert's DB reads failing must never abort the sweep — the next tick retries it.
      alarm(
        `[jobs] pending-match-retry-sweep: failed to compute/enqueue reminders for alert ${row.alert_id} — ${String(err)}`,
      );
    }
  }

  if (rows.length >= limit) {
    alarm(
      `[jobs] pending-match-retry-sweep: hit the ${String(limit)}-alert batch cap — more reconciling ` +
        `alerts remain; the next tick will pick them up (raise pendingMatchSweepAlertLimit if this recurs)`,
    );
  }
  console.info(
    '[jobs] pending-match-retry-sweep',
    JSON.stringify({ scanned: rows.length, enqueuedBatches, limit }),
  );
  return { scanned: rows.length, enqueuedBatches };
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

  const { results, retry } = await fanOutAlertToMembers(
    deps,
    () => alert,
    [p.memberId],
    pariwarId,
    now,
  );

  const first = results[0];
  // Q4: a missing result is retried like a failure, ⛔ recorded as a terminal outcome (unreachable today). F4: and named.
  if (retry.length > 0 || !first) {
    if (!first && retry.length === 0) {
      alarm(`[jobs] contribution-confirmed-notify: the fan-out returned no result for member ${p.memberId} — retrying`);
    }
    await store.release(key).catch((err: unknown) => {
      alarm(`[jobs] contribution-confirmed-notify: failed to release the member claim — ${String(err)}`);
    });
    throw new Error(
      `[jobs] contribution-confirmed-notify: fan-out failed for alert ${p.alertId} — throwing so pg-boss retries`,
    );
  }
  // Story 5.11 (FS14 (a)) — a member no rung reached is recorded `in_app_only`, ⛔ retried.
  await store.recordResult(key, serializeFanOutResult(first)).catch((err: unknown) => {
    alarm(`[jobs] contribution-confirmed-notify: failed to record the member result — ${String(err)}`);
  });
  return { alertId: p.alertId, memberId: p.memberId, delivered: first.delivered, alreadySent: false };
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
  /** Story 5.11b (FS9) — the pg-boss job (its id and, with `includeMetadata`, its retry count). Absent ⇒ the final attempt. */
  job?: NotifyJobAttempt,
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
  const scope = `mismatch:${p.reason}`;
  const key = memberKey(p.alertId, p.memberId, scope);

  if ((await store.claim(key, ttl)) !== 'acquired') {
    return { alertId: p.alertId, memberId: p.memberId, delivered: false, alreadySent: true };
  }

  // Story 5.11b (FS5 (a)) — the member's TEXT language, ONE query; ⛔ passport ⇒ ⛔ text and one alarm (the push still goes).
  let smsLocale: ContributionSmsLocale | null;
  try {
    const languages = await withPariwarScope(deps.pool, pariwarId, (db: Db) =>
      memberDomain.readMemberTextLanguages(db, { pariwarId: ids.pariwarId(pariwarId), memberIds: [p.memberId] }),
    );
    if (languages === null) {
      alarm(
        `[jobs] contribution-mismatch-notify: alert_sms.locale_unresolved — pariwar ${pariwarId} has ⛔ passport row; ⛔ text for ` +
          `alert ${p.alertId} (the push still goes)`,
      );
    }
    smsLocale = languages?.get(p.memberId.toLowerCase()) ?? null;
  } catch (err) {
    await store.release(key).catch(() => undefined);
    throw err;
  }

  const alert = buildContributionMismatchAlert({
    alertId: p.alertId,
    pariwarId,
    memberId: p.memberId,
    poolId: p.poolId,
    reason: p.reason,
    locale,
    smsLocale,
    now,
  });

  const { results, retry } = await fanOutAlertToMembers(deps, () => alert, [p.memberId], pariwarId, now, fanOutCall(job, scope));

  const first = results[0];
  // Q4: a missing result is retried like a failure, ⛔ recorded as a terminal outcome (unreachable today). F4: and named.
  if (retry.length > 0 || !first) {
    if (!first && retry.length === 0) {
      alarm(`[jobs] contribution-mismatch-notify: the fan-out returned no result for member ${p.memberId} — retrying`);
    }
    await store.release(key).catch((err: unknown) => {
      alarm(`[jobs] contribution-mismatch-notify: failed to release the member claim — ${String(err)}`);
    });
    throw new Error(
      `[jobs] contribution-mismatch-notify: fan-out failed for alert ${p.alertId} — throwing so pg-boss retries`,
    );
  }
  // Story 5.11 (FS14 (a)) — a member no rung reached is recorded `in_app_only`, ⛔ retried.
  await store.recordResult(key, serializeFanOutResult(first)).catch((err: unknown) => {
    alarm(`[jobs] contribution-mismatch-notify: failed to record the member result — ${String(err)}`);
  });
  return { alertId: p.alertId, memberId: p.memberId, delivered: first.delivered, alreadySent: false };
}

// ── The job attempt (Story 5.11b, FS9) ─────────────────────────────────────────────────────────────────

/** A pg-boss job's id and — registered with `includeMetadata` — its retry count / limit (type-guarded). */
export interface NotifyJobAttempt {
  readonly id?: string;
  readonly retryCount?: number;
  readonly retryLimit?: number;
}

/** The `claim-contact-ladder-whatsapp.ts` type guard: a field that is ⛔ a number is absent (⇒ the final attempt). */
function jobAttemptOf(job: Job): NotifyJobAttempt {
  const meta = job as Job & { readonly retryCount?: unknown; readonly retryLimit?: unknown };
  return {
    ...(typeof job.id === 'string' ? { id: job.id } : {}),
    ...(typeof meta.retryCount === 'number' && typeof meta.retryLimit === 'number'
      ? { retryCount: meta.retryCount, retryLimit: meta.retryLimit }
      : {}),
  };
}

/** The fan-out's per-call parameters: the attempt and the OCCASION (the keyed store's scope — F4). */
function fanOutCall(job: NotifyJobAttempt | undefined, occasion: string): FanOutCall {
  return {
    occasion,
    ...(job?.id !== undefined ? { jobId: job.id } : {}),
    ...(job?.retryCount !== undefined && job.retryLimit !== undefined ? { retryCount: job.retryCount, retryLimit: job.retryLimit } : {}),
  };
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
  opts: {
    sweepCron?: string;
    recoverySweepCron?: string;
    pendingMatchSweepCron?: string;
    sweepTz?: string;
  } = {},
): Promise<void> {
  await boss.createQueue(QUEUE_NAMES.CONTRIBUTION_NOTIFY_POOL_BATCH);
  // localConcurrency — the same `registerCycleSpawnWorkers` precedent (cycle-spawn.ts:36/381): N pool
  // children processed concurrently in this process rather than one pool at a time. Without it, a
  // cycle-open fan-out across ~50 pools runs fully serially, which is exactly what the §5.12 5-minute
  // time-to-fan-out budget cannot afford.
  // Story 5.11b (FS9) — `includeMetadata`: the child reads its retry count (§3.4's window; the final attempt records what never cleared).
  await boss.work(
    QUEUE_NAMES.CONTRIBUTION_NOTIFY_POOL_BATCH,
    { localConcurrency: deps.childConcurrency ?? DEFAULT_POOL_BATCH_LOCAL_CONCURRENCY, includeMetadata: true },
    async (jobs: Job[]) => {
      const results: ContributionNotifyChildResult[] = [];
      for (const job of jobs) {
        const envelope = job.data as JobEnvelope<ContributionNotifyChildPayload>;
        // Upgrade queued pre-fix payloads as well. Never process their full roster and recreate the retry-age bug.
        // Only finish the old job after ALL bounded children were enqueued — in ONE atomic insert (R4-P2), so a failure enqueued
        // none of them; a retry inserts the same deterministic IDs (`ON CONFLICT DO NOTHING`).
        if (isLitPoolPayload(envelope.payload) && envelope.payload.memberIds.length > LIT_KIND_JOB_MEMBER_LIMIT) {
          const alarm = deps.onAlarm ?? ((message: string): void => console.warn(message));
          if (!envelope.pariwarId) {
            const message = '[jobs] contribution-notify-child: missing pariwarId while splitting a queued job';
            alarm(message);
            throw new Error(message);
          }
          if (!job.id) {
            const message = '[jobs] contribution-notify-child: missing source job id while splitting a queued job — recovery required';
            alarm(message);
            throw new Error(message);
          }
          try {
            await enqueuePoolBatch(boss, { ...envelope, pariwarId: envelope.pariwarId }, envelope.payload, job.id);
          } catch (err) {
            // pg-boss records handler failure without an error emit (T8). Do not promise another attempt on exhaustion
            // or incomplete metadata. The insert is atomic (R4-P2), so PROBABLY none of the bounded jobs was enqueued — but an
            // insert can commit and then lose its reply. Recovery re-drives the SAME source job id: its deterministic child ids
            // make that `ON CONFLICT DO NOTHING`. A resubmission under a NEW id would mint a second set of children (a duplicate
            // push for every member; the send row still stops a second text).
            const attempt = jobAttemptOf(job);
            const redrive = `inspect the queue for children of source job ${String(job.id)}, then re-drive THAT job id (⛔ a new one)`;
            const recovery = attempt.retryCount === undefined || attempt.retryLimit === undefined
              ? `retry status unknown; probably no bounded job was enqueued — ${redrive} if it is not retried — recovery required`
              : attempt.retryCount >= attempt.retryLimit
                ? `no retry remains; probably no bounded job was enqueued — ${redrive} — recovery required`
                : 'retrying';
            alarm(`[jobs] contribution-notify-child: failed to split queued job ${job.id} alert ${envelope.payload.alertId} pool ${envelope.payload.poolId} — ${recovery}`);
            throw err;
          }
          continue;
        }
        results.push(
          await runContributionNotifyChild(deps, envelope, jobAttemptOf(job)),
        );
      }
      return { processed: jobs.length, results };
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
  await boss.work(QUEUE_NAMES.CONTRIBUTION_NOTIFY_MISMATCH, { includeMetadata: true }, async (jobs: Job[]) => {
    const results = [];
    for (const job of jobs) {
      results.push(
        await runContributionMismatchNotify(deps, job.data as JobEnvelope<ContributionMismatchNotifyPayload>, jobAttemptOf(job)),
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

  // The pending-match RETRY cadence cron (IST) — Story 9.10. Hourly so the 4h/24h tier boundaries are
  // always caught within the hour.
  await boss.createQueue(QUEUE_NAMES.CONTRIBUTION_PENDING_MATCH_RETRY_SWEEP);
  await boss.work(QUEUE_NAMES.CONTRIBUTION_PENDING_MATCH_RETRY_SWEEP, async (jobs: Job[]) => {
    try {
      const swept = await runPendingMatchRetrySweep(deps, boss);
      console.info('[jobs] pending-match-retry-sweep tick', JSON.stringify({ jobs: jobs.length, ...swept }));
      return swept;
    } catch (err) {
      console.error('[jobs] pending-match-retry-sweep tick failed', err);
      throw err;
    }
  });
  await boss.schedule(
    QUEUE_NAMES.CONTRIBUTION_PENDING_MATCH_RETRY_SWEEP,
    opts.pendingMatchSweepCron ?? DEFAULT_PENDING_MATCH_RETRY_SWEEP_CRON,
    {},
    { tz: opts.sweepTz ?? CONTRIBUTION_NOTIFY_TZ },
  );
}

/** Re-exported so a consumer computing the card's days-remaining and this module's cycle-day cannot
 *  reach for two different helpers. Story 8.9 replaces the underlying window for both at once. */
export { computeDaysRemaining };
