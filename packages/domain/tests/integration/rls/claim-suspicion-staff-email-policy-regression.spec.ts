// claim_suspicion_staff_emails — migration 0152 + RLS policy regression (Story 6.25, Task 1.3; AC8; `2026-10-09-299` RE2, RE4,
// RE5). The 0151 spec's shape (claim-suspicion-notice-policy-regression): positive / negative RLS, the connection-level
// fail-closed probe, the FORCE-RLS catalog guard, ⛔ no DELETE for `twt_app`, per-command policies, cross-tenant WITH CHECK, the
// composite claim FK and the recipient FK, the column-narrowed INSERT and UPDATE grants (verified in
// `information_schema.column_privileges` as EXACT sets, a denied column 42501, ONE positive write of every granted column),
// ⭐ the once-per-(claim, recipient) UNIQUE NULLS NOT DISTINCT (a two-NULL insert FAILS), every CHECK and the partial index BY
// NAME, and the DB ↔ TS outcome CHECK lockstep (EXACT set). ⭐ 0153 (code review round 3, Decision 2 A): the `detail` /
// `first_detail` vocabulary CHECKs (pattern pinned to the TS constant) and the BEFORE UPDATE trigger — a FINISHED row is frozen
// (even for the superuser), `may_have_sent` never goes back, and the claim cascade still deletes. Live DB only; per-test ROLLBACK
// (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { SUSPICION_STAFF_EMAIL_DETAIL_PATTERN, SUSPICION_STAFF_EMAIL_OUTCOMES } from '../../../src/schema/claim_suspicion_staff_emails.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedClaim, seedUser } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const TABLE = 'claim_suspicion_staff_emails';

/** As the superuser: a refused claim, one Pariwar Admin user and their IN-FLIGHT email (`attempting` — 0153 freezes a finished one). */
async function seedEmail(client: Client, pariwarId: string) {
  const { tx } = getTx();
  const claimCaseId = await seedClaim(tx, pariwarId, { currentState: 'denied' });
  const userId = await seedUser(tx);
  const noticeId = randomUUID();
  await client.query(
    `INSERT INTO ${TABLE} (notice_id, pariwar_id, claim_case_id, recipient_user_id, outcome, claimed_at, claimed_by_job)
     VALUES ($1, $2, $3, $4, 'attempting', now(), 'job-seed')`,
    [noticeId, pariwarId, claimCaseId, userId],
  );
  return { claimCaseId, userId, noticeId };
}

type Seeded = Awaited<ReturnType<typeof seedEmail>>;

