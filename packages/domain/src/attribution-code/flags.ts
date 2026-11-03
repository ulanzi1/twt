// The allocation-exhaustion FLAG — Story 13.2 (Task 5; AC7; AT7). "Permanent unallocation flagged for trustee review."
//
// `flagAllocationExhausted` writes one append-only row. It must run in a transaction that COMMITS independently of the failed
// registration (which rolls back) — the API door's `flagAllocationExhaustedForRequest` opens and commits its own scope tx, and
// supplies the authenticated actor and their server-resolved `actor_display` (Story 6.11 R5 — a blank one is refused by the DB
// CHECK; the door never passes one). `listAllocationFlags` is the read the trustee surface renders (Story 13.4, C3).

import { desc, eq } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb } from '../db.js';
import type { AttributionCodeFlagId, PariwarId, UserId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import {
  type AttributionCodeAllocationFlagRow,
  attributionCodeAllocationFlags,
} from '../schema/attribution_code_allocation_flags.js';
import { assertTxBoundScope } from './tx-guard.js';

export interface FlagAllocationExhaustedInput {
  pariwarId: PariwarId;
  attempts: number;
  actorId: UserId;
  actorDisplay: string;
}

/** Record that an allocation found no free code. Returns the new flag's id. */
export async function flagAllocationExhausted(
  client: pg.PoolClient,
  input: FlagAllocationExhaustedInput,
): Promise<AttributionCodeFlagId> {
  await assertTxBoundScope(client, input.pariwarId);
  const inserted = await bindScopedDb(client)
    .insert(attributionCodeAllocationFlags)
    .values({
      pariwarId: input.pariwarId,
      attempts: input.attempts,
      actorId: input.actorId,
      actorDisplay: input.actorDisplay,
    })
    .returning({ flagId: attributionCodeAllocationFlags.flagId });
  const row = inserted[0];
  if (!row) throw new Error('[flagAllocationExhausted] insert returned no row — check session scope');
  return row.flagId;
}

/**
 * One flag as the trustee surface reads it (Story 13.4, C3; review R2-3, checklist family 6): the admin's `actorDisplay`
 * snapshot (Story 6.11 R5), ⛔ the raw `actor_id` or the Pariwar — the read model is field-picked here, not by each caller.
 */
export type AttributionCodeAllocationFlagView = Pick<
  AttributionCodeAllocationFlagRow,
  'flagId' | 'attempts' | 'actorDisplay' | 'flaggedAt'
>;

export interface ListAllocationFlagsInput {
  pariwarId: PariwarId;
  /** Page size — an integer, clamped to 1..200 (default 50). */
  limit?: number;
}

/**
 * The Pariwar's flags, newest first (`flagged_at DESC, flag_id DESC`).
 *
 * @throws RangeError  `limit` is given but is not an integer (⛔ statement sent) — `clampLimit` passes NaN through, and Drizzle
 *                     then drops the LIMIT altogether (review R4).
 */
export async function listAllocationFlags(
  client: pg.PoolClient,
  input: ListAllocationFlagsInput,
): Promise<AttributionCodeAllocationFlagView[]> {
  if (input.limit !== undefined && !Number.isInteger(input.limit)) throw new RangeError('limit must be an integer');
  await assertTxBoundScope(client, input.pariwarId);
  return bindScopedDb(client)
    .select({
      flagId: attributionCodeAllocationFlags.flagId,
      attempts: attributionCodeAllocationFlags.attempts,
      actorDisplay: attributionCodeAllocationFlags.actorDisplay,
      flaggedAt: attributionCodeAllocationFlags.flaggedAt,
    })
    .from(attributionCodeAllocationFlags)
    .where(eq(attributionCodeAllocationFlags.pariwarId, input.pariwarId))
    .orderBy(desc(attributionCodeAllocationFlags.flaggedAt), desc(attributionCodeAllocationFlags.flagId))
    .limit(clampLimit(input.limit, { default: 50, cap: 200 }));
}
