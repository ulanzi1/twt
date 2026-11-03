// `flagAllocationExhausted` + `listAllocationFlags` — live-DB (Story 13.2, Task 6.1; AC7; AT7). Per-test ROLLBACK. Assertions are
// on THIS test's own rows (membership + relative order) under a fresh Pariwar — ⛔ absolute counts (the API spec's flag leg
// COMMITS append-only rows that never leave the shared DB, TR12).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import { pariwarId as toPariwarId, userId as toUserId } from '../../../src/ids/index.js';
import { attributionCode } from '../../../src/index.js';
import { pgSqlstateOf } from '../../../src/marketplace/errors.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope } from '../_helpers.js';
import { caught } from './_fixtures.js';

const actor = () => toUserId(randomUUID());

/** The violated constraint on a drizzle-wrapped pg error. */
function constraintOf(err: unknown): string | undefined {
  let cur: unknown = err;
  for (let i = 0; cur && i < 6; i += 1) {
    const c = (cur as { constraint?: string }).constraint;
    if (c) return c;
    cur = (cur as { cause?: unknown }).cause;
  }
  return undefined;
}

describe.skipIf(!hasDatabase)('allocation flags (AC7)', () => {
  setupLiveDb();

  it('flagAllocationExhausted writes one row with the given actor + display and returns its id', async () => {
    const { client } = getTx();
    const p = toPariwarId(randomUUID());
    await enterAppScope(client, p);
    const a = actor();
    const id = await attributionCode.flagAllocationExhausted(client, { pariwarId: p, attempts: 8, actorId: a, actorDisplay: 'Asha Verma' });
    const r = await client.query('SELECT pariwar_id, attempts, actor_id, actor_display FROM attribution_code_allocation_flags WHERE flag_id = $1', [id]);
    expect(r.rows).toEqual([{ pariwar_id: p, attempts: 8, actor_id: a, actor_display: 'Asha Verma' }]);
  });

  it('listAllocationFlags returns the Pariwar’s flags newest first (flagged_at DESC, flag_id DESC), and the limit is clamped', async () => {
    const { client } = getTx();
    const p = toPariwarId(randomUUID());
    await enterAppScope(client, p);
    const ids: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      ids.push(await attributionCode.flagAllocationExhausted(client, { pariwarId: p, attempts: 8, actorId: actor(), actorDisplay: `Admin ${String(i)}` }));
    }
    const all = await attributionCode.listAllocationFlags(client, { pariwarId: p });
    const mine = all.map((f) => f.flagId).filter((x) => ids.includes(x));
    expect(mine).toEqual([...ids].reverse()); // clock_timestamp() advances per insert ⇒ newest first
    expect((await attributionCode.listAllocationFlags(client, { pariwarId: p, limit: 2 })).map((f) => f.flagId)).toEqual([ids[2], ids[1]]);
    expect(await attributionCode.listAllocationFlags(client, { pariwarId: p, limit: -1 })).toHaveLength(1); // ⛔ LIMIT -1 bypass
  });

  it('ties on flagged_at break by flag_id DESC', async () => {
    const { client } = getTx();
    const p = randomUUID();
    const ids = [randomUUID(), randomUUID()].sort();
    for (const id of ids) {
      await client.query(
        `INSERT INTO attribution_code_allocation_flags (flag_id, pariwar_id, attempts, actor_id, actor_display, flagged_at)
           VALUES ($1, $2, 8, $3, 'Asha Verma', '2026-11-01 12:00:00+00')`,
        [id, p, randomUUID()],
      );
    }
    await enterAppScope(client, p);
    expect((await attributionCode.listAllocationFlags(client, { pariwarId: toPariwarId(p) })).map((f) => f.flagId)).toEqual([ids[1], ids[0]]);
  });

  it('another Pariwar’s flags are ⛔ listed — as twt_app AND as the OWNER role (the explicit predicate)', async () => {
    const { client } = getTx();
    const p = toPariwarId(randomUUID());
    const q = toPariwarId(randomUUID());
    await setPariwarScope(client, q);
    const other = await attributionCode.flagAllocationExhausted(client, { pariwarId: q, attempts: 8, actorId: actor(), actorDisplay: 'Asha Verma' });
    await setPariwarScope(client, p); // owner: RLS bypassed
    expect((await attributionCode.listAllocationFlags(client, { pariwarId: p })).map((f) => f.flagId)).not.toContain(other);
    await enterAppScope(client, p);
    expect((await attributionCode.listAllocationFlags(client, { pariwarId: p })).map((f) => f.flagId)).not.toContain(other);
  });

  it('a blank actor_display ⇒ 23514 on attribution_code_allocation_flags_actor_display_check; attempts 0 / 33 ⇒ 23514 on …_attempts_check', async () => {
    const { client } = getTx();
    const p = toPariwarId(randomUUID());
    await enterAppScope(client, p);
    const cases: Array<[number, string, string]> = [
      [8, '', 'attribution_code_allocation_flags_actor_display_check'],
      [8, '   ', 'attribution_code_allocation_flags_actor_display_check'],
      [0, 'Asha Verma', 'attribution_code_allocation_flags_attempts_check'],
      [33, 'Asha Verma', 'attribution_code_allocation_flags_attempts_check'],
    ];
    for (const [attempts, actorDisplay, constraint] of cases) {
      await client.query('SAVEPOINT flag_check');
      const err = await caught(() => attributionCode.flagAllocationExhausted(client, { pariwarId: p, attempts, actorId: actor(), actorDisplay }));
      await client.query('ROLLBACK TO SAVEPOINT flag_check');
      expect(pgSqlstateOf(err), constraint).toBe('23514');
      expect(constraintOf(err)).toBe(constraint);
    }
  });

  it('scope ≠ pariwarId ⇒ AttributionPariwarScopeMismatchError for both functions', async () => {
    const { client } = getTx();
    const p = toPariwarId(randomUUID());
    await enterAppScope(client, p);
    const q = toPariwarId(randomUUID());
    expect(
      await caught(() => attributionCode.flagAllocationExhausted(client, { pariwarId: q, attempts: 8, actorId: actor(), actorDisplay: 'Asha Verma' })),
    ).toBeInstanceOf(attributionCode.AttributionPariwarScopeMismatchError);
    expect(await caught(() => attributionCode.listAllocationFlags(client, { pariwarId: q }))).toBeInstanceOf(
      attributionCode.AttributionPariwarScopeMismatchError,
    );
  });
});
