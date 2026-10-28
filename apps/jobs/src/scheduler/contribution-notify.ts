// The contribution-loop LIVE FAN-OUT — Story 8.8 (Task 4; AC1, AC5, AC6).
//
// ⚠ THIS FILE IS THE STACK'S FIRST LIVE `dispatch()` CALL SITE. ⚠
//
// Epic 5 shipped nine stories of channel primitives with ZERO live caller, and every later story
// (5.2–5.8, 6.12, 7.5, AI-5-2, 8.1) deliberately refused to become the first one — each recording that
// the composition belongs to "the site that first drives a real dispatch fan-out". This is that site.
// The memory note `[[project_channels_no_live_dispatch_yet]]` is retired by this file.
//
// The corollary: every "frozen surface" note in `packages/channels` is still binding. Nothing under
// `packages/channels/src/**` is modified by this story — `dispatch`, `cascade`, `render`, `provider`,
// `CANONICAL_CHANNEL_LADDER`, `DeliveryResolver`, `ChannelProvider` and the audit port are CONSUMED.
// Every composition problem is solved HERE, in the composition, and never by editing a primitive.
//
// ── The composition, in the ratified order (AC6 / Decision 3 / D9) ──────────────────────────────────
//   1. `evaluateDegradedModeBridge` FIRST. When it bridges (a cycle-open alert under an active
//      declaration) 8.8 forced SMS only and BYPASSED BOTH cost-optimization AND the ladder — the AR-20
//      carve-out to RA-29's no-bulk-SMS rule (degraded-mode.ts:15-23). Story 5.11 (FS10 (a), `-389`) kept it
//      dark (⛔ registered words). ⭐ Story 5.8b (FS3 (a), `2026-10-28-415`; Panel `2026-10-28-414` Q1 A) LIGHTS
//      it as TEXT FIRST, THE LADDER AS THE FALLBACK: a bridged alert carrying the `cycle_open_bridge` block is
//      texted through the injected `alertSms` seam BEFORE push (⛔ the WhatsApp window — `whatsappTried:
//      false`), unless the Super Admin switch is OFF (read once per job). `sent` ⇒ delivered by SMS, push and
//      WhatsApp ⛔ run (the Telegram mirror still does); anything else ⇒ the ladder below runs, the bridge's
//      trail entry FIRST and the ladder's SMS rung ending `sms_bridge_already_tried`. The primitive and
//      `DEGRADED_MODE_BRIDGE_CHANNELS` are unedited — the composition sequences them.
//   2. `evaluateCostOptimization` decides suppression of the two PAID channels. The
//      mechanism is the one 5.7 specifies: the resolver OMITS the suppressed channels' targets
//      ("the future live fan-out drives it by omitting the suppressed cost-channels' targets",
//      cost-optimization.ts:10-11). Push is never suppressible and never suppressed.
//   3. `runChannelCascade(send, { backoffMs: [], sleep })` — stop at the first `sent`. Each push / WA
//      rung is ONE `dispatch` call with a `DeliveryResolver` narrowed to that single channel, so category
//      eligibility, fcm-vs-apns provider selection, lifecycle suppression, the honest outcome mapping
//      and BOTH audit families all stay `dispatch`'s job. The composition never re-implements them.
//      ⭐ The SMS rung is the exception (Story 5.11, I3 / FS15): it ⛔ dispatches through the category
//      resolver's SMS provider (the log fixture for every alert — its registry is all-dark — reports `sent`).
//      The rung decides lit / eligible ITSELF from the payload's `sms` block and ONE predicate
//      (`isAlertSmsFallbackEligible`), and every non-send names its reason on the trail. ⭐ Story 5.11b
//      (FS18 (a), `-404`): a lit, eligible member with an SMS target is then texted by the INJECTED
//      `alertSms` seam (`alert-sms-send.ts`), which sends THROUGH `dispatch` (a one-send provider in a
//      per-call registry) — the lifecycle-suppression hook on these deps reaches EVERY rung (I4).
//   4. The Telegram mirror fires INDEPENDENTLY of the ladder — fire-and-forget, only when
//      `isCategoryEligible('telegram', category)`. A Telegram failure never changes `delivered` or
//      `deliveredChannel` (dispatch.ts:44-52 owns the eligibility; cascade.ts owns "Telegram is
//      INDEPENDENT").
//
// ── D9: no worker ever sleeps a backoff in-process ──────────────────────────────────────────────────
// `DEFAULT_SMS_BACKOFF_MS` is 30s/5m/30m and `runChannelCascade` sleeps it IN-PROCESS — at 4L members
// that would hold a worker 35+ minutes per undelivered member. So the ladder runs with `backoffMs: []`
// (one attempt per rung, no sleeping) and retry-with-backoff is delegated to pg-boss's own job retry:
// in 8.8 a member whose whole ladder came back undelivered made the job THROW (5.11 narrows it — below). `cascade.ts:14-17` anticipates
// exactly this ("a plain array so a later DURABLE (pg-boss) adapter is thin").
//
// ⭐ Story 5.11 (FS14 (a), review R1 option 1): former fixture successes are recorded `in_app_only`.
// A member without an available SMS target never reached that fixture: their previous retry remains,
// including when cost-optimization omitted SMS. `shouldRetryFanOut` owns this distinction (I4).
// A thrown fan-out also retries. ⭐ Story 5.11b (FS9 (a)): a REAL send adds its own retry classes — §3.4's
// WhatsApp window, `rate_limited`, a send in flight, the send state unavailable, a Secret Manager transient —
// each retried until the final attempt (`alert-sms-details.ts`); every other member's rule is unchanged.
//
// THE AR-19 DEVIATION, STATED NOT HIDDEN: AR-19 reads "push (1 + up to 3 backoff-spaced retries) → WA →
// SMS", i.e. retries are PER RUNG before advancing. This design retries the WHOLE LADDER. Two
// consequences, both examined and accepted: (a) a genuinely dead push reaches SMS FASTER, which is
// better for a time-critical cycle-open; (b) a retry pass cannot duplicate a paid send, because any
// rung that had succeeded would have stopped the ladder — so a re-run only re-attempts rungs that
// already failed. What is LOST is the "give push three more chances before spending money on WA" bias.
// The per-rung durable adapter (a job carrying `{ channel, attempt }` that re-enqueues itself with
// `startAfter`) is the refinement; it is logged in `deferred-work.md`, deliberately NOT built here.
//
// ── PII posture ─────────────────────────────────────────────────────────────────────────────────────
// Addresses (device tokens, mobiles, chat ids) are resolved at this composition layer, never logged,
// and never placed on a job result. The recorded trail is channels + outcomes ONLY.

