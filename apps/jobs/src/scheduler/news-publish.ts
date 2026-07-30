// News/Blog scheduled + immediate publish worker — Story 10.5 (Task 5; AC4, AC5).
//
// The pg-boss consumer of the `NEWS_PUBLISH` queue. Two triggers ride ONE worker (the payload's `mode`
// selects the behavior), so there is ONE publish-and-fan-out path to reason about:
//   · `scheduled` — the DELAYED job (enqueued by apps/api `schedule`, `startAfter = scheduled_publish_at`).
//     At fire time: if the post is STILL `scheduled`, transition it to `published`; if it's ALREADY
//     `published` (a prior attempt already flipped it, or an admin called `publish()` directly out of
//     band — see the `queue.ts` mode-scoped `singletonKey` note), skip the transition but still ATTEMPT
//     the fan-out below. There is no `unschedule`/cancel transition on a post (`status.ts`
//     `LEGAL_TRANSITIONS`) — a `scheduled` post can only ever end up `published`, never reverted — so
//     the delayed job firing late always finds one of those two states, never anything else.
//   · `immediate` — the zero-delay job (enqueued by apps/api `publish` AFTER it transitioned the post to
//     `published` synchronously). The worker only fans out.
//   Both modes converge on the SAME fan-out step once the post is `published`; a pg-boss redelivery of
//   either mode re-attempts fan-out, which is why per-member idempotency below (not a status re-check)
//   is what actually prevents a duplicate send.
//
// ── The fan-out lives HERE, not in apps/api (the 10.4 crypto-boundary lesson) ─────────────────────────
// `resolveMemberDeliveryContext`/`fanOutAlert` resolve MEMBER Tier-1 field crypto; apps/jobs has the
// member-field-crypto deps, apps/api's request path carries ADMIN-identity keys
// ([[project_helpdesk_responder_surface_104]]). So the audience resolution + the `alert_published`
// fan-out belong in this worker. Providers are unwired ⇒ v1 delivery is a LOG-ONLY fixture
// ([[project_channels_no_live_dispatch_yet]] retired — live dispatch exists, vendor legs are stubs).
// The emit + fan-out WIRING is the deliverable (Scope Boundary).
//
// This worker calls the shared composition's PER-MEMBER building blocks (`resolveMemberDeliveryContext`
// + `fanOutAlert`), not the `fanOutAlertToMembers` batch wrapper — two things this story needs that the
// batch wrapper doesn't support without changing its signature for every other caller: per-post
// `channels` restriction (AC5) and a per-member idempotency claim (see `newsMemberKey` below). The
// contribution-notify-triggers.ts `runContributionNotifyChild` claim/release/recordResult loop is the
// direct precedent for this shape.

import { createHash } from 'node:crypto';

import { Alert } from '@twt/contracts';
import { idempotency, ids, newsBlog, withPariwarScope } from '@twt/domain';
import type { schema } from '@twt/domain';
import { QUEUE_NAMES, type Job, type JobEnvelope, type QueueClient } from '@twt/queue';

import {
  fanOutAlert,
  resolveMemberDeliveryContext,
  type ContributionNotifyDeps,
  type MemberDeliveryTargets,
  type MemberFanOutResult,
} from './contribution-notify.js';

type NewsPostRow = schema.NewsPostRow;
type NewsChannel = schema.NewsChannel;

/** Namespaced idempotency key for one (post, member) send — the `contribution.notify:` sibling
 *  pattern ([[project_story910_pending_match_retry_substrate]] / `contribution-notify-triggers.ts`
 *  `memberKey`), on its own `news.publish:` prefix so the two families never collide in the shared
 *  keyed store. */
function newsMemberKey(alertId: string, memberId: string): string {
  return `news.publish:${alertId}:${memberId}`;
}

/** A post publishes at most once — generous TTL (well past any plausible pg-boss retry/backoff
 *  window or worker-crash-restart gap) so a claim never lapses mid-delivery, unlike the day-N
 *  contribution reminders' short default (those legitimately recur). */
const NEWS_PUBLISH_MEMBER_IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

/** Restrict a member's resolved delivery targets to the post's selected `channels` (AC5) — a channel
 *  the author didn't select is treated exactly like "no target on file" for that channel, so the
 *  cascade naturally reports `skipped_no_target` rather than attempting a send. Does NOT touch
 *  `fanOutAlert`/`fanOutAlertToMembers` itself (the shared composition's signature is unchanged;
 *  every other caller is unaffected). */
function restrictTargetsToChannels(targets: MemberDeliveryTargets, channels: readonly NewsChannel[]): MemberDeliveryTargets {
  const allowed = new Set<string>(channels);
  return {
    push: allowed.has('push') ? targets.push : [],
    whatsapp: allowed.has('whatsapp') ? targets.whatsapp : null,
    sms: allowed.has('sms') ? targets.sms : null,
    telegram: allowed.has('telegram') ? targets.telegram : null,
  };
}

