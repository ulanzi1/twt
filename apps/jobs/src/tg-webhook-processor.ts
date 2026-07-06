// Telegram inbound-update processor + opt-in stale-PENDING sweep — Story 5.5 (Task 7; AC4/AC8/AC10).
//
// The async half of the §3.11 ingress split: the apps/api primitive verifies + persists raw Telegram updates;
// THIS worker drains `telegram_inbound_webhook_events` and does the business logic the handler must not:
//   · `/start <code>` → extractStartCode → matchPendingOptIn(code) → PENDING→ACTIVE capturing message.chat.id
//     as chat_id + recordConsent('telegram_opt_in') (audit-or-throw, five-field audit). A code matching no
//     PENDING is logged, no state change.
//   · `/stop` (whole-message, trimmed, case-folded) → the member's ACTIVE opt-in (by chat_id) → REVOKED (+
//     revokeConsent).
//   · a `my_chat_member` update where the user blocked/kicked the bot (new_chat_member.status ∈ {kicked, left})
//     → the ACTIVE opt-in by chat_id → BLOCKED (+ revokeConsent).
//   · a stale-PENDING sweep (default 48h TTL) → EXPIRED (originating_channel: system_expiry, actorId null).
//     NO past-window sweep (there is no window).
//
// Best-effort + isolated (AI-4-3(d)): a broken per-item write logs and continues; the event is marked
// processed regardless (the guards make replays safe) so one bad update never poisons the drain. Runs
// cross-tenant on the BYPASSRLS service pool. Mirrors wa-webhook-processor.ts but simpler (no blind index, no
// window, no status callbacks).
//
// ⚠ Telegram-specific facts (update payload shape, my_chat_member block statuses, the sendMessage/webhook API)
// are indicative — verify against the current Telegram Bot API docs at deploy time (the same caveat 5.3/5.4
// applied to Meta).

import { randomUUID } from 'node:crypto';

import { audit, consent, ids, telegramOptIn, type Db } from '@twt/domain';
import { QUEUE_NAMES, type QueueClient, type Job } from '@twt/queue';
import type pg from 'pg';

/** Default cadence (IST) — near-real-time opt-in processing. Operations policy, overridable via env. */
export const DEFAULT_TELEGRAM_WEBHOOK_PROCESSOR_CRON = '* * * * *'; // every minute
export const TELEGRAM_WEBHOOK_PROCESSOR_TZ = 'Asia/Kolkata';

/** How many events / sweep rows to process per tick (bounded scan). */
const DRAIN_BATCH = 200;
/** Stale-PENDING TTL: a PENDING that never received a `/start` match this long is expired (provisional). */
const DEFAULT_PENDING_TTL_SECONDS = 48 * 60 * 60; // 48h

/** Telegram `my_chat_member` statuses that mean the user blocked/kicked the bot (delivery is impossible). */
const TELEGRAM_BLOCK_STATUSES = new Set(['kicked', 'left']);

/** Zero-width / BOM characters a mobile keyboard can silently insert around pasted or autocorrected text. */
const ZERO_WIDTH_CHARS = /[\u200B-\u200D\uFEFF]/g;

/** True iff the WHOLE trimmed, case-folded message body is `/stop` (never a substring match). */
function isStopCommand(body: string): boolean {
  const normalized = body.normalize('NFKC').replace(ZERO_WIDTH_CHARS, '').trim().toLocaleLowerCase();
  return normalized === '/stop';
}

// ── Five-field audit (AC9) — one writeAuditEntry BEFORE each state write (audit-or-throw) ────────────────

type TelegramOptInOriginatingChannel = telegramOptIn.TelegramOptInOriginatingChannel;

export interface TelegramOptInAuditInput {
  readonly pariwarId: string;
  readonly memberId: string;
  /** Actor: member_id for webhook-matched; null for a system sweep. */
  readonly actorId: string | null;
  readonly originatingChannel: TelegramOptInOriginatingChannel;
  readonly action: string;
  readonly beforeState: string;
  readonly afterState: string;
  /** The matched verification code (webhook-inbound match), or null. NEVER a secret. */
  readonly verificationCode?: string | null;
  /** 200 for the primary transition; 500 for a compensating `*_rolled_back` entry. Defaults to 200. */
  readonly responseStatus?: number;
}

/**
 * Write ONE tamper-evident audit line for an opt-in transition and return its auditId (the SHARED
 * `telegramOptInAuditPayloadHash` encoder — identical to the api routes, no drift). NEVER hash a secret value.
 */
