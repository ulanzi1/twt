// Self-verify screenshot-upload evidence WRITE primitive — Story 9.7 (Task 3; AC3/AC4).
//
// Appends `reconciliation.self-verify-screenshot-uploaded` on the ALERT stream (stream_id = alert_id —
// Decision D2, co-located with the `contribution.reconciliation-mismatch` verdict it responds to). Kept in
// its OWN module (NOT matcher-write.ts) so the Story 9.4 monotonic-invariant fence — which asserts
// matcher-write exports EXACTLY the two forward verdict emitters — stays green verbatim.
//
// ── PURE EVIDENCE INTAKE (AC4, load-bearing) ─────────────────────────────────────────────────────────
// This primitive RECORDS a blob key + the mismatch reference. It emits NO `contribution.confirmed`, does
// NOT remap a wrong-pool payment, does NOT un-confirm, and triggers NO matcher run. It is the Story 9.8
// review-queue INPUT — the member stays red/mismatch until the 9.4 matcher or the 9.8 trustee confirms.
// Same bounded (stream_id, event_version) SAVEPOINT retry the alert stream needs (many appenders race).

import { desc, eq, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb } from '../db.js';
import type { AlertId, PariwarId } from '../ids/index.js';
import { isPoolStreamVersionConflict } from '../pool/errors.js';
import { eventsLog } from '../schema/events_log.js';
import {
  RECONCILIATION_SELF_VERIFY_SCREENSHOT_UPLOADED_EVENT_TYPE,
  ReconciliationSelfVerifyScreenshotUploadedPayloadSchema,
  type ReconciliationSelfVerifyScreenshotUploadedPayload,
} from './events.js';

/** Bounded retry budget for the (stream_id, event_version) race across concurrent alert-stream appenders. */
const MAX_VERSION_RETRIES = 8;

/**
 * Raised when the (stream_id, event_version) SAVEPOINT retry budget is exhausted — a busy alert stream,
 * not a client error. A distinct, typed error (rather than a plain `Error`) so the API boundary can map it
 * to a dignified 503 instead of letting it surface as a raw 500 (AC3's "never a 500" AR-45 contract).
 */
export class SelfVerifyAppendRetryExhaustedError extends Error {
  constructor(alertId: AlertId, attempts: number) {
    super(`[self-verify-write] exhausted ${String(attempts)} version-conflict retries on alert stream ${alertId}`);
    this.name = 'SelfVerifyAppendRetryExhaustedError';
  }
}

function versionRetryBackoffMs(attempt: number): number {
  return Math.min(200, 10 * 2 ** attempt);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Append `reconciliation.self-verify-screenshot-uploaded` on the alert stream inside the caller's already-open
 * pariwar-scoped transaction (the scope-tx contract — does NOT open/commit its own tx), with a
 * SAVEPOINT-guarded (stream_id, event_version) retry. Validates the payload (`.strict()` — defense in depth
 * alongside the JSONB column + the registry). Returns the appended event id. `actorId` is the MEMBER (this
 * is the member's own evidence; the audit line at the apps/api boundary carries the same attribution).
 */
export async function appendSelfVerifyScreenshotUploaded(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly alertId: AlertId;
    readonly actorId: string;
    readonly payload: ReconciliationSelfVerifyScreenshotUploadedPayload;
  },
): Promise<string> {
  const payload = ReconciliationSelfVerifyScreenshotUploadedPayloadSchema.parse(input.payload);
  if (payload.alertId !== input.alertId) {
    throw new Error(
      `[self-verify-write] payload.alertId (${payload.alertId}) does not match the target alert stream (${input.alertId})`,
    );
  }
  const db = bindScopedDb(client);

  for (let attempt = 0; attempt < MAX_VERSION_RETRIES; attempt += 1) {
    const head = await db
      .select({ v: eventsLog.eventVersion })
      .from(eventsLog)
      .where(eq(eventsLog.streamId, input.alertId))
      .orderBy(desc(eventsLog.eventVersion))
      .limit(1);
    const nextVersion = (head[0]?.v ?? 0) + 1;

    await db.execute(sql`SAVEPOINT self_verify_append`);
    try {
      const rows = await db
        .insert(eventsLog)
        .values({
          streamId: input.alertId,
          eventType: RECONCILIATION_SELF_VERIFY_SCREENSHOT_UPLOADED_EVENT_TYPE,
          payload,
          eventVersion: nextVersion,
          actorId: input.actorId,
          pariwarId: input.pariwarId,
        })
        .returning({ eventId: eventsLog.eventId });
      await db.execute(sql`RELEASE SAVEPOINT self_verify_append`);
      const eventId = rows[0]?.eventId;
      if (eventId === undefined) throw new Error('[self-verify-write] insert returned no row');
      return eventId;
    } catch (err) {
      await db.execute(sql`ROLLBACK TO SAVEPOINT self_verify_append`);
      if (isPoolStreamVersionConflict(err)) {
        await sleep(versionRetryBackoffMs(attempt));
        continue; // re-read head, bump version, retry
      }
      throw err;
    }
  }
  throw new SelfVerifyAppendRetryExhaustedError(input.alertId, MAX_VERSION_RETRIES);
}