/** Strip a fan-out record to the fields safe to persist in the idempotency store — the
 *  `contribution-notify-triggers.ts` `nonPiiRecord` sibling (channels + booleans; never an address). */
function nonPiiRecord(record: MemberFanOutResult | undefined): Record<string, unknown> {
  if (!record) return { delivered: false };
  return {
    delivered: record.delivered,
    deliveredChannel: record.deliveredChannel,
    bridged: record.bridged,
    costSuppressedChannels: record.costSuppressedChannels,
    telegramMirrored: record.telegramMirrored,
  };
}

/** The NEWS_PUBLISH job payload (structurally aligned with apps/api's `NewsPublishJobPayload`). */
export interface NewsPublishPayload {
  postId: string;
  mode: 'immediate' | 'scheduled';
}

export interface NewsPublishWorkerDeps {
  /** The shipped contribution-notify fan-out deps (BYPASSRLS pool + member Tier-1 crypto + audit). */
  readonly notify: ContributionNotifyDeps;
  /** Injectable clock (tests freeze it). Defaults to a real clock. */
  readonly now?: () => Date;
  /** Failure/observability alarm sink — a console stub by default. */
  readonly onAlarm?: (message: string) => void;
}

/**
 * The PINNED namespace UUID for deterministic news alert_id derivation (the `ALERT_ID_NAMESPACE_UUID`
 * discipline — a stable id per post makes the `announcements/:alert_id` deep link + any future
 * idempotency stable across a pg-boss redelivery). Distinct from the alert/pool namespaces.
 */
const NEWS_ALERT_ID_NAMESPACE_UUID = 'f2a9c1d4-3e57-4b80-9c6a-1d8e0b5a2f93';
const NEWS_NS_BYTES = Buffer.from(NEWS_ALERT_ID_NAMESPACE_UUID.replace(/-/g, ''), 'hex');

