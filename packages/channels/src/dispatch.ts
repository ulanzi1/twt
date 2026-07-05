// packages/channels/src/dispatch.ts
//
// The central dispatcher — Story 5.1 (AC3, AC4, AC7). Takes an `Alert`, deep-freezes it, and fans it out
// across the three-tier channel ladder. It is deliberately POLICY-AGNOSTIC: cost-optimization (5.7) and
// the degraded-mode SMS bridge (5.8) WRAP `dispatch`, they do not live inside it. Retry / backoff /
// cascade-on-failure (5.6) also WRAP the per-channel send seam without re-sequencing the canonical order
// or changing `dispatch`'s public shape.
//
// Three ownership boundaries this file must not blur (Dev Notes):
//   1. CHANNEL ORDER is dispatcher-owned + FIXED — the `CANONICAL_CHANNEL_LADDER` const tuple, iterated
//      directly. NEVER derived from object-key / Map / config enumeration. Providers plug INTO the order.
//   2. DETERMINISM covers RENDER only — `render` is byte-identical + CI-gated; `send` is non-deterministic
//      and outside the guarantee.
//   3. LIFECYCLE SUPPRESSION lives ONLY here — `dispatch` is the single suppression boundary. Story 5.1
//      ships only the extension point (`LifecycleSuppressionHook`); the member-state read model is not yet
//      part of this primitive. No caller, renderer, provider, or downstream story (5.2–5.9, Epic 6/8) may
//      reimplement suppression independently.

import { Alert, type AlertCategory } from '@twt/contracts';

import type { AuditPort, RenderedMessageHash } from './audit.js';
import { alertPayloadDigest } from './audit.js';
import { deepFreeze, isFrozenMutationError } from './freeze.js';
import type { Channel, ChannelProvider, ProviderId, RenderedMessage, SendResult, SendTarget } from './provider.js';
import { DEFAULT_PROVIDER_REGISTRY } from './providers/index.js';
import { render as defaultRender, type RenderableAlert } from './render.js';

/**
 * THE canonical channel iteration order (AC3) — the three-tier fallback ladder, declared as ONE fixed
 * `const` tuple. Fan-out iterates THIS. It MUST NOT be derived from object-key / Map / config order (all
 * re-orderable / non-obvious). Downstream stories (5.2–5.6) add real providers at these fixed positions;
 * they never re-sequence the tuple. Guarded by a unit test (tests/dispatch.test.ts).
 */
export const CANONICAL_CHANNEL_LADDER = ['push', 'whatsapp', 'sms'] as const;

/**
 * The Telegram mirror is a PARALLEL fire-and-forget side-channel — NOT part of the fallback ladder. It
 * never affects ladder ordering or outcome (there is no cascade in 5.1; 5.6's cascade will iterate only
 * `CANONICAL_CHANNEL_LADDER` and leave Telegram independent). Announcements-only (see eligibility below).
 */
export const TELEGRAM_SIDE_CHANNEL = 'telegram' as const;

/**
 * Categories Telegram is eligible for (AC3 — announcements-only, architecture §3.4 privacy posture).
 * Per-member / per-claim categories (`contribution_confirmed`, `helpdesk_reply`, `claim_status_change`,
 * `contribution_mismatch`, `deadline_reminder`, `step_up_otp`) are NOT eligible for Telegram.
 */
const TELEGRAM_ELIGIBLE_CATEGORIES: ReadonlySet<AlertCategory> = new Set<AlertCategory>([
  'alert_published',
  'module_new',
  'niyamavali_amended',
]);

/** Per-channel category eligibility. Only Telegram is constrained in 5.1 (the AC3-mandated gate). */
export function isCategoryEligible(channel: Channel, category: AlertCategory): boolean {
  if (channel === TELEGRAM_SIDE_CHANNEL) return TELEGRAM_ELIGIBLE_CATEGORIES.has(category);
  return true;
}

/**
 * The lifecycle-suppression hook — the dispatcher's SOLE suppression boundary (AC3). Story 5.1 ships only
 * this extension point; the member-state read model (frozen-account push suppression, architecture §3.4)
 * is not part of this primitive. `noLifecycleSuppression` is the default. When the read model lands, a real
 * hook is injected HERE and nowhere else.
 */
export type LifecycleSuppressionDecision =
  | { readonly suppressed: false }
  | { readonly suppressed: true; readonly reason: string; readonly channels: readonly Channel[] | 'all' };
