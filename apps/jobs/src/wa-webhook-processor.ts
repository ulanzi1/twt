// WhatsApp inbound-webhook processor + opt-in expiry sweep — Story 5.4 (Task 5; AC3/AC4).
//
// The async half of the §3.11 ingress split: the apps/api primitive verifies + persists raw Meta webhooks;
// THIS worker drains `wa_inbound_webhook_events` and does the business logic the handler must not:
//   · Inbound text → compute the sender's mobile_blind_index → matchPendingOptIn by (blind index, phrase) →
//     PENDING→ACTIVE + recordConsent('whatsapp_opt_in') + 24h window (audit-or-throw, 5-field audit).
//   · Inbound STOP/opt-out keyword (whole-message, case-folded allowlist) → the member's ACTIVE opt-in →
//     REVOKED (+ revokeConsent). A STOP from a member with no ACTIVE opt-in is a no-op.
//   · Message-status callback → consume 5.3's mapMetaStatus + upsertWaSendStatus (the Q2 ownership split); a
//     Meta opt-out/block error code additionally drives ACTIVE→BLOCKED_BY_META (+ revokeConsent).
//   · A stale-PENDING / past-24h-window sweep → EXPIRED_24H_WINDOW (originating_channel: system_expiry).
//
// Best-effort + isolated (AI-4-3(d)): a broken per-event write logs and continues; the event is marked
// processed regardless (the guards make replays safe) so one bad event never poisons the drain. Runs
// cross-tenant on the BYPASSRLS service pool (the worker holds no request scope; the accessors take an
// explicit pariwarId + RLS is bypassed on the service login).
//
// ⚠ Meta-specific facts (payload shape, opt-out error codes, keyword set) are indicative — verify against the
// current Meta WhatsApp Cloud API docs at deploy time (the same caveat 5.3 applied to graph version + codes).

import { randomUUID } from 'node:crypto';

import { mapMetaStatus } from '@twt/channels';
import {
  audit,
  channelConfig,
  consent,
  encryption,
  ids,
  waOptIn,
  type Db,
} from '@twt/domain';
import { QUEUE_NAMES, type QueueClient, type Job } from '@twt/queue';
import type pg from 'pg';

/** Default cadence (IST) — near-real-time opt-in processing. Operations policy, overridable via env. */
export const DEFAULT_WA_WEBHOOK_PROCESSOR_CRON = '* * * * *'; // every minute
export const WA_WEBHOOK_PROCESSOR_TZ = 'Asia/Kolkata';

/** The 24h Meta customer-service window, in ms. */
const META_24H_WINDOW_MS = 24 * 60 * 60 * 1000;
/** How many events / sweep rows to process per tick (bounded scan). */
const DRAIN_BATCH = 200;
/** Stale-PENDING TTL: a PENDING that never received an inbound match this long is expired (provisional). */
const DEFAULT_PENDING_TTL_SECONDS = 48 * 60 * 60; // 48h

// ── Mobile blind-index reproduction (MUST match apps/api/src/modules/auth/shared/mobile-index.ts) ────────
// The opt-in row's mobile_blind_index (+ member_identities.mobile_blind_index) is computed at the apps/api
// boundary; the worker MUST reproduce the identical value to match an inbound `from`. apps/jobs cannot import
// apps/api, so the normalization + constants are replicated here — keep them BYTE-IDENTICAL to mobile-index.ts
// (namespace + field class) and context.ts. The HMAC key is the SAME admin-family hmacKeyRef the api uses
// (buildJobsEncryptionDeps is a by-value parallel of buildEncryptionDeps).
const MEMBER_IDENTITY_NAMESPACE = '00000000-0000-0000-0000-000000000001';
const MEMBER_MOBILE_FIELD_CLASS = 'member_mobile';
const INDIAN_MOBILE_CORE = /^[6-9]\d{9}$/;

/**
 * Canonicalise a raw msisdn to E.164 `+91XXXXXXXXXX`, or null if not a valid Indian mobile (mirror
 * mobile-index.ts). Exported (not just used internally) so this app's own test suite can assert it against
 * the SAME fixture table as apps/api's `normalizeMobile` unit test — a shared-expectations regression guard
 * for the "must stay byte-identical" duplication apps/jobs cannot avoid (it cannot import apps/api).
 */
