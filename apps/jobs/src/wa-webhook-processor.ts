// WhatsApp inbound-webhook processor + opt-in expiry sweep — Story 5.4 (Task 5; AC3/AC4).
//
// The async half of the §3.11 ingress split: the apps/api primitive verifies + persists raw Meta webhooks;
// THIS worker drains `wa_inbound_webhook_events` and does the business logic the handler must not:
//   · Inbound text → compute the sender's mobile_blind_index → matchPendingOptIn by (blind index, phrase) →
//     PENDING→ACTIVE + recordConsent('whatsapp_opt_in') + Meta's 24h free-form window end recorded (⛔ the opt-in's end —
//     Story 5.12; audit-or-throw, 5-field audit).
//   · Inbound STOP/opt-out keyword (whole-message, case-folded allowlist) → Story 5.12 (`-364` condition 3): EVERY member
//     whose opt-in rows (any state) carry the sender's number ends their yes — the ACTIVE row → REVOKED and EVERY open
//     whatsapp_opt_in consent row revoked (`endEveryWaYes`); nothing to end ⇒ a no-op. A fault is retried once, then alarmed.
//   · Message-status callback → consume 5.3's mapMetaStatus + upsertWaSendStatus (the Q2 ownership split); Meta's 131050 (a
//     marketing opt-out — the one code that records the person's own request; Story 5.12 LY8) additionally ends the member's
//     yes: ACTIVE→BLOCKED_BY_META + every open consent revoked.
//   · A stale-PENDING sweep → EXPIRED_24H_WINDOW ("a request never confirmed"; originating_channel: system_expiry). Story 5.12
//     (`-364` option A; LY3): an ACTIVE opt-in never expires — a yes lasts until the member takes it back.
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
  claim as claimDomain,
  consent,
  encryption,
  ids,
  smsDelivery,
  waOptIn,
  withPariwarScope,
  type Db,
} from '@twt/domain';
import { QUEUE_NAMES, type QueueClient, type Job } from '@twt/queue';
import type pg from 'pg';

import { recordClaimContactWaStop } from './claim-contact-wa-stop.js';

/** Default cadence (IST) — near-real-time opt-in processing. Operations policy, overridable via env. */
export const DEFAULT_WA_WEBHOOK_PROCESSOR_CRON = '* * * * *'; // every minute
export const WA_WEBHOOK_PROCESSOR_TZ = 'Asia/Kolkata';

/** Meta's 24h free-form (customer-service) window, in ms — recorded on the match; ⛔ the opt-in's end (Story 5.12, LY2). */
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

/** Trailing punctuation a member may type after a keyword (*"STOP."*, *"Stop!"*, *"रोको।"*). */
const TRAILING_STOP_PUNCTUATION = /[.!।,]+$/u;

/**
 * Story 5.12 (LY6 option, Decision 2026-10-21-373) — the MEMBER half's STOP: `isStopKeyword`, OR the same whole message once
 * trailing `[.!।,]` are stripped (⛔ substring matching — *"please stop now"* is ⛔ a STOP). A narrowing of who is messaged.
 * `isStopKeyword` stays byte-unchanged: the claim half reads it (I5 — widening the claim STOP is a separate question).
 */
function isMemberStopKeyword(body: string): boolean {
  if (isStopKeyword(body)) return true;
  const normalized = body.normalize('NFKC').replace(ZERO_WIDTH_CHARS, '').trim().toLocaleLowerCase();
  return STOP_KEYWORDS.has(normalized.replace(TRAILING_STOP_PUNCTUATION, '').trimEnd());
}

// ── Meta opt-out / block error codes (statuses[].status='failed') → authoritative BLOCKED_BY_META ────────
// Indicative set — verify against Meta's error-code reference at deploy time. Since Story 5.12 this set gates ONLY the claim
// half's hash fallback (`isBlock` below); the MEMBER yes ends on `WA_MEMBER_CONSENT_BLOCK_CODES` alone (131050).
const WA_BLOCK_ERROR_CODES = new Set([131050, 131049, 131026, 131047]);

