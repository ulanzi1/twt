// claims RLS policy-regression — Story 6.1 (Task 9). Mirrors
// members-policy-regression: positive (allowed query returns expected rows) + negative
// (forbidden query empty / raises) assertions for the tenant-isolation policies, the
// connection-level fail-closed probe, and the FORCE-RLS catalog regression guard. Live
// DB only.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  enterAppRoleNoScope,
  enterAppScope,
  seedClaim,
} from '../_helpers.js';

describe.skipIf(!hasDatabase)('claims RLS policy regression', () => {
  setupLiveDb();

  it('positive: SELECT under scope A returns only A claim rows', async () => {
    const { tx, client } = getTx();
    await seedClaim(tx, PARIWAR_A);
    await seedClaim(tx, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.claims);
    expect(rows).not.toHaveLength(0); // guard: empty would pass every() vacuously
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_B)).toBe(false);
  });

  it('negative: scope B does NOT see A claim rows (symmetric: B sees its own)', async () => {
    const { tx, client } = getTx();
    await seedClaim(tx, PARIWAR_A);
    await seedClaim(tx, PARIWAR_B);
    await enterAppScope(client, PARIWAR_B);

    const rows = await tx.select().from(schema.claims);
    expect(rows).not.toHaveLength(0);
    expect(rows.every((r) => r.pariwarId === PARIWAR_B)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_A)).toBe(false);
  });

  it('negative: INSERT with a mismatched pariwarId is rejected by withCheck (42501)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // This test isolates the RLS withCheck policy, which is orthogonal to the AC3
    // claims.current_state write-rejection trigger (Story 6.1 review fix: that
    // trigger now also fires BEFORE INSERT, and Postgres runs BEFORE ROW triggers
    // ahead of the WITH CHECK evaluation — an unguarded insert would hit P0001
    // first and never reach the RLS check this test wants to exercise). Set the
    // projector's session guard so the trigger steps aside and RLS is the only
    // gate under test.
    await client.query("SET LOCAL app.claim_state_writer = 'on'");
    const err = await tx
      .insert(schema.claims)
      .values({
        claimCaseId: randomUUID() as never,
        pariwarId: PARIWAR_B, // ← MISMATCH under scope A
        deceasedMemberId: randomUUID() as never,
        intakeChannels: ['member_app'],
        currentState: 'intake_pending',
        stateEventVersion: 1,
      })
      .catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    expect(cause?.code).toBe('42501');
    expect(cause?.message ?? '').toMatch(/row-level security/i);
  });

  it('connection-level fail-closed: app role without scope returns empty', async () => {
    const { tx, client } = getTx();
    await seedClaim(tx, PARIWAR_A);
    await enterAppRoleNoScope(client);

    const rows = await tx.select().from(schema.claims);
    expect(rows).toHaveLength(0);
  });

  it('FORCE RLS: claims has rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
         WHERE relname = 'claims'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows.every((r) => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
  });
});
