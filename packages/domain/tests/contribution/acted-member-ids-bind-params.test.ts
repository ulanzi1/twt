// `listActedMemberIdsForPool`'s bind parameters — Story 5.11b, review 2026-10-26 (R4-P1). DB-free.
//
// AP-P2's first cut expanded `memberIds` into one placeholder per id, twice (2N + 15): a 32,760-member
// roster reached PostgreSQL's 65,535-parameter ceiling and the read threw on every retry. The roster is now
// ONE `text[]` parameter, so the statement's parameter count does not grow with the roster. The statement
// is rendered through the real accessor against a capturing client — never executed.

import { drizzle } from 'drizzle-orm/node-postgres';
import { describe, expect, it } from 'vitest';

import { listActedMemberIdsForPool } from '../../src/contribution/read.js';
import { alertId, pariwarId, poolId } from '../../src/ids/index.js';

const PARIWAR = pariwarId('11111111-1111-1111-1111-111111111111');
const ALERT = alertId('22222222-2222-2222-2222-222222222222');
const POOL = poolId('33333333-3333-3333-3333-333333333333');

async function render(memberIds?: readonly string[]): Promise<{ query: string; params: unknown[] }[]> {
  const statements: { query: string; params: unknown[] }[] = [];
  const client = { query: async () => ({ rows: [], rowCount: 0, fields: [] }) };
  const db = drizzle(client as never, { logger: { logQuery(query, params) { statements.push({ query, params }); } } });
  await listActedMemberIdsForPool(db as never, { pariwarId: PARIWAR, alertId: ALERT, poolId: POOL, ...(memberIds ? { memberIds } : {}) });
  return statements;
}

const roster = (n: number): string[] => Array.from({ length: n }, (_, i) => `aaaaaaaa-0000-0000-0000-${String(i).padStart(12, '0')}`);

describe('R4-P1 — the bounded suppression read binds the roster as ONE parameter', () => {
  it('the parameter count is the same for 1, 8 and 40,000 members (⛔ 2N + 15)', async () => {
    const counts = [];
    for (const n of [1, 8, 40_000]) {
      const statements = await render(roster(n));
      expect(statements).toHaveLength(1);
      counts.push(statements[0]!.params.length);
    }
    expect(new Set(counts).size).toBe(1);
    expect(counts[0]).toBeLessThan(32);
  });

  it('the roster rides as a text[] array value, both legs reading the same parameter shape', async () => {
    const members = roster(3);
    const [statement] = await render(members);
    expect(statement!.query).toMatch(/"contribution_member_id" = ANY\(\$\d+::text\[\]\)/);
    expect(statement!.params.filter((p) => Array.isArray(p))).toEqual([members, members]);
  });

  it('the correlated reversal lookup names its outer column QUALIFIED by the subquery alias (R4-P6)', async () => {
    const [statement] = await render(roster(1));
    expect(statement!.query).toContain('"contribution_reversed_event_id" = "selected_confirmations"."confirmed_event_id"');
  });

  it('a whole-pool caller (no memberIds) binds no roster at all', async () => {
    const [statement] = await render();
    expect(statement!.params.some((p) => Array.isArray(p))).toBe(false);
    expect(statement!.query).not.toContain('contribution_member_id');
  });
});