async function auditOptInTransition(pool: pg.Pool, input: TelegramOptInAuditInput): Promise<string> {
  const row = await audit.writeAuditEntry(pool, {
    pariwarId: input.pariwarId,
    actorId: input.actorId,
    actorRole: null,
    action: input.action,
    resourceLocator: `pariwar/${input.pariwarId}/member/${input.memberId}/telegram-opt-in`,
    requestPayloadHash: telegramOptIn.telegramOptInAuditPayloadHash({
      originatingChannel: input.originatingChannel,
      memberId: input.memberId,
      verificationCode: input.verificationCode ?? null,
      beforeState: input.beforeState,
      afterState: input.afterState,
    }),
    responseStatus: input.responseStatus ?? 200,
    traceId: null,
  });
  return row.auditId;
}

/** Write a compensating `*_rolled_back` audit line (status 500) — best-effort, never masks the original error. */
async function writeCompensatingOptInAudit(pool: pg.Pool, input: TelegramOptInAuditInput): Promise<void> {
  try {
    await auditOptInTransition(pool, { ...input, responseStatus: 500 });
  } catch {
    // swallow — the original error is the one the caller must see.
  }
}

export interface TelegramWebhookProcessorDeps {
  /** BYPASSRLS service pool (cross-tenant) — the drain, the domain-table writes, + the audit writer. */
  readonly pool: pg.Pool;
  /** Drizzle handle bound to `pool`. */
  readonly db: Db;
  /** Stale-PENDING TTL override (seconds). */
  readonly pendingTtlSeconds?: number;
}

// ── Loose Telegram-payload narrowing (verify the shape at deploy time) ───────────────────────────────────
interface TelegramChat {
  id?: number | string;
}
interface TelegramMessage {
  text?: string;
  chat?: TelegramChat;
}
interface TelegramChatMemberUpdate {
  chat?: TelegramChat;
  new_chat_member?: { status?: string };
}
interface TelegramUpdate {
  message?: TelegramMessage;
  my_chat_member?: TelegramChatMemberUpdate;
}

/** Normalize a Telegram chat id (number or string) to the string form the opt-in table stores. */
function chatIdToString(chat: TelegramChat | undefined): string | null {
  const raw = chat?.id;
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  if (typeof raw === 'string' && raw.trim() !== '') return raw;
  return null;
}

/**
 * Process ONE persisted webhook event: parse the Telegram update, branch its message / my_chat_member, and
 * drive the opt-in state machine (audit-or-throw). Best-effort — a broken write logs + continues; the event is
 * marked processed by the caller regardless (including an unexpected payload-shape error — a malformed payload
 * must never poison the drain forever).
 */
export async function processWebhookEvent(
  deps: TelegramWebhookProcessorDeps,
  event: { eventId: string; pariwarId: string; rawPayload: unknown },
): Promise<void> {
  const pariwarId = ids.pariwarId(event.pariwarId);

  try {
    await processWebhookEventBody(deps, event, pariwarId);
  } catch (err) {
    console.error('[jobs] tg-webhook: event processing failed unexpectedly (isolated)', err);
  }

  // Mark processed regardless of the above — the transition guards make replays safe; a broken sub-item, or
  // even a malformed top-level payload shape, is retained for forensics but never re-drained forever
  // (AI-4-3(d) "never poison the drain").
  await telegramOptIn.markWebhookEventProcessed(deps.db, ids.telegramInboundWebhookEventId(event.eventId));
}

