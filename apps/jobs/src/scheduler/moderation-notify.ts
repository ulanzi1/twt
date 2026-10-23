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
import { featureFlags, idempotency, ids, member as memberDomain, withPariwarScope } from '@twt/domain';
import { DEFAULT_LOCALE, t, type Locale } from '@twt/i18n';
import { QUEUE_NAMES, type Job, type JobEnvelope, type QueueClient } from '@twt/queue';

import { fanOutAlertToMembers, serializeFanOutResult, type ContributionNotifyDeps } from './contribution-notify.js';

/** Match the broadcast workers' claim window, covering normal pg-boss redelivery without a new table. */
const MODERATION_NOTIFY_IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

/** pg-boss's default job expiry — this queue is created with no options (`expireInSeconds` 900, pg-boss 12). */
const PG_BOSS_DEFAULT_EXPIRE_SECONDS = 15 * 60;

/**
 * A `pending` claim older than this was ABANDONED (review round 2 patch review, E1 (a); the last fix diff, F2). pg-boss measures
 * its expiry from the job's START, the claim is taken a little later (the member check, the termination flag) and the expiry
 * supervisor runs up to 60 s late — so a redelivery after an expiry sees a claim somewhat YOUNGER than 900 s. A 5-min margin keeps
 * that redelivery a take-over, ⛔ an "in flight" that burns the retries. Only a second job for the same notice can arrive sooner
 * (at-least-once, accepted). Revisit if the queue is ever given its own expiry.
 */
const MODERATION_NOTIFY_ABANDONED_CLAIM_SECONDS = PG_BOSS_DEFAULT_EXPIRE_SECONDS - 5 * 60;

/** The MEMBER_MODERATION_NOTIFY payload (structurally aligned with apps/api's enqueuer type). */
export interface ModerationNotifyPayload {
  moderationActionId: string;
  memberId: string;
  action: 'suspend' | 'terminate' | 'restore' | 'appeal_upheld' | 'appeal_allowed';
  reasonCode: string;
  /** Present iff `action` is `appeal_upheld`/`appeal_allowed` — Story 10.22 §8.8. The alert id
   *  derives from THIS, never from `moderationActionId` (see `deriveAppealAlertId`). */
  appealId?: string;
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
  // ⚠ `terminate` has a SECOND body, selected below by whether access has actually ended. See
  // TERMINATED_ACCESS_RETAINED_BODY_KEY.
  restore: {
    titleKey: 'moderation.notice.restored.title',
    bodyKey: 'moderation.notice.restored.body',
  },
  // ── Story 10.22 §8.8 — the appeal DETERMINATION notice ────────────────────────────────────────
  // Neither body takes a `{reason}` — the appeal outcome carries no rationale (the adjudicator's
  // reasoned outcome is Tier-1 and never leaves the database, matching every other notice here).
  appeal_upheld: {
    titleKey: 'moderation.appeal.outcome.title',
    bodyKey: 'moderation.appeal.outcome.upheld',
  },
  appeal_allowed: {
    titleKey: 'moderation.appeal.outcome.title',
    bodyKey: 'moderation.appeal.outcome.allowed',
  },
} as const satisfies Record<ModerationNotifyPayload['action'], { titleKey: string; bodyKey: string }>;

const NS = { namespace: 'common' } as const;

/**
 * The TRANSITIONAL termination body — the one that still says *"You can sign in as usual…"*.
 *
 * ── Why there are two bodies, and why neither is a hedge (Story 10.19, AC8) ───────────────────────
 * AC8 says the terminated body loses that sentence because "after this story that sentence is
 * false". Under the Panel's Q6 ruling — option (b), sub-choice (b-i), Decision `2026-08-10-097`
 * clause 6 — that is not yet true: the `termination_access_block` flag ships DEFAULT OFF and its
 * flip is gated on Story 10.21 landing. **Until the flip, a terminated member CAN still sign in, and
 * the sentence is accurate.**
 *
 * So a straight strip would have made the notice WRONG for every termination between now and the
 * flip, and deferring the strip would have left it wrong from the instant the flip happened — with
 * nothing but a `deferred-work.md` line standing between the member and a false statement. Decision
 * `097` clause 12 permits either "describe the flag's default as the shipped truth" or "defer and
 * record". Selecting the body from the flag does better than both: the notice states what is true
 * AT THE MOMENT IT IS SENT, in every flag state, with no reconciliation owed later.
 *
 * That is also the correct semantics for a notice. It is a point-in-time record of what the member
 * was told, not a live view — a notice sent before the flip should keep saying what was true then.
 *
 * ⚠ This key is DELETABLE once the flag retires and the block is unconditional. It is named for the
 * condition it describes, not for a story number, so the next reader can tell from the name alone
 * which of the two is transitional.
 */