import type { Alert, AlertCategory, AlertSmsBlock } from '@twt/contracts';
import {
  CANONICAL_CHANNEL_LADDER,
  WHATSAPP_REFUSAL_DETAIL,
  auditCostSuppression,
  dispatch,
  evaluateCostOptimization,
  evaluateDegradedModeBridge,
  isCategoryEligible,
  isUnrecoverableTokenRejection,
  runChannelCascade,
  type AuditPort,
  type CascadeTrailEntry,
  type Channel,
  type ChannelProvider,
  type ChannelSendOutcome,
  type LifecycleSuppressionHook,
  type RenderedMessageHash,
  type SendResult,
  type SendTarget,
} from '@twt/channels';
import {
  deviceToken as deviceTokenDomain,
  ids,
  notifications,
  withPariwarScope,
  type Db,
  type encryption as encryptionTypes,
} from '@twt/domain';
import type pg from 'pg';

import { ALERT_SMS_RETRYABLE_DETAILS, ALERT_SMS_RUNG_DETAIL, isFinalFanOutAttempt, type FanOutCall } from './alert-sms-details.js';
// ⚠ TYPE-ONLY (T12 — [[project_type_only_import_cycle_trap]]): the seam imports VALUES from the claim core and the registry;
// this file must ⛔ take a value edge into it. The seam is INJECTED (`deps.alertSms`), built in boot.
import type { AlertSmsSender } from './alert-sms-send.js';

/** The encryption material the delivery resolvers + the rendered-message HMAC need. Structurally the
 *  jobs-side `JobsEncryptionDeps` (`{ kms, kekRef, hmacKeyRef }`) — passed straight through. */
export type NotifyEncryptionDeps = encryptionTypes.FieldCryptoDeps;

/** Resolve the provider registry for one (Pariwar, category). Injected so the real-vs-fixture selection
 *  never leaks into `dispatch`. Omitted ⇒ `dispatch`'s own `DEFAULT_PROVIDER_REGISTRY` (the shipped
 *  log-only fixtures — the zero-config posture Epic 5 committed to). */
export type ProviderRegistryResolver = (input: {
  readonly pariwarId: string;
  readonly category: AlertCategory;
}) => Promise<Readonly<Record<Channel, readonly ChannelProvider[]>>>;

/** The injectable dependency bundle. Everything impure is here so the fan-out is unit-testable with
 *  fakes and DB-testable live, and so NO test ever needs a real timer or a real network. */
export interface ContributionNotifyDeps {
  /** BYPASSRLS service pool — the `withPariwarScope` pool for every read + the audit writer's pool. */
  readonly pool: pg.Pool;
  /** Drizzle handle bound to {@link pool} (BYPASSRLS). Used ONLY for the isolated push-token
   *  invalidation write, which by design never runs on a caller's scoped tx (AI-4-3(d)). */
  readonly serviceDb: Db;
  /** Tier-1 key material for the delivery-target decrypts + the PII-safe rendered-message HMAC. */
  readonly encryption: NotifyEncryptionDeps;
  /** The audit sink (`createAuditPort(pool)` in production). Never throws into the fan-out. */
  readonly audit: AuditPort;
  /** The PII-safe rendered-message HMAC (`createRenderedMessageHash`) — never a raw sha256 of copy. */
  readonly hashRendered: RenderedMessageHash;
  /** Per-(Pariwar, category) provider registry. Defaults to the shipped log-only fixtures. */
  readonly resolveProviders?: ProviderRegistryResolver;
  /** Injectable clock — the cost-optimization staleness window's `now`. Defaults to a real clock. */
  readonly now?: () => Date;
  /** Injectable sleep for the cascade. With `backoffMs: []` it is never called; injected so a test can
   *  PROVE that (the `sleepRecorder` convention) rather than assume it. */
  readonly sleep?: (ms: number) => Promise<void>;
  /** Failure alarm sink — a console stub by default. Never receives an address. */
  readonly onAlarm?: (message: string) => void;
  /**
   * Story 5.11b (I4; FS18 (a)) — `dispatch`'s lifecycle-suppression hook, passed to EVERY rung's dispatch (push, WhatsApp, SMS
   * and the Telegram mirror). Absent ⇒ `dispatch`'s own `noLifecycleSuppression` (production today — the member-state read
   * model is ⛔ built).
   */
  readonly suppression?: LifecycleSuppressionHook;
  /**
   * Story 5.11b (FS19) — the REAL alert SMS send (`createAlertSmsSender`, built in boot — ALWAYS; an unconfigured gateway ends the
   * rung `config:sms_gateway_unconfigured`). Absent ⇒ a lit, eligible member's rung ends `sms_send_not_wired` (tests only). Shared by
   * news / survey / moderation, which carry
   * ⛔ `sms` block and so never reach it (I6).
   */
  readonly alertSms?: AlertSmsSender;
  /**
   * Story 5.8b (FS17 (a), AC12) — the Super Admin switch for the degraded-mode bridge's TEXT (`degraded_bridge_sms_switch`), read at
   * the bridge attempt. ⭐ The cycle-open child wraps it so it is read ONCE per job (`onceForJob`). Absent ⇒ OFF (⛔ text — the
   * switch starts OFF; tests that drive the bridge pass it). A THROW ⇒ ⛔ text for that job, an alarm, and the member retried
   * (`sms_bridge_switch_unavailable`).
   */
  readonly readBridgeSwitch?: () => Promise<boolean>;
}

/** The member's resolved delivery targets, one entry per channel. `push` is an ARRAY: a member may have
 *  many devices, which the frozen one-target-per-channel `DeliveryResolver` cannot express — resolved
 *  HERE, in the composition (device-token.handlers.ts:142-147 named this as the live-fan-out's problem). */
export interface MemberDeliveryTargets {
  readonly push: readonly SendTarget[];
  readonly whatsapp: SendTarget | null;
  readonly sms: SendTarget | null;
  readonly telegram: SendTarget | null;
}

/** The per-member policy inputs the fan-out decides on. Resolved by {@link resolveMemberDeliveryContext}
 *  (DB) and injected here so `fanOutAlert` itself is DB-free and exhaustively fake-testable. */
