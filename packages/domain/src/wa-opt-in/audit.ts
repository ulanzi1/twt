// WA opt-in five-field audit encoding — Story 5.4 (Task 3; AC4/AC5).
//
// The SINGLE authority for the AC4 audit-payload hash so the apps/api member/admin routes and the apps/jobs
// webhook worker encode the five fields IDENTICALLY (no drift). This is the pure hash-builder ONLY — the
// caller writes the audit line via `writeAuditEntry` (its own advisory-locked tx) and threads the returned
// auditId. The AC4 five fields map: `timestamp` = the chain recorded_at (the writer sets it);
// `originating_channel` + `matched_member_identity` + `current_consent_state_snapshot` (before/after) are
// committed here into the requestPayloadHash; `audit_id` = the written row's id. NEVER hash a secret value.

import { createHash } from 'node:crypto';

import { canonicalJsonStringify } from '../canonical-json.js';

/** The five `originating_channel` values (AC4). system_expiry = time-based sweep (actorId null). */
export const WA_OPT_IN_ORIGINATING_CHANNELS = [
  'member_app',
  'meta_webhook_inbound',
  'meta_webhook_block',
  'admin_action',
  'system_expiry',
] as const;
export type WaOptInOriginatingChannel = (typeof WA_OPT_IN_ORIGINATING_CHANNELS)[number];

export interface WaOptInAuditFacts {
  readonly originatingChannel: WaOptInOriginatingChannel;
  /** The matched member's id (the AC4 matched_member_identity). */
  readonly memberId: string;
  /** The matched verification phrase (webhook-inbound), or null. A random token — NEVER a secret. */
  readonly verificationPhrase?: string | null;
  /** The opt-in state BEFORE the transition (`none` for a first mint). */
  readonly beforeState: string;
  /** The opt-in state AFTER the transition. */
  readonly afterState: string;
}

/**
 * SHA-256 hex over the canonical JSON of the NON-secret transition facts (the AC4 three encoded fields). This
 * IS the `requestPayloadHash` passed to `writeAuditEntry` — the hash commits to originating_channel +
 * matched_member_identity + the before/after consent-state snapshot, making every transition independently
 * auditable + tamper-evident.
 */
export function waOptInAuditPayloadHash(facts: WaOptInAuditFacts): string {
  return createHash('sha256')
    .update(
      canonicalJsonStringify({
        originating_channel: facts.originatingChannel,
        matched_member_identity: {
          member_id: facts.memberId,
          verification_phrase: facts.verificationPhrase ?? null,
        },
        current_consent_state_snapshot: { before: facts.beforeState, after: facts.afterState },
      }),
      'utf8',
    )
    .digest('hex');
}
