// Channel composition seams — apps/api view.
//
// ── RELOCATED to @twt/channels by AI-8-3 (D2) — the PROVIDER composition now lives there ─────────────────────
// The per-channel PROVIDER-selection functions (resolveWhatsappProvider / resolveTelegramProvider /
// resolveSmsProvider + their `*Deps` + the `*CompositionDeps` interfaces) moved VERBATIM into
// `packages/channels/src/composition/provider-composition.ts` so apps/jobs (the stack's first live dispatch()
// fan-out) can compose the provider registry — apps/jobs cannot import apps/api. They call the @twt/channels
// provider factories + return `ChannelProvider`, and @twt/channels already reads @twt/domain's channelConfig,
// so @twt/channels is the lowest shared layer that can host them (§2; @twt/domain can't — it can't import
// channels). This file re-exports them so the `channel-config/index.ts` barrel + the apps/api composition unit
// tests keep working with ZERO call-site change (the Story 8.8 target-resolver re-export precedent, one layer up).
//
// What STAYS here: the delivery-*target* adapters (resolveWaTarget / resolveTelegramTarget / resolveSmsTarget)
// and the cost-optimization read seams — they carry the apps/api `{ db, encryption }` deps shape and are
// unrelated to provider selection (the target reads themselves were relocated to @twt/domain by Story 8.8; these
// are the thin apps/api adapters over that ONE domain implementation).

import { deviceToken, ids, notifications, type Db } from '@twt/domain';
import type { SendTarget } from '@twt/channels';

import type { EncryptionDeps } from '../../context.js';

type PariwarId = ids.PariwarId;
type MemberId = ids.MemberId;

// ── WhatsApp / Telegram / SMS provider composition — RE-EXPORTED from @twt/channels (AI-8-3, D2) ─────────────
// The reusable building blocks the live dispatch resolves each channel's provider through (real-vs-fixture
// selection). apps/api's two composition unit tests + the barrel import these names; the re-export keeps them
// unchanged. The implementation + its own honesty-discipline head-comment now live in @twt/channels.
export {
  resolveWhatsappProvider,
  resolveWhatsappProviderDeps,
  resolveTelegramProvider,
  resolveTelegramProviderDeps,
  resolveSmsProvider,
  resolveSmsProviderDeps,
  type WhatsappCompositionDeps,
  type TelegramCompositionDeps,
  type SmsCompositionDeps,
} from '@twt/channels';

// ── WhatsApp delivery-target adapter — Story 5.4 (Task 7 / AC6); RELOCATED read to @twt/domain by 8.8 ────────

/** What the WA delivery-resolver read needs: a scoped Db + the member-mobile decryption material. */
export interface WaTargetDeps {
  /** RLS-scoped Db (the caller's tenant tx) for the config + opt-in reads. */
  readonly db: Db;
  /** Encryption material to decrypt the member's Tier-1 mobile → the WhatsApp recipient number. */
  readonly encryption: EncryptionDeps;
}

/**
 * The AC6 dual-gated WA delivery-resolver read (Story 5.4) — a thin apps/api adapter over the ONE domain
 * implementation (`notifications.resolveWaTarget`, relocated by Story 8.8 so apps/jobs can call it). Keeps the
 * apps/api `{ db, encryption }` deps shape so no apps/api call site changed. Resolves a WhatsApp `SendTarget`
 * for a member ONLY when both the per-Pariwar admin toggle AND the member opt-in (ACTIVE, within window) pass;
 * otherwise null. The member's Tier-1 mobile is decrypted inside the domain read (never in dispatch/the provider).
 */
export async function resolveWaTarget(
  deps: WaTargetDeps,
  pariwarId: PariwarId,
  memberId: MemberId,
  at?: Date,
): Promise<SendTarget | null> {
  return notifications.resolveWaTarget(deps.db, deps.encryption, pariwarId, memberId, at);
}

// ── Telegram delivery-target adapter — Story 5.5 (AC5); RELOCATED read to @twt/domain by 8.8 ─────────────────

/** What the Telegram delivery-resolver read needs: a scoped Db (no decryption — the chat_id is the address). */
export interface TelegramTargetDeps {
  /** RLS-scoped Db (the caller's tenant tx) for the config + opt-in reads. */
  readonly db: Db;
}