export function normalizeMobile(raw: string): string | null {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (!INDIAN_MOBILE_CORE.test(digits)) return null;
  return `+91${digits}`;
}

export interface WaWebhookEncryption {
  readonly kms: encryption.KmsProvider;
  readonly hmacKeyRef: encryption.KmsKeyRef;
}

/** Deterministic member-mobile blind index for an inbound msisdn, or null when it is not a valid mobile. */
export async function memberMobileBlindIndex(raw: string, enc: WaWebhookEncryption): Promise<string | null> {
  const canonical = normalizeMobile(raw);
  if (canonical === null) return null;
  return encryption.blindIndex(
    MEMBER_MOBILE_FIELD_CLASS,
    canonical,
    { pariwarId: MEMBER_IDENTITY_NAMESPACE },
    enc.kms,
    enc.hmacKeyRef,
  );
}

// ── STOP / opt-out keyword allowlist (whole-message, trimmed, case-folded; NEVER substring) ──────────────
// STOP is WhatsApp's own opt-out keyword; the synonyms + Hindi equivalents are documented here. Verify the
// exact set against Meta's opt-out-keyword docs + the Story 2.1 i18n copy at deploy time.
const STOP_KEYWORDS = new Set(['stop', 'unsubscribe', 'cancel', 'बंद', 'रोको', 'रोकें']);

/** Zero-width / BOM characters a mobile keyboard can silently insert around pasted or autocorrected text. */
const ZERO_WIDTH_CHARS = /[\u200B-\u200D\uFEFF]/g;

/**
 * True iff the WHOLE trimmed, case-folded message body is an opt-out keyword (never a substring match).
 * Normalizes NFKC (compatibility forms) and strips zero-width characters BEFORE the compare, so a legitimate
 * opt-out isn't silently ignored over an encoding artifact the member never intended.
 */
function isStopKeyword(body: string): boolean {
  const normalized = body.normalize('NFKC').replace(ZERO_WIDTH_CHARS, '').trim().toLocaleLowerCase();
  return STOP_KEYWORDS.has(normalized);
}

// ── Meta opt-out / block error codes (statuses[].status='failed') → authoritative BLOCKED_BY_META ────────
// Indicative set — verify against Meta's error-code reference at deploy time. Conservative: only an explicit
// opt-out/undeliverable-by-user-choice code drives BLOCKED_BY_META (a transient failure must NOT revoke).
const WA_BLOCK_ERROR_CODES = new Set([131050, 131049, 131026, 131047]);

// ── Five-field audit (AC4) — one writeAuditEntry BEFORE each state write (audit-or-throw) ────────────────

type WaOptInOriginatingChannel = waOptIn.WaOptInOriginatingChannel;

export interface WaOptInAuditInput {
  readonly pariwarId: string;
  readonly memberId: string;
  /** Actor: member_id for webhook-matched; null for a system sweep. */
  readonly actorId: string | null;
  readonly originatingChannel: WaOptInOriginatingChannel;
  readonly action: string;
  readonly beforeState: string;
  readonly afterState: string;
  /** The matched verification phrase (webhook-inbound match), or null. NEVER a secret. */
  readonly verificationPhrase?: string | null;
  /** 200 for the primary transition; 500 for a P1 compensating `*_rolled_back` entry. Defaults to 200. */
  readonly responseStatus?: number;
}

/**
 * Write ONE tamper-evident audit line for an opt-in transition and return its auditId. The AC4 five fields:
 * timestamp = the chain recorded_at; originating_channel + matched_member_identity + the before/after
 * consent-state snapshot are committed into the requestPayloadHash (the SHARED `waOptInAuditPayloadHash`
 * encoder — identical to the api routes, no drift); audit_id = the returned row's auditId (threaded into the
 * consent + opt-in rows). NEVER hash a secret value.
 */