/** A VALID claim-level `no_target` row on top of the seed (a NULL recipient, so the UNIQUE does ⛔ not fire). */
const validRow = (s: Seeded, pariwarId: string = PARIWAR_A): Record<string, unknown> => ({
  pariwar_id: pariwarId,
  claim_case_id: s.claimCaseId,
  recipient_user_id: null,
  outcome: 'no_target',
  detail: 'no_pariwar_admin',
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
async function grantedColumns(client: Client, privilege: 'INSERT' | 'UPDATE' | 'SELECT'): Promise<string[]> {
  const { rows } = await client.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.column_privileges
      WHERE table_name = $1 AND grantee = 'twt_app' AND privilege_type = $2 ORDER BY column_name`,
    [TABLE, privilege],
  );
  return rows.map((r) => r.column_name);
}

describe.skipIf(!hasDatabase)('the staff email record — migration 0152 + RLS policy regression', { timeout: 20000 }, () => {
  setupLiveDb();

  it('positive + negative: under scope A only A rows, and under scope B only B rows', async () => {
    const { client } = getTx();
    await seedEmail(client, PARIWAR_A);
    await seedEmail(client, PARIWAR_B);
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
    await seedEmail(client, PARIWAR_A);
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
    const s = await seedEmail(client, PARIWAR_A);
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
    const s = await seedEmail(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, validRow(s, PARIWAR_B)), {
      code: '42501',
      message: expect.stringMatching(/row-level security/),
    });
    expect((await insertRow(client, validRow(s, PARIWAR_A))).rowCount).toBe(1);
  });

  it("cross-tenant UPDATE: B's row is INVISIBLE under scope A", async () => {
    const { client } = getTx();
    const a = await seedEmail(client, PARIWAR_A);
    const b = await seedEmail(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    expect((await client.query(`UPDATE ${TABLE} SET updated_at = now() WHERE notice_id = $1`, [b.noticeId])).rowCount).toBe(0);
    expect((await client.query(`UPDATE ${TABLE} SET updated_at = now() WHERE notice_id = $1`, [a.noticeId])).rowCount).toBe(1);
    const { rows } = await client.query<{ qual: string | null; with_check: string | null }>(
      `SELECT qual, with_check FROM pg_policies WHERE schemaname = current_schema() AND tablename = $1 AND cmd = 'UPDATE'`,
      [TABLE],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.with_check).toBe(rows[0]!.qual);
  });

  it('the only deletion is the ON DELETE cascade from claims', async () => {
    const { client } = getTx();
    const s = await seedEmail(client, PARIWAR_A);
    const count = async () =>
      (await client.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${TABLE} WHERE claim_case_id = $1`, [s.claimCaseId])).rows[0]!.n;
    expect(await count()).toBe(1);
    await client.query(`DELETE FROM claims WHERE claim_case_id = $1`, [s.claimCaseId]);
    expect(await count()).toBe(0);
  });

  describe('FKs (23503)', () => {
    it('⭐ the COMPOSITE claim FK — a real claim of ANOTHER Pariwar is refused, ⛔ only an unknown id', async () => {
      const { client } = getTx();
      const a = await seedEmail(client, PARIWAR_A);
      const b = await seedEmail(client, PARIWAR_B);
      const fk = FK('claim_suspicion_staff_emails_claim_case_fk');
      await expectPgError(client, () => insertRow(client, { ...validRow(a), claim_case_id: randomUUID() }), fk);
      await expectPgError(client, () => insertRow(client, { ...validRow(a), claim_case_id: b.claimCaseId }), fk);
      await expectAccepted(client, () => insertRow(client, validRow(a)));
    });

    it('recipient_user_id is a foreign key to users (⛔ cascade)', async () => {
      const { client } = getTx();
      const s = await seedEmail(client, PARIWAR_A);
      const fk = FK('claim_suspicion_staff_emails_recipient_user_fk');
      await expectPgError(
        client,
        () => insertRow(client, { ...validRow(s), recipient_user_id: randomUUID(), outcome: 'error', detail: null }),
        fk,
      );
      // ⛔ cascade — deleting the emailed user is refused while their row exists.
      await expectPgError(client, () => client.query(`DELETE FROM users WHERE id = $1`, [s.userId]), fk);
      const { rows } = await client.query<{ confdeltype: string }>(
        `SELECT confdeltype FROM pg_constraint WHERE conname = 'claim_suspicion_staff_emails_recipient_user_fk'`,
      );
      expect(rows[0]!.confdeltype).toBe('a'); // NO ACTION
    });
  });

  describe('the column-narrowed grants — identity is ⛔ never rewritten, defaults are ⛔ written', () => {
    it('⭐ EXACT sets in information_schema.column_privileges (INSERT, UPDATE); ⛔ DELETE at all', async () => {
      const { client } = getTx();
      expect(await grantedColumns(client, 'INSERT')).toEqual(
        ['claim_case_id', 'claimed_at', 'claimed_by_job', 'detail', 'outcome', 'pariwar_id', 'recipient_user_id'].sort(),
      );
      expect(await grantedColumns(client, 'UPDATE')).toEqual(
        ['aging_since', 'attempt_count', 'claimed_at', 'claimed_by_job', 'detail', 'first_detail', 'may_have_sent', 'outcome', 'parked_at', 'provider_message_id', 'updated_at'].sort(),
      );
      const { rows } = await client.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM information_schema.table_privileges
          WHERE table_name = $1 AND grantee = 'twt_app' AND privilege_type IN ('DELETE', 'TRUNCATE', 'INSERT', 'UPDATE')`,
        [TABLE],
      );
      // ⛔ a TABLE-level INSERT / UPDATE (that would admit every column) and ⛔ DELETE / TRUNCATE.
      expect(rows[0]!.n).toBe(0);
    });

    it('INSERT of a defaulted / identity column is denied (42501); the granted set lands', async () => {
      const { client } = getTx();
      const s = await seedEmail(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      for (const over of [{ notice_id: randomUUID() }, { attempt_count: 2 }, { may_have_sent: true }, { created_at: new Date() }, { first_detail: 'x' }, { aging_since: new Date() }, { parked_at: new Date() }]) {
        await expectPgError(client, () => insertRow(client, { ...validRow(s), ...over }), DENIED);
      }
      await expectAccepted(client, () =>
        insertRow(client, {
          pariwar_id: PARIWAR_A,
          claim_case_id: s.claimCaseId,
          recipient_user_id: null,
          outcome: 'no_target',
          detail: 'no_pariwar_admin',
          claimed_at: null,
          claimed_by_job: null,
        }),
      );
    });

    it('UPDATE of the identity columns and created_at is denied (42501)', async () => {
      const { client } = getTx();
      const s = await seedEmail(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      for (const set of ['recipient_user_id = recipient_user_id', 'claim_case_id = claim_case_id', 'pariwar_id = pariwar_id', 'created_at = now()', 'notice_id = notice_id']) {
        await expectPgError(client, () => client.query(`UPDATE ${TABLE} SET ${set} WHERE notice_id = $1`, [s.noticeId]), DENIED);
      }
    });

    it('ONE positive UPDATE of every granted column', async () => {
      const { client } = getTx();
      const s = await seedEmail(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      await expectAccepted(client, () =>
        client.query(
          `UPDATE ${TABLE} SET outcome = 'error', provider_message_id = 'p', detail = 'error:no_address', first_detail = 'transient:network',
             attempt_count = 2, may_have_sent = true, claimed_at = now(), claimed_by_job = 'sweep:held', parked_at = now(), updated_at = now()
           WHERE notice_id = $1`,
          [s.noticeId],
        ),
      );
    });
  });

  describe('0152 — the CHECKs, the UNIQUE and the index, BY NAME', () => {
    it('every named constraint and the partial index exist (pg_constraint / pg_indexes)', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ conname: string }>(
        `SELECT conname FROM pg_constraint WHERE conrelid = $1::regclass AND contype IN ('c', 'f', 'u', 'p') ORDER BY conname`,
        [TABLE],
      );
      expect(rows.map((r) => r.conname)).toEqual(
        [
          'claim_suspicion_staff_emails_attempt_count_check',
          'claim_suspicion_staff_emails_attempting_claimed_check',
          'claim_suspicion_staff_emails_claim_case_fk',
          'claim_suspicion_staff_emails_claim_recipient_uq',
          'claim_suspicion_staff_emails_detail_length_check',
          'claim_suspicion_staff_emails_detail_vocabulary_check',
          'claim_suspicion_staff_emails_first_detail_length_check',
          'claim_suspicion_staff_emails_first_detail_vocabulary_check',
          'claim_suspicion_staff_emails_no_target_recipient_check',
          'claim_suspicion_staff_emails_outcome_check',
          'claim_suspicion_staff_emails_parked_check',
          'claim_suspicion_staff_emails_pkey',
          'claim_suspicion_staff_emails_recipient_user_fk',
        ].sort(),
      );
      const idx = await client.query<{ indexdef: string }>(
        `SELECT indexdef FROM pg_indexes WHERE tablename = $1 AND indexname = 'claim_suspicion_staff_emails_attempting_idx'`,
        [TABLE],
      );
      expect(idx.rows).toHaveLength(1);
      // 0153 — the give-up's anchor moved from `created_at` to `aging_since` (`-300` §2 (ii)).
      expect(idx.rows[0]!.indexdef).toMatch(/\(aging_since, claimed_at\) WHERE \(outcome = 'attempting'::text\)/);
      const uq = await client.query<{ def: string }>(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'claim_suspicion_staff_emails_claim_recipient_uq'`,
      );
      expect(uq.rows[0]!.def).toBe('UNIQUE NULLS NOT DISTINCT (pariwar_id, claim_case_id, recipient_user_id)');
    });

    it('⭐ LOCKSTEP — the outcome CHECK names EXACTLY the TS vocabulary', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ def: string }>(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'claim_suspicion_staff_emails_outcome_check'`,
      );
      expect(rows).toHaveLength(1);
      const values = [...rows[0]!.def.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]!).sort();
      expect(values).toEqual([...SUSPICION_STAFF_EMAIL_OUTCOMES].sort());
    });

    it('an unknown outcome, attempt count < 1, an `attempting` row without its claim, and an over-long detail are refused', async () => {
      const { client } = getTx();
      const s = await seedEmail(client, PARIWAR_A);
      const user = await seedUser(getTx().tx);
      const recipientRow = { ...validRow(s), recipient_user_id: user, outcome: 'error', detail: 'error:no_address' };
      const ins = (over: Record<string, unknown>) => () => insertRow(client, { ...recipientRow, ...over });
      await expectPgError(client, ins({ outcome: 'delivered' }), CHECK('claim_suspicion_staff_emails_outcome_check'));
      await expectPgError(client, ins({ attempt_count: 0 }), CHECK('claim_suspicion_staff_emails_attempt_count_check'));
      await expectPgError(client, ins({ outcome: 'attempting' }), CHECK('claim_suspicion_staff_emails_attempting_claimed_check'));
      await expectPgError(
        client,
        ins({ outcome: 'attempting', claimed_at: '2026-10-09T04:30:00Z' }),
        CHECK('claim_suspicion_staff_emails_attempting_claimed_check'),
      );
      await expectPgError(
        client,
        ins({ outcome: 'attempting', claimed_by_job: 'j' }),
        CHECK('claim_suspicion_staff_emails_attempting_claimed_check'),
      );
      await expectPgError(client, ins({ detail: 'x'.repeat(201) }), CHECK('claim_suspicion_staff_emails_detail_length_check'));
      await expectPgError(client, ins({ first_detail: 'x'.repeat(201) }), CHECK('claim_suspicion_staff_emails_first_detail_length_check'));
      // 0153 — the length CHECKs are named BEFORE the vocabulary ones (PG checks in name order) ⇒ an over-long value still
      // reports length; a short off-vocabulary value reports the vocabulary.
      await expectPgError(client, ins({ detail: 'x' }), CHECK('claim_suspicion_staff_emails_detail_vocabulary_check'));
      await expectPgError(client, ins({ detail: 'held:priya@example.com' }), CHECK('claim_suspicion_staff_emails_detail_vocabulary_check'));
      await expectPgError(client, ins({ first_detail: 'Message rejected: a@b.in' }), CHECK('claim_suspicion_staff_emails_first_detail_vocabulary_check'));
      await expectAccepted(client, ins({ detail: `rejected:599:${'A'.repeat(64)}`, first_detail: `held:${'b'.repeat(64)}` }));
      await expectAccepted(client, ins({ outcome: 'attempting', claimed_at: '2026-10-09T04:30:00Z', claimed_by_job: 'j', detail: null }));
    });

    it('⭐ 0153 LOCKSTEP — both vocabulary CHECKs carry EXACTLY `SUSPICION_STAFF_EMAIL_DETAIL_PATTERN`', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ conname: string; def: string }>(
        `SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
          WHERE conname IN ('claim_suspicion_staff_emails_detail_vocabulary_check', 'claim_suspicion_staff_emails_first_detail_vocabulary_check')`,
      );
      expect(rows).toHaveLength(2);
      for (const r of rows) expect(r.def.match(/~ '(.*)'::text/)?.[1], r.conname).toBe(SUSPICION_STAFF_EMAIL_DETAIL_PATTERN);
    });

    it('⭐ 0153 trigger — a FINISHED row is frozen (any column, even the superuser); `may_have_sent` never goes back; the cascade still deletes', async () => {
      const { client } = getTx();
      const s = await seedEmail(client, PARIWAR_A);
      const FROZEN = { code: '23000', message: expect.stringMatching(/finished row/) };
      const NEVER_BACK = { code: '23000', message: expect.stringMatching(/never back/) };
      const upd = (set: string) => () => client.query(`UPDATE ${TABLE} SET ${set} WHERE notice_id = $1`, [s.noticeId]);
      // In flight: may_have_sent TRUE is accepted, TRUE → FALSE is refused.
      await client.query(`UPDATE ${TABLE} SET may_have_sent = true WHERE notice_id = $1`, [s.noticeId]);
      await expectPgError(client, upd('may_have_sent = false'), NEVER_BACK);
      // Finished ⇒ frozen: back to attempting, another outcome, and even a harmless column.
      await client.query(`UPDATE ${TABLE} SET outcome = 'accepted', provider_message_id = 'msg-1' WHERE notice_id = $1`, [s.noticeId]);
      for (const set of ["outcome = 'attempting'", "outcome = 'error'", 'updated_at = now()', "detail = 'error:no_address'"]) {
        await expectPgError(client, upd(set), FROZEN);
      }
      // ⛔ A DELETE arm — the claim's ON DELETE cascade still removes the finished row.
      await client.query(`DELETE FROM claims WHERE claim_case_id = $1`, [s.claimCaseId]);
      expect((await client.query(`SELECT 1 FROM ${TABLE} WHERE notice_id = $1`, [s.noticeId])).rowCount).toBe(0);
      const trg = await client.query<{ tgenabled: string }>(
        `SELECT tgenabled FROM pg_trigger WHERE tgname = 'claim_suspicion_staff_emails_guard_update' AND tgrelid = $1::regclass`,
        [TABLE],
      );
      expect(trg.rows).toEqual([{ tgenabled: 'O' }]);
    });

    it('⭐ 0153 / 0154 — `aging_since` is NOT NULL with a clock_timestamp() DEFAULT; `parked_at` is nullable with ⛔ default', async () => {
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

    it('⭐ 0154 — an `attempting` row is parked ⟺ it carries `parked_at` (both directions); a finished row may keep it', async () => {
      const { client } = getTx();
      const s = await seedEmail(client, PARIWAR_A);
      const user = await seedUser(getTx().tx);
      const check = CHECK('claim_suspicion_staff_emails_parked_check');
      const row = (o: Record<string, unknown>) => () =>
        insertRow(client, { ...validRow(s), recipient_user_id: user, outcome: 'attempting', claimed_at: new Date(), detail: null, ...o });
      await expectPgError(client, row({ claimed_by_job: 'sweep:held' }), check);
      await expectPgError(client, row({ claimed_by_job: 'job-1', parked_at: new Date() }), check);
      await expectAccepted(client, row({ claimed_by_job: 'sweep:held', parked_at: new Date() }));
      await expectAccepted(client, () => insertRow(client, { ...validRow(s), recipient_user_id: user, outcome: 'error', detail: 'error:no_address', parked_at: new Date() }));
    });

    it('⭐ 0154 trigger arm — `aging_since` moves ONLY forward and ONLY on a PARKED row (even for the superuser)', async () => {
      const { client } = getTx();
      const s = await seedEmail(client, PARIWAR_A); // in flight, ⛔ parked (`job-seed`)
      const ARM = { code: '23000', message: expect.stringMatching(/aging_since moves only forward/) };
      const upd = (set: string) => () => client.query(`UPDATE ${TABLE} SET ${set} WHERE notice_id = $1`, [s.noticeId]);
      await expectPgError(client, upd("aging_since = aging_since + interval '1 hour'"), ARM); // ⛔ parked
      await client.query(`UPDATE ${TABLE} SET claimed_by_job = 'sweep:held', parked_at = now() WHERE notice_id = $1`, [s.noticeId]);
      await expectPgError(client, upd("aging_since = aging_since - interval '1 minute'"), ARM); // parked, but BACKWARD
      await expectAccepted(client, upd("aging_since = aging_since + interval '1 hour', claimed_by_job = 'job-2', parked_at = NULL"));
    });

    it('⭐ RE4 / RE5 — `no_target` ⟺ a NULL recipient (both directions)', async () => {
      const { client } = getTx();
      const s = await seedEmail(client, PARIWAR_A);
      const user = await seedUser(getTx().tx);
      const check = CHECK('claim_suspicion_staff_emails_no_target_recipient_check');
      // A recipient row can ⛔ never finish `no_target`…
      await expectPgError(client, () => insertRow(client, { ...validRow(s), recipient_user_id: user }), check);
      // …and a NULL-recipient row is ⛔ anything but `no_target`.
      for (const outcome of ['accepted', 'rejected', 'error']) {
        await expectPgError(client, () => insertRow(client, { ...validRow(s), outcome }), check);
      }
      await expectAccepted(client, () => insertRow(client, validRow(s)));
    });

    it('⭐ ONCE per (claim, recipient), EVER — NULLS NOT DISTINCT: a SECOND NULL-recipient row FAILS; another recipient lands', async () => {
      const { client } = getTx();
      const s = await seedEmail(client, PARIWAR_A);
      const uq = UNIQUE('claim_suspicion_staff_emails_claim_recipient_uq');
      // The same recipient twice.
      await expectPgError(client, () => insertRow(client, { ...validRow(s), recipient_user_id: s.userId, outcome: 'error', detail: null }), uq);
      // ⭐ Two NULL recipients — a plain UNIQUE would ACCEPT this.
      await client.query('SAVEPOINT two_nulls');
      expect((await insertRow(client, validRow(s))).rowCount).toBe(1);
      await expectPgError(client, () => insertRow(client, validRow(s)), uq);
      await client.query('ROLLBACK TO SAVEPOINT two_nulls');
      // Another recipient of the same claim lands.
      const other = await seedUser(getTx().tx);
      await expectAccepted(client, () => insertRow(client, { ...validRow(s), recipient_user_id: other, outcome: 'accepted', detail: null }));
    });
  });
});