const TERMINATED_ACCESS_RETAINED_BODY_KEY = 'moderation.notice.terminated.body_access_retained';

/**
 * The capability-bar-admitted flag key gating whether authenticated access has actually ended.
 *
 * ⚠ Declared here rather than imported: the sibling constant lives in
 * `apps/api/src/modules/auth/member/termination-block-seam.ts`, and `apps/jobs` must not import from
 * `apps/api`. `moderation-notify.test.ts` pins it against the domain registry, so a typo or a rename
 * fails a test rather than silently resolving to the code default and quietly reverting every
 * terminated notice to the "you can sign in" wording.
 */
export const TERMINATION_ACCESS_BLOCK_FLAG = 'termination_access_block';

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

/**
 * Derive a deterministic UUIDv5 alert id from the APPEAL id — the `appeal_upheld`/`appeal_allowed`
 * counterpart to `deriveModerationAlertId`. Keyed on the APPEAL, not the moderation action: §8.8
 * permits re-filing after a determination, so one action can carry more than one decided appeal,
 * each earning its own distinct notice. Keying on the action would collide with the original
 * suspend/terminate notice (which already owns that derivation) and with a second appeal's notice
 * on the same action. Same namespace as `deriveModerationAlertId` — the `name` input is what keeps
 * the two derivations from ever colliding.
 */
export function deriveAppealAlertId(appealId: string): string {
  return uuidV5(MODERATION_ALERT_ID_NAMESPACE_UUID, `appeal:${appealId}`);
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
  /** Present iff `action` is `appeal_upheld`/`appeal_allowed` — see `deriveAppealAlertId`. */
  readonly appealId?: string;
  /**
   * Whether authenticated access has ACTUALLY ended for this member — i.e. whether the
   * `termination_access_block` flag is enabled for their Pariwar. INJECTED, never read here: this
   * function is PURE (see the header) and a flag lookup is a DB call. The caller resolves it.
   *
   * Only consulted for `terminate`; a suspension or restoration never loses portal access, so the
   * suspended and restored bodies are unaffected under every flag state.
   */
  readonly accessEnded?: boolean;
}): Alert {
  const keys = NOTICE_KEYS[input.action];
  const { locale } = input;
  // ⛔ The ONE conditional in this builder. `accessEnded` defaults to FALSE — matching the flag's
  // own default-OFF and fail-open posture, so an absent or unresolvable signal degrades toward the
  // statement that is true today rather than toward telling a member they cannot sign in when they
  // still can.
  const bodyKey =
    input.action === 'terminate' && input.accessEnded !== true
      ? TERMINATED_ACCESS_RETAINED_BODY_KEY
      : keys.bodyKey;
  // A code with no catalog entry resolves through the `unspecified` label rather than leaking the
  // raw slug into member-facing prose (a new registry code shipped ahead of its copy must degrade
  // gracefully, not read as machine output).
  //
  // ⚠ This MUST be a try/catch, not a `resolved === key` comparison (review follow-up). `t()` is
  // loud-by-default: `packages/i18n/src/resolver.ts:62-65` THROWS on an unknown key and never
  // returns it, so the equality form was unreachable dead code — and the throw escaped into the
  // worker's batch loop, failing every OTHER member's notice in the same batch. Exactly the failure
  // the envelope guard in `registerModerationNotifyWorker` was added to prevent.
  const reason = resolveReasonLabel(input.reasonCode, locale);

  const alertId =
    input.action === 'appeal_upheld' || input.action === 'appeal_allowed'
      ? deriveAppealAlertId(input.appealId ?? input.moderationActionId)
      : deriveModerationAlertId(input.moderationActionId);

  return Alert.parse({
    alert_id: alertId,
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
      body: t(bodyKey, { reason }, { locale, ...NS }),
    },
  });
}