export interface MemberFanOutContext {
  readonly targets: MemberDeliveryTargets;
  /** The per-Pariwar FR-58C cost-optimization toggle. Fail-safe `false` until Epic 10 (5.7's seam). */
  readonly costToggleEnabled: boolean;
  /** The member's last in-app engagement (the app-open proxy), or null when there is no signal. */
  readonly lastEngagementAt: Date | null;
}

/** The NON-PII record of one member's fan-out — channels + outcomes only, never an address. */
export interface MemberFanOutResult {
  readonly memberId: string;
  readonly delivered: boolean;
  readonly deliveredChannel: Channel | null;
  readonly trail: readonly CascadeTrailEntry[];
  /** `true` when the AR-20 degraded-mode SMS bridge was REQUESTED (a cycle-open under an active declaration).
   *  Story 5.8b (FS3 (a)): the bridge text was tried first (its trail entry is the first `sms` entry) unless a
   *  named reason kept it from being tried — then the ladder's SMS rung names it (or, when the ladder delivered before that
   *  rung, a leading `sms` entry does — code review 2026-10-28, second pass). */
  readonly bridged: boolean;
  /** The paid channels cost-optimization omitted for this member (never includes `push`). */
  readonly costSuppressedChannels: readonly Channel[];
  /** `true` when the Telegram mirror was category-eligible AND a chat id was on file. */
  readonly telegramMirrored: boolean;
  /** Story 5.8b review (P2-1) — the ladder delivered but a `deferred` bridge row could NOT be given up (FS3.1 (a)): the caller records
   *  the member (⛔ a second push) and keeps the closure owed. Absent ⇒ nothing owed. Code review 2026-10-28 (second pass): also when
   *  the terminal row could not be written, or a member recorded `in_app_only` left a `deferred` row open (`delivered` says which). */
  readonly bridgeRowOpen?: true;
}

const realSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Story 5.11 (I3; FS2, FS10, FS15) — why an alert's SMS rung ended WITHOUT a send. PII-free; recorded on the trail and in
 * the member's result. ⛔ A fixture `sent` replaces any of them.
 */
export const SMS_RUNG_DETAIL = {
  /** The alert carries no `sms` block — its message has no registered words (a pool opening, news, …). */
  notLit: 'sms_message_not_lit',
  /** Lit, but the member is not eligible under {@link isAlertSmsFallbackEligible}. */
  notEligible: 'sms_fallback_not_eligible',
  /** Lit and eligible, but ⛔ `alertSms` seam is wired (Story 5.11b: tests, a jobs process without a gateway) — ⛔ text goes. */
  notWired: 'sms_send_not_wired',
  // Story 5.8b (FS3 (a)) retired 5.11's `sms_bridge_not_lit` (the bridge has its words now). A BRIDGED alert's ladder SMS rung ends:
  /** The bridge text was tried FIRST (its own trail entry precedes this one) and did not end `sent` — ⛔ a second text. */
  bridgeAlreadyTried: 'sms_bridge_already_tried',
  /** The Super Admin switch is OFF (FS17 (a)) — ⛔ bridge text tried; the ladder ran as before 5.8b. */
  bridgeSwitchedOff: 'sms_bridge_switched_off',
  /** The switch could not be read — ⛔ text this attempt, alarmed; RETRIED until the final attempt (⛔ a silent drop). */
  bridgeSwitchUnavailable: 'sms_bridge_switch_unavailable',
  /** The job's bridge blocks were omitted on a FAILED death-overlay read (`call.bridgeBlockUnavailable`) — RETRIED like the switch. */
  bridgeBlockUnavailable: 'sms_bridge_block_unavailable',
} as const;

/**
 * The rung details a member's recorded result KEEPS (FS14 (a) — "the trail with each rung's reason"): the named, PII-free
 * reasons only. A provider's own detail (an error string) is ⛔ persisted.
 */
export const RECORDED_RUNG_DETAILS: ReadonlySet<string> = new Set<string>([
  ...Object.values(SMS_RUNG_DETAIL),
  // Story 5.11b (AC4) — the real send's named outcomes, EXACT literals (⛔ a provider's `<class>:<code>`).
  ...Object.values(ALERT_SMS_RUNG_DETAIL),
  ...Object.values(WHATSAPP_REFUSAL_DETAIL),
  'cost_optimized',
]);

/** The shared durable projection: channels, outcomes and allowlisted reasons; never contact or provider error text.
 *  It takes a REAL record: a caller with none retries the member, ⛔ records an outcome (review round 2 patch review, Q4). */
export function serializeFanOutResult(record: MemberFanOutResult): Record<string, unknown> {
  return {
    delivered: record.delivered,
    outcome: record.delivered ? 'delivered' : 'in_app_only',
    deliveredChannel: record.deliveredChannel,
    bridged: record.bridged,
    costSuppressedChannels: record.costSuppressedChannels,
    telegramMirrored: record.telegramMirrored,
    // Story 5.8b review (P2-1) — read back by the cycle-open child on its retry, which owes the closure (⛔ the push).
    ...(record.bridgeRowOpen ? { bridgeRowOpen: true } : {}),
    trail: record.trail.map(
      (entry) => `${entry.channel}:${String(entry.attempt)}:${entry.outcome}` +
        (entry.detail !== undefined && RECORDED_RUNG_DETAILS.has(entry.detail) ? `:${entry.detail}` : ''),
    ),
  };
}

/**
 * ⭐ I2 — THE ONE predicate for who may receive an alert SMS, as RULED by `2026-10-23-390` Q1 B (Trustee-ratified): a LIT
 * message, when the push rung did not end `sent` AND (the member has NO WhatsApp target — the Pariwar's WhatsApp is off or
 * the member has no ACTIVE yes — OR the WhatsApp rung did not end `sent`, FS3's refusal included). The v1.2 build (`-389`
 * FS2 (a), architecture §3.4 as written) also required a WhatsApp target; the ruling removed it. "Did not end `sent`" is the
 * rung's OWN result — a later "undelivered" report from Meta never re-enters the ladder (recorded, ⛔ widened).
 */
export function isAlertSmsFallbackEligible(input: {
  readonly lit: boolean;
  readonly pushOutcome: ChannelSendOutcome['outcome'] | undefined;
  readonly whatsappTarget: boolean;
  readonly whatsappOutcome: ChannelSendOutcome['outcome'] | undefined;
}): boolean {
  if (!input.lit) return false;
  if (input.pushOutcome === 'sent') return false;
  return !input.whatsappTarget || input.whatsappOutcome !== 'sent';
}

