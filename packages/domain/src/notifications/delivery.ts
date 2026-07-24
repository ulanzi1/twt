// Channel delivery-target resolvers — RELOCATED here by Story 8.8 (Task 1; D4).
//
// The four per-member "where do we actually send this?" reads Epic 5 shipped as composition seams:
// push (5.2), WhatsApp (5.4, dual-gated), SMS (5.6), Telegram (5.5). Story 8.8 is the stack's FIRST
// live `dispatch()` fan-out, and that fan-out is cron/worker-driven so it lives in `apps/jobs`
// (architecture §4.4 :4320 scheduler home) — which CANNOT import `apps/api` (apps/api already depends
// on `@twt/jobs`, so the reverse edge is a turbo cycle).
//
// These reads are DB reads + `@twt/domain` encryption with no Fastify dependency, so `@twt/domain` is
// their natural home. Every original apps/api module re-exports from here, so no apps/api call site
// changed and the four functions have exactly ONE definition (contrast a by-value duplicate in
// apps/jobs, which would drift on Tier-1 PII decryption — D4's rejected alternative).
//
// ── Why this file does NOT import `@twt/channels` ───────────────────────────────────────────────────
// `@twt/channels` already depends on `@twt/domain` (cost-optimization.ts:43), so the reverse edge is a
// cycle. `SendTarget` (channels/src/provider.ts:56-72) is a plain structural interface
// (`{ channel, address, platform?, principalType?, principalId? }`), so {@link DeliveryTarget} declares
// the SAME shape locally and TypeScript's structural typing makes the two assignable without an import.
// A field added to `SendTarget` must be mirrored here — there is a compile-time guard in
// `apps/jobs/tests/contribution-notify.test.ts` that assigns one to the other.
//
// ── The PII boundary is unchanged ───────────────────────────────────────────────────────────────────
// The member's Tier-1 mobile / device token is decrypted HERE (the composition layer), never inside
// `dispatch` / a `ChannelProvider` / an accessor, and a resolved address is NEVER logged.

import type { Db } from '../db.js';
import * as channelConfig from '../channel-config/index.js';
import * as deviceToken from '../device-token/index.js';
import type { FieldCryptoDeps } from '../encryption/field-classes.js';
import { decryptDeviceToken, decryptMobile } from '../encryption/member-fields.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import type {
  DeviceTokenPlatform,
  DeviceTokenPrincipalType,
} from '../schema/member_device_tokens.js';
import * as telegramOptIn from '../telegram-opt-in/index.js';
import * as waOptIn from '../wa-opt-in/index.js';

/**
 * The resolved recipient handle for one channel — the STRUCTURAL twin of `@twt/channels`'
 * `SendTarget`. Declared locally (never imported) because channels→domain already exists and the
 * reverse edge would be a cycle; structural typing makes a `DeliveryTarget` usable wherever a
 * `SendTarget` is expected.
 */
export interface DeliveryTarget {
  readonly channel: 'push' | 'whatsapp' | 'sms' | 'telegram';
  /** Opaque provider address. Tier-1 PII for phone-based channels — never logged in plaintext. */
  readonly address: string;
  /** Push-only: which transport provider to use for this device (fcm vs apns). */
  readonly platform?: DeviceTokenPlatform;
  /** Push-only: the owning principal, so the invalidation seam can scope `markInvalid` to the exact
   *  ownership tuple rather than blind-index alone. */
  readonly principalType?: DeviceTokenPrincipalType;
  readonly principalId?: string;
}

/**
 * Resolve a principal's active push `DeliveryTarget`s (Story 5.2). Reads the active tokens, decrypts
 * each under the SAME (pariwarId, field-class) context they were written under, and sets `platform` so
 * the dispatcher's `selectProvider` routes fcm-vs-apns.
 *
 * ── Multi-device is the CALLER's problem, deliberately ──────────────────────────────────────────────
 * A member can have MANY active tokens; this returns them ALL. The frozen `DeliveryResolver` returns
 * ONE `SendTarget` per channel, so the live fan-out (Story 8.8's `fanOutAlert`) iterates these targets
 * on the push rung itself and treats the rung as `sent` if ANY device accepted. That resolution lives
 * in the COMPOSITION, not here and not in `dispatch`.
 */
export async function resolvePushTargets(
  db: Db,
  encryption: FieldCryptoDeps,
  pariwarIdStr: string,
  principalType: DeviceTokenPrincipalType,
  principalId: string,
): Promise<DeliveryTarget[]> {
  const rows = await deviceToken.listActiveTokens(
    db,
    pariwarIdStr as PariwarId,
    principalType,
    principalId,
  );
  // Promise.allSettled, not Promise.all: one row's decrypt throwing (a context mismatch or corrupt
  // ciphertext) must not sink every OTHER valid device's target — a bad row is dropped + logged, not fatal.
  const settled = await Promise.allSettled(
    rows.map(async (row) => ({
      channel: 'push' as const,
      address: await decryptDeviceToken(row.tokenCiphertext, pariwarIdStr, encryption),
      platform: row.platform as DeviceTokenPlatform,
      // Carried so the invalidation seam can scope `markInvalid` to the EXACT ownership tuple —
      // never invalidate-by-blind-index alone, which two principals could collide on.
      principalType,
      principalId,
    })),
  );
  const targets: DeliveryTarget[] = [];
  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      targets.push(outcome.value);
    } else {
      console.error(
        `[notifications] resolvePushTargets: decrypt failed for a device token (principal=${principalType}:${principalId}) — dropping this row, other targets unaffected:`,
        outcome.reason,
      );
    }
  }
  return targets;
}