/**
 * Story 5.12 (LY8 (a), Decision 2026-10-21-373) — the codes that end a MEMBER's yes: ONLY 131050. Per Meta's Cloud API error
 * reference (fetched 2026-10-20) 131050 = *"This recipient has chosen to stop receiving marketing messages on WhatsApp from your
 * business"* — a marketing opt-out (⛔ a block), the one code that records the person's own request. 131049 (a per-user
 * marketing cap), 131026 (not reachable on WhatsApp) and 131047 (the free-form window) are ⛔ consent: under a lasting yes
 * (`-364`) they end nothing — each is still recorded by upsertWaSendStatus. `WA_BLOCK_ERROR_CODES` / `isBlock` stay
 * BYTE-UNCHANGED: they also gate the claim half's hash fallback (6.37d WS11 — I5).
 */
const WA_MEMBER_CONSENT_BLOCK_CODES = new Set([131050]);

function isMemberConsentBlock(status: MetaStatus): boolean {
  return status.status === 'failed' && (status.errors ?? []).some((e) => e.code !== undefined && WA_MEMBER_CONSENT_BLOCK_CODES.has(e.code));
}

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
  /**
   * The jobs KMS deps — the member blind index uses `kms` + `hmacKeyRef`; Story 6.37d's claim branch hashes a STOP sender and a
   * block-coded recipient in the LADDER's space (`correctionNumberHash` — the SAME `hmacKeyRef` the ladder uses, so they match).
   */
  readonly enc: encryption.FieldCryptoDeps;
  /** Injectable clock (deterministic tests). */
  readonly now?: () => Date;
  /** Stale-PENDING TTL override (seconds). */
  readonly pendingTtlSeconds?: number;
  /**
   * Story 6.37d round 2 (P4) — the alarm sink (ids only, ⛔ a number). Default `console.warn` — logs only until roster
   * Row 32 (h) names a person, like every claim-contact alarm.
   */
  readonly onAlarm?: (message: string) => void;
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
  /** Story 6.37d (WS11 / T26) — the receiving WhatsApp number; the claim branch acts only when it is the event Pariwar's. */
  metadata?: { phone_number_id?: string };
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

// ── Story 6.37d (WS10, WS11; I7, I8) — the CLAIM branch: before, and independent of, the member lookup ─────────────
// A claim-contact WhatsApp goes to a claimant who may be NO member (F5): a STOP from them must still end claim WhatsApp, a status
// for a claim send lands on THAT send's row, and a block-coded `failed` for a claim send must ⛔ revoke anyone's MEMBER opt-in
// (§3.4 exception: *"does not change any member's opt-in state"*). Every claim read / write runs inside `withPariwarScope(event
// Pariwar)` with an explicit `pariwar_id` filter; the claim-space hash is `correctionNumberHash` over the DOMAIN `normalizeMobile`
// (T21 — ⛔ the member blind index, a different space). Row 5-12 (`-364`) will widen the MEMBER half below; this half is its own.
// 2026-10-21 Story 5.12 — DONE: the member half below now ends every yes on the number (LY6); this claim half is unchanged and
// still runs first.

/**
 * T26 — the claim branch acts ONLY when the change's `metadata.phone_number_id` is the event Pariwar's configured WhatsApp number
 * (the event's Pariwar is the signed URL's — right only if each Pariwar's Meta app posts to its own URL; `phone_number_id` is ⛔
 * unique). A mismatch, or ⛔ metadata, ⇒ ⛔ claim action and a log line (the member path runs as today).
 */
async function claimBranchOpen(deps: WaWebhookProcessorDeps, pariwarId: ids.PariwarId, value: MetaChangeValue): Promise<boolean> {
  const pnid = value.metadata?.phone_number_id;
  if (typeof pnid !== 'string' || pnid.trim() === '') {
    console.warn('[jobs] wa-webhook: claim branch skipped — the change carries no metadata.phone_number_id');
    return false;
  }
  const wa = await withPariwarScope(deps.pool, pariwarId, (db: Db) => channelConfig.getWaConfig(db, pariwarId));
  if (wa === null || (wa.phoneNumberId?.trim() ?? '') !== pnid.trim()) {
    console.warn(`[jobs] wa-webhook: claim branch skipped — the change's phone_number_id is not Pariwar ${pariwarId}'s configured WhatsApp number`);
    return false;
  }
  return true;
}

