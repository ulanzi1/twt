// claim_suspicion_notices — migration 0151 + RLS policy regression (Story 6.24b, Task 1.4; AC7b, AC10b). The 0138 spec's
// shape (claim-certificate-reminder-policy-regression): positive / negative RLS, the connection-level fail-closed probe,
// the FORCE-RLS catalog guard, ⛔ no DELETE for `twt_app`, per-command policies, cross-tenant WITH CHECK, the composite
// FK (a notice can ⛔ never name another Pariwar's claim), the version FK, the column-narrowed UPDATE grant (a denied
// identity column 42501 + ONE positive UPDATE of every granted column), ⭐ the once-per-claim-per-purpose UNIQUE, and the
// DB ↔ TS CHECK lockstep (EXACT sets). Each constraint asserted by its NAME. Live DB only; per-test ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { SUSPICION_NOTICE_OUTCOMES, SUSPICION_NOTICE_PURPOSES } from '../../../src/schema/claim_suspicion_notices.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedClaim } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const TABLE = 'claim_suspicion_notices';

/** As the superuser: a refused claim and its finished FQ7 notice. */
async function seedNotice(client: Client, pariwarId: string) {
  const { tx } = getTx();
  const claimCaseId = await seedClaim(tx, pariwarId, { currentState: 'denied' });
  const noticeId = randomUUID();
  await client.query(
    `INSERT INTO claim_suspicion_notices (notice_id, pariwar_id, claim_case_id, purpose, outcome)
     VALUES ($1, $2, $3, 'suspicion_refusal', 'accepted')`,
    [noticeId, pariwarId, claimCaseId],
  );
  return { claimCaseId, noticeId };
}

type Seeded = Awaited<ReturnType<typeof seedNotice>>;

/** A VALID row on top of the seed (a different purpose, so the UNIQUE does ⛔ not fire). */
const validRow = (s: Seeded, pariwarId: string = PARIWAR_A): Record<string, unknown> => ({
  pariwar_id: pariwarId,
  claim_case_id: s.claimCaseId,
  purpose: 'refusal_appeal_notice',
  outcome: 'no_target',
});

function insertRow(client: Client, v: Record<string, unknown>) {
  const cols = Object.keys(v);
  return client.query(
    `INSERT INTO ${TABLE} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`,
    Object.values(v),
  );
}

async function expectPgError(
  client: Client,
  run: () => Promise<unknown>,
  expected: string | { readonly code: string; readonly constraint?: string; readonly message?: unknown },
): Promise<void> {
  await client.query('SAVEPOINT expect_pg_error');
  await expect(run()).rejects.toMatchObject(typeof expected === 'string' ? { code: expected } : expected);
  await client.query('ROLLBACK TO SAVEPOINT expect_pg_error');
}

/** A positive write inside its own savepoint (rolled back) — proves the row is accepted without leaving it. */
async function expectAccepted(client: Client, run: () => Promise<{ rowCount: number | null }>): Promise<void> {
  await client.query('SAVEPOINT expect_ok');
  expect((await run()).rowCount).toBe(1);
  await client.query('ROLLBACK TO SAVEPOINT expect_ok');
}

const CHECK = (constraint: string) => ({ code: '23514', constraint });
const UNIQUE = (constraint: string) => ({ code: '23505', constraint });
const FK = (constraint: string) => ({ code: '23503', constraint });
const DENIED = { code: '42501', message: expect.stringMatching(/permission denied/) };

