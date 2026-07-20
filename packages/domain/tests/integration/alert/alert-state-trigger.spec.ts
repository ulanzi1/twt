// alerts.current_state write-rejection trigger — live-DB regression (Story 8.1, Task 7; AC5).
//
// The RUNTIME guard half of AC5 (the AST gate is the static half): the BEFORE INSERT OR UPDATE
// trigger `alerts_state_write_guard` (migration 0078) rejects any current_state / state_event_version
// write not issued under the projector's `app.alert_state_writer = 'on'` session guard. Mirrors the
// pool trigger regression in pool-lifecycle.spec.ts. Live DB only.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedAlert } from '../_helpers.js';

describe.skipIf(!hasDatabase)('alerts.current_state write-rejection trigger (AC5)', () => {
  setupLiveDb();

  it('a direct UPDATE alerts SET current_state without the projector guard is REJECTED (P0001)', async () => {
    const { client, tx } = getTx();
    const id = randomUUID();
    await seedAlert(tx, PARIWAR_A, { alertId: id, currentState: 'live' });
    await enterAppScope(client, PARIWAR_A);

    const err = await client
      .query("UPDATE alerts SET current_state = 'closed' WHERE alert_id = $1", [id])
      .then(() => null)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as { code?: string }).code).toBe('P0001');
    expect((err as Error).message).toContain('alerts.current_state direct write rejected');
  });

  it('a direct UPDATE touching ONLY state_event_version is REJECTED (the cache pair travels together)', async () => {
    const { client, tx } = getTx();
    const id = randomUUID();
    await seedAlert(tx, PARIWAR_A, { alertId: id, currentState: 'live' });
    await enterAppScope(client, PARIWAR_A);

    const err = await client
      .query('UPDATE alerts SET state_event_version = 999 WHERE alert_id = $1', [id])
      .then(() => null)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as { code?: string }).code).toBe('P0001');
  });

  it('a non-state UPDATE (updated_at only) is NOT rejected by the trigger', async () => {
    const { client, tx } = getTx();
    const id = randomUUID();
    await seedAlert(tx, PARIWAR_A, { alertId: id, currentState: 'live' });
    await enterAppScope(client, PARIWAR_A);
    await expect(
      client.query('UPDATE alerts SET updated_at = now() WHERE alert_id = $1', [id]),
    ).resolves.toBeDefined();
  });

  it('a direct INSERT into alerts without the projector guard is REJECTED (P0001)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const err = await client
      .query(
        `INSERT INTO alerts (alert_id, cycle_id, pariwar_id, pool_count,
           current_state, state_event_version, created_by_actor)
         VALUES ($1,$2,$3,1,'live',3,'trustee-actor-1')`,
        [randomUUID(), randomUUID(), PARIWAR_A],
      )
      .then(() => null)
      .catch((e: unknown) => e);
    expect((err as { code?: string }).code).toBe('P0001');
    expect((err as Error).message).toContain('alerts.current_state direct write rejected');
  });
});
