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
//      declaration) we force SMS only and BYPASS BOTH cost-optimization AND the ladder — that is the
//      AR-20 carve-out to RA-29's no-bulk-SMS rule, not a ladder run (degraded-mode.ts:15-23).
//   2. Otherwise `evaluateCostOptimization` decides suppression of the two PAID channels. The
//      mechanism is the one 5.7 specifies: the resolver OMITS the suppressed channels' targets
//      ("the future live fan-out drives it by omitting the suppressed cost-channels' targets",
//      cost-optimization.ts:10-11). Push is never suppressible and never suppressed.
//   3. `runChannelCascade(send, { backoffMs: [], sleep })` — stop at the first `sent`. Each rung is
//      ONE `dispatch` call with a `DeliveryResolver` narrowed to that single channel, so category
//      eligibility, fcm-vs-apns provider selection, lifecycle suppression, the honest outcome mapping
//      and BOTH audit families all stay `dispatch`'s job. The composition never re-implements them.
//   4. The Telegram mirror fires INDEPENDENTLY of the ladder — fire-and-forget, only when
//      `isCategoryEligible('telegram', category)`. A Telegram failure never changes `delivered` or
//      `deliveredChannel` (dispatch.ts:44-52 owns the eligibility; cascade.ts owns "Telegram is
//      INDEPENDENT").
//
// ── D9: no worker ever sleeps a backoff in-process ──────────────────────────────────────────────────
// `DEFAULT_SMS_BACKOFF_MS` is 30s/5m/30m and `runChannelCascade` sleeps it IN-PROCESS — at 4L members
// that would hold a worker 35+ minutes per undelivered member. So the ladder runs with `backoffMs: []`
// (one attempt per rung, no sleeping) and retry-with-backoff is delegated to pg-boss's own job retry:
// a member whose whole ladder came back undelivered makes the job THROW. `cascade.ts:14-17` anticipates
// exactly this ("a plain array so a later DURABLE (pg-boss) adapter is thin").
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

import type { Alert, AlertCategory } from '@twt/contracts';
import {
  CANONICAL_CHANNEL_LADDER,
  DEGRADED_MODE_BRIDGE_CHANNELS,
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
  /** `true` when the AR-20 degraded-mode SMS bridge fired (ladder + cost-opt both bypassed). */
  readonly bridged: boolean;
  /** The paid channels cost-optimization omitted for this member (never includes `push`). */
  readonly costSuppressedChannels: readonly Channel[];
  /** `true` when the Telegram mirror was category-eligible AND a chat id was on file. */
  readonly telegramMirrored: boolean;
}

const realSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

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
 * Returns the NON-PII outcome record. It NEVER throws for a delivery failure: the CALLER decides
 * whether an undelivered member should fail the job (it should — that is how pg-boss owns the backoff).
 */
