// Member-moderation notice worker — Story 10.10 (Task 6; AC8).
//
// The pg-boss consumer of the `MEMBER_MODERATION_NOTIFY` queue. One job = one COMMITTED moderation
// decision = one notice to one member.
//
// ── The fan-out lives HERE, not in apps/api (the 10.4 crypto-boundary lesson) ────────────────────
// `fanOutAlertToMembers` resolves MEMBER Tier-1 field crypto; apps/jobs has the member-field-crypto
// deps, apps/api's request path carries ADMIN-identity keys
// ([[project_helpdesk_responder_surface_104]]). So apps/api ENQUEUES and this worker DISPATCHES.
// ⚠ Story 10.4 shipped a log-only console-notifier STOPGAP for exactly this problem and it is still
// an unresolved HIGH gap — this story does NOT repeat it. It uses the Story 10.5 `news-publish`
// enqueue+worker pattern, which is the resolved form of the same constraint.
//
// ── No 10th AlertCategory (Decision 7) ──────────────────────────────────────────────────────────
// No existing `AlertCategory` variant fits a moderation notice (`claim_status_change` needs a
// `claim_id`, `helpdesk_reply` a `ticket_id`, `niyamavali_amended` is a broadcast), and `Alert` is a
// `.strict()` discriminated union, so a member id + reason code cannot be smuggled in. But minting a
// 10th category would make it push-eligible and thereby redefine FR-71 from 7 push categories to 8 —
// which Story 5.2 froze in terms ("FR-71 = 7. Full stop."). That is a PRD amendment, not a
// story-level call.
// → this ships on `alert_published`'s `{ title, body }`, the same carrier News/Blog uses.
// ⚠ KNOWN LIMITATION, recorded not hidden: the resulting deep link lands on the ANNOUNCEMENT FEED
// rather than `<MemberStatusPanel>`. FORWARD COMMITMENT: a `member_moderation` category (plus a
// `deep-link.ts` case routing to the status panel) once PM amends FR-71.
//
// ── The copy (AC8 / UX Stance #5) ───────────────────────────────────────────────────────────────
// SYSTEM copy from the `@twt/i18n` catalog, Hindi-first with en/hi parity — NOT per-action authored
// copy, so NO tone-review gate applies (contrast 10.5/10.9, whose copy a human writes). It states
// what happened, why (the reason-code LABEL, never the raw code), and how to ask for a review.
// Never a deadline, never a countdown, never a threat. It carries NO rationale: the Tier-1 free text
// never leaves the database.

import { createHash } from 'node:crypto';

import { Alert } from '@twt/contracts';
import { ids, member as memberDomain, withPariwarScope } from '@twt/domain';
import { DEFAULT_LOCALE, t, type Locale } from '@twt/i18n';
import { QUEUE_NAMES, type Job, type JobEnvelope, type QueueClient } from '@twt/queue';

import { fanOutAlertToMembers, type ContributionNotifyDeps } from './contribution-notify.js';

/** The MEMBER_MODERATION_NOTIFY payload (structurally aligned with apps/api's enqueuer type). */
export interface ModerationNotifyPayload {
  moderationActionId: string;
  memberId: string;
  action: 'suspend' | 'terminate' | 'restore';
  reasonCode: string;
}

export interface ModerationNotifyWorkerDeps {
  /** The shipped contribution-notify fan-out deps (BYPASSRLS pool + member Tier-1 crypto + audit). */
  readonly notify: ContributionNotifyDeps;
  /** Injectable clock (tests freeze it). Defaults to a real clock. */
  readonly now?: () => Date;
  /** Failure/observability alarm sink — a console stub by default. */
  readonly onAlarm?: (message: string) => void;
}

/** The i18n copy keys per action. `common` namespace (where the member-status copy already lives). */
const NOTICE_KEYS = {
  suspend: {
    titleKey: 'moderation.notice.suspended.title',
    bodyKey: 'moderation.notice.suspended.body',
  },
  terminate: {
    titleKey: 'moderation.notice.terminated.title',
    bodyKey: 'moderation.notice.terminated.body',
  },
  restore: {
    titleKey: 'moderation.notice.restored.title',
    bodyKey: 'moderation.notice.restored.body',
  },
} as const satisfies Record<ModerationNotifyPayload['action'], { titleKey: string; bodyKey: string }>;

const NS = { namespace: 'common' } as const;

/** The reason-code LABEL key. Never render the raw code to a member (UX a11y `:1896`). */
export function moderationReasonLabelKey(reasonCode: string): string {
  return `memberStatus.moderationReason.${reasonCode}`;
}

/**
 * The PINNED namespace UUID for deterministic moderation alert_id derivation (the news/pool
 * `ALERT_ID_NAMESPACE_UUID` discipline). Distinct from every other alert namespace, so a moderation
 * notice can never collide with a news post or a cycle-open alert.
 */
const MODERATION_ALERT_ID_NAMESPACE_UUID = '5c74b0e2-9a13-4f68-8d21-7ae35c9b40f1';

/**
 * Derive a deterministic UUIDv5 alert id from the MODERATION ACTION id — one alert per DECISION.
 * Keying on the action (not the member) means a suspend and the terminate that follows it are two
 * distinct notices, while a pg-boss redelivery of either job re-derives the same id.
 */
export function deriveModerationAlertId(moderationActionId: string): string {
  return uuidV5(MODERATION_ALERT_ID_NAMESPACE_UUID, moderationActionId);
}