/**
 * ⭐ Story 5.8b (AC6; FS4 (d), FS17 (a)) — THE ONE predicate for who the degraded-mode bridge TEXTS, the counterpart of
 * {@link isAlertSmsFallbackEligible} (code review 2026-10-28, second pass). In the member's terms: *"If the Trust has declared your
 * Pariwar's notifications unreliable and a Super Admin has the bridge texts switched on, you are texted once when a new cycle opens
 * for your pool — whether or not you use the app or WhatsApp — in the language you chose, naming the family you are supporting,
 * unless your own death has been reported to the Trust."* Push, WhatsApp and a WhatsApp yes are ⛔ inputs (the text goes FIRST).
 * Two sites ask it, each with the conjuncts it holds: the producer (`buildCycleOpenAlert` — the declaration, the overlay, the
 * language, the name; the send-time two passed `true`, decided at the send) and the fan-out's (1b) — the block those decided, the
 * target, the switch.
 */
export function isCycleOpenBridgeTextEligible(input: {
  /** The Pariwar was declared degraded at the cycle's freeze — a TIME-CRITICAL cycle-open (`evaluateDegradedModeBridge`). */
  readonly bridged: boolean;
  /** The member's OWN death has been reported (the `account-frozen` overlay — FS4 (d)). */
  readonly deathReported: boolean;
  /** The member's text language (`readMemberTextLanguages`); `null` ⇒ ⛔ passport row. */
  readonly textLanguage: AlertSmsBlock['locale'] | null;
  /** The family's name in the two 30-letter boxes; `null` ⇒ it does not fit even shortened. A box may not be empty. */
  readonly nameBoxes: readonly [string, string] | null;
  /** The member has an SMS target. */
  readonly smsTarget: boolean;
  /** The Super Admin switch is ON (it starts OFF). */
  readonly switchOn: boolean;
}): boolean {
  if (!input.bridged || input.deathReported) return false;
  if (input.textLanguage === null || input.nameBoxes === null) return false;
  if (input.nameBoxes[0] === '' || input.nameBoxes[1] === '') return false;
  return input.smsTarget && input.switchOn;
}

/**
 * The `sms` block a lit producer put on the payload (FS7) — the two variants a lit notice rides, and (Story 5.8b, FS7 (a)) a
 * TIME-CRITICAL `alert_published`: the bridged cycle-open. The contract already refuses a block on a non-time-critical one; the
 * guard is repeated here so a block on any other broadcast is never read (I2 — the fan-out half).
 */
function alertSmsBlock(alert: Alert): AlertSmsBlock | undefined {
  switch (alert.alert_category) {
    case 'deadline_reminder':
    case 'contribution_mismatch':
      return alert.payload_data.sms;
    case 'alert_published':
      return alert.time_critical ? alert.payload_data.sms : undefined;
    default:
      return undefined;
  }
}

/** A switch read that failed, as {@link onceForJob} keeps it: ONE object per job, so the fan-out alarms it once per job. */
class BridgeSwitchReadFault extends Error {
  readonly fault: unknown;
  constructor(fault: unknown) {
    super(String(fault));
    this.name = 'BridgeSwitchReadFault';
    this.fault = fault;
  }
}

/** The switch-read faults already alarmed (code review 2026-10-28, second pass: ONE alarm per job, ⛔ one per member). */
const alarmedSwitchFaults = new WeakSet<object>();

/**
 * Story 5.8b (AC12) — wrap the switch read so ONE job reads it ONCE (the first bridge attempt), however many members it fans out.
 * A throw is kept too: every member of the job sees the same `unavailable` (⛔ a second read), and — code review 2026-10-28 (second
 * pass) — the job's ONE fault object is alarmed ONCE (⛔ per member).
 */
export function onceForJob(read: () => Promise<boolean>): () => Promise<boolean> {
  let memo: Promise<boolean> | undefined;
  return () =>
    (memo ??= read().catch((err: unknown) => {
      throw new BridgeSwitchReadFault(err);
    }));
}

/**
 * Resolve one member's delivery targets + cost-policy inputs (the DB half). Runs under the caller's
 * already-scoped tenant handle. Every Tier-1 decrypt happens inside the relocated `@twt/domain`
 * resolvers — the SAME code the apps/api registration path wrote the ciphertext through.
 */
export async function resolveMemberDeliveryContext(
  db: Parameters<typeof notifications.resolveWaTarget>[0],
  encryption: NotifyEncryptionDeps,
  pariwarIdStr: string,
  memberIdStr: string,
  at: Date,
): Promise<MemberFanOutContext> {
  const pariwarId = ids.pariwarId(pariwarIdStr);
  const memberId = ids.memberId(memberIdStr);
  const [push, whatsapp, sms, telegram, lastEngagementAt] = await Promise.all([
    notifications.resolvePushTargets(db, encryption, pariwarIdStr, 'member', memberIdStr),
    notifications.resolveWaTarget(db, encryption, pariwarId, memberId, at),
    notifications.resolveSmsTarget(db, encryption, pariwarId, memberId),
    notifications.resolveTelegramTarget(db, pariwarId, memberId),
    deviceTokenDomain.getMemberLastEngagementAt(db, memberId),
  ]);
  return {
    targets: { push, whatsapp, sms, telegram },
    // Story 5.7's seam returns the FAIL-SAFE `false` until Epic 10's FR-58C flag subsystem lands.
    // Resolved here (not hardcoded at the decision) so the Epic-10 read is a one-line change.
    costToggleEnabled: false,
    lastEngagementAt,
  };
}

/**
 * Whether the AR-20 degraded-mode SMS bridge applies to this alert.
 *
 * ── Why this reads `time_critical` instead of re-reading the declaration (invariant 6) ──────────────
 * Story 8.1's `openCycleAlert` sets `time_critical: true` on the `alert.published` payload EXACTLY when
 * a `cycle_open_sms_bridge` declaration was active for the Pariwar at the cycle-freeze `committed_at`
 * (project.ts:447-449) — the durable, replay-deterministic instant. `time_critical` is copied verbatim
 * onto the notification alert (AC1), so for a cycle-open alert it IS the resolved bridge signal.
 *
 * Re-reading `degraded_mode_declarations` here would evaluate at notify-time `now()`, which (a) breaks
 * the replay determinism 8.1 deliberately bought, and (b) could bridge or un-bridge a cycle mid-fan-out
 * if a trustee declared/revoked between the freeze and the send. So the bridge input is DERIVED from
 * the payload, exactly as invariant 6 requires for `time_critical` itself. The primitive still owns the
 * decision (it also enforces the cycle-open-only carve-out).
 */
