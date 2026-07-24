// Push-token invalidation seam — Story 5.2 (Task 5; AC5).
//
// When a push `send` rejects with an UNRECOVERABLE token error (the provider classified it into
// `SendResult.detail`), the offending device token is marked `invalid`. This runs from the
// send-result-handling seam (the composition layer), NOT inside `provider.send` — the provider stays pure
// of DB access (it returns the classification; this seam does the write). Transient rejections keep the
// token `active` (a live device must survive a quota blip).
//
// ── RELOCATED to @twt/domain by Story 8.8 (Task 1) — this keeps the CLASSIFICATION, delegates the WRITE ──
// The write + its audit line moved to `packages/domain/src/notifications/push-invalidation.ts` so
// `apps/jobs`' live fan-out invalidates dead tokens through the SAME code path (apps cannot import apps).
// The `isUnrecoverableTokenRejection` CLASSIFICATION deliberately stays on the caller's side of the
// boundary: it lives in `@twt/channels`, which already depends on `@twt/domain`, so importing it down
// there would be a package cycle. This module's exported signature is unchanged.
//
// ── Isolated, best-effort write (AI-4-3(d) — the 4.8 poisoning defect) ─────────────────────────────────
// The `markInvalid` write runs on the BYPASSRLS `serviceDb` (never the caller's request tx — the
// dispatcher holds no tx) and is wrapped best-effort: a broken write logs and returns, it never throws
// into the send path. `markInvalid` filters on the FULL ownership tuple (pariwar_id, principal_type,
// principal_id, platform, token_blind_index) — never blind-index alone, since the blind index is an HMAC
// of (token, pariwarId) only and two principals sharing a raw token would otherwise collide.

import type { SendResult, SendTarget } from '@twt/channels';
import { isUnrecoverableTokenRejection } from '@twt/channels';
import { notifications } from '@twt/domain';

import type { AppDeps } from '../../context.js';

/** What the invalidation seam decided (for observability / tests). */
export type PushInvalidationOutcome = notifications.PushInvalidationOutcome;

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
  return notifications.invalidatePushToken(
    { serviceDb: deps.serviceDb, servicePool: deps.servicePool, encryption: deps.encryption },
    pariwarIdStr,
    target,
    { provider: result.provider, detail: result.detail },
  );
}
