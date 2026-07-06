// Inbound WA webhook-queue accessors — Story 5.4 (Task 4; AC2).
//
// The §3.11 persist-and-ack half: `persistInboundWebhookEvent` runs on the ingress request tx (RLS enforces
// the tenant match from the URL-path pariwar_id). The worker-drain half (`claimUnprocessedWebhookEvents` /
// `markWebhookEventProcessed`) runs cross-tenant on the apps/jobs BYPASSRLS service pool. No business logic
// here — matching / transitions live in the worker (this is the primitive persistence seam).

import { and, asc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';

import { clampLimit } from '../pagination.js';
import type { Db } from '../db.js';
import type { PariwarId, WaInboundWebhookEventId } from '../ids/index.js';
import {
  type WaInboundWebhookEventRow,
  waInboundWebhookEvents,
} from '../schema/wa_inbound_webhook_events.js';

export interface PersistInboundWebhookEventInput {
  pariwarId: PariwarId;
  /** The verified inbound Meta body, stored intact for the worker + provenance. */
  rawPayload: unknown;
  /** Whether X-Hub-Signature-256 verified (TRUE for every persisted row — invalid signatures persist nothing). */
  signatureVerified: boolean;
}

/**
 * Persist one verified inbound webhook event on the ingress request tx (AC2). Returns the inserted row (its
 * `event_id` + `received_at`). NO downstream call — the worker drains + processes.
 */
export async function persistInboundWebhookEvent(
  db: Db,
  input: PersistInboundWebhookEventInput,
): Promise<WaInboundWebhookEventRow> {
  const inserted = await db
    .insert(waInboundWebhookEvents)
    .values({
      pariwarId: input.pariwarId,
      rawPayload: input.rawPayload,
      signatureVerified: input.signatureVerified,
    })
    .returning();
  const row = inserted[0];
  if (!row) {
    throw new Error('[persistInboundWebhookEvent] insert returned no row — check session scope');
  }
  return row;
}

/**
 * The worker drain scan (AC3): atomically claims the oldest un-processed events (processed_at IS NULL),
 * bounded by `limit`. A single `UPDATE ... FOR UPDATE SKIP LOCKED` statement — the SKIP-LOCKED subquery
 * selects candidate rows without blocking on ones already claimed by a concurrent tick/replica, and the
 * outer UPDATE stamps `processed_at` in the SAME statement, so two overlapping ticks can never both claim
 * the same row. Cross-tenant (the worker's service login is BYPASSRLS); each row carries its pariwar_id so
 * the worker can scope per-event work. `processWebhookEvent`'s own trailing `markWebhookEventProcessed` call
 * is then a harmless no-op (the row is already marked) — kept for the direct-call (non-drain) test path.
 */
export async function claimUnprocessedWebhookEvents(
  db: Db,
  limit: number,
): Promise<WaInboundWebhookEventRow[]> {
  const candidates = db
    .select({ eventId: waInboundWebhookEvents.eventId })
    .from(waInboundWebhookEvents)
    .where(isNull(waInboundWebhookEvents.processedAt))
    .orderBy(asc(waInboundWebhookEvents.receivedAt))
    .limit(clampLimit(limit, { default: 200, cap: 500 }))
    .for('update', { skipLocked: true });

  return db
    .update(waInboundWebhookEvents)
    .set({ processedAt: sql`now()` })
    .where(inArray(waInboundWebhookEvents.eventId, candidates))
    .returning();
}

/** Mark an event processed (worker end-of-drain). Idempotent — re-marking a processed event is a no-op UPDATE. */
export async function markWebhookEventProcessed(
  db: Db,
  eventId: WaInboundWebhookEventId,
): Promise<void> {
  await db
    .update(waInboundWebhookEvents)
    .set({ processedAt: sql`now()` })
    .where(
      and(
        eq(waInboundWebhookEvents.eventId, eventId),
        isNull(waInboundWebhookEvents.processedAt),
      ),
    );
}

/**
 * Reclaim processed webhook-queue rows older than `ttlSeconds` (operational hygiene — the worker has already
 * consumed them; the raw payload need not be retained indefinitely). Cross-tenant on the service pool.
 * Returns the number of rows deleted.
 */
export async function purgeProcessedWebhookEvents(db: Db, ttlSeconds: number): Promise<number> {
  const deleted = await db
    .delete(waInboundWebhookEvents)
    .where(
      and(
        sql`${waInboundWebhookEvents.processedAt} IS NOT NULL`,
        lt(waInboundWebhookEvents.processedAt, sql`now() - make_interval(secs => ${ttlSeconds})`),
      ),
    )
    .returning({ id: waInboundWebhookEvents.eventId });
  return deleted.length;
}