async function auditOptInTransition(pool: pg.Pool, input: WaOptInAuditInput): Promise<string> {
  const row = await audit.writeAuditEntry(pool, {
    pariwarId: input.pariwarId,
    actorId: input.actorId,
    actorRole: null,
    action: input.action,
    resourceLocator: `pariwar/${input.pariwarId}/member/${input.memberId}/wa-opt-in`,
    requestPayloadHash: waOptIn.waOptInAuditPayloadHash({
      originatingChannel: input.originatingChannel,
      memberId: input.memberId,
      verificationPhrase: input.verificationPhrase ?? null,
      beforeState: input.beforeState,
      afterState: input.afterState,
    }),
    responseStatus: input.responseStatus ?? 200,
    traceId: null,
  });
  return row.auditId;
}

/** Write a P1 compensating `*_rolled_back` audit line (status 500) — best-effort, never masks the original error. */
async function writeCompensatingOptInAudit(pool: pg.Pool, input: WaOptInAuditInput): Promise<void> {
  try {
    await auditOptInTransition(pool, { ...input, responseStatus: 500 });
  } catch {
    // swallow — the original error is the one the caller must see.
  }
}

export interface WaWebhookProcessorDeps {
  /** BYPASSRLS service pool (cross-tenant) — the drain, the domain-table writes, + the audit writer. */
  readonly pool: pg.Pool;
  /** Drizzle handle bound to `pool`. */
  readonly db: Db;
  /** Member-family encryption (kms + admin hmacKeyRef) for the mobile blind index. */
  readonly enc: WaWebhookEncryption;
  /** Injectable clock (deterministic tests). */
  readonly now?: () => Date;
  /** Stale-PENDING TTL override (seconds). */
  readonly pendingTtlSeconds?: number;
}

// ── Loose Meta-payload narrowing (verify the shape at deploy time) ───────────────────────────────────────
interface MetaInboundMessage {
  from?: string;
  type?: string;
  text?: { body?: string };
}
interface MetaStatus {
  id?: string;
  status?: string;
  recipient_id?: string;
  errors?: Array<{ code?: number }>;
}
interface MetaChangeValue {
  messages?: MetaInboundMessage[];
  statuses?: MetaStatus[];
}
interface MetaEntry {
  changes?: Array<{ value?: MetaChangeValue }>;
}
interface MetaWebhookPayload {
  entry?: MetaEntry[];
}

function collectValues(payload: unknown): MetaChangeValue[] {
  const values: MetaChangeValue[] = [];
  const entries = (payload as MetaWebhookPayload)?.entry ?? [];
  if (!Array.isArray(entries)) return values;
  for (const entry of entries) {
    const changes = entry?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      if (change?.value) values.push(change.value);
    }
  }
  return values;
}

/** now()+24h, computed from the DB's clock (not the worker host's) so the 24h window never drifts under clock skew. */
async function resolveWindowExpiresAt(deps: WaWebhookProcessorDeps): Promise<Date> {
  if (deps.now) return new Date(deps.now().getTime() + META_24H_WINDOW_MS);
  const res = await deps.pool.query<{ expires_at: Date }>(
    `SELECT now() + interval '24 hours' AS expires_at`,
  );
  return res.rows[0]!.expires_at;
}

/**
 * Process ONE persisted webhook event: parse the Meta payload, branch its inbound messages + status
 * callbacks, and drive the opt-in state machine (audit-or-throw). Best-effort per sub-item — a broken write
 * logs + continues; the event is marked processed by the caller regardless (including an unexpected payload-
 * shape error — a malformed payload must never poison the drain forever).
 */
export async function processWebhookEvent(
  deps: WaWebhookProcessorDeps,
  event: { eventId: string; pariwarId: string; rawPayload: unknown },
): Promise<void> {
  const pariwarId = ids.pariwarId(event.pariwarId);

  try {
    await processWebhookEventBody(deps, event, pariwarId);
  } catch (err) {
    console.error('[jobs] wa-webhook: event processing failed unexpectedly (isolated)', err);
  }

  // Mark processed regardless of the above — the transition guards make replays safe; a broken sub-item, or
  // even a malformed top-level payload shape, is retained for forensics but never re-drained forever
  // (AI-4-3(d) "never poison the drain").
  await waOptIn.markWebhookEventProcessed(deps.db, ids.waInboundWebhookEventId(event.eventId));
}