function degradedModeActiveFor(alert: Alert): boolean {
  return alert.time_critical;
}

/** `dispatch`'s honest per-channel outcome for ONE rung, read off the attempt for THAT channel.
 *  (NOT `attempts[0]` — `dispatch` always walks the full `CANONICAL_CHANNEL_LADDER`, so `attempts[0]`
 *  is the `push` entry regardless of which rung we asked for; the non-addressed channels come back
 *  `skipped_no_target`.) */
function outcomeForChannel(
  attempts: readonly { channel: Channel; outcome: ChannelSendOutcome['outcome']; result?: SendResult }[],
  channel: Channel,
): { outcome: ChannelSendOutcome['outcome']; result?: SendResult } {
  const attempt = attempts.find((a) => a.channel === channel);
  // A missing attempt can only mean `dispatch` did not walk this channel, which for a ladder channel is
  // impossible — treat it as an error rather than silently reporting success.
  return attempt ?? { outcome: 'error' };
}

/**
 * Fan ONE alert out to ONE member across the channel ladder (AC1, AC5, AC6). DB-free: every impure
 * input is injected, so the whole composition — bridge-before-cost-opt, the single-rung dispatch calls,
 * stop-at-first-`sent`, multi-device push, the independent Telegram mirror — is exercisable with fakes.
 *
 * Returns the NON-PII outcome record. It NEVER throws for a delivery failure. The caller uses
 * `shouldRetryFanOut` to distinguish a terminal `in_app_only` result from a previously retryable failure.
 */