async function processWebhookEventBody(
  deps: TelegramWebhookProcessorDeps,
  event: { eventId: string; pariwarId: string; rawPayload: unknown },
  pariwarId: ids.PariwarId,
): Promise<void> {
  const update = event.rawPayload as TelegramUpdate;

  // ── Inbound message: `/start <code>` → ACTIVE, or `/stop` → REVOKED ────────────────────────────────
  const message = update?.message;
  if (message && typeof message === 'object') {
    try {
      const body = typeof message.text === 'string' ? message.text : '';
      const chatId = chatIdToString(message.chat);

      if (isStopCommand(body)) {
        // Opt-out: scoped to EVERY ACTIVE opt-in bound to this chat id (a `/stop` carries no code, and there
        // is no DB constraint stopping more than one member from sharing a chat_id) — a `/stop` must revoke
        // all of them, not just the most-recently-matched, or an older binding stays silently ACTIVE.
        if (chatId) {
          const activeRows = await telegramOptIn.listActiveOptInsByChatId(deps.db, { pariwarId, chatId });
          for (const active of activeRows) {
            await revokeActiveOptIn(deps, pariwarId, active, {
              channel: 'telegram_webhook_inbound',
              action: 'member.telegram_opt_in_revoked',
              toState: 'REVOKED',
              reason: 'member sent /stop',
            });
          }
        }
      } else {
        // A candidate opt-in confirmation: extract the code + match a PENDING.
        const code = telegramOptIn.extractStartCode(body);
        if (code && chatId) {
          const pending = await telegramOptIn.matchPendingOptIn(deps.db, {
            pariwarId,
            verificationCode: code,
          });
          if (pending) {
            await activateMatchedOptIn(deps, pariwarId, event.pariwarId, pending, code, chatId);
          } else {
            // Mismatch (code matches no PENDING) — logged, no state change.
            console.warn('[jobs] tg-webhook: inbound /start code matched no PENDING opt-in — surfaced for confirmation');
          }
        }
      }
    } catch (err) {
      console.error('[jobs] tg-webhook: inbound-message processing failed (isolated)', err);
    }
  }

  // ── my_chat_member: the user blocked/kicked the bot → BLOCKED ──────────────────────────────────────
  const chatMember = update?.my_chat_member;
  if (chatMember && typeof chatMember === 'object') {
    try {
      const status = chatMember.new_chat_member?.status;
      const chatId = chatIdToString(chatMember.chat);
      if (status && TELEGRAM_BLOCK_STATUSES.has(status) && chatId) {
        // Block every ACTIVE opt-in bound to this chat id, not just the latest match — same rationale as /stop.
        const activeRows = await telegramOptIn.listActiveOptInsByChatId(deps.db, { pariwarId, chatId });
        for (const active of activeRows) {
          await revokeActiveOptIn(deps, pariwarId, active, {
            channel: 'telegram_webhook_block',
            action: 'member.telegram_opt_in_blocked',
            toState: 'BLOCKED',
            reason: 'user blocked/kicked the bot',
          });
        }
      }
    } catch (err) {
      console.error('[jobs] tg-webhook: my_chat_member processing failed (isolated)', err);
    }
  }
}

/** Match → ACTIVE: audit FIRST, then consent + state (capturing chat_id) in one tx (audit-or-throw). */
async function activateMatchedOptIn(
  deps: TelegramWebhookProcessorDeps,
  pariwarId: ids.PariwarId,
  pariwarIdStr: string,
  pending: { optInId: string; memberId: string },
  code: string,
  chatId: string,
): Promise<void> {
  const consentId = ids.consentId(randomUUID());
  const auditFacts = {
    pariwarId: pariwarIdStr,
    memberId: pending.memberId,
    actorId: pending.memberId,
    originatingChannel: 'telegram_webhook_inbound' as const,
    beforeState: 'PENDING',
    afterState: 'ACTIVE',
    verificationCode: code,
  };
  const auditId = await auditOptInTransition(deps.pool, {
    ...auditFacts,
    action: 'member.telegram_opt_in_activated',
  });
  try {
    await deps.db.transaction(async (tx) => {
      await consent.recordConsent(tx, {
        pariwarId,
        subjectId: pending.memberId,
        consentType: 'telegram_opt_in',
        grantedViaActor: 'member_self',
        consentPayload: { source: 'telegram_webhook_inbound' },
        auditId,
        consentId,
      });
      await telegramOptIn.activateOptIn(tx, {
        pariwarId,
        optInId: ids.memberTelegramOptInId(pending.optInId),
        chatId,
        consentId,
      });
    });
  } catch (err) {
    // Compensating audit: the 'activated' line above is durably committed on deps.pool and SURVIVES this tx's
    // rollback — settle the chain with a rolled-back line rather than leaving an orphan audit asserting ACTIVE.
    await writeCompensatingOptInAudit(deps.pool, {
      ...auditFacts,
      action: 'member.telegram_opt_in_activated_rolled_back',
    });
    throw err;
  }
}

/** Revoke an ACTIVE opt-in (member `/stop` / block): audit FIRST, then consent + state in one tx. */
async function revokeActiveOptIn(
  deps: TelegramWebhookProcessorDeps,
  pariwarId: ids.PariwarId,
  active: { optInId: string; memberId: string; consentId: string | null; verificationCode: string },
  opts: {
    channel: TelegramOptInOriginatingChannel;
    action: string;
    toState: 'REVOKED' | 'BLOCKED';
    reason: string;
  },
): Promise<void> {
  const auditFacts = {
    pariwarId,
    memberId: active.memberId,
    actorId: opts.channel === 'telegram_webhook_block' ? null : active.memberId,
    originatingChannel: opts.channel,
    beforeState: 'ACTIVE',
    afterState: opts.toState,
    verificationCode: active.verificationCode,
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
      await telegramOptIn.revokeOptIn(tx, {
        pariwarId,
        optInId: ids.memberTelegramOptInId(active.optInId),
        toState: opts.toState,
      });
    });
  } catch (err) {
    await writeCompensatingOptInAudit(deps.pool, { ...auditFacts, action: `${opts.action}_rolled_back` });
    throw err;
  }
}

