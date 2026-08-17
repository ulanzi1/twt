// Survey publish fan-out worker — Story 10.15 (Task 10; AC8).
//
// The pg-boss consumer of the `SURVEY_PUBLISH` queue. ONE trigger, ONE job shape.
//
// ⭐ SIMPLER THAN `news-publish.ts`, AND THE DIFFERENCE IS THE DESIGN, NOT AN OMISSION. That worker
// carries a `mode` discriminator and a status-transition arm because a news post has a
// scheduled-publish TRANSITION the worker may have to perform at fire time. A survey has none: it is
// ALREADY `published` when this job is enqueued (apps/api transitions it synchronously), and a future
// `valid_from` simply reads as `scheduled` off that published row — the response window is a pure
// read-time derivation with no sweep, no expiry job and no transition at open or close (AC2).
// ⛔ So this worker NEVER writes to `surveys`. It reads one row and notifies. If you find yourself
// adding a transition here, the design has drifted.
//
// ── The fan-out lives HERE, not in apps/api (the 10.4 crypto-boundary lesson) ─────────────────────
// `resolveMemberDeliveryContext`/`fanOutAlert` resolve MEMBER Tier-1 field crypto; apps/jobs has the
// member-field-crypto deps, apps/api's request path carries ADMIN-identity keys
// ([[project_helpdesk_responder_surface_104]]). So the audience resolution + the `alert_published`
// fan-out belong in this worker.
//
// ── ⭐ ONE AUDIENCE AUTHORITY (AC8) ───────────────────────────────────────────────────────────────
// The audience is resolved by `surveys.resolveSurveyAudienceMemberIds`, whose ONLY job is to feed the
// SAME `isMemberInSurveyAudience` predicate the member READ uses. ⛔ Not a parallel SQL filter: a
// second definition of "who is in the audience" would let the notification and the surface disagree,
// so a member could be told about a survey the read then refuses to show them.
//
// This worker calls the shared composition's PER-MEMBER building blocks (`resolveMemberDeliveryContext`
// + `fanOutAlert`), not the `fanOutAlertToMembers` batch wrapper, because it needs a per-member
// idempotency claim — the `news-publish.ts` / `contribution-notify-triggers.ts` precedent.

import { createHash } from 'node:crypto';

import { Alert } from '@twt/contracts';
import { geoTree, idempotency, ids, surveys, withPariwarScope } from '@twt/domain';
import type { schema } from '@twt/domain';
import { QUEUE_NAMES, type Job, type JobEnvelope, type QueueClient } from '@twt/queue';

import {
  fanOutAlert,
  resolveMemberDeliveryContext,
  type ContributionNotifyDeps,
  type MemberFanOutResult,
} from './contribution-notify.js';

type SurveyRow = schema.SurveyRow;

/** Namespaced idempotency key for one (survey, member) send — on its own `survey.publish:` prefix so
 *  the family never collides with `news.publish:` / `contribution.notify:` in the shared keyed store. */
function surveyMemberKey(alertId: string, memberId: string): string {
  return `survey.publish:${alertId}:${memberId}`;
}

/** A survey publishes at most once — generous TTL (well past any plausible pg-boss retry/backoff
 *  window or worker-crash-restart gap) so a claim never lapses mid-delivery, unlike the day-N
 *  contribution reminders' short default (those legitimately recur). */
const SURVEY_PUBLISH_MEMBER_IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

/** Strip a fan-out record to the fields safe to persist in the idempotency store — the
 *  `nonPiiRecord` sibling (channels + booleans; ⛔ never an address). */
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

/** The SURVEY_PUBLISH job payload (structurally aligned with apps/api's `SurveyPublishJobPayload`). */
export interface SurveyPublishPayload {
  surveyId: string;
}

export interface SurveyPublishWorkerDeps {
  /** The shipped contribution-notify fan-out deps (BYPASSRLS pool + member Tier-1 crypto + audit). */
  readonly notify: ContributionNotifyDeps;
  /** Injectable clock (tests freeze it). Defaults to a real clock. */
  readonly now?: () => Date;
  /** Failure/observability alarm sink — a console stub by default. */
  readonly onAlarm?: (message: string) => void;
}

/**
 * The PINNED namespace UUID for deterministic survey alert_id derivation (the
 * `ALERT_ID_NAMESPACE_UUID` discipline — a stable id per survey makes the per-member idempotency key
 * stable across a pg-boss redelivery, which is what actually prevents a duplicate send). Distinct
 * from the news/alert/pool namespaces.
 */
