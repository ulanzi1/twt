// claim_contact_wa_sends + claim_contact_wa_stops — migration 0172 + RLS policy regression (Story 6.37d, Task 3; AC8; WS8,
// WS10, WS11; I4, I8). Positive / negative tenant RLS, the connection-level fail-closed probe, FORCE RLS, EXACTLY the
// per-command policies (sends: SELECT / INSERT / UPDATE; stops: SELECT / INSERT — ⛔ FOR ALL, ⛔ DELETE), EXACTLY the grants
// (⛔ identity, ⛔ DELETE), cross-tenant WITH CHECK, the FKs, ONE send per ladder, the stops' replay UNIQUE, every CHECK by
// NAME with a positive counterpart (a leg per outcome — 6.37d's OWN marker mapping), the grammar LOCKSTEP, and the TRIGGER:
// identity frozen, a finished row frozen EXCEPT the three status columns (each set once, on an accepted row with a wamid),
// the attempting-row rules and the marker's re-stamp refusal. Live DB only; per-test ROLLBACK.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  CONTACT_LADDER_WA_DETAIL_PATTERN,
  CONTACT_LADDER_WA_SEND_OUTCOMES,
} from '../../../src/schema/claim_contact_wa_sends.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedClaim } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const T = 'claim_contact_wa_sends';
const S = 'claim_contact_wa_stops';

/** As the superuser: a claim and ONE running correction ladder whose WhatsApp step is pending. */
async function seedLadder(client: Client, pariwarId: string): Promise<{ claimCaseId: string; ladderId: string }> {
  const { tx } = getTx();
  const claimCaseId = await seedClaim(tx, pariwarId);
  const { rows } = await client.query<{ ladder_id: string }>(
    `INSERT INTO claim_contact_ladders (pariwar_id, claim_case_id, chase, run_id, return_decision_id, person_key, recipient_number_hash,
       origin_row_id, origin_sent_on, whatsapp_step, sms2_due_on)
     VALUES ($1, $2, 'correction', gen_random_uuid(), gen_random_uuid(), 'claimant', 'h-number', gen_random_uuid(), '2026-10-01', 'pending', '2026-10-03')
     RETURNING ladder_id`,
    [pariwarId, claimCaseId],
  );
  return { claimCaseId, ladderId: rows[0]!.ladder_id };
}

type Ladder = Awaited<ReturnType<typeof seedLadder>>;

const rowOf = (l: Ladder, pariwarId: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  ladder_id: l.ladderId,
  pariwar_id: pariwarId,
  claim_case_id: l.claimCaseId,
  chase: 'correction',
  recipient_number_hash: 'h-number',
  template_name: 'claim_correction_reminder_en',
  locale: 'en',
  send_outcome: 'attempting',
  claimed_at: '2026-10-20T08:00:00.000Z',
  claimed_by_job: 'job-1',
  aging_since: '2026-10-20T08:00:00.000Z',
  ...over,
});

function insertRow(client: Client, v: Record<string, unknown>, table: string = T) {
  const cols = Object.keys(v);
  return client.query<{ send_id?: string; stop_id?: string }>(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
    Object.values(v),
  );
}

async function seed(client: Client, pariwarId: string = PARIWAR_A, over: Record<string, unknown> = {}): Promise<{ ladder: Ladder; sendId: string }> {
  const ladder = await seedLadder(client, pariwarId);
  const { rows } = await insertRow(client, rowOf(ladder, pariwarId, over));
  return { ladder, sendId: rows[0]!.send_id! };
}

async function expectPgError(
  client: Client,
  run: () => Promise<unknown>,
  expected: { readonly code: string; readonly constraint?: string; readonly message?: unknown },
): Promise<void> {
  await client.query('SAVEPOINT expect_pg_error');
  await expect(run()).rejects.toMatchObject(expected);
  await client.query('ROLLBACK TO SAVEPOINT expect_pg_error');
}

async function expectAccepted(client: Client, run: () => Promise<{ rowCount: number | null }>): Promise<void> {
  await client.query('SAVEPOINT expect_ok');
  expect((await run()).rowCount).toBe(1);
  await client.query('ROLLBACK TO SAVEPOINT expect_ok');
}