/** The claim-space hash of a Meta msisdn — `null` when it is ⛔ a valid Indian mobile (⛔ isolation match, ⛔ stop). */
async function claimSpaceHash(raw: string, pariwarId: ids.PariwarId, enc: encryption.FieldCryptoDeps): Promise<string | null> {
  const e164 = encryption.normalizeMobile(raw);
  return e164 === null ? null : claimDomain.correctionNumberHash(e164, pariwarId, enc);
}

async function processWebhookEventBody(
  deps: WaWebhookProcessorDeps,
  event: { eventId: string; pariwarId: string; rawPayload: unknown },
  pariwarId: ids.PariwarId,
): Promise<void> {
  for (const value of collectValues(event.rawPayload)) {
    let claimOpen: boolean | null = null;
    const isClaimBranchOpen = async (): Promise<boolean> => (claimOpen ??= await claimBranchOpen(deps, pariwarId, value));
    // ── Inbound messages: match → ACTIVE, or STOP → REVOKED ──────────────────────────────────────────
    for (const msg of value.messages ?? []) {
      try {
        if (msg.type !== 'text') continue; // only text messages carry opt-in confirmations / STOP keywords
        const from = msg.from;
        const body = msg.text?.body ?? '';
        if (!from) continue;
        // Story 6.37d (WS10) — a STOP ALSO records a claim-contact stop, whether or not the number has a member opt-in. Its own
        // try: a claim-side fault never costs the member their STOP.
        if (isStopKeyword(body)) {
          try {
            if (await isClaimBranchOpen()) {
              const hash = await claimSpaceHash(from, pariwarId, deps.enc);
              if (hash !== null) await recordClaimContactWaStop(deps.pool, { pariwarId, recipientNumberHash: hash, inboundEventId: event.eventId });
            }
          } catch (err) {
            console.error('[jobs] wa-webhook: claim-contact STOP failed to record (isolated)', err);
            // Round 2 (P4, I8 / I10 — ⛔ silent): the drain marks an event processed AT CLAIM (at-most-once — F8), so ⛔ retry
            // reaches this STOP again; the claimant stays eligible for claim WhatsApp until someone acts. Ids only.
            try {
              (deps.onAlarm ?? ((m: string): void => console.warn(m)))(
                `[jobs] wa-webhook: contact_ladder.stop_unrecorded — a claim-contact STOP in Pariwar ${pariwarId} (inbound event ` +
                  `${event.eventId}) could not be recorded and will ⛔ be retried; that number can still receive claim WhatsApp`,
              );
            } catch {
              // ⛔ An alarm sink's own fault must never cost the member their STOP below.
            }
          }
        }
        const blindIndex = await memberMobileBlindIndex(from, deps.enc);
        if (blindIndex === null) {
          console.warn('[jobs] wa-webhook: inbound from a non-Indian-mobile msisdn — ignored');
          continue;
        }

        if (isMemberStopKeyword(body)) {
          // Story 5.12 (`-364` condition 3; LY6) — STOP always works: EVERY member whose opt-in rows (ANY state) carry the
          // number ends their yes, whatever their newest row's state (a STOP carries no phrase). Nothing to end ⇒ ⛔ write.
          // Each member in its OWN try + transaction (T12), retried once, then alarmed — ⛔ rethrown (else the catch below
          // alarms twice). A fault BEFORE this loop (the blind index above, this listing) reaches the catch below.
          const memberIds = await waOptIn.listMemberIdsByOptInMobile(deps.db, { pariwarId, mobileBlindIndex: blindIndex });
          for (const memberId of memberIds) {
            await endMemberYesOnStop(deps, pariwarId, memberId, event.eventId);
          }
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
            // Protect the consent grant as well as PENDING → ACTIVE against every withdrawal path.
            await waOptIn.lockMemberWaYes(tx, { pariwarId, memberId: pending.memberId });
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
        // Story 5.12 (LY6; I3) — a STOP whose member half faulted BEFORE the per-member loop (the blind index, the member
        // listing) is ⛔ silent: the drain is at-most-once (F10a), so ⛔ retry reaches it. Ids only (I7) — the claim half
        // may already have recorded its stop, so the text names the member opt-in only.
        if (msg.type === 'text' && isMemberStopKeyword(msg.text?.body ?? '')) {
          raiseAlarm(
            deps,
            `[jobs] wa-webhook: wa_opt_in.stop_unrecorded — a member WhatsApp STOP in Pariwar ${pariwarId} (inbound event ` +
              `${event.eventId}) could not be applied to the member opt-in and will ⛔ be retried; the yes on that number still stands`,
          );
        }
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
        // Story 6.37d (WS11) — a CLAIM send's status lands on its row (set once) and ⛔ drives BLOCKED_BY_META: matched by
        // wamid, or — a block code with ⛔ wamid match (a lapsed / may-have-sent row, a status drained before the finalise) — by the
        // recipient's CLAIM-space hash against the Pariwar's recent claim sends. A claim-side fault fails THIS item (the member
        // revoke below does ⛔ run — fail closed for I7).
        // Review R4 (2026-10-20) — ⛔ gated on `isClaimBranchOpen()`: that check compares the callback's `phone_number_id`
        // against TODAY's configured number, so a legitimate late callback surviving a number rotation failed it, leaving
        // `claimOwned` false and letting a claim-send failure fall into the MEMBER block path below. Ownership is matched by
        // wamid (globally unique) or the recipient's claim-space hash — both self-scoping, needing ⛔ today's config to be
        // authoritative. Retain ownership across a configuration change instead of re-deriving it from `phone_number_id`.
        // DELIBERATE (Decision 2026-10-20-369 decision 4 — `-367` decision 11 corrected as built): the STATUS branch has ⛔
        // `metadata.phone_number_id` gate; only the STOP branch above keeps it. Accepted costs: a callback with a mismatched
        // or absent `phone_number_id` can still write `delivered_at` / `failed_at` on THIS Pariwar's own wamid-matched row; and
        // the hash fallback can claim a MEMBER send's block on a number that had a claim send in the last 7 days (that
        // member's BLOCKED_BY_META is ⛔ recorded — a deferred item). RE-EXAMINE when: a Pariwar's webhook URL can carry
        // another tenant's events, or row 5-12 / the `WA_BLOCK_ERROR_CODES` item reworks the member block path.
        // 2026-10-21 Story 5.12 — row 5-12 REWORKED the member block path (LY8 (a)): only 131050 ends a member yes, gated by
        // `isMemberConsentBlock` below; everything above (incl. `isBlock` and the hash fallback) is unchanged. The fallback's
        // member cost stays (bounded to 7 days; its fix needs a send-time wamid record for alert sends — the WS11 item).
        let claimOwned = false;
        if (status.id && status.status) {
          const firstCode = (status.errors ?? []).find((e) => typeof e.code === 'number')?.code ?? null;
          const written = await withPariwarScope(deps.pool, pariwarId, (db: Db) =>
            claimDomain.recordClaimContactWaStatus(db, { pariwarId, wamid: status.id!, status: status.status!, errorCode: firstCode }),
          );
          claimOwned = written.matched;
          if (!claimOwned && isBlock && status.recipient_id) {
            const hash = await claimSpaceHash(status.recipient_id, pariwarId, deps.enc);
            if (hash !== null) {
              claimOwned = await withPariwarScope(deps.pool, pariwarId, (db: Db) =>
                claimDomain.hasRecentClaimContactWaSendTo(db, { pariwarId, recipientNumberHash: hash }),
              );
            }
          }
        }
        if (isMemberConsentBlock(status) && status.recipient_id && !claimOwned) {
          // Story 5.12 (LY8 (a)) — the recipient's ACTIVE row only (a 131050 on a number with ⛔ standing yes ends nothing);
          // on a hit the member's whole yes ends (every open consent too).
          const blindIndex = await memberMobileBlindIndex(status.recipient_id, deps.enc);
          if (blindIndex === null) continue;
          const active = await waOptIn.getActiveOptInByMobile(deps.db, { pariwarId, mobileBlindIndex: blindIndex });
          if (!active) continue;
          await endMemberWaYes(deps, pariwarId, ids.memberId(active.memberId), {
            channel: 'meta_webhook_block',
            action: 'member.wa_opt_in_blocked',
            toState: 'BLOCKED_BY_META',
            reason: 'meta 131050 — the recipient stopped marketing messages from the Trust',
          });
        }
      } catch (err) {
        console.error('[jobs] wa-webhook: status-callback processing failed (isolated)', err);
      }
    }
  }
}

/** The alarm sink (ids only — I7); a sink's own fault never costs the caller anything. */
function raiseAlarm(deps: WaWebhookProcessorDeps, message: string): void {
  try {
    (deps.onAlarm ?? ((m: string): void => console.warn(m)))(message);
  } catch {
    // ⛔ An alarm sink's own fault must never cost a member their STOP.
  }
}

/** What one attempt to end a member's yes did. `lost_race`: another path ended it between the read and the write. */
type EndMemberYesOutcome = 'ended' | 'nothing_to_end' | 'lost_race';

/**
 * Story 5.12 (`-364` condition 4; LY5) — end ONE member's WhatsApp yes (member STOP / Meta 131050). Its OWN `deps.db`
 * transaction holds the member lock across the snapshot and both mutations. ONE audit line commits FIRST on a separate
 * connection (satisfying `revoked_audit_id`), then `endEveryWaYes` moves the ACTIVE row and revokes EVERY open consent.
 * Nothing to end (⛔
 * ACTIVE row, ⛔ open consent) ⇒ ⛔ write, ⛔ audit. Snapshot: an ACTIVE row ⇒ `ACTIVE → toState`; else the newest row's state
 * on both sides (an auditor reads "consent closed, state unchanged"). A fault after the audit line ⇒ a compensating
 * `_rolled_back` line, rethrown; a lost race (`{ null, 0 }`) ⇒ the compensation and `lost_race` — ⛔ a fault, ⛔ alarm.
 */
async function endMemberWaYes(
  deps: WaWebhookProcessorDeps,
  pariwarId: ids.PariwarId,
  memberId: ids.MemberId,
  opts: {
    channel: WaOptInOriginatingChannel;
    action: string;
    toState: 'REVOKED' | 'BLOCKED_BY_META';
    reason: string;
  },
): Promise<EndMemberYesOutcome> {
  let writtenAudit: WaOptInAuditInput | undefined;
  let outcome: EndMemberYesOutcome;
  try {
    outcome = await deps.db.transaction(async (tx): Promise<EndMemberYesOutcome> => {
      // Snapshot and both writes share the lock with activation, even if there is no ACTIVE row yet.
      await waOptIn.lockMemberWaYes(tx, { pariwarId, memberId });
      const active = await waOptIn.getActiveOptInForMember(tx, { pariwarId, memberId });
      if (!active && !(await waOptIn.hasAnythingToEnd(tx, { pariwarId, memberId }))) return 'nothing_to_end';
      const snapshot = active ?? (await waOptIn.getOptInForMember(tx, { pariwarId, memberId }));
      const stateBefore = snapshot?.state ?? 'none';
      const facts: WaOptInAuditInput = {
        pariwarId,
        memberId,
        actorId: opts.channel === 'meta_webhook_block' ? null : memberId,
        originatingChannel: opts.channel,
        beforeState: stateBefore,
        afterState: active ? opts.toState : stateBefore,
        verificationPhrase: snapshot?.verificationPhrase ?? null,
        action: opts.action,
      };
      const auditId = await auditOptInTransition(deps.pool, facts);
      writtenAudit = facts;
      const result = await waOptIn.endEveryWaYes(tx, {
        pariwarId, memberId, toState: opts.toState, reason: opts.reason, revokedAuditId: auditId,
      });
      return result.movedOptInId === null && result.consentsRevoked === 0 ? 'lost_race' : 'ended';
    });
  } catch (err) {
    // Compensate only an intent that actually committed, including a failed state-transaction COMMIT.
    if (writtenAudit) await writeCompensatingOptInAudit(deps.pool, { ...writtenAudit, action: `${opts.action}_rolled_back` });
    throw err;
  }
  if (outcome === 'lost_race' && writtenAudit) {
    // LY5 — ⛔ audit line asserts a transition that did not happen.
    await writeCompensatingOptInAudit(deps.pool, { ...writtenAudit, action: `${opts.action}_rolled_back` });
  }
  return outcome;
}

/**
 * Story 5.12 (LY6; I3) — a member STOP: `endMemberWaYes`, RETRIED ONCE in a fresh transaction (each attempt writes its own
 * primary line), then `wa_opt_in.stop_unrecorded` through `deps.onAlarm` (ids only — I7). ⛔ rethrows: the next member on the
 * number still gets their STOP, and the per-message catch must ⛔ alarm a second time. Residual (Decision 2026-10-21-373, PQ1 —
 * told to the Panel): the drain is at-most-once, so a STOP that faults twice stays unrecorded until a person acts on the alarm.
 */
async function endMemberYesOnStop(deps: WaWebhookProcessorDeps, pariwarId: ids.PariwarId, memberId: ids.MemberId, inboundEventId: string): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await endMemberWaYes(deps, pariwarId, memberId, {
        channel: 'meta_webhook_inbound',
        action: 'member.wa_opt_in_revoked',
        toState: 'REVOKED',
        reason: 'member sent STOP',
      });
      return;
    } catch (err) {
      console.error(`[jobs] wa-webhook: member STOP attempt ${attempt} failed (isolated)`, err);
    }
  }
  raiseAlarm(
    deps,
    `[jobs] wa-webhook: wa_opt_in.stop_unrecorded — a member WhatsApp STOP in Pariwar ${pariwarId} (inbound event ${inboundEventId}, ` +
      `member ${memberId}) failed twice and will ⛔ be retried; that member's WhatsApp yes still stands`,
  );
}

