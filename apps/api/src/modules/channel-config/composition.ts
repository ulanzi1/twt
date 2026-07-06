// WhatsApp provider composition seam — Story 5.3 (Task 6; AC1, AC2).
//
// The reusable building block the (future) live dispatch resolves the `whatsapp` provider through — mirrors
// Story 5.2's `resolvePushTargets` (a composition seam exported for a live fan-out that does NOT exist
// yet: through 5.4 `dispatch()` is a primitive with NO live call site — [[project_channels_no_live_dispatch_yet]]).
// This is app-composition wiring, NOT a change to `dispatch` / the frozen `ChannelProvider` port.
//
// ── What this seam does (AC1, AC2) ─────────────────────────────────────────────────────────────────────
// Given a Pariwar + an alert category, it resolves the per-Pariwar WA config + the approved UTILITY
// template + the resolved access token, builds a per-Pariwar WA client (cached by pariwar_id), and returns
// a `ChannelProvider` — the REAL Meta provider when fully provisioned, else the log-only FIXTURE (the
// opt-in-real convention: an absent config row / `enabled=false` / a blank credential NAME / no approved
// template ⇒ fixture, so the stack boots with ZERO Meta config in dev/CI). `createWhatsappProvider(null)`
// makes the real-vs-fixture selection — it never leaks into `dispatch` (the dispatcher stays policy-agnostic).
//
// ── What this seam does NOT do (the boundaries) ────────────────────────────────────────────────────────
//   · It does NOT enforce the DUAL GATE (admin toggle AND member opt-in). Whether to ATTEMPT WA delivery to
//     a member is the DeliveryResolver's job (member opt-in ACTIVE is Story 5.4; the config `enabled` toggle
//     is this story's admin gate). The provider selection here only decides real-vs-fixture TRANSPORT.
//   · It does NOT run a live fan-out — there is no live `dispatch` call site yet. This is a building block.
//   · It never logs/audits the resolved token value (only the NAME pointer is safe — AI-4-3(c)).
//
// ── Infra failure vs. "not provisioned" (deliberate — do NOT swallow) ─────────────────────────────────────
// `getWaConfig` / `resolveApprovedTemplate` / `resolveSecret` are NOT wrapped in try/catch. Only the
// explicit "not provisioned" states above (no config row, toggle off, blank credential/phone-number-id, no
// approved template) resolve to `null` ⇒ fixture. A DB or Secret Manager OUTAGE must propagate as a
// rejection, not silently degrade to the fixture — swallowing it would mask a real outage behind a log-only
// no-op send (dishonest, the opposite of this story's "no fabricated success" discipline). Whoever wires the
// live dispatch call site (5.4+) is responsible for deciding how a rejection here is surfaced/retried.

import { channelConfig, ids, telegramOptIn, waOptIn, type Db } from '@twt/domain';
import {
  createTelegramProvider,
  createWhatsappProvider,
  type ChannelProvider,
  type SendTarget,
  type TelegramAppCache,
  type WhatsappAppCache,
} from '@twt/channels';

import type { EncryptionDeps } from '../../context.js';
import { decryptMobile } from '../auth/shared/mobile-index.js';

type PariwarId = ids.PariwarId;
type MemberId = ids.MemberId;

/** What the composition seam needs: a scoped Db, the process WA client cache, and a secret resolver. */
export interface WhatsappCompositionDeps {
  /** RLS-scoped Db (the caller's tenant tx) for the config/template reads. */
  readonly db: Db;
  /** The per-process WA client cache (whatsapp-app.ts) — one client per pariwar_id, built lazily. */
  readonly appCache: WhatsappAppCache;
  /**
   * Resolve a Secret-Manager NAME → the token VALUE (production: `resolveSecretValue(name, { envFallback })`
   * from @twt/domain; local dev: an env fallback). Injected so the seam is testable without Secret Manager.
   */
  readonly resolveSecret: (secretName: string) => Promise<string>;
}

/**
 * Resolve the REAL WA provider deps for a (Pariwar, category), or `null` when the channel is not fully
 * provisioned for a live Meta send (⇒ the caller falls back to the fixture). Returns null when: no config
 * row, the admin toggle is off, the credential NAME / phone_number_id is blank, or the category has no
 * `approved` UTILITY template (not WA-eligible). The token is resolved LAST (only once every gate passes)
 * and never logged.
 */
