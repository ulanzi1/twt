// Reconciliation verdict WRITE primitives — Story 9.4 (Task 4; AC3/AC6, Decision D2/D5).
//
// The matcher worker's event appends: `contribution.confirmed` (green) + `contribution.reconciliation-
// mismatch` (red), both on the ALERT stream (stream_id = alert_id — Decision D2, co-located with the
// `contribution.utr-attested` claim they resolve). Appended DIRECTLY to events_log (domain owns the table;
// it cannot import @twt/events — the turbo cycle, the `attestContributionUtr` precedent) with the SAME
// bounded (stream_id, event_version) retry the alert stream needs (many members + the verdicts all append
// to the one alert stream, so a concurrent version race is expected — RETRY, re-read head, bump version).
//
// ── The matcher NEVER emits a reversal (AC5b — the monotonic invariant, structural) ──────────────────
// This module exports EXACTLY two emitters: confirmed + mismatch. There is NO `reconciliation.confirmation-
// reversed` emitter anywhere in the matcher's code path — the ONLY un-confirm path is the Story 9.8 trustee-
// attested compensating event. That absence is the structural half of the monotonic-confirmation invariant
// (Task 6's structural test asserts this module exports no reversal writer).

import { desc, eq, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb } from '../db.js';
import type { AlertId, PariwarId } from '../ids/index.js';
import { eventsLog } from '../schema/events_log.js';
import { isPoolStreamVersionConflict } from '../pool/errors.js';
import { CONFIRMED_EVENT_TYPE } from '../contribution/read.js';
import { CONTRIBUTION_MISMATCH_EVENT_TYPE } from '../contribution/history.js';
import {
  ContributionConfirmedPayloadSchema,
  ContributionReconciliationMismatchPayloadSchema,
  type ContributionConfirmedPayload,
  type ContributionReconciliationMismatchPayload,
} from '../contribution/events.js';

/** Bounded retry budget for the (stream_id, event_version) race across concurrent alert-stream appenders. */
const MAX_VERSION_RETRIES = 8;

function versionRetryBackoffMs(attempt: number): number {
  // Deterministic exponential backoff (no Math.random — replay-friendly + no unseeded jitter in the matcher).
  return Math.min(200, 10 * 2 ** attempt);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Append a validated verdict event on the alert stream inside the caller's already-open pariwar-scoped
 * transaction (the scope-tx contract — this does NOT open/commit its own tx), with a SAVEPOINT-guarded
 * (stream_id, event_version) retry. Returns the appended event id. The payload is Zod-validated (defense in
 * depth alongside the JSONB column + the registry). `actorId` is NULL — the matcher is a system producer.
 */
async function appendAlertVerdict(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly alertId: AlertId;
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

    await db.execute(sql`SAVEPOINT recon_verdict_append`);
    try {
      const rows = await db
        .insert(eventsLog)
        .values({
          streamId: input.alertId,
          eventType: input.eventType,
          payload: input.payload,
          eventVersion: nextVersion,
          actorId: null, // system producer (the matcher) — architecture §1.14 NULL = system/SIE.
          pariwarId: input.pariwarId,
        })
        .returning({ eventId: eventsLog.eventId });
      await db.execute(sql`RELEASE SAVEPOINT recon_verdict_append`);
      const eventId = rows[0]?.eventId;
      if (eventId === undefined) throw new Error('[appendAlertVerdict] insert returned no row');
      return eventId;
    } catch (err) {
      await db.execute(sql`ROLLBACK TO SAVEPOINT recon_verdict_append`);
      if (isPoolStreamVersionConflict(err)) {
        await sleep(versionRetryBackoffMs(attempt));
        continue; // re-read head, bump version, retry
      }
      throw err;
    }
  }
  throw new Error(
    `[appendAlertVerdict] exhausted ${String(MAX_VERSION_RETRIES)} version-conflict retries on alert stream ${input.alertId}`,
  );
}

/** Guard: this Pariwar scope + this alert own the verdict; the payload's alertId MUST match the stream. */
function assertPayloadAlert(alertId: AlertId, payloadAlertId: string): void {
  if (payloadAlertId !== alertId) {
    throw new Error(
      `[matcher-write] payload.alertId (${payloadAlertId}) does not match the target alert stream (${alertId})`,
    );
  }
}

/**
 * Append `contribution.confirmed` (the GREEN verdict) on the alert stream (AC3, Decision D2). Validates the
 * payload (`.strict()`) — the load-bearing camelCase `poolId`/`memberId` forward-contract keys + the match
 * provenance. Idempotency/monotonicity is the caller's (the keyed-store claim + the pre-read) — this
 * primitive only appends. Returns the appended event id.
 */
export async function appendConfirmedContribution(
  client: pg.PoolClient,
  input: { readonly pariwarId: PariwarId; readonly alertId: AlertId; readonly payload: ContributionConfirmedPayload },
): Promise<string> {
  const payload = ContributionConfirmedPayloadSchema.parse(input.payload);
  assertPayloadAlert(input.alertId, payload.alertId);
  return appendAlertVerdict(client, {
    pariwarId: input.pariwarId,
    alertId: input.alertId,
    eventType: CONFIRMED_EVENT_TYPE,
    payload,
  });
}

/**
 * Append `contribution.reconciliation-mismatch` (the RED verdict) on the alert stream (AC6, Decision D5).
 * Validates the payload (`.strict()`). Idempotency/dedup is the caller's. Returns the appended event id.
 */
export async function appendReconciliationMismatch(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly alertId: AlertId;
    readonly payload: ContributionReconciliationMismatchPayload;
  },
): Promise<string> {
  const payload = ContributionReconciliationMismatchPayloadSchema.parse(input.payload);
  assertPayloadAlert(input.alertId, payload.alertId);
  return appendAlertVerdict(client, {
    pariwarId: input.pariwarId,
    alertId: input.alertId,
    eventType: CONTRIBUTION_MISMATCH_EVENT_TYPE,
    payload,
  });
}