/** The quoted values of a CHECK's `IN (…)` list, as the catalog prints it. */
async function checkValues(client: Client, conname: string): Promise<string[]> {
  const { rows } = await client.query<{ def: string }>(
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1`,
    [conname],
  );
  expect(rows).toHaveLength(1);
  return [...rows[0]!.def.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]!).sort();
}

describe.skipIf(!hasDatabase)('the suspicion notice record — migration 0151 + RLS policy regression', { timeout: 20000 }, () => {
  setupLiveDb();

  it('positive + negative: under scope A only A rows, and under scope B only B rows', async () => {
    const { client } = getTx();
    await seedNotice(client, PARIWAR_A);
    await seedNotice(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    const a = await client.query<{ pariwar_id: string }>(`SELECT pariwar_id FROM ${TABLE}`);
    expect(a.rows.length).toBeGreaterThan(0);
    expect(a.rows.every((r) => r.pariwar_id === PARIWAR_A)).toBe(true);
    await enterAppScope(client, PARIWAR_B);
    const b = await client.query<{ pariwar_id: string }>(`SELECT pariwar_id FROM ${TABLE}`);
    expect(b.rows.length).toBeGreaterThan(0);
    expect(b.rows.some((r) => r.pariwar_id === PARIWAR_A)).toBe(false);
  });

  it('connection-level fail-closed: the app role with no scope sees ⛔ no row', async () => {
    const { client } = getTx();
    await seedNotice(client, PARIWAR_A);
    await enterAppRoleNoScope(client);
    expect((await client.query(`SELECT 1 FROM ${TABLE}`)).rows).toHaveLength(0);
  });

  it('FORCE RLS: rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1 AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())`,
      [TABLE],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.relrowsecurity && rows[0]!.relforcerowsecurity).toBe(true);
  });

  it('⛔ no DELETE for twt_app', async () => {
    const { client } = getTx();
    const s = await seedNotice(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => client.query(`DELETE FROM ${TABLE} WHERE notice_id = $1`, [s.noticeId]), DENIED);
  });

  it('the policies are per-command — ⛔ no FOR ALL and ⛔ no DELETE policy', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ cmd: string }>(
      `SELECT cmd FROM pg_policies WHERE schemaname = current_schema() AND tablename = $1`,
      [TABLE],
    );
    expect(rows.map((r) => r.cmd).sort()).toEqual(['INSERT', 'SELECT', 'UPDATE']);
  });

  it('cross-tenant INSERT: under scope A, a row carrying Pariwar B is refused by WITH CHECK (42501)', async () => {
    const { client } = getTx();
    const s = await seedNotice(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, validRow(s, PARIWAR_B)), {
      code: '42501',
      message: expect.stringMatching(/row-level security/),
    });
    expect((await insertRow(client, validRow(s, PARIWAR_A))).rowCount).toBe(1);
  });

  it('cross-tenant UPDATE: B\'s row is INVISIBLE under scope A, and ⛔ no row can be moved to B', async () => {
    const { client } = getTx();
    const a = await seedNotice(client, PARIWAR_A);
    const b = await seedNotice(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    expect((await client.query(`UPDATE ${TABLE} SET updated_at = now() WHERE notice_id = $1`, [b.noticeId])).rowCount).toBe(0);
    expect((await client.query(`UPDATE ${TABLE} SET updated_at = now() WHERE notice_id = $1`, [a.noticeId])).rowCount).toBe(1);
    await expectPgError(client, () => client.query(`UPDATE ${TABLE} SET pariwar_id = $2 WHERE notice_id = $1`, [a.noticeId, PARIWAR_B]), DENIED);
    const { rows } = await client.query<{ qual: string | null; with_check: string | null }>(
      `SELECT qual, with_check FROM pg_policies WHERE schemaname = current_schema() AND tablename = $1 AND cmd = 'UPDATE'`,
      [TABLE],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.with_check).toBe(rows[0]!.qual);
  });

  it('the only deletion is the ON DELETE cascade from claims', async () => {
    const { client } = getTx();
    const s = await seedNotice(client, PARIWAR_A);
    const count = async () =>
      (await client.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${TABLE} WHERE claim_case_id = $1`, [s.claimCaseId])).rows[0]!.n;
    expect(await count()).toBe(1);
    await client.query(`DELETE FROM claims WHERE claim_case_id = $1`, [s.claimCaseId]);
    expect(await count()).toBe(0);
  });

  describe('FKs (23503)', () => {
    it('⭐ the COMPOSITE claim FK — a real claim of ANOTHER Pariwar is refused, ⛔ only an unknown id', async () => {
      const { client } = getTx();
      const a = await seedNotice(client, PARIWAR_A);
      const b = await seedNotice(client, PARIWAR_B);
      const fk = FK('claim_suspicion_notices_claim_case_fk');
      await expectPgError(client, () => insertRow(client, { ...validRow(a), claim_case_id: randomUUID() }), fk);
      // B's claim id under A's Pariwar — a single-column FK would accept it.
      await expectPgError(client, () => insertRow(client, { ...validRow(a), claim_case_id: b.claimCaseId }), fk);
      await expectAccepted(client, () => insertRow(client, validRow(a)));
    });

    it('recipient_version_id is a foreign key to member_nominee_versions (nullable)', async () => {
      const { client } = getTx();
      const s = await seedNotice(client, PARIWAR_A);
      await expectPgError(
        client,
        () => insertRow(client, { ...validRow(s), recipient_version_id: randomUUID() }),
        FK('claim_suspicion_notices_recipient_version_id_fk'),
      );
      await expectAccepted(client, () => insertRow(client, { ...validRow(s), recipient_version_id: null }));
    });
  });

  describe('the column-narrowed UPDATE grant — identity is ⛔ never rewritten', () => {
    it('the identity columns and created_at are denied (42501)', async () => {
      const { client } = getTx();
      const s = await seedNotice(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      for (const set of [`purpose = 'closed_after_appeal'`, `claim_case_id = claim_case_id`, `pariwar_id = pariwar_id`, `created_at = now()`, `notice_id = notice_id`]) {
        await expectPgError(client, () => client.query(`UPDATE ${TABLE} SET ${set} WHERE notice_id = $1`, [s.noticeId]), DENIED);
      }
    });

    it('ONE positive UPDATE of every granted column', async () => {
      const { client } = getTx();
      const s = await seedNotice(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      await expectAccepted(client, () =>
        client.query(
          `UPDATE ${TABLE} SET outcome = 'attempting', provider_message_id = 'p', detail = 'd', first_detail = 'f',
             recipient_version_id = NULL, recipient_number_hash = 'h', attempt_count = 2, claimed_at = now(),
             claimed_by_job = 'j', updated_at = now()
           WHERE notice_id = $1`,
          [s.noticeId],
        ),
      );
    });
  });

  describe('0151 — the CHECKs and the UNIQUE', () => {
    it('⭐ LOCKSTEP — the purpose and outcome CHECKs name EXACTLY the TS vocabularies', async () => {
      const { client } = getTx();
      expect(await checkValues(client, 'claim_suspicion_notices_purpose_check')).toEqual([...SUSPICION_NOTICE_PURPOSES].sort());
      expect(await checkValues(client, 'claim_suspicion_notices_outcome_check')).toEqual([...SUSPICION_NOTICE_OUTCOMES].sort());
    });

    it('an unknown purpose / outcome, attempt count < 1, and an unclaimed `attempting` row are refused', async () => {
      const { client } = getTx();
      const s = await seedNotice(client, PARIWAR_A);
      const ins = (over: Record<string, unknown>) => () => insertRow(client, { ...validRow(s), ...over });
      await expectPgError(client, ins({ purpose: 'replacement_reminder' }), CHECK('claim_suspicion_notices_purpose_check'));
      await expectPgError(client, ins({ outcome: 'delivered' }), CHECK('claim_suspicion_notices_outcome_check'));
      await expectPgError(client, ins({ attempt_count: 0 }), CHECK('claim_suspicion_notices_attempt_count_check'));
      await expectPgError(client, ins({ outcome: 'attempting' }), CHECK('claim_suspicion_notices_attempting_claimed_check'));
      await expectAccepted(client, ins({ outcome: 'attempting', claimed_at: '2026-10-08T04:30:00Z', recipient_number_hash: 'h' }));
    });

    it('⭐ ONCE per claim per purpose, EVER — a second row of the same purpose is refused; another purpose lands', async () => {
      const { client } = getTx();
      const s = await seedNotice(client, PARIWAR_A);
      await expectPgError(
        client,
        () => insertRow(client, { ...validRow(s), purpose: 'suspicion_refusal' }),
        UNIQUE('claim_suspicion_notices_claim_purpose_uq'),
      );
      await expectAccepted(client, () => insertRow(client, { ...validRow(s), purpose: 'closed_after_appeal' }));
    });
  });
});