export async function fanOutAlert(
  deps: ContributionNotifyDeps,
  alert: Alert,
  ctx: MemberFanOutContext,
  /** Story 5.11b (FS9) — this job attempt and the occasion, per CALL (T7). Absent ⇒ the final attempt (F3b's callers). */
  call?: FanOutCall,
): Promise<MemberFanOutResult> {
  const now = deps.now?.() ?? new Date();
  const sleep = deps.sleep ?? realSleep;
  const category = alert.alert_category;
  const providers = deps.resolveProviders
    ? await deps.resolveProviders({ pariwarId: alert.pariwar_id, category })
    : undefined;

  /** ONE `dispatch` call, narrowed to a single channel + target. Everything `dispatch` owns stays
   *  `dispatch`'s: eligibility, provider selection, lifecycle suppression, the honest status mapping,
   *  and both audit families. */
  const dispatchOneChannel = async (
    channel: Channel,
    target: SendTarget,
  ): Promise<{ outcome: ChannelSendOutcome['outcome']; result?: SendResult }> => {
    const outcome = await dispatch(alert, {
      ...(providers ? { providers } : {}),
      resolveDelivery: () => Promise.resolve({ [channel]: target }),
      hashRendered: deps.hashRendered,
      audit: deps.audit,
      // Story 5.11b (I4) — the ONE suppression boundary, on every rung.
      ...(deps.suppression ? { suppression: deps.suppression } : {}),
    });
    return outcomeForChannel(outcome.attempts, channel);
  };

  // ── (1) The AR-20 degraded-mode bridge — evaluated FIRST. Story 5.8b (FS3 (a)): a bridged alert carrying the bridge block is
  //        TEXTED FIRST (below, after cost); the ladder is the fallback. ────────────────────────────────────────────────────────
  const bridge = evaluateDegradedModeBridge({
    category,
    degradedModeActive: degradedModeActiveFor(alert),
  });

  // ── (2) Cost-optimization decides suppression of the two PAID channels ───────────────────────────
  // (A bridged alert is time-critical, so cost-optimization never suppresses it — the AR-18 override.)
  const cost = evaluateCostOptimization({
    category,
    timeCritical: alert.time_critical,
    toggleEnabled: ctx.costToggleEnabled,
    lastEngagementAt: ctx.lastEngagementAt,
    now,
  });
  const costSuppressedChannels: readonly Channel[] = cost.suppressed ? cost.channels : [];
  const suppressed = new Set<Channel>(costSuppressedChannels);
  if (cost.suppressed) {
    // Best-effort, PII-free: category + timestamps + config numbers only.
    await auditCostSuppression(deps.audit, {
      pariwarId: alert.pariwar_id,
      memberId: alert.member_id,
      alertId: alert.alert_id,
      reason: cost.reason,
    });
  }

  // Each rung's own outcome, for the SMS rung's predicate (I2).
  const rungOutcomes = new Map<Channel, ChannelSendOutcome['outcome']>();

  const smsDispatchDeps = {
    ...(providers ? { providers } : {}),
    hashRendered: deps.hashRendered,
    audit: deps.audit,
    ...(deps.suppression ? { suppression: deps.suppression } : {}),
  };

  // ── (1b) Story 5.8b (FS3 (a), AC5) — THE BRIDGE TEXT, FIRST. Only a BRIDGED alert (I2) that carries the block, for a member with
  //        an SMS target, through the injected seam (so THROUGH `dispatch`, carrying `deps.suppression`), with the switch ON. Its
  //        trail entry is recorded FIRST: `shouldRetryFanOut` reads the first `sms` entry (F8 / T19). When it is not tried, the
  //        ladder's SMS rung names why (`bridgeSkip`). ⛔ The WhatsApp window (`whatsappTried: false`) — the bridge does not wait. ──
  let bridgeEntry: CascadeTrailEntry | undefined;
  let bridgeSkip: ChannelSendOutcome = { outcome: 'skipped_no_target' };
  if (bridge.bridged) {
    const block = alertSmsBlock(alert);
    if (!block) {
      bridgeSkip = {
        outcome: 'skipped_no_target',
        detail: call?.bridgeBlockUnavailable ? SMS_RUNG_DETAIL.bridgeBlockUnavailable : SMS_RUNG_DETAIL.notLit,
      };
    } else if (!ctx.targets.sms) bridgeSkip = { outcome: 'skipped_no_target' };
    else if (!deps.alertSms) bridgeSkip = { outcome: 'skipped_no_target', detail: SMS_RUNG_DETAIL.notWired };
    else {
      let switchOn: boolean | 'unavailable';
      try {
        switchOn = deps.readBridgeSwitch ? await deps.readBridgeSwitch() : false;
      } catch (err) {
        switchOn = 'unavailable';
        // Code review 2026-10-28 (second pass): ONE alarm per job — `onceForJob` hands every member the SAME fault object.
        const seen = typeof err === 'object' && err !== null && alarmedSwitchFaults.has(err);
        if (!seen) {
          if (typeof err === 'object' && err !== null) alarmedSwitchFaults.add(err);
          alarmOf(deps)(
            `[jobs] contribution-notify: the degraded-mode bridge switch could not be read for alert ${alert.alert_id} — ⛔ bridge text ` +
              `this attempt (the ladder runs; retried) — ${err instanceof BridgeSwitchReadFault ? String(err.fault) : String(err)}`,
          );
        }
      }
      if (switchOn === 'unavailable') bridgeSkip = { outcome: 'skipped_no_target', detail: SMS_RUNG_DETAIL.bridgeSwitchUnavailable };
      else if (!switchOn) bridgeSkip = { outcome: 'skipped_no_target', detail: SMS_RUNG_DETAIL.bridgeSwitchedOff };
      else if (
        // AC6 — the ONE predicate; the producer decided its conjuncts when it put the block on (the block IS that answer).
        !isCycleOpenBridgeTextEligible({
          bridged: true,
          deathReported: false,
          textLanguage: block.locale,
          nameBoxes: [block.values['member1'] ?? '', block.values['member2'] ?? ''],
          smsTarget: true,
          switchOn: true,
        })
      ) {
        bridgeSkip = { outcome: 'skipped_no_target', detail: SMS_RUNG_DETAIL.notLit };
      } else {
        const texted = await deps.alertSms({
          alert,
          block,
          target: ctx.targets.sms,
          ...(call ? { call } : {}),
          whatsappTried: false,
          dispatch: smsDispatchDeps,
        });
        bridgeEntry = { channel: 'sms', attempt: 0, outcome: texted.outcome, ...(texted.detail !== undefined ? { detail: texted.detail } : {}) };
        bridgeSkip = { outcome: 'skipped_no_target', detail: SMS_RUNG_DETAIL.bridgeAlreadyTried };
      }
    }
  }

  /**
   * Story 5.11 — the SMS rung decides lit / eligible itself and ⛔ dispatches through the category resolver's SMS provider (I3;
   * FS10, FS15).
   *
   * ⭐ Story 5.11b (I4; FS18 (a)) — the boundary 5.11's review (round 2, P3) left DELIBERATELY open is WIRED, not yet enforced: the
   * real send (`deps.alertSms`) goes THROUGH `dispatch` — a one-send provider in a per-call registry — carrying `deps.suppression`,
   * the SAME hook every other rung's dispatch carries, so a member that hook suppresses is ⛔ texted and gets ⛔ send row.
   * ⚠ Code review 2026-10-25 (C2-D4, C4-P1): `apps/jobs/src/boot.ts` injects NO hook — it never did (0 occurrences at the pre-5.11b
   * base) — so production runs `noLifecycleSuppression` for push, WhatsApp AND this SMS until the member-state read model exists.
   * RE-TRIGGER: that read model lands ⇒ inject it into `contributionNotifyDeps` in boot.ts and add a boot pin. The decisions BEFORE
   * the seam (bridge, lit, eligible, a target) are 5.11's, byte for byte.
   */
  const smsRung = async (): Promise<ChannelSendOutcome> => {
    // Story 5.8b — a bridged alert's text was decided at (1b): ⛔ a second text from the ladder.
    if (bridge.bridged) return bridgeSkip;
    const block = alertSmsBlock(alert);
    if (!block) return { outcome: 'skipped_no_target', detail: SMS_RUNG_DETAIL.notLit };
    const eligible = isAlertSmsFallbackEligible({
      lit: true,
      pushOutcome: rungOutcomes.get('push'),
      whatsappTarget: ctx.targets.whatsapp !== null,
      whatsappOutcome: rungOutcomes.get('whatsapp'),
    });
    if (!eligible) return { outcome: 'skipped_no_target', detail: SMS_RUNG_DETAIL.notEligible };
    if (!ctx.targets.sms) return { outcome: 'skipped_no_target' };
    if (!deps.alertSms) return { outcome: 'skipped_no_target', detail: SMS_RUNG_DETAIL.notWired };
    return deps.alertSms({
      alert,
      block,
      target: ctx.targets.sms,
      ...(call ? { call } : {}),
      // FS9 (a) — the Pariwar uses WhatsApp for this member (FS3's refusal included) and that rung did not end `sent`.
      whatsappTried: ctx.targets.whatsapp !== null && rungOutcomes.get('whatsapp') !== 'sent',
      dispatch: smsDispatchDeps,
    });
  };

  // ── (3) The ladder — one attempt per rung, no in-process sleeping, stop at the first `sent` ──────
  const rung = async (channel: Channel): Promise<ChannelSendOutcome> => {
    // 5.7's specified mechanism: the resolver OMITS a suppressed channel's target, so the rung reads
    // as `skipped_no_target` and the cascade advances WITHOUT burning a retry (cascade.ts:47-52).
    if (suppressed.has(channel)) return { outcome: 'skipped_no_target', detail: 'cost_optimized' };
    if (channel === 'sms') return smsRung();
    if (channel === 'push') return sendPushRung(deps, alert, ctx.targets.push, dispatchOneChannel);
    const target = ctx.targets[channel];
    if (!target) return { outcome: 'skipped_no_target' };
    const attempt = await dispatchOneChannel(channel, target);
    return { outcome: attempt.outcome, ...(attempt.result?.detail ? { detail: attempt.result.detail } : {}) };
  };
  const send = async (channel: Channel): Promise<ChannelSendOutcome> => {
    const result = await rung(channel);
    rungOutcomes.set(channel, result.outcome);
    return result;
  };

  let trail: CascadeTrailEntry[];
  let delivered: boolean;
  let deliveredChannel: Channel | null;
  let bridgeRowOpen = false;
  if (bridgeEntry?.outcome === 'sent') {
    // Story 5.8b (FS3 (a)) — the text went: push and WhatsApp are ⛔ run for this alert (it is in the app; the mirror runs below).
    trail = [bridgeEntry];
    delivered = true;
    deliveredChannel = 'sms';
  } else {
    const cascade = await runChannelCascade(send, {
      ladder: CANONICAL_CHANNEL_LADDER,
      backoffMs: [], // D9 — pg-boss owns retry/backoff; no worker ever sleeps one in-process.
      sleep,
    });
    // The bridge entry FIRST (T19 — `shouldRetryFanOut` reads the first `sms` entry).
    trail = bridgeEntry ? [bridgeEntry, ...cascade.trail] : [...cascade.trail];
    // Code review 2026-10-28 (second pass; `-415` item 17 — "when off … the trail names it"): a bridge text NOT tried is named by the
    // ladder's SMS rung (`bridgeSkip`) — but a ladder that delivers before that rung never reaches it. Then the skip leads the trail
    // instead. Retry is unchanged: it is the SAME entry the rung would have recorded, and a delivered member is ⛔ retried anyway.
    if (bridge.bridged && !bridgeEntry && !trail.some((e) => e.channel === 'sms')) {
      trail = [{ channel: 'sms', attempt: 0, ...bridgeSkip }, ...trail];
    }
    delivered = cascade.delivered;
    deliveredChannel = cascade.deliveredChannel;
    // Story 5.8b (FS3.1 (a)) — a rate-limited bridge text leaves its row `deferred`; the ladder DELIVERED, so this member is ⛔
    // retried and nothing would ever end that row — a later re-run that re-claims the member would text one the push already told.
    // ⭐ Review P2-1: the row may come from an EARLIER attempt — this one's text may not have been tried at all (the switch now OFF or
    // unreadable, a Secret Manager blip, the send state unavailable) — so ANY ladder delivery of a bridged alert closes it, whatever
    // this attempt's bridge entry says (⛔ row ⇒ the terminal row below). A closure that fails through the seam's tries is REPORTED
    // (`bridgeRowOpen`): the job keeps it and retries ONLY the closure (the push is ⛔ repeated — the claim stays recorded).
    // ⭐ Code review 2026-10-28 (second pass), was Decision 2 (a): with ⛔ row at all, the seam writes a TERMINAL one, so F9's re-fan
    // (bridged again — FS10) ⛔ texts once the cause clears. And a member recorded TERMINALLY without delivery (⛔ retried — the switch
    // now OFF, the final attempt) closes an earlier `deferred` row too — ⛔ a new row: they were ⛔ told, a later re-fan may text them.
    if (bridge.bridged && deps.alertSms?.giveUpDeferred) {
      if (delivered) {
        const closure = await deps.alertSms.giveUpDeferred({ alert, ...(call ? { call } : {}) });
        // Fix review (2026-10-28): ⛔ block on a FAILED overlay read ⇒ the terminal row could not be written (its language is the
        // block's) — OWED, so the job's retry writes it once the read is back (⛔ a later re-fan texting a member the push told).
        bridgeRowOpen = closure === 'failed' || (closure === 'none' && call?.bridgeBlockUnavailable === true);
      } else {
        const terminal = !shouldRetryFanOut({ memberId: alert.member_id, delivered, deliveredChannel, trail, bridged: true, costSuppressedChannels, telegramMirrored: false }, ctx, call);
        if (terminal) {
          bridgeRowOpen = (await deps.alertSms.giveUpDeferred({ alert, ...(call ? { call } : {}), ladder: 'in_app_only' })) === 'failed';
        }
      }
    }
  }

  // ── (4) The Telegram mirror — INDEPENDENT of the ladder, fire-and-forget ─────────────────────────
  // Eligible for `alert_published` only among this story's three categories (dispatch.ts:44-52), so a
  // deadline reminder / contribution confirmation is never mirrored to a group channel. A failure here
  // changes neither `delivered` nor `deliveredChannel` — it is not a rung.
  //
  // ⚠ FR-73 / Story 10.8: the `telegram_mirror` FEATURE FLAG IS REGISTERED BUT NOT READ HERE.
  // The flag exists in `FLAG_DEFAULTS` and is admitted to the capability bar (`governance_boundary
  // .yaml`), so the behaviour is attested — but Story 10.8 Decision 8 deliberately wired exactly ONE
  // consumer (the FR-2 DigiLocker seam) and left this one at its fail-safe default: category
  // eligibility alone decides, exactly as before the flag subsystem existed. Do NOT assume flipping
  // `telegram_mirror` changes anything today; it does not reach this code.
  // Re-trigger: the story that first drives a live Telegram mirror dispatch — read the flag here
  // following the `kyc/manual-fallback-seam.ts` pattern (source-keyed, NOT a naive
  // `decision.enabled`), keeping this fail-safe default. Recorded in `deferred-work.md`.
  let telegramMirrored = false;
  const telegramTarget = ctx.targets.telegram;
  if (telegramTarget && isCategoryEligible('telegram', category)) {
    try {
      await dispatchOneChannel('telegram', telegramTarget);
      telegramMirrored = true;
    } catch (err) {
      alarmOf(deps)(
        `[jobs] contribution-notify: telegram mirror failed for alert ${alert.alert_id} — ${String(err)} ` +
          `(side-channel only; the ladder outcome is unaffected)`,
      );
    }
  }

  return {
    memberId: alert.member_id,
    delivered,
    deliveredChannel,
    trail,
    bridged: bridge.bridged,
    costSuppressedChannels,
    telegramMirrored,
    ...(bridgeRowOpen ? { bridgeRowOpen: true as const } : {}),
  };
}

