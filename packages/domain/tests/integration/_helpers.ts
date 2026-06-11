// Shared helpers for the Story 1.6 live-DB integration tests.
//
// Not a `.spec.ts`, so the vitest integration glob does not collect it as a
// suite — it is imported by the policy-regression + cross-pariwar-leak specs.
//
// ⚠ RLS-in-tests model (see Story 1.6 dev notes): the test login role
// (twt_dev_app) is a Docker/CI superuser and BYPASSES RLS. To exercise the
// policies we `SET LOCAL ROLE twt_app` on the per-test transaction client to
// shed superuser, then `setPariwarScope`. Seeding happens BEFORE entering app
// scope (as superuser, RLS bypassed) so both tenants' rows land regardless of
// the withCheck policy. afterEach ROLLBACK (setupLiveDb) reverts the SET LOCAL
// role + scope + seed rows.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';

import { setPariwarScope, type Db } from '../../src/db.js';
import * as schema from '../../src/schema/index.js';

export const PARIWAR_A = '11111111-1111-1111-1111-111111111111';
export const PARIWAR_B = '22222222-2222-2222-2222-222222222222';

// Dedicated tenants for the runAsCrossTenant helper tests, which COMMIT rows
// (the append-only trigger blocks cleanup, so they persist). Kept distinct from
// A/B so the exact-count RLS-enforcement assertions — which scope to A/B and
// rely on per-test ROLLBACK isolation — never observe these committed rows.
export const PARIWAR_X = '33333333-3333-3333-3333-333333333333';
export const PARIWAR_Y = '44444444-4444-4444-4444-444444444444';

export interface SeedOptions {
  streamId?: string;
  eventVersion?: number;
  eventType?: string;
  payload?: unknown;
}

/** Insert one events_log row. Returns the streamId used (random by default). */
export async function seedEvent(
  tx: Db,
  pariwarId: string,
  opts: SeedOptions = {},
): Promise<string> {
  const streamId = opts.streamId ?? randomUUID();
  await tx.insert(schema.eventsLog).values({
    streamId,
    eventType: opts.eventType ?? 'test.created',
    payload: opts.payload ?? {},
    eventVersion: opts.eventVersion ?? 1,
    actorId: null,
    pariwarId,
  });
  return streamId;
}

/** Shed Docker superuser (SET ROLE twt_app) + set the pariwar scope, in-tx. */
export async function enterAppScope(
  client: pg.PoolClient,
  pariwarId: string,
): Promise<void> {
  await client.query('SET LOCAL ROLE twt_app');
  await setPariwarScope(client, pariwarId);
}

/** Shed superuser without setting a scope — for the fail-closed probe. */
export async function enterAppRoleNoScope(client: pg.PoolClient): Promise<void> {
  await client.query('SET LOCAL ROLE twt_app');
}
