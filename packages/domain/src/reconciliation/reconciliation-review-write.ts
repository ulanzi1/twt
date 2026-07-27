// Reconciliation-review trustee action WRITE primitives — Story 9.8 (Task 5; AC4/AC6, D1/D3).
//
// The two NEW verdict appends a trustee's reconciliation-review decision emits, both on the ALERT stream
// (stream_id = alert_id — Decision D2, co-located with the mismatch/confirmed verdicts they respond to):
//   · `reconciliation.contribution-rejected`   — the REJECT verdict (D1; the case-closed marker).
//   · `reconciliation.confirmation-reversed`    — walk a confirmed contribution back to `held` (D3).
//
// ── Kept OUT of matcher-write.ts (the 9.4 monotonic-invariant fence) ─────────────────────────────────
// matcher-write.ts exports EXACTLY the two FORWARD verdict emitters (confirmed + mismatch); a 9.4
// structural test asserts it exports NO reversal emitter (the monotonic-confirmation invariant — the
// matcher never un-confirms). The reject + reversal producers are the TRUSTEE's, not the matcher's, so
// they live here (the self-verify-write.ts precedent). Confirm reuses `appendConfirmedContribution`
// (matcher-write) directly — no re-implementation (D2).
//
// Both appends run inside the caller's already-open pariwar-scoped transaction (the scope-tx contract),
// with the SAME bounded (stream_id, event_version) SAVEPOINT retry the alert stream needs (many appenders
// race). `actorId` is the deciding TRUSTEE (attribution; the apps/api boundary writes the matching audit).

import { desc, eq, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb } from '../db.js';
import type { AlertId, PariwarId } from '../ids/index.js';
import { isPoolStreamVersionConflict } from '../pool/errors.js';
import { eventsLog } from '../schema/events_log.js';
import {
  RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE,
  RECONCILIATION_CONTRIBUTION_REJECTED_EVENT_TYPE,
  ReconciliationConfirmationReversedPayloadSchema,
  ReconciliationContributionRejectedPayloadSchema,
  type ReconciliationConfirmationReversedPayload,
  type ReconciliationContributionRejectedPayload,
} from './events.js';

const MAX_VERSION_RETRIES = 8;

/** Raised when the (stream_id, event_version) retry budget is exhausted — a busy stream, not a client error. */
export class ReconciliationReviewAppendRetryExhaustedError extends Error {
  constructor(alertId: AlertId, attempts: number) {
    super(
      `[reconciliation-review-write] exhausted ${String(attempts)} version-conflict retries on alert stream ${alertId}`,
    );
    this.name = 'ReconciliationReviewAppendRetryExhaustedError';
  }
}

function versionRetryBackoffMs(attempt: number): number {
  return Math.min(200, 10 * 2 ** attempt);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function appendAlertEvent(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly alertId: AlertId;
    readonly actorId: string;
    readonly eventType: string;
    readonly payload: unknown;
  },
): Promise<string> {
  const db = bindScopedDb(client);
  for (let attempt = 0; attempt < MAX_VERSION_RETRIES; attempt += 1) {
    const head = await db
      .select({ v: eventsLog.eventVersion })
      .from(eventsLog)
      .where(eq(eventsLog.streamId, input.alertId))
      .orderBy(desc(eventsLog.eventVersion))
      .limit(1);
    const nextVersion = (head[0]?.v ?? 0) + 1;

    await db.execute(sql`SAVEPOINT recon_review_append`);
    try {
      const rows = await db
        .insert(eventsLog)
        .values({
          streamId: input.alertId,
          eventType: input.eventType,
          payload: input.payload,
          eventVersion: nextVersion,
          actorId: input.actorId,
          pariwarId: input.pariwarId,
        })
        .returning({ eventId: eventsLog.eventId });
      await db.execute(sql`RELEASE SAVEPOINT recon_review_append`);
      const eventId = rows[0]?.eventId;
      if (eventId === undefined) throw new Error('[reconciliation-review-write] insert returned no row');
      return eventId;
    } catch (err) {
      await db.execute(sql`ROLLBACK TO SAVEPOINT recon_review_append`);
      if (isPoolStreamVersionConflict(err)) {
        await sleep(versionRetryBackoffMs(attempt));
        continue;
      }
      throw err;
    }
  }
  throw new ReconciliationReviewAppendRetryExhaustedError(input.alertId, MAX_VERSION_RETRIES);
}

/**
 * Append `reconciliation.contribution-rejected` (the trustee REJECT verdict, AC4/D1) on the alert stream.
 * Validates the payload (`.strict()`). The member stays red (no new derivation arm); this event is the
 * case-CLOSED marker for the open-vs-resolved queue read + the member-notify trigger. Returns the event id.
 */
export async function appendReconciliationReject(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly alertId: AlertId;
    readonly actorId: string;
    readonly payload: ReconciliationContributionRejectedPayload;
  },
): Promise<string> {
  const payload = ReconciliationContributionRejectedPayloadSchema.parse(input.payload);
  if (payload.alertId !== input.alertId) {
    throw new Error(
      `[reconciliation-review-write] reject payload.alertId (${payload.alertId}) does not match target stream (${input.alertId})`,
    );
  }
  return appendAlertEvent(client, {
    pariwarId: input.pariwarId,
    alertId: input.alertId,
    actorId: input.actorId,
    eventType: RECONCILIATION_CONTRIBUTION_REJECTED_EVENT_TYPE,
    payload,
  });
}

/**
 * Append `reconciliation.confirmation-reversed` (the review-and-reverse `held` producer, AC6/D3) on the
 * alert stream. Validates the payload (`.strict()`), naming the EXACT `reversedConfirmedEventId` → the 9.5
 * reversal-consumer reads back the confirmation out everywhere (contributor list, pill green→held). A
 * subsequent fresh `contribution.confirmed` re-greens (monotonic per-event-id chain). Returns the event id.
 */
export async function appendConfirmationReversed(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly alertId: AlertId;
    readonly actorId: string;
    readonly payload: ReconciliationConfirmationReversedPayload;
  },
): Promise<string> {
  const payload = ReconciliationConfirmationReversedPayloadSchema.parse(input.payload);
  if (payload.alertId !== input.alertId) {
    throw new Error(
      `[reconciliation-review-write] reversal payload.alertId (${payload.alertId}) does not match target stream (${input.alertId})`,
    );
  }
  return appendAlertEvent(client, {
    pariwarId: input.pariwarId,
    alertId: input.alertId,
    actorId: input.actorId,
    eventType: RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE,
    payload,
  });
}