/**
 * Resolve a reason code to its member-facing LABEL, degrading to `unspecified` when the catalog has
 * no entry for it (a registry code shipped ahead of its copy). PURE apart from the catalog read.
 *
 * Both lookups are guarded: if even `unspecified` is missing, the member still gets a coherent
 * notice rather than a thrown worker — the reason simply goes unnamed. A moderation notice that
 * arrives without a label is a degraded notice; one that never arrives, and takes its batch-mates
 * down with it, is a silent governance failure.
 */
export function resolveReasonLabel(reasonCode: string, locale: Locale): string {
  try {
    return t(moderationReasonLabelKey(reasonCode), {}, { locale, ...NS });
  } catch {
    try {
      return t(moderationReasonLabelKey('unspecified'), {}, { locale, ...NS });
    } catch {
      return '';
    }
  }
}

export interface ModerationNotifyResult {
  /** The notice was handled for this member — `false` ONLY for `member-not-found`. It does ⛔ say a channel delivered it (`delivered`). */
  readonly notified: boolean;
  /** A channel delivered the notice (this run, or the recorded earlier run). `false` ⇒ `in_app_only` (review round 2, P5). */
  readonly delivered?: boolean;
  /** An earlier run had already recorded this notice; nothing was sent now (review round 2, P5). */
  readonly alreadySent?: boolean;
  /**
   * Only `member-not-found` is a RETURNED outcome — it is genuinely terminal (an RTBF cascade
   * between commit and delivery), so retrying could never help. Previously retryable failures throw;
   * former fixture successes complete with a durable `in_app_only` record (Story 5.11, R1 / R3).
   */
  readonly reason?: 'member-not-found';
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
  const alertId =
    payload.action === 'appeal_upheld' || payload.action === 'appeal_allowed'
      ? deriveAppealAlertId(payload.appealId ?? payload.moderationActionId)
      : deriveModerationAlertId(payload.moderationActionId);

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

  // v1 resolves the DEFAULT locale, keeping the same seam the cycle-open/news producers carry. Hindi-first is a CATALOG
  // property here. (2026-10-23, row 6-35: the member can now choose a language in the app — `members.preferred_locale` — but
  // this sender does ⛔ read it; the LS11 deferred item "Senders that ignore the member's chosen language (row 6-35)".)
  const locale: Locale = DEFAULT_LOCALE;

  // Has authenticated access actually ended for this Pariwar? Only a `terminate` notice's wording
  // depends on it (see TERMINATED_ACCESS_RETAINED_BODY_KEY), so the lookup is skipped entirely for
  // suspend/restore rather than paying for a decision nothing reads.
  //
  // ⛔ FAILS TOWARD "access retained", matching the flag's own fail-open posture: if the lookup
  // errors we must not tell a member they can no longer sign in when they still can. A wrong notice
  // is unrecoverable — it has already been delivered — so the degraded answer is the one that stays
  // true under the shipped default.
  let accessEnded = false;
  if (payload.action === 'terminate') {
    try {
      const decision = await featureFlags.resolveFlagAudited(
        deps.notify.serviceDb,
        TERMINATION_ACCESS_BLOCK_FLAG,
        ids.pariwarId(pariwarId),
        { pariwarId },
        now,
        false,
      );
      accessEnded = decision.enabled;
    } catch (err) {
      alarm(
        `[jobs] moderation-notify: termination-access flag lookup failed for pariwar ${pariwarId} — notice will state access is RETAINED (${String(err)})`,
      );
      accessEnded = false;
    }
  }

  const alert = buildModerationAlert({
    moderationActionId: payload.moderationActionId,
    pariwarId,
    memberId: payload.memberId,
    action: payload.action,
    reasonCode: payload.reasonCode,
    locale,
    now,
    accessEnded,
    appealId: payload.appealId,
  });