export type LifecycleSuppressionHook = (alert: RenderableAlert) => Promise<LifecycleSuppressionDecision>;

/** Default suppression hook: suppress nothing. The deferral seam — replaced when member-state reads land. */
export const noLifecycleSuppression: LifecycleSuppressionHook = () => Promise.resolve({ suppressed: false });

/** Resolves which channels are enabled for this alert + their opaque recipient targets (delivery seam). */
export type DeliveryResolver = (alert: RenderableAlert) => Promise<Partial<Record<Channel, SendTarget>>>;

/** The renderer seam — defaults to the in-package pure `render`; 5.2 may refine per-channel copy here. */
export type RenderFn = (alert: RenderableAlert, channel: Channel) => RenderedMessage;

export interface DispatchDeps {
  /** Channel → transport provider(s). Defaults to the stub registry; 5.2–5.6 swap in real providers. */
  readonly providers?: Readonly<Record<Channel, readonly ChannelProvider[]>>;
  /** Which channels are enabled + their targets (admin toggle / member opt-in / device tokens). */
  readonly resolveDelivery: DeliveryResolver;
  /** PII-safe HMAC of the rendered message for the per-channel audit line (AI-4-3(c)). */
  readonly hashRendered: RenderedMessageHash;
  /** Audit sink (one call per line). Never throws into dispatch. */
  readonly audit: AuditPort;
  /** Lifecycle-suppression hook — the SOLE suppression boundary. Defaults to `noLifecycleSuppression`. */
  readonly suppression?: LifecycleSuppressionHook;
  /**
   * Renderer override — defaults to the gated pure `render`. Injectable for downstream per-channel
   * renderer refinement (5.2) and to exercise the AC4 P0 mutation-violation path in tests. An override
   * carries its OWN determinism obligation (the AC5 gate covers the default renderer).
   */
  readonly render?: RenderFn;
}

/**
 * The outcome of one channel attempt (ordering-preserving; the ladder then the side-channel). `outcome`
 * is HONEST about delivery: it maps the provider's `SendResult.status` (`sent` ONLY for `accepted`;
 * `rejected`/`not_implemented` pass through) — a 5.6 cascade keying on `outcome` must never treat a
 * rejected or stubbed send as a success.
 */
export interface ChannelAttempt {
  readonly channel: Channel;
  readonly outcome:
    | 'sent'
    | 'rejected'
    | 'not_implemented'
    | 'skipped_ineligible'
    | 'skipped_no_target'
    | 'suppressed'
    | 'error';
  readonly provider?: ProviderId;
  readonly result?: SendResult;
  readonly renderedHash?: string;
  /** Why: the suppression hook's `reason` (outcome `suppressed`) or the error summary (outcome `error`). */
  readonly reason?: string;
}

