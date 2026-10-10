// claim_suspicion_notices — migration 0151 + RLS policy regression (Story 6.24b, Task 1.4; AC7b, AC10b). The 0138 spec's
// shape (claim-certificate-reminder-policy-regression): positive / negative RLS, the connection-level fail-closed probe,
// the FORCE-RLS catalog guard, ⛔ no DELETE for `twt_app`, per-command policies, cross-tenant WITH CHECK, the composite
// FK (a notice can ⛔ never name another Pariwar's claim), the version FK, the column-narrowed UPDATE grant (a denied
// identity column 42501 + ONE positive UPDATE of every granted column), ⭐ the once-per-claim-per-purpose UNIQUE, and the
// DB ↔ TS CHECK lockstep (EXACT sets). Each constraint asserted by its NAME. ⭐ 0155 (Story 6.29, `2026-10-10-302` RN3, RN5, RN6,
// RN8): the `detail` / `first_detail` grammar CHECKs (pattern pinned to the TS constant), the BEFORE UPDATE trigger (a FINISHED row
// is frozen even for the superuser; `aging_since` moves only forward, only on a parked row), the parked ⟺ `parked_at` CHECK, an
// `attempting` row names its holder, the column-narrowed INSERT grant (EXACT sets), and the partial index BY NAME. Live DB only;
// per-test ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  SUSPICION_NOTICE_DETAIL_PATTERN,
  SUSPICION_NOTICE_OUTCOMES,
  SUSPICION_NOTICE_PURPOSES,
} from '../../../src/schema/claim_suspicion_notices.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedClaim } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const TABLE = 'claim_suspicion_notices';