  const store = idempotency.createKeyedStore(deps.notify.pool);
  const key = `moderation.notify:${pariwarId}:${alertId}:${payload.memberId}`;
  if (await store.claim(key, MODERATION_NOTIFY_IDEMPOTENCY_TTL_SECONDS) !== 'acquired') {
    // Review round 2 (D1 (a), then the patch review's E1 (a)): `claim` cannot tell these apart, so read the row.
    const row = await store.inspect(key);
    if (row?.status === 'completed') {
      // Recorded — even past its TTL, before the vacuum. ⛔ Re-send.
      const prior = row.result as { readonly delivered?: unknown } | null;
      return { notified: true, delivered: prior?.delivered === true, alreadySent: true, alertId };
    }
    const staleBefore = new Date(now.getTime() - MODERATION_NOTIFY_ABANDONED_CLAIM_SECONDS * 1000);
    if (row && row.createdAt.getTime() >= staleBefore.getTime()) { // at exactly the threshold: in flight (takeOver needs OLDER)
      // In flight (or a recording that failed moments ago): ⛔ complete as notified — that would lose the notice silently.
      alarm(
        `[jobs] moderation-notify: notice for member ${payload.memberId} in pariwar ${pariwarId} (action ${payload.action}) is claimed by an attempt still in flight — retrying`,
      );
      throw new Error(`[jobs] moderation-notify: notice still in flight for moderation action ${payload.moderationActionId}`);
    }
    // ABANDONED (a worker died between the claim and the record, or a fan-out hung past pg-boss's expiry), or GONE: take it
    // over and send — in ONE locked statement (F1), so two take-overs cannot both win. At-least-once, as before R3 added the
    // claim: a hung original that later records, or a recording that failed, can mean the notice is sent twice; none loses it.
    if (await store.takeOver(key, MODERATION_NOTIFY_IDEMPOTENCY_TTL_SECONDS, staleBefore) !== 'acquired') {
      // Someone else completed or claimed it in between — read what they left.
      const after = await store.inspect(key);
      if (after?.status === 'completed') {
        const prior = after.result as { readonly delivered?: unknown } | null;
        return { notified: true, delivered: prior?.delivered === true, alreadySent: true, alertId };
      }
      throw new Error(`[jobs] moderation-notify: lost the take-over of an abandoned claim for moderation action ${payload.moderationActionId}`);
    }
    alarm(
      row
        ? `[jobs] moderation-notify: took over an ABANDONED claim for member ${payload.memberId} in pariwar ${pariwarId} (action ${payload.action}) — sending`
        : `[jobs] moderation-notify: the claim for member ${payload.memberId} in pariwar ${pariwarId} (action ${payload.action}) vanished before it was read — re-claimed, sending`,
    );
  }

  let result: Awaited<ReturnType<typeof fanOutAlertToMembers>>['results'][number];
  try {
    const { results, retry } = await fanOutAlertToMembers(
      deps.notify,
      () => alert,
      [payload.memberId],
      pariwarId,
      now,
    );
    // R1: a previous failure still releases and throws. R3: terminal outcomes keep the claim and
    // their PII-free trail, so redelivery cannot silently replace an `in_app_only` record with a send.
    if (retry.length > 0) {
      throw new Error(`[jobs] moderation-notify: notice fan-out failed for moderation action ${payload.moderationActionId}`);
    }
    const first = results[0];
    if (!first) throw new Error('[jobs] moderation-notify: fan-out returned no member result');
    result = first;
  } catch (err) {
    await store.release(key).catch((releaseError: unknown) => {
      alarm(`[jobs] moderation-notify: failed to release the member claim — ${String(releaseError)}`);
    });
    // The moderation action already committed in apps/api; only this notice retries.
    alarm(
      `[jobs] moderation-notify: notice fan-out FAILED for member ${payload.memberId} in pariwar ${pariwarId} (action ${payload.action}) — retrying`,
    );
    throw err;
  }
  // Review round 2, P4: a recording failure AFTER the fan-out keeps the claim and completes — the contribution, news and
  // survey workers' rule. Releasing here would re-send a notice that may already have been delivered. The claim stays
  // `pending`: a redelivery within 10 min of the CLAIM reads it as in flight; a later one takes it over and may re-send (E1 (a)).
  await store.recordResult(key, serializeFanOutResult(result)).catch((err: unknown) => {
    alarm(`[jobs] moderation-notify: failed to record the member result — ${String(err)}`);
  });
  return { notified: true, delivered: result.delivered, alreadySent: false, alertId };
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