function bytesToUuid(buf: Buffer): string {
  const h = buf.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/** Derive a deterministic UUIDv5 alert id from the post id (idempotent across redeliveries). */
export function deriveNewsAlertId(postId: string): string {
  const hash = createHash('sha1').update(Buffer.concat([NEWS_NS_BYTES, Buffer.from(postId, 'utf8')])).digest();
  const bytes = hash.subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC-4122 variant
  return bytesToUuid(bytes);
}

/** Push-body cap — a broadcast announcement notification is a teaser, not the full article. */
const NEWS_PUSH_BODY_MAX = 240;

/**
 * Truncate on Unicode CODE POINTS, not UTF-16 code units — `.slice()` on a raw string can bisect a
 * surrogate pair (an emoji, some Devanagari combining sequences), producing a malformed teaser.
 */
function truncatePushBody(text: string, maxLen: number): string {
  const codePoints = Array.from(text);
  if (codePoints.length <= maxLen) return text;
  return `${codePoints.slice(0, maxLen - 1).join('')}…`;
}

/**
 * Build the `alert_published` Alert for ONE member from a post (PURE). Reuses the SHIPPED
 * `alert_published` category verbatim (no new category) — `{ title, body }` from the post's
 * producer-formatted copy; the deep-link resolves to `announcements/:alert_id` (already wired).
 *
 * v1 uses the post's English title/body for the push teaser; per-member Hindi localization of the
 * PUSH copy is a documented seam (the post's own hi copy still drives the public/member SURFACE
 * render + the bilingual requirement). Render stays a pure function of the payload.
 */
export function buildNewsAlert(post: NewsPostRow, memberId: string, now: Date): Alert {
  const body = truncatePushBody(post.bodyMarkdown, NEWS_PUSH_BODY_MAX);
  return Alert.parse({
    alert_id: deriveNewsAlertId(post.postId),
    pariwar_id: post.pariwarId,
    member_id: memberId,
    time_critical: false, // a News/Blog announcement is never AR-18 time-critical
    provenance_refs: {},
    created_at: now.toISOString(),
    created_by_actor: 'system',
    alert_category: 'alert_published',
    payload_data: { title: post.title, body },
  });
}

export interface NewsPublishResult {
  readonly published: boolean;
  readonly reason?: 'not-scheduled' | 'not-published' | 'not-found';
  readonly memberCount?: number;
}

/**
 * The worker CORE (pure of pg-boss). Loads the post under Pariwar scope, transitions it to
 * `published` if still `scheduled` (a no-op if some other path already flipped it), resolves the
 * audience, and runs the fan-out. Returns a structured result so tests can assert the no-op arms
 * without a queue.
 */
export async function runNewsPublish(
  deps: NewsPublishWorkerDeps,
  payload: NewsPublishPayload,
  pariwarId: string,
): Promise<NewsPublishResult> {
  const now = (deps.now ?? (() => new Date()))();
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));

  // Load + (if still scheduled) transition + resolve audience — all in ONE scoped tx. The status gate
  // here decides ONLY whether a *transition* is needed, not whether fan-out should run — fan-out
  // always runs once the post ends up `published`, and its own per-member idempotency claims (below)
  // are what make a pg-boss redelivery of either mode safe to re-attempt without double-notifying.
  const gate = await withPariwarScope(deps.notify.pool, pariwarId, async (db) => {
    const post = await newsBlog.getPost(db, ids.pariwarId(pariwarId), ids.newsPostId(payload.postId));
    if (!post) return { proceed: false as const, reason: 'not-found' as const };

    const current = post.status === 'scheduled' ? await newsBlog.publish(db, post.pariwarId, post.postId, now) : post;
    if (current.status !== 'published') {
      const reason = payload.mode === 'scheduled' ? ('not-scheduled' as const) : ('not-published' as const);
      return { proceed: false as const, reason };
    }
    const memberIds = await newsBlog.resolveAudienceMemberIds(db, current.pariwarId, current.audienceScope, current.audienceScopeValue);
    return { proceed: true as const, post: current, memberIds };
  });

  if (!gate.proceed) return { published: false, reason: gate.reason };

  const { post, memberIds } = gate;
  const alertId = deriveNewsAlertId(post.postId);
  const store = idempotency.createKeyedStore(deps.notify.pool);

  // Claim each member BEFORE sending — the claim IS the at-most-once guarantee (dispatch() itself has
  // no built-in idempotency; a redelivered job without this claim would double-send every member who
  // already received the alert — the contribution-notify-triggers.ts `runContributionNotifyChild`
  // precedent).
  const claimed: string[] = [];
  for (const memberId of memberIds) {
    const outcome = await store.claim(newsMemberKey(alertId, memberId), NEWS_PUBLISH_MEMBER_IDEMPOTENCY_TTL_SECONDS);
    if (outcome === 'acquired') claimed.push(memberId);
  }

  const undelivered: string[] = [];
  for (const memberId of claimed) {
    const key = newsMemberKey(alertId, memberId);
    try {
      const ctx = await withPariwarScope(deps.notify.pool, post.pariwarId, (db) =>
        resolveMemberDeliveryContext(db, deps.notify.encryption, post.pariwarId, memberId, now),
      );
      // Reuse the SHIPPED per-member dispatch core (`fanOutAlert`) — never re-implemented — but
      // restrict the resolved targets to the post's selected `channels` first (AC5): the shared
      // `fanOutAlertToMembers` composition has no channel-restriction parameter, so filtering the
      // targets before this call is the only way to honor a per-post channel selection without
      // changing that composition's signature for its other callers.
      const scopedCtx = { ...ctx, targets: restrictTargetsToChannels(ctx.targets, post.channels) };
      const result = await fanOutAlert(deps.notify, buildNewsAlert(post, memberId, now), scopedCtx);
      if (result.delivered) {
        await store.recordResult(key, nonPiiRecord(result)).catch((err: unknown) => {
          alarm(`[jobs] news-publish: failed to record a member result — ${String(err)}`);
        });
      } else {
        undelivered.push(memberId);
        // Release rather than record so a later best-effort re-run (not auto-retried — see below)
        // could still reach this member; a "delivered" claim must never be recorded for a non-send.
        await store.release(key).catch((err: unknown) => {
          alarm(`[jobs] news-publish: failed to release a member claim — ${String(err)}`);
        });
      }
    } catch (err) {
      undelivered.push(memberId);
      await store.release(key).catch(() => {});
      alarm(`[jobs] news-publish: fan-out failed for member ${memberId} of post ${post.postId} — ${String(err)}`);
    }
  }
  if (undelivered.length > 0) {
    // Best-effort broadcast (v1): a member with no reachable channel is logged, NOT retried forever
    // (unlike the contribution loop, a News/Blog announcement is non-critical broadcast copy).
    alarm(`[jobs] news-publish: ${undelivered.length}/${memberIds.length} members undelivered for post ${post.postId} (best-effort broadcast)`);
  }
  return { published: true, memberCount: memberIds.length };
}

/** Register the NEWS_PUBLISH worker on the pg-boss client (boot.ts wires the deps). */
export async function registerNewsPublishWorker(boss: QueueClient, deps: NewsPublishWorkerDeps): Promise<void> {
  await boss.createQueue(QUEUE_NAMES.NEWS_PUBLISH);
  await boss.work(QUEUE_NAMES.NEWS_PUBLISH, async (jobs: Job[]) => {
    for (const job of jobs) {
      const env = job.data as JobEnvelope<NewsPublishPayload>;
      if (!env?.pariwarId || !env.payload?.postId) {
        console.error('[jobs] news-publish: malformed job envelope — skipping', JSON.stringify({ id: job.id }));
        continue;
      }
      await runNewsPublish(deps, env.payload, env.pariwarId);
    }
  });
}