/**
 * The `push` rung over a member's MANY devices (AC6). The frozen `DeliveryResolver` returns ONE target
 * per channel, so multi-device is resolved HERE rather than by changing the port: every active device
 * is dispatched to, and the rung counts as `sent` if ANY device accepted — a member with a dead old
 * token and a live current one must NOT cascade to the paid channels.
 *
 * A device whose rejection classifies as an UNRECOVERABLE token error feeds the shipped invalidation
 * seam. The classification is `@twt/channels`' `isUnrecoverableTokenRejection` and the write is
 * `@twt/domain`'s `invalidatePushToken` — both REUSED, never re-classified or re-implemented here.
 */
async function sendPushRung(
  deps: ContributionNotifyDeps,
  alert: Alert,
  devices: readonly SendTarget[],
  dispatchOneChannel: (
    channel: Channel,
    target: SendTarget,
  ) => Promise<{ outcome: ChannelSendOutcome['outcome']; result?: SendResult }>,
): Promise<ChannelSendOutcome> {
  if (devices.length === 0) return { outcome: 'skipped_no_target' };

  let anySent = false;
  let lastOutcome: ChannelSendOutcome['outcome'] = 'error';
  let lastDetail: string | undefined;

  for (const device of devices) {
    try {
      const attempt = await dispatchOneChannel('push', device);
      lastOutcome = attempt.outcome;
      lastDetail = attempt.result?.detail;
      if (attempt.outcome === 'sent') {
        anySent = true;
        continue;
      }
      if (attempt.result && isUnrecoverableTokenRejection(attempt.result)) {
        // Best-effort + isolated: a broken invalidation write never poisons the send path (AI-4-3(d)).
        await notifications.invalidatePushToken(
          { serviceDb: deps.serviceDb, servicePool: deps.pool, encryption: deps.encryption },
          alert.pariwar_id,
          device,
          { provider: attempt.result.provider, detail: attempt.result.detail },
        );
      }
    } catch (err) {
      // ONE device throwing (the dispatch call itself, or the best-effort invalidation write) must
      // never skip the member's REMAINING devices — a dead old token must not cost a live current one
      // its chance to deliver. Recorded as the last outcome for this rung; the loop continues.
      lastOutcome = 'error';
      lastDetail = String(err);
      alarmOf(deps)(
        `[jobs] contribution-notify: push rung failed for one device of member ${alert.member_id} — ` +
          `${String(err)} (trying remaining devices)`,
      );
    }
  }

  if (anySent) return { outcome: 'sent' };
  return { outcome: lastOutcome, ...(lastDetail ? { detail: lastDetail } : {}) };
}