const DENIED = { code: '42501', message: expect.stringMatching(/permission denied/) };
const CHECK = (constraint: string) => ({ code: '23514', constraint });
const GUARD = (message: RegExp) => ({ code: '23000', message: expect.stringMatching(message) });
const MARK = '2026-10-20T08:00:05.000Z';

describe.skipIf(!hasDatabase)('claim_contact_wa_sends / claim_contact_wa_stops — migration 0172 + RLS policy regression', { timeout: 20000 }, () => {
  setupLiveDb();

  it('positive + negative: under scope A only A rows, under scope B only B rows (both tables)', async () => {
    const { client } = getTx();
    await seed(client, PARIWAR_A);
    await seed(client, PARIWAR_B);
    await insertRow(client, { pariwar_id: PARIWAR_A, recipient_number_hash: 'h', inbound_event_id: randomUUID() }, S);
    await insertRow(client, { pariwar_id: PARIWAR_B, recipient_number_hash: 'h', inbound_event_id: randomUUID() }, S);
    for (const table of [T, S]) {
      await enterAppScope(client, PARIWAR_A);
      const a = await client.query<{ pariwar_id: string }>(`SELECT pariwar_id FROM ${table}`);
      expect(a.rows.length).toBeGreaterThan(0);
      expect(a.rows.every((r) => r.pariwar_id === PARIWAR_A)).toBe(true);
      await enterAppScope(client, PARIWAR_B);
      const b = await client.query<{ pariwar_id: string }>(`SELECT pariwar_id FROM ${table}`);
      expect(b.rows.length).toBeGreaterThan(0);
      expect(b.rows.some((r) => r.pariwar_id === PARIWAR_A)).toBe(false);
      await client.query('RESET ROLE');
    }
  });

  it('connection-level fail-closed: the app role with no scope sees ⛔ no row (both tables)', async () => {
    const { client } = getTx();
    await seed(client);
    await insertRow(client, { pariwar_id: PARIWAR_A, recipient_number_hash: 'h', inbound_event_id: randomUUID() }, S);
    await enterAppRoleNoScope(client);
    expect((await client.query(`SELECT 1 FROM ${T}`)).rows).toHaveLength(0);
    expect((await client.query(`SELECT 1 FROM ${S}`)).rows).toHaveLength(0);
  });

  it('FORCE RLS on both tables', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ relname: string; on: boolean }>(
      `SELECT relname, relrowsecurity AND relforcerowsecurity AS on FROM pg_class
        WHERE relname = ANY($1) AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema()) ORDER BY relname`,
      [[T, S]],
    );
    expect(rows).toEqual([{ relname: T, on: true }, { relname: S, on: true }]);
  });

  it('the policies: sends EXACTLY SELECT / INSERT / UPDATE, stops EXACTLY SELECT / INSERT — to twt_app, tenant-keyed', async () => {
    const { client } = getTx();
    for (const [table, cmds] of [[T, ['INSERT', 'SELECT', 'UPDATE']], [S, ['INSERT', 'SELECT']]] as const) {
      const { rows } = await client.query<{ cmd: string; roles: string; qual: string | null; with_check: string | null }>(
        `SELECT cmd, roles::text AS roles, qual, with_check FROM pg_policies WHERE schemaname = current_schema() AND tablename = $1 ORDER BY cmd`,
        [table],
      );
      expect(rows.map((r) => r.cmd)).toEqual(cmds);
      expect(rows.every((r) => r.roles === '{twt_app}')).toBe(true);
      for (const r of rows) expect(`${r.qual ?? ''} ${r.with_check ?? ''}`).toMatch(/pariwar_id = \(NULLIF\(current_setting\('app\.pariwar_id'::text, true\), ''::text\)\)::uuid/);
    }
  });

  it('the grants: sends SELECT + INSERT + UPDATE on the send columns only; stops SELECT + INSERT only', async () => {
    const { client } = getTx();
    const grants = async (table: string) =>
      (
        await client.query<{ privilege_type: string }>(
          `SELECT privilege_type FROM information_schema.role_table_grants WHERE grantee = 'twt_app' AND table_name = $1 ORDER BY 1`,
          [table],
        )
      ).rows.map((r) => r.privilege_type);
    expect(await grants(T)).toEqual(['INSERT', 'SELECT']);
    expect(await grants(S)).toEqual(['INSERT', 'SELECT']);
    const cols = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.column_privileges WHERE grantee = 'twt_app' AND table_name = $1 AND privilege_type = 'UPDATE' ORDER BY 1`,
      [T],
    );
    expect(cols.rows.map((r) => r.column_name)).toEqual(
      [
        'aging_since',
        'attempt_count',
        'claimed_at',
        'claimed_by_job',
        'delivered_at',
        'detail',
        'failed_at',
        'failure_code',
        'first_detail',
        'locale',
        'provider_message_id',
        'send_outcome',
        'send_started_at',
        'template_name',
        'updated_at',
      ].sort(),
    );
    const stopCols = await client.query(
      `SELECT 1 FROM information_schema.column_privileges WHERE grantee = 'twt_app' AND table_name = $1 AND privilege_type = 'UPDATE'`,
      [S],
    );
    expect(stopCols.rows).toHaveLength(0);
  });

  it('⛔ DELETE for twt_app (both); ⛔ an identity column rewritten (42501); a send column IS writable', async () => {
    const { client } = getTx();
    const { sendId } = await seed(client);
    const stopId = (await insertRow(client, { pariwar_id: PARIWAR_A, recipient_number_hash: 'h', inbound_event_id: randomUUID() }, S)).rows[0]!.stop_id!;
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => client.query(`DELETE FROM ${T} WHERE send_id = $1`, [sendId]), DENIED);
    await expectPgError(client, () => client.query(`DELETE FROM ${S} WHERE stop_id = $1`, [stopId]), DENIED);
    await expectPgError(client, () => client.query(`UPDATE ${S} SET stopped_at = now() WHERE stop_id = $1`, [stopId]), DENIED);
    for (const set of [
      'ladder_id = ladder_id',
      'pariwar_id = pariwar_id',
      'claim_case_id = claim_case_id',
      'chase = chase',
      'recipient_number_hash = recipient_number_hash',
      'send_id = send_id',
      'created_at = now()',
    ]) {
      await expectPgError(client, () => client.query(`UPDATE ${T} SET ${set} WHERE send_id = $1`, [sendId]), DENIED);
    }
    expect((await client.query(`UPDATE ${T} SET updated_at = clock_timestamp() WHERE send_id = $1`, [sendId])).rowCount).toBe(1);
  });

  it("cross-tenant INSERT refused by WITH CHECK (42501) on both tables; cross-tenant UPDATE finds ⛔ row", async () => {
    const { client } = getTx();
    const a = await seedLadder(client, PARIWAR_A);
    const b = await seed(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, rowOf(a, PARIWAR_B)), { code: '42501', message: expect.stringMatching(/row-level security/) });
    await expectPgError(client, () => insertRow(client, { pariwar_id: PARIWAR_B, recipient_number_hash: 'h', inbound_event_id: randomUUID() }, S), {
      code: '42501',
      message: expect.stringMatching(/row-level security/),
    });
    expect((await client.query(`UPDATE ${T} SET updated_at = clock_timestamp() WHERE send_id = $1`, [b.sendId])).rowCount).toBe(0);
    expect((await insertRow(client, rowOf(a, PARIWAR_A))).rowCount).toBe(1);
  });

  it('⭐ I4 — ONE send per ladder, EVER (23505); a wamid is unique; the ladder and claim FKs (23503)', async () => {
    const { client } = getTx();
    const { ladder } = await seed(client, PARIWAR_A, { send_outcome: 'skipped', detail: 'skipped:overtaken' });
    await expectPgError(client, () => insertRow(client, rowOf(ladder, PARIWAR_A)), { code: '23505', constraint: 'claim_contact_wa_sends_ladder_uq' });
    const other = await seedLadder(client, PARIWAR_A);
    const third = await seedLadder(client, PARIWAR_A);
    const accepted = { send_outcome: 'accepted', send_started_at: MARK, provider_message_id: 'wamid.SAME' };
    await insertRow(client, rowOf(other, PARIWAR_A, accepted));
    await expectPgError(client, () => insertRow(client, rowOf(third, PARIWAR_A, accepted)), { code: '23505', constraint: 'claim_contact_wa_sends_wamid_uq' });
    await expectPgError(client, () => insertRow(client, rowOf({ ...third, ladderId: randomUUID() }, PARIWAR_A)), {
      code: '23503',
      constraint: 'claim_contact_wa_sends_ladder_id_fk',
    });
    await expectPgError(client, () => insertRow(client, rowOf({ ...third, claimCaseId: randomUUID() }, PARIWAR_A)), {
      code: '23503',
      constraint: 'claim_contact_wa_sends_claim_case_id_fk',
    });
  });

  it('⭐ the stops: a replayed inbound event records ⛔ a second stop (23505); the same number again from a NEW event is another row', async () => {
    const { client } = getTx();
    const ev = randomUUID();
    await insertRow(client, { pariwar_id: PARIWAR_A, recipient_number_hash: 'h', inbound_event_id: ev }, S);
    await expectPgError(client, () => insertRow(client, { pariwar_id: PARIWAR_A, recipient_number_hash: 'h', inbound_event_id: ev }, S), {
      code: '23505',
      constraint: 'claim_contact_wa_stops_event_uq',
    });
    await expectAccepted(client, () => insertRow(client, { pariwar_id: PARIWAR_A, recipient_number_hash: 'h', inbound_event_id: randomUUID() }, S));
    await expectPgError(client, () => insertRow(client, { pariwar_id: PARIWAR_A, recipient_number_hash: ' ', inbound_event_id: randomUUID() }, S), CHECK('claim_contact_wa_stops_number_hash_check'));
  });

  it('⭐ LOCKSTEP — the outcome CHECK names EXACTLY the TS vocabulary; the two grammar CHECKs carry EXACTLY the TS pattern', async () => {
    const { client } = getTx();
    const def = async (conname: string) =>
      (await client.query<{ def: string }>(`SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1`, [conname])).rows[0]!.def;
    const outcomes = [...(await def('claim_contact_wa_sends_send_outcome_check')).matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]!).sort();
    expect(outcomes).toEqual([...CONTACT_LADDER_WA_SEND_OUTCOMES].sort());
    for (const c of ['claim_contact_wa_sends_detail_vocabulary_check', 'claim_contact_wa_sends_first_detail_vocabulary_check']) {
      expect(await def(c)).toContain(`'${CONTACT_LADDER_WA_DETAIL_PATTERN}'::text`);
    }
  });

  // ⭐ Every CHECK by NAME, each with a POSITIVE counterpart (a fresh ladder per leg).
  it.each<[string, Record<string, unknown>, Record<string, unknown>]>([
    ['claim_contact_wa_sends_send_outcome_check', { send_outcome: 'error' }, { send_outcome: 'attempting' }],
    ['claim_contact_wa_sends_chase_check', { chase: 'peer_mesh' }, { chase: 'certificate' }],
    ['claim_contact_wa_sends_number_hash_check', { recipient_number_hash: '  ' }, { recipient_number_hash: 'h' }],
    ['claim_contact_wa_sends_template_name_check', { template_name: 'Has-Caps' }, { template_name: 'claim_certificate_reminder_hi' }],
    ['claim_contact_wa_sends_template_name_check', { template_name: 'a'.repeat(513) }, { template_name: 'a'.repeat(512) }],
    ['claim_contact_wa_sends_locale_check', { locale: 'en_US' }, { locale: 'hi' }],
    ['claim_contact_wa_sends_attempt_count_check', { attempt_count: 0 }, { attempt_count: 2 }],
    // ⭐ 6.37d's marker mapping — a leg per finished outcome.
    ['claim_contact_wa_sends_send_started_outcome_check', { send_outcome: 'accepted', provider_message_id: 'w1' }, { send_outcome: 'accepted', provider_message_id: 'w1', send_started_at: MARK }],
    ['claim_contact_wa_sends_send_started_outcome_check', { send_outcome: 'rejected_recipient', detail: 'rejected_recipient:131026' }, { send_outcome: 'rejected_recipient', detail: 'rejected_recipient:131026', send_started_at: MARK }],
    ['claim_contact_wa_sends_send_started_outcome_check', { send_outcome: 'may_have_sent', detail: 'may_have_sent:timeout' }, { send_outcome: 'may_have_sent', detail: 'may_have_sent:timeout', send_started_at: MARK }],
    ['claim_contact_wa_sends_send_started_outcome_check', { send_outcome: 'refused', detail: 'refused:131031' }, { send_outcome: 'refused', detail: 'refused:131031', send_started_at: MARK }],
    ['claim_contact_wa_sends_send_started_outcome_check', { send_outcome: 'skipped', detail: 'skipped:overtaken', send_started_at: MARK }, { send_outcome: 'skipped', detail: 'skipped:overtaken' }],
    ['claim_contact_wa_sends_send_started_outcome_check', { send_outcome: 'no_target', detail: 'no_target:hash_mismatch', send_started_at: MARK }, { send_outcome: 'no_target', detail: 'no_target:hash_mismatch' }],
    ['claim_contact_wa_sends_accepted_check', { send_outcome: 'accepted', send_started_at: MARK }, { send_outcome: 'accepted', send_started_at: MARK, provider_message_id: 'w2' }],
    ['claim_contact_wa_sends_outcome_detail_check', { send_outcome: 'skipped', detail: 'refused:x' }, { send_outcome: 'skipped', detail: 'skipped:stopped' }],
    ['claim_contact_wa_sends_outcome_detail_check', { send_outcome: 'may_have_sent', send_started_at: MARK }, { send_outcome: 'may_have_sent', send_started_at: MARK, detail: 'may_have_sent:lease_lapsed' }],
    ['claim_contact_wa_sends_outcome_detail_check', { send_outcome: 'skipped' }, { send_outcome: 'skipped', detail: 'skipped:transient_exhausted' }],
    ['claim_contact_wa_sends_outcome_detail_check', { send_outcome: 'no_target', detail: 'skipped:x' }, { send_outcome: 'no_target', detail: 'no_target:no_sendable_number' }],
    ['claim_contact_wa_sends_status_check', { delivered_at: MARK }, { send_outcome: 'accepted', send_started_at: MARK, provider_message_id: 'w3', delivered_at: MARK }],
    ['claim_contact_wa_sends_failure_code_check', { send_outcome: 'accepted', send_started_at: MARK, provider_message_id: 'w4', failure_code: '131026' }, { send_outcome: 'accepted', send_started_at: MARK, provider_message_id: 'w4', failed_at: MARK, failure_code: '131026' }],
    ['claim_contact_wa_sends_failure_code_check', { send_outcome: 'accepted', send_started_at: MARK, provider_message_id: 'w5', failed_at: MARK, failure_code: 'abc' }, { send_outcome: 'accepted', send_started_at: MARK, provider_message_id: 'w5', failed_at: MARK }],
    ['claim_contact_wa_sends_detail_vocabulary_check', { detail: 'rate_limited:9876543210' }, { detail: 'rate_limited:130429' }],
    ['claim_contact_wa_sends_detail_vocabulary_check', { detail: 'free text' }, { detail: 'api_unavailable:000' }],
    ['claim_contact_wa_sends_first_detail_vocabulary_check', { first_detail: 'unknown:x' }, { first_detail: 'marker_lost:lease' }],
  ])('CHECK %s refuses its bad row and accepts its good one', async (constraint, bad, good) => {
    const { client } = getTx();
    const l1 = await seedLadder(client, PARIWAR_A);
    const l2 = await seedLadder(client, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, rowOf(l1, PARIWAR_A, bad)), CHECK(constraint));
    await expectAccepted(client, () => insertRow(client, rowOf(l2, PARIWAR_A, good)));
  });

  // ── The trigger ──────────────────────────────────────────────────────────────────────────────────────────────

  it('⭐ the trigger — identity is never rewritten, even by the owner (the jobs pool bypasses the grant)', async () => {
    const { client } = getTx();
    const { sendId } = await seed(client);
    for (const set of [`recipient_number_hash = 'other'`, `chase = 'certificate'`, `created_at = now()`, `claim_case_id = gen_random_uuid()`]) {
      await expectPgError(client, () => client.query(`UPDATE ${T} SET ${set} WHERE send_id = $1`, [sendId]), GUARD(/identity is never rewritten/));
    }
  });

  it('⭐ the trigger — while attempting: the marker set once (⛔ re-stamped; cleared and set again is fine), attempt_count ⛔ down, first_detail once, aging_since forward', async () => {
    const { client } = getTx();
    const { sendId } = await seed(client);
    const upd = (set: string) => client.query(`UPDATE ${T} SET ${set} WHERE send_id = $1`, [sendId]);
    expect((await upd(`send_started_at = '${MARK}'`)).rowCount).toBe(1);
    await expectPgError(client, () => upd(`send_started_at = now()`), GUARD(/in-flight marker is set once/));
    expect((await upd(`send_started_at = NULL, detail = 'api_unavailable:503'`)).rowCount).toBe(1);
    expect((await upd(`send_started_at = now()`)).rowCount).toBe(1);
    // The BEFORE trigger runs ahead of the CHECK: a move to 0 is refused as a DECREASE.
    await expectPgError(client, () => upd(`attempt_count = 0`), GUARD(/attempt_count never decreases/));
    expect((await upd(`attempt_count = 3`)).rowCount).toBe(1);
    await expectPgError(client, () => upd(`attempt_count = 2`), GUARD(/attempt_count never decreases/));
    expect((await upd(`first_detail = 'api_unavailable:503'`)).rowCount).toBe(1);
    await expectPgError(client, () => upd(`first_detail = 'rate_limited:none'`), GUARD(/first_detail is written once/));
    await expectPgError(client, () => upd(`aging_since = '2026-01-01T00:00:00Z'`), GUARD(/aging_since moves only forward/));
  });

  it('⭐ T28 — a FINISHED row is frozen EXCEPT the status columns: on an accepted row each is set ONCE; ⛔ on any other outcome', async () => {
    const { client } = getTx();
    const accepted = await seed(client, PARIWAR_A, { send_outcome: 'accepted', send_started_at: MARK, provider_message_id: 'wamid.T28' });
    const upd = (id: string, set: string) => client.query(`UPDATE ${T} SET ${set} WHERE send_id = $1`, [id]);
    await expectPgError(client, () => upd(accepted.sendId, `send_outcome = 'refused', detail = 'refused:x'`), GUARD(/finished send .* is never rewritten/));
    await expectPgError(client, () => upd(accepted.sendId, `detail = 'skipped:x'`), GUARD(/finished send .* is never rewritten/));
    await expectPgError(client, () => upd(accepted.sendId, `provider_message_id = 'wamid.other'`), GUARD(/finished send .* is never rewritten/));
    expect((await upd(accepted.sendId, `delivered_at = clock_timestamp(), updated_at = clock_timestamp()`)).rowCount).toBe(1);
    await expectPgError(client, () => upd(accepted.sendId, `delivered_at = clock_timestamp()`), GUARD(/delivered_at is set once/));
    await expectPgError(client, () => upd(accepted.sendId, `delivered_at = NULL`), GUARD(/delivered_at is set once/));
    // A same-value write (a duplicate status) passes.
    expect((await upd(accepted.sendId, `delivered_at = delivered_at`)).rowCount).toBe(1);
    expect((await upd(accepted.sendId, `failed_at = clock_timestamp(), failure_code = '131026'`)).rowCount).toBe(1);
    await expectPgError(client, () => upd(accepted.sendId, `failure_code = '131049'`), GUARD(/failure_code is set once/));
    // ⛔ On a may_have_sent row (⛔ wamid) — the CHECK refuses first; on a refused row with a wamid-less marker, the same.
    const mhs = await seed(client, PARIWAR_A, { send_outcome: 'may_have_sent', send_started_at: MARK, detail: 'may_have_sent:timeout' });
    await expectPgError(client, () => upd(mhs.sendId, `delivered_at = clock_timestamp()`), { code: expect.stringMatching(/^(23000|23514)$/) as unknown as string });
  });
});
