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

export interface ListAllocationFlagsInput {
  pariwarId: PariwarId;
  /** Page size, clamped to 1..200 (default 50). */
  limit?: number;
}

/** The Pariwar's flags, newest first (`flagged_at DESC, flag_id DESC`). */
export async function listAllocationFlags(
  client: pg.PoolClient,
  input: ListAllocationFlagsInput,
): Promise<AttributionCodeAllocationFlagRow[]> {
  await assertTxBoundScope(client, input.pariwarId);
  return bindScopedDb(client)
    .select()
    .from(attributionCodeAllocationFlags)
    .where(eq(attributionCodeAllocationFlags.pariwarId, input.pariwarId))
    .orderBy(desc(attributionCodeAllocationFlags.flaggedAt), desc(attributionCodeAllocationFlags.flagId))
    .limit(clampLimit(input.limit, { default: 50, cap: 200 }));
}