async function processWebhookEventBody(
  deps: WaWebhookProcessorDeps,
  event: { eventId: string; pariwarId: string; rawPayload: unknown },
  pariwarId: ids.PariwarId,
): Promise<void> {
  for (const value of collectValues(event.rawPayload)) {
    // ── Inbound messages: match → ACTIVE, or STOP → REVOKED ──────────────────────────────────────────
    for (const msg of value.messages ?? []) {
      try {
        if (msg.type !== 'text') continue; // only text messages carry opt-in confirmations / STOP keywords
        const from = msg.from;
        const body = msg.text?.body ?? '';
        if (!from) continue;
        const blindIndex = await memberMobileBlindIndex(from, deps.enc);
        if (blindIndex === null) {
          console.warn('[jobs] wa-webhook: inbound from a non-Indian-mobile msisdn — ignored');
          continue;
        }

        if (isStopKeyword(body)) {
          // Opt-out: scoped to the member's ACTIVE opt-in (a STOP carries no phrase). No ACTIVE ⇒ no-op.
          const active = await waOptIn.getActiveOptInByMobile(deps.db, { pariwarId, mobileBlindIndex: blindIndex });
          if (!active) continue;
          await revokeActiveOptIn(deps, pariwarId, active, {
            channel: 'meta_webhook_inbound',
            action: 'member.wa_opt_in_revoked',
            toState: 'REVOKED',
            reason: 'member sent STOP',
          });
          continue;
        }

        // Otherwise a candidate opt-in confirmation: extract the phrase + match a PENDING.
        const phrase = waOptIn.extractVerificationPhrase(body);
        if (!phrase) continue; // no phrase → not an opt-in message; ignore.
        const pending = await waOptIn.matchPendingOptIn(deps.db, {
          pariwarId,
          mobileBlindIndex: blindIndex,
          verificationPhrase: phrase,
        });
        if (!pending) {
          // Mismatch (number not on file, or phrase not matching any PENDING) — logged, no state change.
          console.warn('[jobs] wa-webhook: inbound phrase matched no PENDING opt-in — surfaced for confirmation');
          continue;
        }

        // Match → ACTIVE. Audit FIRST, then consent + state in one tx (audit-or-throw).
        const consentId = ids.consentId(randomUUID());
        const auditFacts = {
          pariwarId: event.pariwarId,
          memberId: pending.memberId,
          actorId: pending.memberId,
          originatingChannel: 'meta_webhook_inbound' as const,
          beforeState: 'PENDING',
          afterState: 'ACTIVE',
          verificationPhrase: phrase,
        };
        const auditId = await auditOptInTransition(deps.pool, {
          ...auditFacts,
          action: 'member.wa_opt_in_activated',
        });
        const windowExpiresAt = await resolveWindowExpiresAt(deps);
        try {
          await deps.db.transaction(async (tx) => {
            await consent.recordConsent(tx, {
              pariwarId,
              subjectId: pending.memberId,
              consentType: 'whatsapp_opt_in',
              grantedViaActor: 'member_self',
              consentPayload: { source: 'meta_webhook_inbound' },
              auditId,
              consentId,
            });
            await waOptIn.activateOptIn(tx, {
              pariwarId,
              optInId: pending.optInId,
              windowExpiresAt,
              consentId,
            });
          });
        } catch (err) {
          // P1 (compensating audit): the 'activated' line above is durably committed on deps.pool and
          // SURVIVES this tx's rollback — settle the chain with a rolled-back line rather than leaving an
          // orphan audit asserting ACTIVE when the transition never took effect.
          await writeCompensatingOptInAudit(deps.pool, {
            ...auditFacts,
            action: 'member.wa_opt_in_activated_rolled_back',
          });
          throw err;
        }
      } catch (err) {
        console.error('[jobs] wa-webhook: inbound-message processing failed (isolated)', err);
      }
    }

    // ── Status callbacks: persist mapped status; a block code → BLOCKED_BY_META ───────────────────────
    for (const status of value.statuses ?? []) {
      try {
        if (status.id && status.status) {
          await channelConfig.upsertWaSendStatus(deps.db, {
            wamid: status.id,
            pariwarId,
            state: mapMetaStatus(status.status),
            metaStatus: status.status,
          });
        }
        const isBlock =
          status.status === 'failed' && (status.errors ?? []).some((e) => e.code !== undefined && WA_BLOCK_ERROR_CODES.has(e.code));
        if (isBlock && status.recipient_id) {
          const blindIndex = await memberMobileBlindIndex(status.recipient_id, deps.enc);
          if (blindIndex === null) continue;
          const active = await waOptIn.getActiveOptInByMobile(deps.db, { pariwarId, mobileBlindIndex: blindIndex });
          if (!active) continue;
          await revokeActiveOptIn(deps, pariwarId, active, {
            channel: 'meta_webhook_block',
            action: 'member.wa_opt_in_blocked',
            toState: 'BLOCKED_BY_META',
            reason: 'meta block/opt-out status',
          });
        }
      } catch (err) {
        console.error('[jobs] wa-webhook: status-callback processing failed (isolated)', err);
      }
    }
  }
}