export async function fanOutAlert(
  deps: ContributionNotifyDeps,
  alert: Alert,
  ctx: MemberFanOutContext,
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
    });
    return outcomeForChannel(outcome.attempts, channel);
  };

  // ── (1) The AR-20 degraded-mode bridge — evaluated FIRST, and it bypasses the ladder entirely ─────
  const bridge = evaluateDegradedModeBridge({
    category,
    degradedModeActive: degradedModeActiveFor(alert),
  });

  let trail: CascadeTrailEntry[] = [];
  let delivered = false;
  let deliveredChannel: Channel | null = null;
  let costSuppressedChannels: readonly Channel[] = [];

  if (bridge.bridged) {
    // Force-send SMS to every eligible member regardless of engagement AND regardless of the tier
    // ladder — it does NOT wait for push/WA to fail; that is the whole point of a bridge during
    // infrastructure degradation. Cost-optimization is not consulted at all on this path.
    for (const channel of DEGRADED_MODE_BRIDGE_CHANNELS) {
      const target = ctx.targets[channel];
      const attempt = target
        ? await dispatchOneChannel(channel, target)
        : ({ outcome: 'skipped_no_target' } as const);
      trail.push({ channel, attempt: 0, outcome: attempt.outcome });
      if (attempt.outcome === 'sent') {
        delivered = true;
        deliveredChannel = channel;
      }
    }
  } else {
    // ── (2) Cost-optimization decides suppression of the two PAID channels ─────────────────────────
    const cost = evaluateCostOptimization({
      category,
      timeCritical: alert.time_critical,
      toggleEnabled: ctx.costToggleEnabled,
      lastEngagementAt: ctx.lastEngagementAt,
      now,
    });
    const suppressed = new Set<Channel>(cost.suppressed ? cost.channels : []);
    if (cost.suppressed) {
      costSuppressedChannels = cost.channels;
      // Best-effort, PII-free: category + timestamps + config numbers only.
      await auditCostSuppression(deps.audit, {
        pariwarId: alert.pariwar_id,
        memberId: alert.member_id,
        alertId: alert.alert_id,
        reason: cost.reason,
      });
    }

    // ── (3) The ladder — one attempt per rung, no in-process sleeping, stop at the first `sent` ────
    const send = async (channel: Channel): Promise<ChannelSendOutcome> => {
      // 5.7's specified mechanism: the resolver OMITS a suppressed channel's target, so the rung reads
      // as `skipped_no_target` and the cascade advances WITHOUT burning a retry (cascade.ts:47-52).
      if (suppressed.has(channel)) return { outcome: 'skipped_no_target', detail: 'cost_optimized' };
      if (channel === 'push') return sendPushRung(deps, alert, ctx.targets.push, dispatchOneChannel);
      const target = ctx.targets[channel];
      if (!target) return { outcome: 'skipped_no_target' };
      const attempt = await dispatchOneChannel(channel, target);
      return { outcome: attempt.outcome, ...(attempt.result?.detail ? { detail: attempt.result.detail } : {}) };
    };

    const cascade = await runChannelCascade(send, {
      ladder: CANONICAL_CHANNEL_LADDER,
      backoffMs: [], // D9 — pg-boss owns retry/backoff; no worker ever sleeps one in-process.
      sleep,
    });
    trail = [...cascade.trail];
    delivered = cascade.delivered;
    deliveredChannel = cascade.deliveredChannel;
  }

  // ── (4) The Telegram mirror — INDEPENDENT of the ladder, fire-and-forget ─────────────────────────
  // Eligible for `alert_published` only among this story's three categories (dispatch.ts:44-52), so a
  // deadline reminder / contribution confirmation is never mirrored to a group channel. A failure here
  // changes neither `delivered` nor `deliveredChannel` — it is not a rung.
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
 * Run the fan-out for a whole chunk of members under ONE tenant scope. Returns the per-member records
 * plus the ids that ended UNDELIVERED — the caller throws on a non-empty undelivered set so pg-boss
 * retries (D9), while every member who DID deliver is already recorded in the idempotency store and is
 * therefore never re-sent by that retry.
 *
 * A single member's unexpected THROW never aborts the batch: it is alarmed and recorded as undelivered,
 * so one corrupt row cannot cost the other members in the chunk their notification.
 */
export async function fanOutAlertToMembers(
  deps: ContributionNotifyDeps,
  alertFor: (memberId: string) => Alert,
  memberIds: readonly string[],
  pariwarId: string,
  at: Date,
): Promise<{ results: MemberFanOutResult[]; undelivered: string[] }> {
  const alarm = alarmOf(deps);
  const results: MemberFanOutResult[] = [];
  const undelivered: string[] = [];

  for (const memberId of memberIds) {
    try {
      const ctx = await withPariwarScope(deps.pool, pariwarId, (db) =>
        resolveMemberDeliveryContext(db, deps.encryption, pariwarId, memberId, at),
      );
      const result = await fanOutAlert(deps, alertFor(memberId), ctx);
      results.push(result);
      if (!result.delivered) undelivered.push(memberId);
    } catch (err) {
      // One member's failure must never cost the rest of the chunk their notification. It IS recorded
      // as undelivered, so the caller still throws and pg-boss still retries this member.
      alarm(
        `[jobs] contribution-notify: fan-out failed for one member of pariwar ${pariwarId} — ${String(err)} ` +
          `(batch continues; the member is recorded undelivered and retried)`,
      );
      undelivered.push(memberId);
    }
  }

  return { results, undelivered };
}