/**
 * The dual-gated Telegram delivery-resolver read (Story 5.5, AC5) — a thin apps/api adapter over the ONE domain
 * implementation (`notifications.resolveTelegramTarget`, relocated by Story 8.8). Resolves a Telegram
 * `SendTarget` for a member ONLY when both the per-Pariwar admin toggle AND the member opt-in (ACTIVE) pass;
 * otherwise null. The captured `chat_id` IS the address (Telegram carries no PII envelope — no decryption).
 */
export async function resolveTelegramTarget(
  deps: TelegramTargetDeps,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<SendTarget | null> {
  return notifications.resolveTelegramTarget(deps.db, pariwarId, memberId);
}

// ── SMS delivery-target adapter — Story 5.6 (AC4); RELOCATED read to @twt/domain by 8.8 ──────────────────────

/** What the SMS delivery-resolver read needs: a scoped Db + the member-mobile decryption material. */
export interface SmsTargetDeps {
  /** RLS-scoped Db (the caller's tenant tx) for the member-mobile ciphertext read. */
  readonly db: Db;
  /** Encryption material to decrypt the member's Tier-1 mobile → the SMS recipient E.164. */
  readonly encryption: EncryptionDeps;
}

/**
 * The SMS delivery-resolver read (Story 5.6, AC4) — a thin apps/api adapter over the ONE domain implementation
 * (`notifications.resolveSmsTarget`, relocated by Story 8.8). SMS has NO opt-in gate (the member's registered
 * KYC mobile IS the address). Resolves an `sms` `SendTarget` by reading + decrypting the member's Tier-1 mobile
 * inside the domain read, or null when the member has no identity row (⇒ no number).
 */
export async function resolveSmsTarget(
  deps: SmsTargetDeps,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<SendTarget | null> {
  return notifications.resolveSmsTarget(deps.db, deps.encryption, pariwarId, memberId);
}

// ── Cost-optimization composition read-seams — Story 5.7 (Task 3; AC4) ───────────────────────────────────────
// The two thin READ-seams the live cost-optimization wrapper resolves its policy inputs through: the member's
// last in-app-engagement instant + the per-Pariwar cost-optimization toggle. app-composition wiring over
// @twt/domain reads (NOT a change to `dispatch` / the frozen `ChannelProvider` port / `CANONICAL_CHANNEL_LADDER`).

/** What the cost-optimization read-seams need: a scoped Db (the engagement + toggle reads run under RLS). */
export interface CostOptimizationCompositionDeps {
  /** RLS-scoped Db (the caller's tenant tx) for the engagement / toggle reads. */
  readonly db: Db;
}

/**
 * Resolve a member's last in-app-engagement instant (Story 5.7 AC4) — a thin wrapper over the pure-domain
 * `getMemberLastEngagementAt` accessor (`MAX(last_seen_at)` over the member's ACTIVE device tokens, the
 * app-open proxy). RLS scopes the read to the Pariwar. Returns `null` when there is no engagement signal (⇒ the
 * policy fails toward reach and does not suppress). Reads only the timestamp — no decrypt.
 */
export async function resolveMemberLastEngagement(
  deps: CostOptimizationCompositionDeps,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<Date | null> {
  // `pariwarId` documents the RLS tenant boundary; the domain accessor is RLS-scoped + member_id-keyed.
  void pariwarId;
  return deviceToken.getMemberLastEngagementAt(deps.db, memberId);
}

/**
 * Resolve the per-Pariwar cost-optimization toggle (Story 5.7 AC4) — currently ALWAYS `false` (OFF).
 *
 * The real per-Pariwar FR-58C flag read + its admin surface + its persistence land at EPIC 10; there is no flag
 * subsystem yet, so this seam returns the FAIL-SAFE default. OFF ⇒ the policy suppresses NOTHING ⇒ full
 * delivery, zero risk of a missed alert. Do NOT add a per-Pariwar toggle DB column/migration/admin form here —
 * that persistence + UI belongs to the FR-58C subsystem at Epic 10. The args are bound for the Epic 10 signature.
 */
export async function resolveCostOptimizationToggle(
  deps: CostOptimizationCompositionDeps,
  pariwarId: PariwarId,
): Promise<boolean> {
  void deps;
  void pariwarId;
  return false;
}
