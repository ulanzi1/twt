// The memorial take-down WATCH against the live DB (Story 11b.4a, Task 8.3; AC10; `2026-10-27-412` MP14 (b)): ONE `warn` line per
// Pariwar with ≥ 1 OPEN request past `due_at` — `{ pariwarId, count }` and ⛔ nothing else — and silent at zero. Own-committing; a
// fresh Pariwar per leg, each in the `pariwarAllowlist`; the request rows are written as the superuser with EXPLICIT old instants
// (the API's own 7-day bound is 0187's CHECK, satisfied here with `received_at` in the past).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runMemorialTakedownOverdueWatch } from '../src/scheduler/memorial-takedown-overdue.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const H = 3_600_000;

describe.skipIf(!hasDatabase)('Story 11b.4a — the take-down overdue watch (live DB)', { timeout: 60000 }, () => {
  let pool: pg.Pool;
  const pariwars: string[] = [];
  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4, ssl: false });
  });
  afterAll(async () => {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      for (const t of ['memorial_takedown_outcomes', 'memorial_takedown_requests', 'memorial_submissions', 'pools', 'claims', 'members']) {
        await c.query(`DELETE FROM ${t} WHERE pariwar_id = ANY($1::uuid[])`, [pariwars]);
      }
      await c.query('COMMIT');
    } finally {
      c.release();
      await pool.end();
    }
  });

  /** One request in a fresh drive of `pariwarId`, its first contact `firstContactHoursAgo` ago (recorded an hour later). */
  async function request(pariwarId: string, firstContactHoursAgo: number, decided = false): Promise<void> {
    const memberId = randomUUID();
    const claimCaseId = randomUUID();
    const poolId = randomUUID();
    const submissionId = randomUUID();
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'"); // the drive's parents are ⛔ not the subject here
      await c.query(
        `INSERT INTO memorial_submissions (submission_id, pariwar_id, pool_id, claim_case_id, deceased_member_id, body_ciphertext,
           authorisation_copy_version, authorisation_locale, handover_recipient, handover_nominee_ref)
         VALUES ($1, $2, $3, $4, $5, 'enc:v1:b', 'v', 'hi', 'latest', $6)`,
        [submissionId, pariwarId, poolId, claimCaseId, memberId, randomUUID()],
      );
      const first = new Date(Date.now() - firstContactHoursAgo * H);
      const requestId = randomUUID();
      await c.query(
        `INSERT INTO memorial_takedown_requests (request_id, pariwar_id, pool_id, submission_id, handover_nominee_ref, verified_by,
           first_contact_at, received_at, due_at, actor_id, actor_display)
         VALUES ($1, $2, $3, $4, $5, 'called_back', $6, $7, $6::timestamptz + interval '168 hours', $8, 'Op')`,
        [requestId, pariwarId, poolId, submissionId, randomUUID(), first, new Date(first.getTime() + H), randomUUID()],
      );
      if (decided) {
        await c.query(`INSERT INTO memorial_takedown_outcomes (request_id, pariwar_id, outcome, actor_id, actor_display) VALUES ($1, $2, 'kept', $3, 'Op')`, [
          requestId,
          pariwarId,
          randomUUID(),
        ]);
      }
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      c.release();
    }
  }

  const fresh = (): string => {
    const p = randomUUID();
    pariwars.push(p);
    return p;
  };

  it('⭐ ONE warn per Pariwar with ≥ 1 OPEN overdue request — `{ pariwarId, count }` only; a decided or not-yet-due request is ⛔ not counted; silent at zero', async () => {
    const P = fresh();
    const Q = fresh();
    const Z = fresh();
    await request(P, 8 * 24); // overdue
    await request(P, 10 * 24); // overdue
    await request(P, 9 * 24, true); // overdue but DECIDED ⇒ ⛔ not counted
    await request(P, 2 * 24); // open, ⛔ not yet due
    await request(Q, 7 * 24 + 2); // overdue by two hours
    await request(Z, 24); // ⛔ not yet due ⇒ Z is silent
    const lines: { event: string; fields: Record<string, unknown> }[] = [];
    await runMemorialTakedownOverdueWatch({ pool, pariwarAllowlist: [P, Q, Z], onWarn: (event, fields) => lines.push({ event, fields: { ...fields } }) });
    expect(lines.sort((a, b) => String(a.fields['pariwarId']).localeCompare(String(b.fields['pariwarId'])))).toEqual(
      [
        { event: 'memorial.takedown.overdue', fields: { pariwarId: P, count: 2 } },
        { event: 'memorial.takedown.overdue', fields: { pariwarId: Q, count: 1 } },
      ].sort((a, b) => a.fields.pariwarId.localeCompare(b.fields.pariwarId)),
    );
    for (const l of lines) expect(Object.keys(l.fields).sort()).toEqual(['count', 'pariwarId']);
  });

  it('silent at zero — ⛔ no line for a Pariwar with nothing overdue', async () => {
    const Z = fresh();
    await request(Z, 3 * 24);
    const lines: unknown[] = [];
    await runMemorialTakedownOverdueWatch({ pool, pariwarAllowlist: [Z], onWarn: (...a) => lines.push(a) });
    expect(lines).toEqual([]);
  });
});