/**
 * The dual-gated WhatsApp delivery-resolver read (Story 5.4, AC6). Resolves a WhatsApp target for a
 * member ONLY when BOTH gates pass:
 *   1. the per-Pariwar admin toggle (`pariwar_wa_config.enabled`, Story 5.3), AND
 *   2. the member opt-in is ACTIVE and within the 24h Meta window (`isOptInActive`, Story 5.4).
 * Otherwise `null` (no WA delivery for this member). When both pass, the member's Tier-1 mobile is
 * decrypted HERE (the composition layer) to the recipient number the WA provider addresses.
 */
export async function resolveWaTarget(
  db: Db,
  encryption: FieldCryptoDeps,
  pariwarId: PariwarId,
  memberId: MemberId,
  at?: Date,
): Promise<DeliveryTarget | null> {
  // Gate 1 — the admin toggle (Story 5.3).
  const config = await channelConfig.getWaConfig(db, pariwarId);
  if (!config || !config.enabled) return null;

  // Gate 2 — the member opt-in ACTIVE + within the 24h window (Story 5.4).
  const active = await waOptIn.isOptInActive(db, { pariwarId, memberId, at });
  if (!active) return null;

  // Both gates pass — resolve the member's WhatsApp recipient number (their registered mobile). A
  // member with no identity row (⇒ no number) resolves to null.
  const ciphertext = await waOptIn.getMemberMobileCiphertext(db, { pariwarId, memberId });
  if (!ciphertext) return null;
  // A context-mismatched/corrupt mobile ciphertext must not sink the member's OTHER channels — the
  // caller gathers all four resolvers via Promise.all, so an uncaught throw here would fail push and
  // Telegram too, exactly the isolation `resolvePushTargets` already gives per-device.
  try {
    const address = await decryptMobile(ciphertext, encryption);
    return { channel: 'whatsapp', address };
  } catch (err) {
    console.error(
      `[notifications] resolveWaTarget: mobile decrypt failed (pariwarId=${pariwarId}) — no WA target, other channels unaffected:`,
      err,
    );
    return null;
  }
}

/**
 * The SMS delivery-resolver read (Story 5.6, AC4) — `resolveWaTarget` MINUS the opt-in gate: SMS has
 * NO opt-in (the member's registered KYC mobile IS the address; SMS is a transactional fallback, not a
 * consented channel). Reuses `waOptIn.getMemberMobileCiphertext` — a NEUTRAL member-mobile ciphertext
 * read that merely lives in that module — so SMS is NOT coupled to WA opt-in state.
 */
export async function resolveSmsTarget(
  db: Db,
  encryption: FieldCryptoDeps,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<DeliveryTarget | null> {
  const ciphertext = await waOptIn.getMemberMobileCiphertext(db, { pariwarId, memberId });
  if (!ciphertext) return null;
  // Same isolation rationale as resolveWaTarget — a decrypt failure must not sink push/Telegram too.
  try {
    const address = await decryptMobile(ciphertext, encryption);
    return { channel: 'sms', address };
  } catch (err) {
    console.error(
      `[notifications] resolveSmsTarget: mobile decrypt failed (pariwarId=${pariwarId}) — no SMS target, other channels unaffected:`,
      err,
    );
    return null;
  }
}

/**
 * The dual-gated Telegram delivery-resolver read (Story 5.5, AC5). Resolves a Telegram target ONLY
 * when BOTH the per-Pariwar admin toggle AND the member's ACTIVE opt-in pass. The captured `chat_id`
 * IS the address (no decryption — Telegram carries no PII envelope).
 *
 * Gate 2 reads the OPERATIONAL state (`isOptInActive`), NEVER a consent-registry read: operational-
 * ACTIVE and the consent record are minted/revoked TOGETHER in one tx, but the delivery source of
 * truth is the operational state.
 */
export async function resolveTelegramTarget(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<DeliveryTarget | null> {
  const config = await channelConfig.getTelegramConfig(db, pariwarId);
  if (!config || !config.enabled) return null;

  const active = await telegramOptIn.isOptInActive(db, { pariwarId, memberId });
  if (!active) return null;

  const chatId = await telegramOptIn.getChatIdForMember(db, { pariwarId, memberId });
  if (!chatId) return null;
  return { channel: 'telegram', address: chatId };
}
