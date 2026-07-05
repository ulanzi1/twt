// Push-token invalidation seam — Story 5.2 (Task 5; AC5).
//
// When a push `send` rejects with an UNRECOVERABLE token error (the provider classified it into
// `SendResult.detail`), the offending device token is marked `invalid`. This runs from the
// send-result-handling seam (the composition layer), NOT inside `provider.send` — the provider stays pure
// of DB access (it returns the classification; this seam does the write). Transient rejections keep the
// token `active` (a live device must survive a quota blip).
//
// ── Isolated, best-effort write (AI-4-3(d) — the 4.8 poisoning defect) ─────────────────────────────────
// The `markInvalid` write runs on the BYPASSRLS `serviceDb` (never the caller's request tx — the
// dispatcher holds no tx) and is wrapped best-effort: a broken write logs and returns, it never throws
// into the send path. `markInvalid` filters on the FULL ownership tuple (pariwar_id, principal_type,
// principal_id, platform, token_blind_index) — never blind-index alone — so it is correct on BYPASSRLS
// AND can never cross-invalidate a different principal's token (code-review fix, 2026-07-05: two
// principals in the same Pariwar registering the identical raw token would otherwise collide on blind
// index, since it is an HMAC of (token, pariwarId) only, not the principal).

import type { SendResult, SendTarget } from '@twt/channels';
import { isUnrecoverableTokenRejection } from '@twt/channels';
import { audit, deviceToken, ids } from '@twt/domain';

import type { AppDeps } from '../../context.js';
import { deviceTokenBlindIndex } from './device-token-crypto.js';

/** What the invalidation seam decided (for observability / tests). */
export type PushInvalidationOutcome = 'invalidated' | 'not_found' | 'kept' | 'error';

/**
 * Invalidate a device token IFF the push send rejected with an unrecoverable token error (AC5). `target`
 * is the SAME `SendTarget` the send was addressed to (`resolvePushTargets`'s output) — its
 * `principalType`/`principalId`/`platform` scope the write to the exact ownership tuple, never blind-index
 * alone. `pariwarIdStr` scopes the write. Best-effort + isolated — never throws.
 */
export async function invalidatePushTokenOnFailure(
  deps: AppDeps,
  pariwarIdStr: string,
  target: SendTarget,
  result: SendResult,
): Promise<PushInvalidationOutcome> {
  if (!isUnrecoverableTokenRejection(result)) return 'kept';
  if (!target.platform || !target.principalType || !target.principalId) {
    // Can't scope the write to the ownership tuple without these — never fall back to a blind-index-only
    // write (that's the exact cross-principal collision this signature exists to prevent).
    console.error(
      '[device-token] invalidatePushTokenOnFailure: target is missing platform/principalType/principalId — skipping invalidation rather than risking a cross-principal write',
    );
    return 'error';
  }
  try {
    const blindIndex = await deviceTokenBlindIndex(target.address, pariwarIdStr, deps.encryption);
    const marked = await deviceToken.markInvalid(
      deps.serviceDb,
      ids.pariwarId(pariwarIdStr),
      target.principalType,
      target.principalId,
      target.platform,
      blindIndex,
    );
    if (marked === 0) return 'not_found';
    await writeInvalidationAudit(deps, pariwarIdStr, blindIndex, result);
    return 'invalidated';
  } catch (err) {
    // A broken invalidation write never poisons the send path (AI-4-3(d)).
    console.error('[device-token] markInvalid failed (best-effort isolated write):', err);
    return 'error';
  }
}

/**
 * Isolated best-effort audit line for an ACTUAL invalidation (AC7 — "invalidation emit audit lines via
 * writeAuditEntry"). System-initiated by a send failure, not a caller — `actorId`/`actorRole` are null (the
 * `member.device_token_register`/`admin.device_token_register` lines carry the caller identity; this one
 * documents the system-side lifecycle transition). The hash is the blind index — NEVER the raw token
 * (AI-4-3(c)). Runs on `servicePool` (BYPASSRLS, isolated from any request tx — the invalidation write
 * itself already runs on `serviceDb`, never a caller's tx).
 */
async function writeInvalidationAudit(
  deps: AppDeps,
  pariwarIdStr: string,
  tokenBlindIndex: string,
  result: SendResult,
): Promise<void> {
  try {
    await audit.writeAuditEntry(deps.servicePool, {
      pariwarId: pariwarIdStr,
      actorId: null,
      actorRole: null,
      action: 'device_token.invalidated',
      resourceLocator: `device_token;provider=${result.provider};detail=${result.detail ?? 'unknown'}`,
      requestPayloadHash: tokenBlindIndex, // 64-hex HMAC blind index (AC7(c) — never raw token)
      responseStatus: 200,
      traceId: null,
    });
  } catch (err) {
    // A broken audit path never fails the invalidation write itself (AI-4-3(d) — same isolation discipline).
    console.error('[device-token] invalidation audit write failed:', err);
  }
}
