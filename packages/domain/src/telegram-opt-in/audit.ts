// Telegram opt-in five-field audit encoding — Story 5.5 (Task 3; AC9/AC10).
//
// The SINGLE authority for the audit-payload hash so the apps/api member/admin routes and the apps/jobs
// webhook worker encode the five fields IDENTICALLY (no drift — mirrors waOptInAuditPayloadHash). This is the
// pure hash-builder ONLY — the caller writes the audit line via `writeAuditEntry` (its own advisory-locked tx)
// and threads the returned auditId. The five fields map: `timestamp` = the chain recorded_at (the writer sets
// it); `originating_channel` + `matched_member_identity` + `current_consent_state_snapshot` (before/after) are
// committed here into the requestPayloadHash; `audit_id` = the written row's id. NEVER hash a secret value.

import { createHash } from 'node:crypto';

import { canonicalJsonStringify } from '../canonical-json.js';

/**
 * The `originating_channel` values (AC9). system_expiry = time-based sweep (actorId null). Unlike WhatsApp,
 * there is no trustee `admin_action` force-opt-out in this story's scope — do not add it back without a
 * route/worker path that actually emits it.
 */
export const TELEGRAM_OPT_IN_ORIGINATING_CHANNELS = [
  'member_app',
  'telegram_webhook_inbound',
  'telegram_webhook_block',
  'system_expiry',
] as const;
export type TelegramOptInOriginatingChannel = (typeof TELEGRAM_OPT_IN_ORIGINATING_CHANNELS)[number];

export interface TelegramOptInAuditFacts {
  readonly originatingChannel: TelegramOptInOriginatingChannel;
  /** The matched member's id (the matched_member_identity field). */
  readonly memberId: string;
  /** The matched verification code (webhook-inbound), or null. A random token — NEVER a secret. */
  readonly verificationCode?: string | null;
  /** The opt-in state BEFORE the transition (`none` for a first mint). */
  readonly beforeState: string;
  /** The opt-in state AFTER the transition. */
  readonly afterState: string;
}

/**
 * SHA-256 hex over the canonical JSON of the NON-secret transition facts (the three encoded fields). This IS
 * the `requestPayloadHash` passed to `writeAuditEntry` — the hash commits to originating_channel +
 * matched_member_identity + the before/after consent-state snapshot, making every transition independently
 * auditable + tamper-evident.
 */
export function telegramOptInAuditPayloadHash(facts: TelegramOptInAuditFacts): string {
  return createHash('sha256')
    .update(
      canonicalJsonStringify({
        originating_channel: facts.originatingChannel,
        matched_member_identity: {
          member_id: facts.memberId,
          verification_code: facts.verificationCode ?? null,
        },
        current_consent_state_snapshot: { before: facts.beforeState, after: facts.afterState },
      }),
      'utf8',
    )
    .digest('hex');
}