function alarmOf(deps: ContributionNotifyDeps): (message: string) => void {
  return deps.onAlarm ?? ((m: string): void => console.warn(m));
}

/**
 * Story 5.11 review R1, option 1 — preserve the previous retry set without driving either fixture.
 * An available, unsuppressed SMS target previously reached the accepting SMS fixture. FS3's named
 * WhatsApp refusals previously reached the accepting WA fixture instead; they are also terminal.
 * (The old bridge bypassed WA and cost policy, so only its SMS target could complete that path — Story 5.8b removed that arm.)
 * Everyone else whose ladder exhausted still retries, including a missing/decrypt-failed mobile or
 * cost-suppressed SMS. Broadcast callers release these claims and add NO job retry — a re-run of the job would try them.
 * ⭐ Story 5.11b (FS9 (a)) — a REAL send's retry classes (`ALERT_SMS_RETRYABLE_DETAILS`: §3.4's WhatsApp window, `rate_limited`,
 * a send in flight, the send state unavailable, a Secret Manager transient) put the member back on the retry set until the
 * FINAL attempt, where they are recorded `in_app_only`. Every other result follows the rule above, byte for byte (`call` absent
 * ⇒ the final attempt — F3b's callers, which carry ⛔ `sms` block, never reach a seam detail).
 */
export function shouldRetryFanOut(result: MemberFanOutResult, ctx: MemberFanOutContext, call?: FanOutCall): boolean {
  if (result.delivered) return false;
  const smsDetail = result.trail.find((entry) => entry.channel === 'sms')?.detail;
  if (smsDetail !== undefined && ALERT_SMS_RETRYABLE_DETAILS.has(smsDetail)) return !isFinalFanOutAttempt(call);
  // Story 5.8b — the switch could not be read: ⛔ a silent drop of the bridge text — retried like a send state that is unavailable.
  if (smsDetail === SMS_RUNG_DETAIL.bridgeSwitchUnavailable) return !isFinalFanOutAttempt(call);
  // Fix review (2026-10-28) — a FAILED death-overlay read omitted the block: retried the same way (⛔ a fresh `deferred` row closed).
  if (smsDetail === SMS_RUNG_DETAIL.bridgeBlockUnavailable) return !isFinalFanOutAttempt(call);
  // ⭐ Story 5.8b (FS9 (a), `2026-10-28-415` — `-394` item 1's bridged clause superseded in part): the bridged arm
  // (`if (result.bridged) return ctx.targets.sms === null;`) is REMOVED. A bridged member's retry follows the retry classes above and
  // the ordinary rule below; the one case it changes — a bridged member with ⛔ SMS target and a named WhatsApp refusal — is terminal.
  if (ctx.targets.sms !== null && !result.costSuppressedChannels.includes('sms')) return false;
  const refusedWhatsapp = result.trail.some(
    (entry) => entry.channel === 'whatsapp' && entry.outcome === 'rejected' &&
      (entry.detail === WHATSAPP_REFUSAL_DETAIL.templateNotApproved || entry.detail === WHATSAPP_REFUSAL_DETAIL.credentialsMissing),
  );
  return !refusedWhatsapp;
}

/**
 * Run the fan-out for a whole chunk of members under ONE tenant scope. Returns the per-member records
 * plus the ids to RETRY — the caller throws on a non-empty `retry` set so pg-boss retries (D9).
 * Only delivered and terminal `in_app_only` members are recorded in the idempotency store.
 *
 * ⭐ Story 5.11 (FS14 (a), review R1 option 1): former fixture successes become `in_app_only`;
 * previously retryable failures remain on `retry`, as determined by `shouldRetryFanOut` (I4).
 *
 * A single member's unexpected THROW never aborts the batch: it is alarmed and put on `retry`, so one
 * corrupt row cannot cost the other members in the chunk their notification.
 */
export async function fanOutAlertToMembers(
  deps: ContributionNotifyDeps,
  alertFor: (memberId: string) => Alert,
  memberIds: readonly string[],
  pariwarId: string,
  at: Date,
  /** Story 5.11b (FS9) — the job attempt and the occasion, per CALL (T7). Absent ⇒ the final attempt (F3b's callers). */
  call?: FanOutCall,
): Promise<{ results: MemberFanOutResult[]; retry: string[] }> {
  const alarm = alarmOf(deps);
  const results: MemberFanOutResult[] = [];
  const retry: string[] = [];

  for (const memberId of memberIds) {
    try {
      const ctx = await withPariwarScope(deps.pool, pariwarId, (db) =>
        resolveMemberDeliveryContext(db, deps.encryption, pariwarId, memberId, at),
      );
      const result = await fanOutAlert(deps, alertFor(memberId), ctx, call);
      results.push(result);
      if (shouldRetryFanOut(result, ctx, call)) retry.push(memberId);
    } catch (err) {
      // One member's failure must never cost the rest of the chunk their notification. It IS put on
      // `retry`, so the caller still throws and pg-boss still retries this member.
      alarm(
        `[jobs] contribution-notify: fan-out failed for one member of pariwar ${pariwarId} — ${String(err)} ` +
          `(batch continues; the member is retried)`,
      );
      retry.push(memberId);
    }
  }

  return { results, retry };
}