function uuidV5(namespaceUuid: string, name: string): string {
  const nsBytes = Buffer.from(namespaceUuid.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1')
    .update(Buffer.concat([nsBytes, Buffer.from(name, 'utf8')]))
    .digest();
  const bytes = hash.subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC-4122 variant
  const h = bytes.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/**
 * Build the `alert_published` Alert for the moderated member (PURE). Reuses the SHIPPED
 * `alert_published` category verbatim (Decision 7 — no new category).
 *
 * ⚠ `payload_data` carries the RENDERED copy only. No rationale, no reason CODE, no actor name — the
 * `alert_published` payload is a plaintext push body, and the code is a governance term the member
 * has no use for. The reason reaches them as a resolved LABEL inside the prose.
 */
export function buildModerationAlert(input: {
  readonly moderationActionId: string;
  readonly pariwarId: string;
  readonly memberId: string;
  readonly action: ModerationNotifyPayload['action'];
  readonly reasonCode: string;
  readonly locale: Locale;
  readonly now: Date;
}): Alert {
  const keys = NOTICE_KEYS[input.action];
  const { locale } = input;
  // A code with no catalog entry resolves through the `unspecified` label rather than leaking the
  // raw slug into member-facing prose (a new registry code shipped ahead of its copy must degrade
  // gracefully, not read as machine output).
  const reasonKey = moderationReasonLabelKey(input.reasonCode);
  const resolvedReason = t(reasonKey, {}, { locale, ...NS });
  const reason =
    resolvedReason === reasonKey
      ? t(moderationReasonLabelKey('unspecified'), {}, { locale, ...NS })
      : resolvedReason;

  return Alert.parse({
    alert_id: deriveModerationAlertId(input.moderationActionId),
    pariwar_id: input.pariwarId,
    member_id: input.memberId,
    // A moderation notice is NOT AR-18 time-critical: there is no deadline the member must beat.
    // Marking it time-critical would be exactly the countdown pressure UX Stance #5 forbids.
    time_critical: false,
    provenance_refs: {},
    created_at: input.now.toISOString(),
    created_by_actor: 'system',
    alert_category: 'alert_published',
    payload_data: {
      title: t(keys.titleKey, { reason }, { locale, ...NS }),
      body: t(keys.bodyKey, { reason }, { locale, ...NS }),
    },
  });
}

export interface ModerationNotifyResult {
  readonly notified: boolean;
  readonly reason?: 'member-not-found' | 'undelivered';
  readonly alertId: string;
}

/**
 * The worker CORE (pure of pg-boss). Confirms the member exists under Pariwar scope, builds the
 * notice, and runs the SHIPPED `fanOutAlertToMembers` dispatch (never re-implemented) for the one
 * member. Returns a structured result so tests can assert every arm without a queue.
 */
export async function runModerationNotify(
  deps: ModerationNotifyWorkerDeps,
  payload: ModerationNotifyPayload,
  pariwarId: string,
): Promise<ModerationNotifyResult> {
  const now = (deps.now ?? (() => new Date()))();
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const alertId = deriveModerationAlertId(payload.moderationActionId);

  const exists = await withPariwarScope(deps.notify.pool, pariwarId, (db) =>
    memberDomain.memberExists(db, ids.pariwarId(pariwarId), ids.memberId(payload.memberId)),
  );
  if (!exists) {
    // The moderation action committed against a member that no longer resolves in this tenant (an
    // RTBF cascade between commit and delivery is the realistic path). Nothing to notify, and this
    // is NOT an error worth retrying — report it and let the job succeed.
    alarm(
      `[jobs] moderation-notify: member ${payload.memberId} not found in pariwar ${pariwarId} — notice skipped`,
    );
    return { notified: false, reason: 'member-not-found', alertId };
  }

  // v1 resolves the DEFAULT locale. Per-member locale preference is not yet on the member record;
  // the same seam the cycle-open/news producers carry. Hindi-first is a CATALOG property here.
  const locale: Locale = DEFAULT_LOCALE;
  const alert = buildModerationAlert({
    moderationActionId: payload.moderationActionId,
    pariwarId,
    memberId: payload.memberId,
    action: payload.action,
    reasonCode: payload.reasonCode,
    locale,
    now,
  });

  const { undelivered } = await fanOutAlertToMembers(
    deps.notify,
    () => alert,
    [payload.memberId],
    pariwarId,
    now,
  );

  if (undelivered.length > 0) {
    // Surfaced so pg-boss's retry has a reason to exist; the moderation ACTION itself is long since
    // committed and is never affected by a delivery outcome (AC8: best-effort).
    return { notified: false, reason: 'undelivered', alertId };
  }
  return { notified: true, alertId };
}

/** Register the MEMBER_MODERATION_NOTIFY consumer (the `registerNewsPublishWorker` shape). */
export async function registerModerationNotifyWorker(
  boss: QueueClient,
  deps: ModerationNotifyWorkerDeps,
): Promise<void> {
  await boss.createQueue(QUEUE_NAMES.MEMBER_MODERATION_NOTIFY);
  await boss.work(QUEUE_NAMES.MEMBER_MODERATION_NOTIFY, async (jobs: Job[]) => {
    for (const job of jobs) {
      const env = job.data as JobEnvelope<ModerationNotifyPayload>;
      if (
        !env?.pariwarId ||
        !env.payload?.memberId ||
        !env.payload?.moderationActionId ||
        !env.payload?.action ||
        !(env.payload.action in NOTICE_KEYS)
      ) {
        // `action` is checked structurally here (not just presence) — a missing or unrecognized
        // value would otherwise make `NOTICE_KEYS[input.action]` resolve to `undefined` deep inside
        // `buildModerationAlert`, throwing unguarded and aborting every OTHER job in this batch too.
        console.error(
          '[jobs] moderation-notify: malformed job envelope — skipping',
          JSON.stringify({ id: job.id }),
        );
        continue;
      }
      await runModerationNotify(deps, env.payload, env.pariwarId);
    }
  });
}
