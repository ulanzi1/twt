// Story 12.5b code review round 3 (R2P17; Decision `2026-11-22-492`) — the partner-totals OVERLAP rule against a RACE, on two connections.
//
// The sequential legs prove the rule; they cannot prove the LOCK. Two entries for overlapping periods, each checked against the committed
// rows: with no lock, both pass the check (neither sees the other's uncommitted rows) and both land — and a figure below 5 can then be
// worked out by subtraction (100 − 97 = 3). `recordPartnerFormTotals` therefore takes a per-offer transaction-scoped advisory lock BEFORE its
// check, so the second entry WAITS for the first to commit, then re-checks (READ COMMITTED: the new statement sees the first's row) and is
// refused. Proven here by a mutation-sensitive shape: B must be seen WAITING while A holds its uncommitted entry, and be refused after A
// commits. Delete the lock line and B is not waiting (it finishes at once) — and lands.
//
// COMMITTED seeds (the two connections cannot see an uncommitted test transaction), removed in `afterAll`.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { moduleId as toModuleId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import { PartnerFormTotalsOverlapError } from '../../../src/marketplace/errors.js';
import { recordPartnerFormTotals } from '../../../src/marketplace/partner-form.js';
import { DATABASE_URL, hasDatabase } from '../../../src/test-utils/integration-setup.js';
import { rawInsertParams, rawInsertSqlWith, seedPartner } from './_fixtures.js';

const stages = (figure: number) => [{ label: 'Started', figure }];

describe.skipIf(!hasDatabase)('Story 12.5b — two overlapping totals entries RACE: the lock makes the second one wait and be refused (R2P17)', () => {
  let pool: pg.Pool;
  const pariwar = randomUUID();
  const moduleId = randomUUID();
  let partnerId: string;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3, ssl: false });
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      partnerId = await seedPartner(c, pariwar);
      await c.query("SET LOCAL app.marketplace_module_state_writer = 'on'");
      await c.query(rawInsertSqlWith({ route: 'partner_form' }), rawInsertParams(moduleId, pariwar, { partnerId, capacity: null }));
      await c.query('COMMIT');
    } finally {
      c.release();
    }
  });

  afterAll(async () => {
    try {
      await pool.query('DELETE FROM marketplace_partner_form_totals WHERE module_id = $1', [moduleId]);
      await pool.query('DELETE FROM marketplace_modules WHERE module_id = $1', [moduleId]);
      await pool.query('DELETE FROM marketplace_partners WHERE partner_id = $1', [partnerId]);
    } finally {
      await pool.end();
    }
  });

  const entry = (start: string, end: string, figure: number) => ({
    pariwarId: toPariwarId(pariwar),
    moduleId: toModuleId(moduleId),
    totals: { period_start: start, period_end: end, stages: stages(figure) },
    enteredByActorId: randomUUID(),
    auditId: randomUUID(),
  });

  it('B (an overlapping period) WAITS while A holds its uncommitted entry, then is refused once A commits — exactly one period lands', async () => {
    const a = await pool.connect();
    const b = await pool.connect();
    try {
      await a.query('BEGIN');
      await recordPartnerFormTotals(a, entry('2026-03-01', '2026-03-31', 100)); // A's row is written, NOT committed; A holds the lock
      await b.query('BEGIN');
      const settled: { value?: unknown } = {};
      const pB = recordPartnerFormTotals(b, entry('2026-03-01', '2026-03-15', 30)).then(
        (v) => ((settled.value = v), v),
        (e: unknown) => ((settled.value = e), e),
      );
      // B must still be WAITING: with no lock it checks the committed rows (A's is invisible), passes, inserts, and is settled within a few ms.
      await new Promise((r) => setTimeout(r, 400));
      expect(settled.value, 'B finished while A still held its entry — nothing made it wait (the lock is gone)').toBeUndefined();
      await a.query('COMMIT');
      const outcome = await pB;
      expect(outcome).toBeInstanceOf(PartnerFormTotalsOverlapError);
      expect(outcome).toMatchObject({ existingPeriodStart: '2026-03-01', existingPeriodEnd: '2026-03-31' });
      await b.query('ROLLBACK');
      const periods = await pool.query<{ period_start: string; period_end: string }>(
        'SELECT DISTINCT period_start::text AS period_start, period_end::text AS period_end FROM marketplace_partner_form_totals WHERE module_id = $1',
        [moduleId],
      );
      expect(periods.rows).toEqual([{ period_start: '2026-03-01', period_end: '2026-03-31' }]);
    } finally {
      await a.query('ROLLBACK').catch(() => undefined);
      await b.query('ROLLBACK').catch(() => undefined);
      a.release();
      b.release();
    }
  });
});