/**
 * The stale-PENDING expiry sweep (AC4; originating_channel: system_expiry). A PENDING that never matched within
 * the TTL → EXPIRED. NO past-window sweep (there is no window). Consent is NOT touched (a PENDING never minted
 * a consent record). Best-effort per row.
 */
export async function runTelegramOptInExpirySweep(
  deps: TelegramWebhookProcessorDeps,
): Promise<{ expiredPending: number }> {
  const ttl = deps.pendingTtlSeconds ?? DEFAULT_PENDING_TTL_SECONDS;
  let expiredPending = 0;

  const stale = await telegramOptIn.listStalePendingOptIns(deps.db, ttl, DRAIN_BATCH);
  for (const row of stale) {
    try {
      await expireOptIn(deps, row);
      expiredPending += 1;
    } catch (err) {
      console.error('[jobs] tg-webhook: stale-PENDING expiry failed (isolated)', err);
    }
  }
  return { expiredPending };
}

/** Transition one PENDING opt-in row → EXPIRED with a system_expiry audit line (actorId null). */
async function expireOptIn(
  deps: TelegramWebhookProcessorDeps,
  row: { optInId: string; pariwarId: string; memberId: string; verificationCode: string },
): Promise<void> {
  const auditFacts = {
    pariwarId: row.pariwarId,
    memberId: row.memberId,
    actorId: null,
    originatingChannel: 'system_expiry' as const,
    beforeState: 'PENDING',
    afterState: 'EXPIRED',
    verificationCode: row.verificationCode,
  };
  const auditId = await auditOptInTransition(deps.pool, { ...auditFacts, action: 'member.telegram_opt_in_expired' });
  void auditId; // the audit line stands alone; EXPIRED does not touch consent, so no id threaded.
  try {
    await telegramOptIn.revokeOptIn(deps.db, {
      pariwarId: ids.pariwarId(row.pariwarId),
      optInId: ids.memberTelegramOptInId(row.optInId),
      toState: 'EXPIRED',
    });
  } catch (err) {
    await writeCompensatingOptInAudit(deps.pool, {
      ...auditFacts,
      action: 'member.telegram_opt_in_expired_rolled_back',
    });
    throw err;
  }
}

/** Drain the webhook queue (bounded) + run the stale-PENDING sweep. Returns the tick summary. */
export async function runTelegramWebhookProcessorTick(
  deps: TelegramWebhookProcessorDeps,
): Promise<{ drained: number; expiredPending: number }> {
  const events = await telegramOptIn.claimUnprocessedWebhookEvents(deps.db, DRAIN_BATCH);
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
      console.error('[jobs] tg-webhook: event drain failed (isolated)', err);
    }
  }
  const sweep = await runTelegramOptInExpirySweep(deps);
  const summary = { drained: events.length, ...sweep };
  console.info('[jobs] tg-webhook-processor', JSON.stringify(summary));
  return summary;
}

/**
 * Register the Telegram webhook-processor queue + worker + cron on the pg-boss client. Mirrors the
 * registerWaWebhookProcessorCron registration shape in boot.ts.
 */
export async function registerTelegramWebhookProcessorCron(
  boss: QueueClient,
  deps: TelegramWebhookProcessorDeps,
  opts: { cron?: string; tz?: string } = {},
): Promise<void> {
  const cron = opts.cron ?? DEFAULT_TELEGRAM_WEBHOOK_PROCESSOR_CRON;
  const tz = opts.tz ?? TELEGRAM_WEBHOOK_PROCESSOR_TZ;
  await boss.createQueue(QUEUE_NAMES.TELEGRAM_WEBHOOK_PROCESSOR);
  await boss.work(QUEUE_NAMES.TELEGRAM_WEBHOOK_PROCESSOR, async (jobs: Job[]) => {
    try {
      const result = await runTelegramWebhookProcessorTick(deps);
      return { jobs: jobs.length, ...result };
    } catch (err) {
      console.error('[jobs] tg-webhook-processor failed', err);
      throw err;
    }
  });
  await boss.schedule(QUEUE_NAMES.TELEGRAM_WEBHOOK_PROCESSOR, cron, {}, { tz });
}