/** As the superuser: a refused claim and its IN-FLIGHT FQ7 notice (`attempting` — 0155 freezes a finished one). */
async function seedNotice(client: Client, pariwarId: string) {
  const { tx } = getTx();
  const claimCaseId = await seedClaim(tx, pariwarId, { currentState: 'denied' });
  const noticeId = randomUUID();
  await client.query(
    `INSERT INTO claim_suspicion_notices (notice_id, pariwar_id, claim_case_id, purpose, outcome, claimed_at, claimed_by_job)
     VALUES ($1, $2, $3, 'suspicion_refusal', 'attempting', now(), 'job-seed')`,
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

/** The columns `twt_app` holds `privilege` on, as the catalog reports them. */
async function grantedColumns(client: Client, privilege: 'INSERT' | 'UPDATE'): Promise<string[]> {
  const { rows } = await client.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.column_privileges
      WHERE table_name = $1 AND grantee = 'twt_app' AND privilege_type = $2 ORDER BY column_name`,
    [TABLE, privilege],
  );
  return rows.map((r) => r.column_name);
}

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

  describe('the column-narrowed grants — identity is ⛔ never rewritten, defaults are ⛔ written', () => {
    it('⭐ 0155 RN8 (b) — EXACT sets in information_schema.column_privileges (INSERT, UPDATE); ⛔ table-level INSERT / UPDATE / DELETE', async () => {
      const { client } = getTx();
      expect(await grantedColumns(client, 'INSERT')).toEqual(
        ['claim_case_id', 'claimed_at', 'claimed_by_job', 'detail', 'outcome', 'pariwar_id', 'purpose'].sort(),
      );
      expect(await grantedColumns(client, 'UPDATE')).toEqual(
        ['aging_since', 'attempt_count', 'claimed_at', 'claimed_by_job', 'detail', 'first_detail', 'outcome', 'parked_at', 'provider_message_id', 'recipient_number_hash', 'recipient_version_id', 'updated_at'].sort(),
      );
      const { rows } = await client.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM information_schema.table_privileges
          WHERE table_name = $1 AND grantee = 'twt_app' AND privilege_type IN ('DELETE', 'TRUNCATE', 'INSERT', 'UPDATE')`,
        [TABLE],
      );
      expect(rows[0]!.n).toBe(0);
    });

    it('⭐ 0155 RN8 (b) — INSERT of a non-writer column is denied (42501); the writers\' union lands', async () => {
      const { client } = getTx();
      const s = await seedNotice(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      for (const over of [
        { notice_id: randomUUID() },
        { attempt_count: 2 },
        { created_at: new Date() },
        { aging_since: new Date() },
        { parked_at: new Date() },
        { first_detail: 'name:none' },
        { recipient_number_hash: 'h' },
        { provider_message_id: 'p' },
        { recipient_version_id: null },
        { updated_at: new Date() },
      ]) {
        await expectPgError(client, () => insertRow(client, { ...validRow(s), ...over }), DENIED);
      }
      await expectAccepted(client, () =>
        insertRow(client, { ...validRow(s), detail: 'no_target:no_contact_record', claimed_at: null, claimed_by_job: null }),
      );
      await expectAccepted(client, () =>
        insertRow(client, { ...validRow(s), outcome: 'attempting', detail: null, claimed_at: new Date(), claimed_by_job: 'job-1' }),
      );
    });

    it('the identity columns and created_at are denied (42501)', async () => {
      const { client } = getTx();
      const s = await seedNotice(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      for (const set of [`purpose = 'closed_after_appeal'`, `claim_case_id = claim_case_id`, `pariwar_id = pariwar_id`, `created_at = now()`, `notice_id = notice_id`]) {
        await expectPgError(client, () => client.query(`UPDATE ${TABLE} SET ${set} WHERE notice_id = $1`, [s.noticeId]), DENIED);
      }
    });

    it('ONE positive UPDATE of every granted column (from a PARKED seed — the only shape the parked CHECK and the trigger arm admit)', async () => {
      const { client } = getTx();
      const s = await seedNotice(client, PARIWAR_A);
      await client.query(`UPDATE ${TABLE} SET claimed_by_job = 'sweep:held', parked_at = now() WHERE notice_id = $1`, [s.noticeId]);
      await enterAppScope(client, PARIWAR_A);
      await expectAccepted(client, () =>
        client.query(
          `UPDATE ${TABLE} SET outcome = 'attempting', provider_message_id = 'p', detail = 'api_unavailable:timeout',
             first_detail = 'rate_limited:E004', recipient_version_id = NULL, recipient_number_hash = 'h', attempt_count = 2,
             claimed_at = now(), claimed_by_job = 'j', parked_at = NULL, aging_since = aging_since + interval '1 hour',
             updated_at = now()
           WHERE notice_id = $1`,
          [s.noticeId],
        ),
      );
    });
  });

  describe('0151 / 0155 — the CHECKs, the UNIQUE, the index and the trigger', () => {
    it('⭐ every named constraint and the partial index exist (pg_constraint / pg_indexes) — RN8 (c)', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ conname: string }>(
        `SELECT conname FROM pg_constraint WHERE conrelid = $1::regclass AND contype IN ('c', 'f', 'u', 'p') ORDER BY conname`,
        [TABLE],
      );
      expect(rows.map((r) => r.conname)).toEqual(
        [
          'claim_suspicion_notices_attempt_count_check',
          'claim_suspicion_notices_attempting_claimed_check',
          'claim_suspicion_notices_claim_case_fk',
          'claim_suspicion_notices_detail_length_check',
          'claim_suspicion_notices_detail_vocabulary_check',
          'claim_suspicion_notices_first_detail_length_check',
          'claim_suspicion_notices_first_detail_vocabulary_check',
          'claim_suspicion_notices_outcome_check',
          'claim_suspicion_notices_parked_check',
          'claim_suspicion_notices_pkey',
          'claim_suspicion_notices_purpose_check',
          'claim_suspicion_notices_recipient_version_id_fk',
        ].sort(),
      );
      const idx = await client.query<{ indexdef: string }>(
        `SELECT indexdef FROM pg_indexes WHERE tablename = $1 AND indexname = 'claim_suspicion_notices_attempting_idx'`,
        [TABLE],
      );
      expect(idx.rows).toHaveLength(1);
      // 0155 — the give-up's anchor moved from `created_at` to `aging_since` (`-302` RN3).
      expect(idx.rows[0]!.indexdef).toMatch(/\(aging_since, claimed_at\) WHERE \(outcome = 'attempting'::text\)/);
      const uq = await client.query<{ indexdef: string }>(
        `SELECT indexdef FROM pg_indexes WHERE tablename = $1 AND indexname = 'claim_suspicion_notices_claim_purpose_uq'`,
        [TABLE],
      );
      expect(uq.rows[0]!.indexdef).toMatch(/UNIQUE INDEX .* \(pariwar_id, claim_case_id, purpose\)$/);
    });

    it('⭐ LOCKSTEP — the purpose and outcome CHECKs name EXACTLY the TS vocabularies', async () => {
      const { client } = getTx();
      expect(await checkValues(client, 'claim_suspicion_notices_purpose_check')).toEqual([...SUSPICION_NOTICE_PURPOSES].sort());
      expect(await checkValues(client, 'claim_suspicion_notices_outcome_check')).toEqual([...SUSPICION_NOTICE_OUTCOMES].sort());
    });

    it('an unknown purpose / outcome, attempt count < 1, and an `attempting` row without its claim OR its holder are refused', async () => {
      const { client } = getTx();
      const s = await seedNotice(client, PARIWAR_A);
      const ins = (over: Record<string, unknown>) => () => insertRow(client, { ...validRow(s), ...over });
      const claimed = CHECK('claim_suspicion_notices_attempting_claimed_check');
      await expectPgError(client, ins({ purpose: 'replacement_reminder' }), CHECK('claim_suspicion_notices_purpose_check'));
      await expectPgError(client, ins({ outcome: 'delivered' }), CHECK('claim_suspicion_notices_outcome_check'));
      await expectPgError(client, ins({ attempt_count: 0 }), CHECK('claim_suspicion_notices_attempt_count_check'));
      await expectPgError(client, ins({ outcome: 'attempting' }), claimed);
      await expectPgError(client, ins({ outcome: 'attempting', claimed_by_job: 'j' }), claimed);
      // 0155 RN8 (a) — 0151 accepted this one (a claim time, ⛔ holder).
      await expectPgError(client, ins({ outcome: 'attempting', claimed_at: '2026-10-08T04:30:00Z', recipient_number_hash: 'h' }), claimed);
      await expectAccepted(client, ins({ outcome: 'attempting', claimed_at: '2026-10-08T04:30:00Z', claimed_by_job: 'j', recipient_number_hash: 'h' }));
    });

    it('⭐ 0155 RN5 — `detail` / `first_detail`: length first, then the grammar (⛔ free text, a space, `+91…`, a bare 10-digit number)', async () => {
      const { client } = getTx();
      const s = await seedNotice(client, PARIWAR_A);
      const ins = (over: Record<string, unknown>) => () => insertRow(client, { ...validRow(s), outcome: 'error', ...over });
      const vocab = CHECK('claim_suspicion_notices_detail_vocabulary_check');
      await expectPgError(client, ins({ detail: 'x'.repeat(201) }), CHECK('claim_suspicion_notices_detail_length_check'));
      await expectPgError(client, ins({ first_detail: 'x'.repeat(201) }), CHECK('claim_suspicion_notices_first_detail_length_check'));
      for (const bad of ['d', 'unknown:a b', 'invalid_number:+919876543210', 'invalid_number:9876543210', 'carrier_reject:E003 at 9876543210', `auth:${'A'.repeat(65)}`, 'held:x']) {
        await expectPgError(client, ins({ detail: bad }), vocab);
      }
      await expectPgError(client, ins({ first_detail: 'Message rejected' }), CHECK('claim_suspicion_notices_first_detail_vocabulary_check'));
      await expectAccepted(client, ins({ detail: `auth:${'A'.repeat(64)}`, first_detail: 'api_unavailable:http_503' }));
      await expectAccepted(client, ins({ detail: 'config:secret_manager_PERMISSION_DENIED', first_detail: 'unknown:123456' }));
    });

    it('⭐ 0155 LOCKSTEP — both vocabulary CHECKs carry EXACTLY `SUSPICION_NOTICE_DETAIL_PATTERN`', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ conname: string; def: string }>(
        `SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
          WHERE conname IN ('claim_suspicion_notices_detail_vocabulary_check', 'claim_suspicion_notices_first_detail_vocabulary_check')`,
      );
      expect(rows).toHaveLength(2);
      for (const r of rows) expect(r.def.match(/~ '(.*)'::text/)?.[1], r.conname).toBe(SUSPICION_NOTICE_DETAIL_PATTERN);
    });

    it('⭐ 0155 RN6 trigger — a FINISHED row is frozen (any column, even the superuser); the cascade still deletes', async () => {
      const { client } = getTx();
      const s = await seedNotice(client, PARIWAR_A);
      const FROZEN = { code: '23000', message: expect.stringMatching(/finished row/) };
      const upd = (set: string) => () => client.query(`UPDATE ${TABLE} SET ${set} WHERE notice_id = $1`, [s.noticeId]);
      await client.query(`UPDATE ${TABLE} SET outcome = 'accepted', provider_message_id = 'msg-1' WHERE notice_id = $1`, [s.noticeId]);
      for (const set of ["outcome = 'attempting'", "outcome = 'error'", 'updated_at = now()', "detail = 'unknown:unknown'", "claimed_by_job = 'sweep:held'"]) {
        await expectPgError(client, upd(set), FROZEN);
      }
      await client.query(`DELETE FROM claims WHERE claim_case_id = $1`, [s.claimCaseId]);
      expect((await client.query(`SELECT 1 FROM ${TABLE} WHERE notice_id = $1`, [s.noticeId])).rowCount).toBe(0);
      const trg = await client.query<{ tgenabled: string }>(
        `SELECT tgenabled FROM pg_trigger WHERE tgname = 'claim_suspicion_notices_guard_update' AND tgrelid = $1::regclass`,
        [TABLE],
      );
      expect(trg.rows).toEqual([{ tgenabled: 'O' }]);
    });

    it('⭐ 0155 RN3 — `aging_since` is NOT NULL with a clock_timestamp() DEFAULT; `parked_at` is nullable with ⛔ default', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ column_name: string; is_nullable: string; column_default: string | null }>(
        `SELECT column_name, is_nullable, column_default FROM information_schema.columns
          WHERE table_name = $1 AND column_name IN ('aging_since', 'parked_at') ORDER BY column_name`,
        [TABLE],
      );
      expect(rows).toEqual([
        { column_name: 'aging_since', is_nullable: 'NO', column_default: 'clock_timestamp()' },
        { column_name: 'parked_at', is_nullable: 'YES', column_default: null },
      ]);
    });

    it('⭐ 0155 RN3 — an `attempting` row is parked ⟺ it carries `parked_at` (both directions); a finished row may keep it', async () => {
      const { client } = getTx();
      const s = await seedNotice(client, PARIWAR_A);
      const check = CHECK('claim_suspicion_notices_parked_check');
      const row = (o: Record<string, unknown>) => () => insertRow(client, { ...validRow(s), outcome: 'attempting', claimed_at: new Date(), ...o });
      await expectPgError(client, row({ claimed_by_job: 'sweep:held' }), check);
      await expectPgError(client, row({ claimed_by_job: 'job-1', parked_at: new Date() }), check);
      await expectAccepted(client, row({ claimed_by_job: 'sweep:held', parked_at: new Date() }));
      await expectAccepted(client, () => insertRow(client, { ...validRow(s), outcome: 'error', detail: 'exhausted:attempting_three_days', parked_at: new Date() }));
    });

    it('⭐ 0155 RN3 trigger arm — `aging_since` moves ONLY forward and ONLY on a PARKED row (even for the superuser)', async () => {
      const { client } = getTx();
      const s = await seedNotice(client, PARIWAR_A); // in flight, ⛔ parked (`job-seed`)
      const ARM = { code: '23000', message: expect.stringMatching(/aging_since moves only forward/) };
      const upd = (set: string) => () => client.query(`UPDATE ${TABLE} SET ${set} WHERE notice_id = $1`, [s.noticeId]);
      await expectPgError(client, upd("aging_since = aging_since + interval '1 hour'"), ARM); // ⛔ parked
      await client.query(`UPDATE ${TABLE} SET claimed_by_job = 'sweep:held', parked_at = now() WHERE notice_id = $1`, [s.noticeId]);
      await expectPgError(client, upd("aging_since = aging_since - interval '1 minute'"), ARM); // parked, but BACKWARD
      await expectAccepted(client, upd("aging_since = aging_since + interval '1 hour', claimed_by_job = 'job-2', parked_at = NULL"));
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