/**
 * The stale-PENDING expiry sweep (AC4; originating_channel: system_expiry). A PENDING that never matched within the TTL →
 * EXPIRED_24H_WINDOW (now meaning "a request never confirmed" — ⛔ a yes; ⛔ consent exists to touch). Story 5.12 (`-364`
 * option A; LY3): the past-window ACTIVE half is GONE — a yes lasts until withdrawn, and the database refuses ACTIVE →
 * EXPIRED (trigger `member_wa_opt_in_no_active_expiry`). Best-effort per row.
 */
export async function runWaOptInExpirySweep(deps: WaWebhookProcessorDeps): Promise<{ expiredPending: number }> {
  const ttl = deps.pendingTtlSeconds ?? DEFAULT_PENDING_TTL_SECONDS;
  let expiredPending = 0;

  const stale = await waOptIn.listStalePendingOptIns(deps.db, ttl, DRAIN_BATCH);
  for (const row of stale) {
    try {
      await expireOptIn(deps, row);
      expiredPending += 1;
    } catch (err) {
      console.error('[jobs] wa-webhook: stale-PENDING expiry failed (isolated)', err);
    }
  }
  return { expiredPending };
}

/** Transition one stale PENDING row → EXPIRED_24H_WINDOW with a system_expiry audit line (actorId null). */
async function expireOptIn(
  deps: WaWebhookProcessorDeps,
  row: { optInId: string; pariwarId: string; memberId: string; verificationPhrase: string },
): Promise<void> {
  const auditFacts = {
    pariwarId: row.pariwarId,
    memberId: row.memberId,
    actorId: null,
    originatingChannel: 'system_expiry' as const,
    beforeState: 'PENDING',
    afterState: 'EXPIRED_24H_WINDOW',
    verificationPhrase: row.verificationPhrase,
  };
  const auditId = await auditOptInTransition(deps.pool, { ...auditFacts, action: 'member.wa_opt_in_expired' });
  void auditId; // the audit line stands alone; a PENDING has ⛔ consent to touch, so no id threaded.
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
): Promise<{ drained: number; expiredPending: number; refused?: true }> {
  // Story 6.37d (WS11) — under an RLS-bound role every cross-tenant read returns ⛔ row SILENTLY: the claim branch's lookup by
  // wamid would miss and a block code would REVOKE the member's opt-in (I7) — silently. Refuse BEFORE any event is claimed (⛔
  // marked processed) — ⛔ a fall-through to the member path (6.37c's `canReadAcrossPariwars` guard; roster Row 26).
  if (!(await smsDelivery.canReadAcrossPariwars(deps.pool))) {
    console.warn('[jobs] wa-webhook: REFUSED — the pool role cannot read across Pariwars (roster Row 26); ⛔ event claimed');
    return { drained: 0, expiredPending: 0, refused: true };
  }
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