const SURVEY_ALERT_ID_NAMESPACE_UUID = '6b3f8d21-9c47-4a15-8e02-7d5a1c9b4e63';
const SURVEY_NS_BYTES = Buffer.from(SURVEY_ALERT_ID_NAMESPACE_UUID.replace(/-/g, ''), 'hex');

function bytesToUuid(buf: Buffer): string {
  const h = buf.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/** Derive a deterministic UUIDv5 alert id from the survey id (idempotent across redeliveries). */
export function deriveSurveyAlertId(surveyId: string): string {
  const hash = createHash('sha1').update(Buffer.concat([SURVEY_NS_BYTES, Buffer.from(surveyId, 'utf8')])).digest();
  const bytes = hash.subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC-4122 variant
  return bytesToUuid(bytes);
}

/** Push-body cap — an invitation to answer is a teaser, not the questionnaire. */
const SURVEY_PUSH_BODY_MAX = 240;

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
 * Build the `alert_published` Alert for ONE member from a survey (PURE).
 *
 * ⛔ REUSES THE SHIPPED `alert_published` CATEGORY VERBATIM — no new alert variant, no new alert
 * category, no `packages/events` registration, no new event vocabulary (LBD-2/LBD-8). A survey
 * announcement is an announcement; minting a category for it would add a stream nothing else reads.
 *
 * ⚠ The copy is the survey's own title/body — ⛔ never a question, never an option label, and never
 * anything about how anyone has answered. A push that quoted the questionnaire would put authored
 * content into a channel the tone gate reviewed only as a survey surface.
 *
 * v1 uses the English title/body for the push teaser; per-member Hindi localization of the PUSH copy
 * is the same documented seam as 10.5's (the survey's own `hi` copy still drives the member SURFACE
 * render + the FR-68 bilingual requirement).
 */
export function buildSurveyAlert(survey: SurveyRow, memberId: string, now: Date): Alert {
  const body = truncatePushBody(survey.body ?? '', SURVEY_PUSH_BODY_MAX);
  return Alert.parse({
    alert_id: deriveSurveyAlertId(survey.surveyId),
    pariwar_id: survey.pariwarId,
    member_id: memberId,
    time_critical: false, // a survey invitation is never AR-18 time-critical
    provenance_refs: {},
    created_at: now.toISOString(),
    created_by_actor: 'system',
    alert_category: 'alert_published',
    payload_data: { title: survey.title ?? '', body },
  });
}

export interface SurveyPublishResult {
  readonly notified: boolean;
  readonly reason?: 'not-found' | 'not-published';
  readonly memberCount?: number;
}

/**
 * The worker CORE (pure of pg-boss). Loads the survey under Pariwar scope, resolves the audience
 * through the shared predicate, and runs the per-member fan-out. Returns a structured result so tests
 * can assert the no-op arms without a queue.
 *
 * ⚠ A survey that is not `published` is a clean NO-OP, not an error: the only way to reach that state
 * is a `close` racing a redelivery, and re-notifying about a closed survey would be worse than
 * silence.
 */