/** Revoke an ACTIVE opt-in (member STOP / admin / Meta block): audit FIRST, then consent + state in one tx. */
async function revokeActiveOptIn(
  deps: WaWebhookProcessorDeps,
  pariwarId: ids.PariwarId,
  active: { optInId: string; memberId: string; consentId: string | null; verificationPhrase: string },
  opts: {
    channel: WaOptInOriginatingChannel;
    action: string;
    toState: 'REVOKED' | 'BLOCKED_BY_META';
    reason: string;
  },
): Promise<void> {
  const auditFacts = {
    pariwarId,
    memberId: active.memberId,
    actorId: opts.channel === 'meta_webhook_block' ? null : active.memberId,
    originatingChannel: opts.channel,
    beforeState: 'ACTIVE',
    afterState: opts.toState,
    verificationPhrase: active.verificationPhrase,
  };
  const auditId = await auditOptInTransition(deps.pool, { ...auditFacts, action: opts.action });
  try {
    await deps.db.transaction(async (tx) => {
      if (active.consentId) {
        await consent.revokeConsent(tx, {
          pariwarId,
          consentId: ids.consentId(active.consentId),
          reason: opts.reason,
          revokedAuditId: auditId,
        });
      }
      await waOptIn.revokeOptIn(tx, {
        pariwarId,
        optInId: ids.memberWaOptInId(active.optInId),
        toState: opts.toState,
      });
    });
  } catch (err) {
    // P1 (compensating audit) — see the ACTIVE-match path above for the rationale.
    await writeCompensatingOptInAudit(deps.pool, { ...auditFacts, action: `${opts.action}_rolled_back` });
    throw err;
  }
}

/**
 * The stale-PENDING / past-24h-window expiry sweep (AC4; originating_channel: system_expiry). A PENDING that
 * never matched within the TTL → EXPIRED_24H_WINDOW; an ACTIVE past its window → EXPIRED_24H_WINDOW. Consent
 * is NOT revoked on window expiry — the member remains opted in; only the Meta delivery window closed (the
 * AC6 gate already blocks delivery via isOptInActive's window check). Best-effort per row.
 */
export async function runWaOptInExpirySweep(deps: WaWebhookProcessorDeps): Promise<{ expiredPending: number; expiredWindow: number }> {
  const ttl = deps.pendingTtlSeconds ?? DEFAULT_PENDING_TTL_SECONDS;
  let expiredPending = 0;
  let expiredWindow = 0;

  const stale = await waOptIn.listStalePendingOptIns(deps.db, ttl, DRAIN_BATCH);
  for (const row of stale) {
    try {
      await expireOptIn(deps, row, 'PENDING');
      expiredPending += 1;
    } catch (err) {
      console.error('[jobs] wa-webhook: stale-PENDING expiry failed (isolated)', err);
    }
  }

  const past = await waOptIn.listExpiredWindowOptIns(deps.db, DRAIN_BATCH);
  for (const row of past) {
    try {
      await expireOptIn(deps, row, 'ACTIVE');
      expiredWindow += 1;
    } catch (err) {
      console.error('[jobs] wa-webhook: past-window expiry failed (isolated)', err);
    }
  }
  return { expiredPending, expiredWindow };
}