export async function resolveWhatsappProviderDeps(
  deps: WhatsappCompositionDeps,
  pariwarId: PariwarId,
  alertCategory: string,
): Promise<{ messaging: ReturnType<WhatsappAppCache['messagingFor']>; template: { name: string; languageCode: string } } | null> {
  const config = await channelConfig.getWaConfig(deps.db, pariwarId);
  if (
    !config ||
    !config.enabled ||
    !config.accessTokenSecretName ||
    config.accessTokenSecretName.trim() === '' ||
    !config.phoneNumberId ||
    config.phoneNumberId.trim() === ''
  ) {
    return null;
  }

  // A category with no `approved` template is NOT WA-eligible — the real send cannot be built (Meta requires
  // a registered template). Fall back to the fixture (the caller passes null → createWhatsappProvider).
  const template = await channelConfig.resolveApprovedTemplate(deps.db, pariwarId, alertCategory);
  if (!template) return null;

  const accessToken = await deps.resolveSecret(config.accessTokenSecretName);
  const messaging = deps.appCache.messagingFor(pariwarId, {
    phoneNumberId: config.phoneNumberId,
    accessToken,
    graphApiVersion: config.graphApiVersion,
  });
  return { messaging, template: { name: template.templateName, languageCode: template.languageCode } };
}

/**
 * Resolve the `whatsapp` `ChannelProvider` for a (Pariwar, category): the REAL Meta provider when fully
 * provisioned, else the log-only fixture. Always returns a provider (fixture on the null path) — the
 * real-vs-fixture selection is `createWhatsappProvider`'s (kept OUT of `dispatch`).
 */
export async function resolveWhatsappProvider(
  deps: WhatsappCompositionDeps,
  pariwarId: PariwarId,
  alertCategory: string,
): Promise<ChannelProvider> {
  const providerDeps = await resolveWhatsappProviderDeps(deps, pariwarId, alertCategory);
  return createWhatsappProvider(providerDeps);
}

/** What the WA delivery-resolver read needs: a scoped Db + the member-mobile decryption material. */
export interface WaTargetDeps {
  /** RLS-scoped Db (the caller's tenant tx) for the config + opt-in reads. */
  readonly db: Db;
  /** Encryption material to decrypt the member's Tier-1 mobile → the WhatsApp recipient number. */
  readonly encryption: EncryptionDeps;
}

/**
 * The AC6 dual-gated WA delivery-resolver read (Story 5.4) — closes the Story 5.3 seam that "resolved no
 * member target until 5.4 lands its ACTIVE-state read". Resolves a WhatsApp `SendTarget` for a member ONLY
 * when BOTH gates pass:
 *   1. the per-Pariwar admin toggle (`pariwar_wa_config.enabled`, Story 5.3), AND
 *   2. the member opt-in is ACTIVE and within the 24h Meta window (`isOptInActive`, this story).
 * Otherwise returns `null` (no WA delivery for this member). When both pass, the member's Tier-1 mobile is
 * decrypted HERE (the composition layer — never inside `dispatch` / the provider; mirrors resolvePushTargets)
 * to the recipient number the WA provider's `toMsisdn` addresses.
 *
 * ── Frozen-shape discipline ([[project_channels_no_live_dispatch_yet]]) ──────────────────────────────────
 * This is a reusable composition READ — it does NOT modify `DeliveryResolver` / `dispatch` / `ChannelProvider`
 * / `CANONICAL_CHANNEL_LADDER`, and there is still NO live `dispatch` call site (5.2/5.3 posture). Whoever
 * wires the live fan-out consumes this read.
 */
export async function resolveWaTarget(
  deps: WaTargetDeps,
  pariwarId: PariwarId,
  memberId: MemberId,
  at?: Date,
): Promise<SendTarget | null> {
  // Gate 1 — the admin toggle (Story 5.3).
  const config = await channelConfig.getWaConfig(deps.db, pariwarId);
  if (!config || !config.enabled) return null;

  // Gate 2 — the member opt-in ACTIVE + within the 24h window (this story).
  const active = await waOptIn.isOptInActive(deps.db, { pariwarId, memberId, at });
  if (!active) return null;

  // Both gates pass — resolve the member's WhatsApp recipient number (their registered mobile). Decrypt in
  // the composition layer; a member with no identity row (⇒ no number) resolves to null.
  const ciphertext = await waOptIn.getMemberMobileCiphertext(deps.db, { pariwarId, memberId });
  if (!ciphertext) return null;
  const address = await decryptMobile(ciphertext, deps.encryption);
  return { channel: 'whatsapp', address };
}

// ── Telegram composition seam — Story 5.5 (Task 8; AC1, AC5) ─────────────────────────────────────────────
// The Telegram twin of the WhatsApp seam above: a reusable building block the (future) live dispatch resolves
// the `telegram` MIRROR side-channel through. This is app-composition wiring, NOT a change to `dispatch` / the
// frozen `ChannelProvider` port ([[project_channels_no_live_dispatch_yet]]) — there is still NO live dispatch
// call site. Telegram is a fire-and-forget side-channel: no fallback ladder fires on a failure.