export async function runSurveyPublish(
  deps: SurveyPublishWorkerDeps,
  payload: SurveyPublishPayload,
  pariwarId: string,
): Promise<SurveyPublishResult> {
  const now = (deps.now ?? (() => new Date()))();
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));

  // Load + resolve the audience in ONE scoped tx. ⛔ NO transition happens here — see the header.
  const gate = await withPariwarScope(deps.notify.pool, pariwarId, async (db) => {
    const survey = await surveys.getSurvey(db, ids.pariwarId(pariwarId), ids.surveyId(payload.surveyId));
    if (!survey) return { proceed: false as const, reason: 'not-found' as const };
    if (survey.status !== 'published') return { proceed: false as const, reason: 'not-published' as const };

    // ⭐ THE GEO TREE IS LOADED **ONCE**, HERE — inside the SAME `withPariwarScope` callback as the
    // survey read, on the SAME scoped tx. ⛔ Never once per member: this fan-out runs against a
    // 4L-member Pariwar, and a per-member load is exactly the N+1 AC8 forbids. A Pariwar with no
    // published tree loads `null`, and the `state` arm then resolves to the EMPTY set — fail-closed,
    // never a fallback to `members-all` (ADR-0038: no code default geography).
    const tree = await geoTree.loadGeoTree(db, survey.pariwarId, now);
    const memberIds = await surveys.resolveSurveyAudienceMemberIds(
      db,
      survey.pariwarId,
      survey.audienceScope,
      survey.audienceScopeValue,
      // ⛔ tree AND instant travel together — the member READ bounds its newest-posting lookup by the
      // same `now`, and a disagreement between the two consumers would notify a member the read then
      // denies.
      { tree, now },
    );
    return { proceed: true as const, survey, memberIds };
  });

  if (!gate.proceed) return { notified: false, reason: gate.reason };

  const { survey, memberIds } = gate;
  const alertId = deriveSurveyAlertId(survey.surveyId);
  const store = idempotency.createKeyedStore(deps.notify.pool);

  // ⭐ Claim each member BEFORE sending — the claim IS the at-most-once guarantee (AC8). `dispatch()`
  // has no built-in idempotency, and a STATUS RE-CHECK cannot substitute: the survey stays `published`
  // across a redelivery, so a status gate would happily send twice. Only the per-member claim stops it
  // (the `news-publish.ts` / `runContributionNotifyChild` precedent).
  const claimed: string[] = [];
  for (const memberId of memberIds) {
    const outcome = await store.claim(surveyMemberKey(alertId, memberId), SURVEY_PUBLISH_MEMBER_IDEMPOTENCY_TTL_SECONDS);
    if (outcome === 'acquired') claimed.push(memberId);
  }

  const undelivered: string[] = [];
  for (const memberId of claimed) {
    const key = surveyMemberKey(alertId, memberId);
    try {
      const ctx = await withPariwarScope(deps.notify.pool, survey.pariwarId, (db) =>
        resolveMemberDeliveryContext(db, deps.notify.encryption, survey.pariwarId, memberId, now),
      );
      // Reuse the SHIPPED per-member dispatch core (`fanOutAlert`) — never re-implemented. ⚠ Unlike
      // 10.5 there is NO per-survey channel restriction: `surveys` has no `channels` column, because
      // FR-58 asks for a notification and not for a per-survey channel policy. Every resolved target
      // is used, exactly as the shared composition intends.
      const result = await fanOutAlert(deps.notify, buildSurveyAlert(survey, memberId, now), ctx);
      if (result.delivered) {
        await store.recordResult(key, nonPiiRecord(result)).catch((err: unknown) => {
          alarm(`[jobs] survey-publish: failed to record a member result — ${String(err)}`);
        });
      } else {
        undelivered.push(memberId);
        // Release rather than record so a later best-effort re-run could still reach this member; a
        // "delivered" claim must never be recorded for a non-send.
        await store.release(key).catch((err: unknown) => {
          alarm(`[jobs] survey-publish: failed to release a member claim — ${String(err)}`);
        });
      }
    } catch (err) {
      undelivered.push(memberId);
      await store.release(key).catch(() => {});
      alarm(`[jobs] survey-publish: fan-out failed for member ${memberId} of survey ${survey.surveyId} — ${String(err)}`);
    }
  }
  if (undelivered.length > 0) {
    // Best-effort broadcast (v1): a member with no reachable channel is logged, NOT retried forever.
    // ⚠ An unreachable member is NOT excluded from the survey — they will still see it on the member
    // surface, because the audience predicate and the delivery channel are different questions.
    alarm(
      `[jobs] survey-publish: ${undelivered.length}/${memberIds.length} members undelivered for survey ${survey.surveyId} (best-effort broadcast)`,
    );
  }
  return { notified: true, memberCount: memberIds.length };
}

/** Register the SURVEY_PUBLISH worker on the pg-boss client (boot.ts wires the deps). */
export async function registerSurveyPublishWorker(boss: QueueClient, deps: SurveyPublishWorkerDeps): Promise<void> {
  await boss.createQueue(QUEUE_NAMES.SURVEY_PUBLISH);
  await boss.work(QUEUE_NAMES.SURVEY_PUBLISH, async (jobs: Job[]) => {
    for (const job of jobs) {
      const env = job.data as JobEnvelope<SurveyPublishPayload>;
      if (!env?.pariwarId || !env.payload?.surveyId) {
        console.error('[jobs] survey-publish: malformed job envelope — skipping', JSON.stringify({ id: job.id }));
        continue;
      }
      await runSurveyPublish(deps, env.payload, env.pariwarId);
    }
  });
}