/** Transition one opt-in row → EXPIRED_24H_WINDOW with a system_expiry audit line (actorId null). */
async function expireOptIn(
  deps: WaWebhookProcessorDeps,
  row: { optInId: string; pariwarId: string; memberId: string; verificationPhrase: string },
  beforeState: 'PENDING' | 'ACTIVE',
): Promise<void> {
  const auditFacts = {
    pariwarId: row.pariwarId,
    memberId: row.memberId,
    actorId: null,
    originatingChannel: 'system_expiry' as const,
    beforeState,
    afterState: 'EXPIRED_24H_WINDOW',
    verificationPhrase: row.verificationPhrase,
  };
  const auditId = await auditOptInTransition(deps.pool, { ...auditFacts, action: 'member.wa_opt_in_expired' });
  void auditId; // the audit line stands alone; EXPIRED does not touch consent (window-only), so no id threaded.
  try {
    await waOptIn.revokeOptIn(deps.db, {
      pariwarId: ids.pariwarId(row.pariwarId),
      optInId: ids.memberWaOptInId(row.optInId),
      toState: 'EXPIRED_24H_WINDOW',
    });
  } catch (err) {
    // P1 (compensating audit) — see the ACTIVE-match path above for the rationale.
    await writeCompensatingOptInAudit(deps.pool, {
      ...auditFacts,
      action: 'member.wa_opt_in_expired_rolled_back',
    });
    throw err;
  }
}

/** Drain the webhook queue (bounded) + run the expiry sweep. Returns the tick summary (stored in job output). */
export async function runWaWebhookProcessorTick(
  deps: WaWebhookProcessorDeps,
): Promise<{ drained: number; expiredPending: number; expiredWindow: number }> {
  const events = await waOptIn.claimUnprocessedWebhookEvents(deps.db, DRAIN_BATCH);
  for (const event of events) {
    try {
      await processWebhookEvent(deps, {
        eventId: event.eventId,
        pariwarId: event.pariwarId,
        rawPayload: event.rawPayload,
      });
    } catch (err) {
      // A truly-unexpected failure (outside the per-item guards) — log; the event stays unprocessed and
      // retries next tick. Never rethrow into the drain loop.
      console.error('[jobs] wa-webhook: event drain failed (isolated)', err);
    }
  }
  const sweep = await runWaOptInExpirySweep(deps);
  const summary = { drained: events.length, ...sweep };
  console.info('[jobs] wa-webhook-processor', JSON.stringify(summary));
  return summary;
}

/**
 * Register the WA webhook-processor queue + worker + cron on the pg-boss client. Mirrors the
 * registerDeviceTokenCleanupCron registration shape in boot.ts.
 */
export async function registerWaWebhookProcessorCron(
  boss: QueueClient,
  deps: WaWebhookProcessorDeps,
  opts: { cron?: string; tz?: string } = {},
): Promise<void> {
  const cron = opts.cron ?? DEFAULT_WA_WEBHOOK_PROCESSOR_CRON;
  const tz = opts.tz ?? WA_WEBHOOK_PROCESSOR_TZ;
  await boss.createQueue(QUEUE_NAMES.WA_WEBHOOK_PROCESSOR);
  await boss.work(QUEUE_NAMES.WA_WEBHOOK_PROCESSOR, async (jobs: Job[]) => {
    try {
      const result = await runWaWebhookProcessorTick(deps);
      return { jobs: jobs.length, ...result };
    } catch (err) {
      console.error('[jobs] wa-webhook-processor failed', err);
      throw err;
    }
  });
  await boss.schedule(QUEUE_NAMES.WA_WEBHOOK_PROCESSOR, cron, {}, { tz });
}