/** What the Telegram composition seam needs: a scoped Db, the process Telegram client cache, + a secret resolver. */
export interface TelegramCompositionDeps {
  /** RLS-scoped Db (the caller's tenant tx) for the config read. */
  readonly db: Db;
  /** The per-process Telegram client cache (telegram-app.ts) — one client per pariwar_id, built lazily. */
  readonly appCache: TelegramAppCache;
  /** Resolve a Secret-Manager NAME → the bot-token VALUE. Injected so the seam is testable without Secret Manager. */
  readonly resolveSecret: (secretName: string) => Promise<string>;
}

/**
 * Resolve the REAL Telegram provider deps for a Pariwar, or `null` when the channel is not fully provisioned
 * for a live send (⇒ the caller falls back to the fixture). Returns null when: no config row, the admin toggle
 * is off, or the bot-token NAME is blank. The token is resolved LAST (only once every gate passes) and never
 * logged. Note: unlike WhatsApp there is NO per-category template gate (Telegram sends free text) — the
 * announcements-only eligibility already lives in dispatch.ts, not here.
 */
export async function resolveTelegramProviderDeps(
  deps: TelegramCompositionDeps,
  pariwarId: PariwarId,
): Promise<{ messaging: ReturnType<TelegramAppCache['messagingFor']> } | null> {
  const config = await channelConfig.getTelegramConfig(deps.db, pariwarId);
  if (
    !config ||
    !config.enabled ||
    !config.botTokenSecretName ||
    config.botTokenSecretName.trim() === ''
  ) {
    return null;
  }

  const botToken = await deps.resolveSecret(config.botTokenSecretName);
  const messaging = deps.appCache.messagingFor(pariwarId, { botToken });
  return { messaging };
}

/**
 * Resolve the `telegram` `ChannelProvider` for a Pariwar: the REAL Telegram provider when fully provisioned,
 * else the log-only fixture. Always returns a provider (fixture on the null path) — the real-vs-fixture
 * selection is `createTelegramProvider`'s (kept OUT of `dispatch`).
 */
export async function resolveTelegramProvider(
  deps: TelegramCompositionDeps,
  pariwarId: PariwarId,
): Promise<ChannelProvider> {
  const providerDeps = await resolveTelegramProviderDeps(deps, pariwarId);
  return createTelegramProvider(providerDeps);
}

/** What the Telegram delivery-resolver read needs: a scoped Db (no decryption — the chat_id is the address). */
export interface TelegramTargetDeps {
  /** RLS-scoped Db (the caller's tenant tx) for the config + opt-in reads. */
  readonly db: Db;
}

/**
 * The dual-gated Telegram delivery-resolver read (Story 5.5, AC5). Resolves a Telegram `SendTarget` for a
 * member ONLY when BOTH gates pass:
 *   1. the per-Pariwar admin toggle (`pariwar_telegram_config.enabled`, the FR-58C v1 flag), AND
 *   2. the member opt-in is ACTIVE (`isOptInActive` — just `state === 'ACTIVE'`, NO window check).
 * Otherwise returns `null` (no Telegram delivery for this member). When both pass, the captured `chat_id` IS
 * the `SendTarget.address` (no decryption — Telegram carries no PII envelope).
 *
 * ── Consent vs. operational delivery state (the load-bearing invariant) ──────────────────────────────────
 * Gate 2 reads the OPERATIONAL state (`isOptInActive`), NEVER a consent-registry read. Operational-ACTIVE and
 * the consent record are minted/revoked TOGETHER in one tx (the worker's audit-or-throw), so operational-ACTIVE
 * ⟺ valid consent — but the delivery source of truth is the operational state, never `consentExists`.
 *
 * ── Frozen-shape discipline ([[project_channels_no_live_dispatch_yet]]) ──────────────────────────────────
 * A reusable composition READ — it does NOT modify `DeliveryResolver` / `dispatch` / `ChannelProvider` /
 * `CANONICAL_CHANNEL_LADDER`, and there is still NO live `dispatch` call site.
 */
export async function resolveTelegramTarget(
  deps: TelegramTargetDeps,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<SendTarget | null> {
  // Gate 1 — the admin toggle (the FR-58C v1 flag).
  const config = await channelConfig.getTelegramConfig(deps.db, pariwarId);
  if (!config || !config.enabled) return null;

  // Gate 2 — the member opt-in ACTIVE (operational state; no window).
  const active = await telegramOptIn.isOptInActive(deps.db, { pariwarId, memberId });
  if (!active) return null;

  // Both gates pass — the captured chat_id is the delivery address (no decryption).
  const chatId = await telegramOptIn.getChatIdForMember(deps.db, { pariwarId, memberId });
  if (!chatId) return null;
  return { channel: 'telegram', address: chatId };
}
