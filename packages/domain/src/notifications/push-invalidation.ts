// Push-token invalidation WRITE — the Story 5.2 (AC5) seam's core, RELOCATED here by Story 8.8 (Task 1).
//
// When a push `send` rejects with an UNRECOVERABLE token error, the offending device token is marked
// `invalid`. Story 5.2 put this in apps/api; Story 8.8's live fan-out runs in apps/jobs and needs the
// SAME write (apps cannot import apps), so the write + its audit line live here and BOTH apps call it.
//
// ── The CLASSIFICATION stays with the caller, on purpose ────────────────────────────────────────────
// `isUnrecoverableTokenRejection` is defined in `@twt/channels`
// (packages/channels/src/providers/push-errors.ts:80) and `@twt/channels` already depends on
// `@twt/domain` — so importing it here would be a package cycle. Both callers already depend on
// `@twt/channels`, so each classifies first and calls this writer only for a rejection it has already
// judged unrecoverable. Neither caller RE-implements the classification (apps/api's
// `invalidatePushTokenOnFailure` keeps its exact signature and delegates here).
//
// ── Isolated, best-effort write (AI-4-3(d) — the 4.8 poisoning defect) ──────────────────────────────
// The `markInvalid` write runs on the BYPASSRLS `serviceDb` (never a caller tx — the dispatcher holds
// none) and is wrapped best-effort: a broken write logs and returns, it never throws into the send
// path. `markInvalid` filters on the FULL ownership tuple (pariwar_id, principal_type, principal_id,
// platform, token_blind_index) — never blind-index alone, which two principals could collide on.

import type pg from 'pg';

import * as audit from '../audit/index.js';
import type { Db } from '../db.js';
import * as deviceToken from '../device-token/index.js';
import type { FieldCryptoDeps } from '../encryption/field-classes.js';
import { deviceTokenBlindIndex } from '../encryption/member-fields.js';
import { pariwarId as toPariwarId } from '../ids/index.js';
import type { DeliveryTarget } from './delivery.js';

/** What the invalidation seam decided (for observability / tests). */
export type PushInvalidationOutcome = 'invalidated' | 'not_found' | 'kept' | 'error';

/** The BYPASSRLS handles + key material the isolated invalidation write needs. */
export interface PushInvalidationDeps {
  /** Drizzle handle bound to the BYPASSRLS service pool — the `markInvalid` write runs here. */
  readonly serviceDb: Db;
  /** The BYPASSRLS service pool — the hash-chain audit writer's own-committing client. */
  readonly servicePool: pg.Pool;
  readonly encryption: FieldCryptoDeps;
}

/** The PII-free provider facts an invalidation audit line records (never the raw token). */
export interface PushRejectionFacts {
  readonly provider: string;
  readonly detail?: string | undefined;
}

/**
 * Mark a device token `invalid` (Story 5.2 AC5). The CALLER has already classified the rejection as
 * unrecoverable — this performs the write only. `target` is the SAME target the send was addressed to
 * (`resolvePushTargets`'s output); its `principalType`/`principalId`/`platform` scope the write to the
 * exact ownership tuple, never blind-index alone. Best-effort + isolated — never throws.
 */
export async function invalidatePushToken(
  deps: PushInvalidationDeps,
  pariwarIdStr: string,
  target: DeliveryTarget,
  facts: PushRejectionFacts,
): Promise<PushInvalidationOutcome> {
  if (!target.platform || !target.principalType || !target.principalId) {
    // Can't scope the write to the ownership tuple without these — never fall back to a blind-index-only
    // write (that's the exact cross-principal collision this signature exists to prevent).
    console.error(
      '[notifications] invalidatePushToken: target is missing platform/principalType/principalId — skipping invalidation rather than risking a cross-principal write',
    );
    return 'error';
  }
  try {
    const blindIndex = await deviceTokenBlindIndex(target.address, pariwarIdStr, deps.encryption);
    const marked = await deviceToken.markInvalid(
      deps.serviceDb,
      toPariwarId(pariwarIdStr),
      target.principalType,
      target.principalId,
      target.platform,
      blindIndex,
    );
    if (marked === 0) return 'not_found';
    await writeInvalidationAudit(deps.servicePool, pariwarIdStr, blindIndex, facts);
    return 'invalidated';
  } catch (err) {
    // A broken invalidation write never poisons the send path (AI-4-3(d)).
    console.error('[notifications] markInvalid failed (best-effort isolated write):', err);
    return 'error';
  }
}

/**
 * Isolated best-effort audit line for an ACTUAL invalidation (Story 5.2 AC7). System-initiated by a
 * send failure, not a caller — `actorId`/`actorRole` are null. The hash is the blind index — NEVER the
 * raw token (AI-4-3(c)). Runs on the BYPASSRLS service pool (own-committing, isolated from any tx).
 */
/** Strip the `resourceLocator`'s own `key=value;` delimiters out of a provider-sourced string — a
 *  provider's free-text rejection detail must never be able to inject a fake `key=value` pair or
 *  truncate/ambiguate the locator by carrying a literal `;` or `=`. */
function sanitizeLocatorSegment(value: string): string {
  return value.replace(/[;=]/g, '_');
}

async function writeInvalidationAudit(
  servicePool: pg.Pool,
  pariwarIdStr: string,
  tokenBlindIndex: string,
  facts: PushRejectionFacts,
): Promise<void> {
  try {
    const provider = sanitizeLocatorSegment(facts.provider);
    const detail = sanitizeLocatorSegment(facts.detail ?? 'unknown');
    await audit.writeAuditEntry(servicePool, {
      pariwarId: pariwarIdStr,
      actorId: null,
      actorRole: null,
      action: 'device_token.invalidated',
      resourceLocator: `device_token;provider=${provider};detail=${detail}`,
      requestPayloadHash: tokenBlindIndex, // 64-hex HMAC blind index (AC7(c) — never raw token)
      responseStatus: 200,
      traceId: null,
    });
  } catch (err) {
    // A broken audit path never fails the invalidation write itself (AI-4-3(d) — same isolation).
    console.error('[notifications] invalidation audit write failed:', err);
  }
}