export interface DispatchOutcome {
  readonly alertId: string;
  readonly payloadDigest: string;
  /** Attempts in canonical order: push, whatsapp, sms, then the telegram side-channel. */
  readonly attempts: readonly ChannelAttempt[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Map the stub/real send status to an audit-friendly HTTP-equivalent status (100–599). */
function sendStatusToHttp(status: SendResult['status']): number {
  switch (status) {
    case 'accepted':
      return 202;
    case 'rejected':
      return 400;
    case 'not_implemented':
      return 501;
  }
}

/** SendResult.status → the honest ChannelAttempt outcome (never claim `sent` for a non-accepted send). */
function sendStatusToOutcome(status: SendResult['status']): ChannelAttempt['outcome'] {
  switch (status) {
    case 'accepted':
      return 'sent';
    case 'rejected':
      return 'rejected';
    case 'not_implemented':
      return 'not_implemented';
  }
}

/** A one-line, PII-free error summary for the attempt record (never the full stack / payload). */
function errorSummary(err: unknown): string {
  return err instanceof Error ? `${err.name}: ${err.message}` : String(err);
}

/**
 * Select the transport provider for a channel; push resolves fcm (Android) vs apns (iOS) by target. An
 * explicit iOS target with no `apns` provider registered FAILS (outcome `error`) rather than silently
 * falling back to FCM — an APNs device token sent to the wrong transport is an undebuggable no-op.
 */
function selectProvider(
  channel: Channel,
  target: SendTarget,
  registry: Readonly<Record<Channel, readonly ChannelProvider[]>>,
): ChannelProvider {
  const candidates = registry[channel];
  if (!candidates || candidates.length === 0) {
    throw new Error(`dispatch: no provider registered for channel '${channel}'`);
  }
  if (channel === 'push' && target.platform === 'ios') {
    const apns = candidates.find((p) => p.id === 'apns');
    if (!apns) {
      throw new Error(`dispatch: iOS push target but no 'apns' provider registered for channel 'push'`);
    }
    return apns;
  }
  return candidates[0]!;
}

/**
 * Dispatch an alert across the enabled channels in canonical order (AC3). Validates the payload at entry
 * (fail fast — a schema-invalid alert must never deliver, least of all with its audit writes silently
 * failing schema validation inside the swallowing audit port), deep-freezes it before any renderer runs
 * (AC4), writes one dispatch audit line + one per channel send (AC7), and returns the ordered per-channel
 * outcome. Per-channel failures are ISOLATED: a throwing renderer/provider/hasher marks THAT channel
 * `error` — the remaining channels still run and the dispatch line is always written. Policy-agnostic —
 * no cost-opt, no cascade, no degraded bridge.
 */
export async function dispatch(alert: Alert, deps: DispatchDeps): Promise<DispatchOutcome> {
  // Validate at the dispatch boundary (review decision 2026-07-05). Throws ZodError on invalid input.
  const parsed = Alert.parse(alert);

  // (AC4) Immutability-after-dispatch: freeze the payload BEFORE any renderer can touch it. `parse`
  // returns a validated COPY, so the freeze binds the copy every renderer sees (the caller's original
  // object is not frozen — renderers can never receive it).
  const frozen = deepFreeze(parsed) as RenderableAlert;

  const registry = deps.providers ?? DEFAULT_PROVIDER_REGISTRY;
  const suppressHook = deps.suppression ?? noLifecycleSuppression;
  const renderFn = deps.render ?? defaultRender;
  const payloadDigest = alertPayloadDigest(frozen);

  // (AC3) Lifecycle suppression — consulted HERE and nowhere else.
  const decision = await suppressHook(frozen);
  const suppressed = new Set<Channel>(
    decision.suppressed
      ? decision.channels === 'all'
        ? [...CANONICAL_CHANNEL_LADDER, TELEGRAM_SIDE_CHANNEL]
        : decision.channels
      : [],
  );
  const suppressionReason = decision.suppressed ? decision.reason : undefined;

  const delivery = await deps.resolveDelivery(frozen);

  const ctx: AttemptCtx = { registry, delivery, suppressed, suppressionReason, renderFn, deps, payloadDigest };

  // (AC3) The Telegram mirror starts CONCURRENTLY with the ladder — a parallel fire-and-forget
  // side-channel. `attemptChannel` never rejects (all failures collapse to outcome `error`), so Telegram
  // can never affect ladder ordering or outcome; it is awaited only so its outcome lands in the record.
  const telegramAttempt = attemptChannel(TELEGRAM_SIDE_CHANNEL, frozen, ctx);

  const attempts: ChannelAttempt[] = [];
  // Iterate the FIXED tuple — order is dispatcher-owned, never key/config order. In 5.1 there is no
  // cascade, so each enabled channel is attempted independently.
  for (const channel of CANONICAL_CHANNEL_LADDER) {
    attempts.push(await attemptChannel(channel, frozen, ctx));
  }
  attempts.push(await telegramAttempt);

  // (AC7) ONE dispatch audit line: payload digest + EVERY channel with its honest outcome (attempted,
  // skipped, suppressed, errored — never a sent-only filter; a suppressed or failed channel must be
  // forensically visible from the dispatch line).
  const channelOutcomes = attempts.map((a) => `${a.channel}:${a.outcome}`).join(',');
  await auditBestEffort(deps.audit, {
    pariwarId: frozen.pariwar_id,
    actorId: UUID_RE.test(frozen.created_by_actor) ? frozen.created_by_actor : null,
    actorRole: null,
    action: 'alert.dispatch',
    resourceLocator: `alert:${frozen.alert_id};channels=${channelOutcomes}`,
    requestPayloadHash: payloadDigest,
    responseStatus: 200,
    traceId: frozen.alert_id,
  });

  return { alertId: frozen.alert_id, payloadDigest, attempts };
}

interface AttemptCtx {
  readonly registry: Readonly<Record<Channel, readonly ChannelProvider[]>>;
  readonly delivery: Partial<Record<Channel, SendTarget>>;
  readonly suppressed: ReadonlySet<Channel>;
  readonly suppressionReason: string | undefined;
  readonly renderFn: RenderFn;
  readonly deps: DispatchDeps;
  readonly payloadDigest: string;
}

/**
 * Attempt ONE channel. NEVER rejects — every failure collapses to outcome `error` (with a one-line
 * `reason`) so one channel's transport/KMS/renderer fault can never abort the remaining ladder channels
 * or lose the dispatch audit line (the critical review finding: a rejection here used to skip BOTH).
 */
async function attemptChannel(channel: Channel, frozen: RenderableAlert, ctx: AttemptCtx): Promise<ChannelAttempt> {
  // Category eligibility (Telegram announcements-only, AC3).
  if (!isCategoryEligible(channel, frozen.alert_category)) {
    return { channel, outcome: 'skipped_ineligible' };
  }
  // Lifecycle suppression (the sole boundary, consulted upstream). The hook's `reason` is carried on the
  // attempt so "why did this member get nothing" is answerable from the dispatch record.
  if (ctx.suppressed.has(channel)) {
    return { channel, outcome: 'suppressed', reason: ctx.suppressionReason };
  }
  // Delivery: a channel with no resolved target is not enabled / not opted-in.
  const target = ctx.delivery[channel];
  if (!target) {
    return { channel, outcome: 'skipped_no_target' };
  }

  // (AC4) RENDER the frozen payload. A renderer that ATTEMPTS to mutate the frozen alert throws in strict
  // mode; that is a P0 architectural violation — audit it and mark the channel errored. Any OTHER renderer
  // throw is a plain per-channel error (isolated, not rethrown).
  let rendered: RenderedMessage;
  try {
    rendered = ctx.renderFn(frozen, channel);
  } catch (err) {
    if (isFrozenMutationError(err)) {
      await auditBestEffort(ctx.deps.audit, {
        pariwarId: frozen.pariwar_id,
        actorId: null,
        actorRole: null,
        action: 'alert.immutability_violation',
        resourceLocator: `alert:${frozen.alert_id};channel=${channel}`,
        requestPayloadHash: ctx.payloadDigest,
        responseStatus: 500,
        traceId: frozen.alert_id,
      });
      return { channel, outcome: 'error', reason: `immutability_violation: ${errorSummary(err)}` };
    }
    return { channel, outcome: 'error', reason: `render: ${errorSummary(err)}` };
  }

  let provider: ChannelProvider;
  try {
    provider = selectProvider(channel, target, ctx.registry);
  } catch (err) {
    return { channel, outcome: 'error', reason: `provider: ${errorSummary(err)}` };
  }

  let result: SendResult;
  try {
    result = await provider.send(rendered, target);
  } catch (err) {
    return { channel, outcome: 'error', provider: provider.id, reason: `send: ${errorSummary(err)}` };
  }

  // (AC7 / AI-4-3(c)) per-channel audit line — HMAC of the rendered message, never raw PII. A hasher (KMS)
  // failure AFTER a successful send must not abort the ladder: the message is already out — record the
  // channel as errored (the dispatch line carries `channel:error`) rather than losing the whole trail.
  let renderedHash: string;
  try {
    renderedHash = await ctx.deps.hashRendered(rendered, frozen.pariwar_id);
  } catch (err) {
    return { channel, outcome: 'error', provider: provider.id, result, reason: `hashRendered: ${errorSummary(err)}` };
  }
  await auditBestEffort(ctx.deps.audit, {
    pariwarId: frozen.pariwar_id,
    actorId: null,
    actorRole: null,
    action: 'alert.channel_send',
    resourceLocator: `alert:${frozen.alert_id};channel=${channel};provider=${provider.id}`,
    requestPayloadHash: renderedHash,
    responseStatus: sendStatusToHttp(result.status),
    traceId: frozen.alert_id,
  });

  return { channel, outcome: sendStatusToOutcome(result.status), provider: provider.id, result, renderedHash };
}

/** The audit port is best-effort by contract, but a NON-conforming injected port must still not reject. */
async function auditBestEffort(audit: AuditPort, input: Parameters<AuditPort>[0]): Promise<void> {
  try {
    await audit(input);
  } catch {
    // Swallow — audit failure never poisons dispatch (AI-4-3(d)); createAuditPort logs via onError.
  }
}
