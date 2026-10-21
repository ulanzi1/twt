// member_wa_opt_in_codes — migration 0178 + RLS policy regression (Story 5.13, Task 1.3; AC3; WC2; I3). Positive / negative tenant
// RLS, the connection-level fail-closed probe, FORCE RLS, EXACTLY the per-command policies (SELECT / INSERT / UPDATE — ⛔ FOR ALL,
// ⛔ DELETE), EXACTLY the grants (a column-limited UPDATE, LOCKSTEP with the trigger's `mutable_cols`), cross-tenant WITH CHECK,
// the composite OWNER FK, the partial UNIQUE (⛔ a third counted send), every CHECK by NAME with a positive counterpart, the
// vocabulary LOCKSTEPs, and the TRIGGER (identity frozen — run as the owner so the TRIGGER, ⛔ the grant, refuses; the outcome
// moves once from `sending`; `attempts` ⛔ down; `consumed_at` / `invalidated_at` set once). Live DB only; per-test ROLLBACK.

import { createHash, randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  WA_OPT_IN_CODE_DETAIL_PATTERN,
  WA_OPT_IN_CODE_SEND_OUTCOMES,
} from '../../../src/schema/member_wa_opt_in_codes.js';
import { WA_OPT_IN_CODE_MAX_ATTEMPTS, WA_OPT_IN_CODE_MAX_SENDS } from '../../../src/wa-opt-in/code.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const T = 'member_wa_opt_in_codes';
const HASH = createHash('sha256').update('123456').digest('hex');

interface OptIn {
  readonly optInId: string;
  readonly memberId: string;
  readonly pariwarId: string;
}

/** As the superuser: one PENDING opt-in for a fresh member. */
async function seedOptIn(client: Client, pariwarId: string = PARIWAR_A, state = 'PENDING'): Promise<OptIn> {
  const memberId = randomUUID();
  const { rows } = await client.query<{ opt_in_id: string }>(
    `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index)
     VALUES ($1, $2, $3, $4, $5) RETURNING opt_in_id`,
    [pariwarId, memberId, state, `TWT-${randomUUID().slice(0, 8).toUpperCase()}`, `bidx-${memberId}`],
  );
  return { optInId: rows[0]!.opt_in_id, memberId, pariwarId };
}

const rowOf = (o: OptIn, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  pariwar_id: o.pariwarId,
  opt_in_id: o.optInId,
  member_id: o.memberId,
  send_seq: 1,
  code_hash: HASH,
  expires_at: '2099-01-01T00:10:00.000Z',
  ...over,
});

function insertRow(client: Client, v: Record<string, unknown>) {
  const cols = Object.keys(v);
  return client.query<{ code_id: string }>(
    `INSERT INTO ${T} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING code_id`,
    Object.values(v),
  );
}

async function seed(client: Client, pariwarId: string = PARIWAR_A, over: Record<string, unknown> = {}): Promise<{ optIn: OptIn; codeId: string }> {
  const optIn = await seedOptIn(client, pariwarId);
  const { rows } = await insertRow(client, rowOf(optIn, over));
  return { optIn, codeId: rows[0]!.code_id };
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

describe.skipIf(!hasDatabase)('member_wa_opt_in_codes — migration 0178 + RLS policy regression', { timeout: 20000 }, () => {
  setupLiveDb();

  it('positive + negative: under scope A only A rows, under scope B only B rows', async () => {
    const { client } = getTx();
    await seed(client, PARIWAR_A);
    await seed(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    const a = await client.query<{ pariwar_id: string }>(`SELECT pariwar_id FROM ${T}`);
    expect(a.rows.length).toBeGreaterThan(0);
    expect(a.rows.every((r) => r.pariwar_id === PARIWAR_A)).toBe(true);
    await enterAppScope(client, PARIWAR_B);
    const b = await client.query<{ pariwar_id: string }>(`SELECT pariwar_id FROM ${T}`);
    expect(b.rows.length).toBeGreaterThan(0);
    expect(b.rows.some((r) => r.pariwar_id === PARIWAR_A)).toBe(false);
  });

  it('connection-level fail-closed: the app role with no scope sees ⛔ no row', async () => {
    const { client } = getTx();
    await seed(client);
    await enterAppRoleNoScope(client);
    expect((await client.query(`SELECT 1 FROM ${T}`)).rows).toHaveLength(0);
  });

  it('FORCE RLS', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ on: boolean }>(
      `SELECT relrowsecurity AND relforcerowsecurity AS on FROM pg_class
        WHERE relname = $1 AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())`,
      [T],
    );
    expect(rows).toEqual([{ on: true }]);
  });

  it('the policies: EXACTLY SELECT / INSERT / UPDATE — to twt_app, tenant-keyed (⛔ FOR ALL, ⛔ DELETE)', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ cmd: string; roles: string; qual: string | null; with_check: string | null }>(
      `SELECT cmd, roles::text AS roles, qual, with_check FROM pg_policies WHERE schemaname = current_schema() AND tablename = $1 ORDER BY cmd`,
      [T],
    );
    expect(rows.map((r) => r.cmd)).toEqual(['INSERT', 'SELECT', 'UPDATE']);
    expect(rows.every((r) => r.roles === '{twt_app}')).toBe(true);
    for (const r of rows) expect(`${r.qual ?? ''} ${r.with_check ?? ''}`).toMatch(/pariwar_id = \(NULLIF\(current_setting\('app\.pariwar_id'::text, true\), ''::text\)\)::uuid/);
  });

  it('the grants: SELECT + INSERT + UPDATE on the six mutable columns only — ⚠ LOCKSTEP with the trigger\'s `mutable_cols`', async () => {
    const { client } = getTx();
    const table = await client.query<{ privilege_type: string }>(
      `SELECT privilege_type FROM information_schema.role_table_grants WHERE grantee = 'twt_app' AND table_name = $1 ORDER BY 1`,
      [T],
    );
    expect(table.rows.map((r) => r.privilege_type)).toEqual(['INSERT', 'SELECT']);
    const cols = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.column_privileges WHERE grantee = 'twt_app' AND table_name = $1 AND privilege_type = 'UPDATE' ORDER BY 1`,
      [T],
    );
    const granted = cols.rows.map((r) => r.column_name);
    expect(granted).toEqual(['attempts', 'consumed_at', 'detail', 'invalidated_at', 'provider_message_id', 'send_outcome']);
    const fn = await client.query<{ src: string }>(`SELECT prosrc AS src FROM pg_proc WHERE proname = 'member_wa_opt_in_codes_guard'`);
    const mutable = /mutable_cols text\[\] := ARRAY\[([^\]]*)\]/.exec(fn.rows[0]!.src)![1]!;
    expect([...mutable.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]!).sort()).toEqual(granted);
    // Every column is identity or mutable (a NEW column must be classified).
    const identity = /identity_cols text\[\] := ARRAY\[([^\]]*)\]/.exec(fn.rows[0]!.src)![1]!;
    const classified = [...`${identity},${mutable}`.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]!).sort();
    const all = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1 ORDER BY 1`,
      [T],
    );
    expect(classified).toEqual(all.rows.map((r) => r.column_name));
  });

  it('⛔ DELETE for twt_app; ⛔ an identity column rewritten as twt_app (42501 — the grant); a mutable column IS writable', async () => {
    const { client } = getTx();
    const { codeId } = await seed(client);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => client.query(`DELETE FROM ${T} WHERE code_id = $1`, [codeId]), DENIED);
    for (const set of ['code_hash = code_hash', 'send_seq = 2', 'expires_at = now()', 'opt_in_id = opt_in_id', 'pariwar_id = pariwar_id', 'member_id = member_id', 'created_at = now()', 'code_id = code_id']) {
      await expectPgError(client, () => client.query(`UPDATE ${T} SET ${set} WHERE code_id = $1`, [codeId]), DENIED);
    }
    expect((await client.query(`UPDATE ${T} SET attempts = 1 WHERE code_id = $1`, [codeId])).rowCount).toBe(1);
  });

  it('cross-tenant INSERT refused by WITH CHECK (42501); cross-tenant UPDATE finds ⛔ row', async () => {
    const { client } = getTx();
    const mine = await seedOptIn(client, PARIWAR_A);
    const theirs = await seed(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, rowOf({ ...mine, pariwarId: PARIWAR_B })), {
      code: '42501',
      message: expect.stringMatching(/row-level security/),
    });
    expect((await client.query(`UPDATE ${T} SET attempts = 1 WHERE code_id = $1`, [theirs.codeId])).rowCount).toBe(0);
    expect((await insertRow(client, rowOf(mine))).rowCount).toBe(1);
  });

  it('⭐ the composite OWNER FK — a code\'s Pariwar and member must be its opt-in\'s (23503; FK checks bypass RLS)', async () => {
    const { client } = getTx();
    const mine = await seedOptIn(client, PARIWAR_A);
    const another = await seedOptIn(client, PARIWAR_A);
    const theirs = await seedOptIn(client, PARIWAR_B);
    const owner = { code: '23503', constraint: 'member_wa_opt_in_codes_opt_in_owner_fk' };
    await expectPgError(client, () => insertRow(client, rowOf({ ...mine, memberId: another.memberId })), owner);
    await expectPgError(client, () => insertRow(client, rowOf({ ...theirs, pariwarId: PARIWAR_A })), owner);
    await expectPgError(client, () => insertRow(client, rowOf({ ...mine, optInId: randomUUID() })), owner);
    await expectAccepted(client, () => insertRow(client, rowOf(mine)));
  });

  it('⭐ I3 (1) — at most TWO counted sends per request: a third non-released row fails (23505 / 23514); a released row frees its seq', async () => {
    const { client } = getTx();
    const { optIn } = await seed(client, PARIWAR_A, { send_seq: 1 });
    await insertRow(client, rowOf(optIn, { send_seq: 2, send_outcome: 'accepted', provider_message_id: 'wamid.2' }));
    await expectPgError(client, () => insertRow(client, rowOf(optIn, { send_seq: 1 })), { code: '23505', constraint: 'member_wa_opt_in_codes_counted_seq_uq' });
    await expectPgError(client, () => insertRow(client, rowOf(optIn, { send_seq: 3 })), CHECK('member_wa_opt_in_codes_send_seq_check'));
    // A released row does ⛔ hold its seq: a released seq-1 row beside a live seq-1 row is fine (the partial UNIQUE).
    await expectAccepted(client, () => insertRow(client, rowOf(optIn, { send_seq: 1, send_outcome: 'released', detail: 'api_unavailable:000' })));
  });

  it('⭐ LOCKSTEP — the outcome CHECK names EXACTLY the TS vocabulary; the grammar CHECK carries EXACTLY the TS pattern; the caps are the TS constants', async () => {
    const { client } = getTx();
    const def = async (conname: string) =>
      (await client.query<{ def: string }>(`SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1`, [conname])).rows[0]!.def;
    const outcomes = [...(await def('member_wa_opt_in_codes_send_outcome_check')).matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]!).sort();
    expect(outcomes).toEqual([...WA_OPT_IN_CODE_SEND_OUTCOMES].sort());
    expect(await def('member_wa_opt_in_codes_detail_vocabulary_check')).toContain(`'${WA_OPT_IN_CODE_DETAIL_PATTERN}'::text`);
    expect(await def('member_wa_opt_in_codes_attempts_check')).toContain(`<= ${String(WA_OPT_IN_CODE_MAX_ATTEMPTS)}`);
    expect(await def('member_wa_opt_in_codes_send_seq_check')).toMatch(new RegExp(`ARRAY\\[1, ${String(WA_OPT_IN_CODE_MAX_SENDS)}\\]`));
  });

  // ⭐ Every CHECK by NAME, each with a POSITIVE counterpart (a fresh opt-in per leg).
  it.each<[string, Record<string, unknown>, Record<string, unknown>]>([
    ['member_wa_opt_in_codes_send_seq_check', { send_seq: 0 }, { send_seq: 2 }],
    ['member_wa_opt_in_codes_code_hash_check', { code_hash: '123456' }, { code_hash: HASH }],
    ['member_wa_opt_in_codes_code_hash_check', { code_hash: HASH.toUpperCase() }, { code_hash: HASH }],
    ['member_wa_opt_in_codes_expires_check', { created_at: '2026-10-21T10:00:00Z', expires_at: '2026-10-21T10:00:00Z' }, { created_at: '2026-10-21T10:00:00Z', expires_at: '2026-10-21T10:10:00Z' }],
    ['member_wa_opt_in_codes_attempts_check', { attempts: 3, invalidated_at: '2026-10-21T10:00:00Z' }, { attempts: 2, invalidated_at: '2026-10-21T10:00:00Z' }],
    ['member_wa_opt_in_codes_attempts_check', { attempts: -1 }, { attempts: 1 }],
    ['member_wa_opt_in_codes_dead_after_two_check', { attempts: 2 }, { attempts: 1 }],
    ['member_wa_opt_in_codes_consumed_live_check', { consumed_at: '2026-10-21T10:00:00Z', invalidated_at: '2026-10-21T10:00:00Z' }, { consumed_at: '2026-10-21T10:00:00Z' }],
    ['member_wa_opt_in_codes_consumed_live_check', { consumed_at: '2026-10-21T10:00:00Z', attempts: 2, invalidated_at: '2026-10-21T10:00:00Z' }, { consumed_at: '2026-10-21T10:00:00Z', attempts: 1 }],
    ['member_wa_opt_in_codes_send_outcome_check', { send_outcome: 'rejected_recipient', detail: 'recipient:meta_131026' }, { send_outcome: 'refused', detail: 'recipient:meta_131026' }],
    ['member_wa_opt_in_codes_accepted_check', { send_outcome: 'accepted' }, { send_outcome: 'accepted', provider_message_id: 'wamid.x' }],
    ['member_wa_opt_in_codes_outcome_detail_check', { send_outcome: 'may_have_sent' }, { send_outcome: 'may_have_sent', detail: 'may_have_sent:timeout' }],
    ['member_wa_opt_in_codes_outcome_detail_check', { send_outcome: 'released' }, { send_outcome: 'released', detail: 'rate_limited:130429' }],
    ['member_wa_opt_in_codes_detail_vocabulary_check', { detail: 'scope:9876543210' }, { detail: 'scope:meta_131048' }],
    ['member_wa_opt_in_codes_detail_vocabulary_check', { detail: 'free text' }, { detail: 'pre_send:resolve' }],
    ['member_wa_opt_in_codes_detail_vocabulary_check', { detail: 'refused:x' }, { detail: 'unknown_scope:param_invalid' }],
  ])('CHECK %s refuses its bad row and accepts its good one', async (constraint, bad, good) => {
    const { client } = getTx();
    const o1 = await seedOptIn(client);
    const o2 = await seedOptIn(client);
    await expectPgError(client, () => insertRow(client, rowOf(o1, bad)), CHECK(constraint));
    await expectAccepted(client, () => insertRow(client, rowOf(o2, good)));
  });

  // ── The trigger (run as the owner — the superuser bypasses the column grant, so the TRIGGER is what refuses) ──────────────

  it('⭐ the trigger — identity is never rewritten, even by the owner (code_hash, send_seq, expires_at, opt_in_id, …)', async () => {
    const { client } = getTx();
    const { codeId } = await seed(client);
    const other = await seedOptIn(client);
    for (const set of [
      `code_hash = '${createHash('sha256').update('654321').digest('hex')}'`,
      'send_seq = 2',
      `expires_at = expires_at + interval '1 minute'`,
      `opt_in_id = '${other.optInId}', member_id = '${other.memberId}'`,
      'created_at = created_at - interval \'1 minute\'',
    ]) {
      await expectPgError(client, () => client.query(`UPDATE ${T} SET ${set} WHERE code_id = $1`, [codeId]), GUARD(/identity is never rewritten/));
    }
  });

  it('⭐ the trigger — the outcome moves ONCE, from `sending`: accepted → released is refused (a counted send never frees its seq)', async () => {
    const { client } = getTx();
    const { codeId } = await seed(client);
    const upd = (set: string) => client.query(`UPDATE ${T} SET ${set} WHERE code_id = $1`, [codeId]);
    expect((await upd(`send_outcome = 'accepted', provider_message_id = 'wamid.1'`)).rowCount).toBe(1);
    await expectPgError(client, () => upd(`send_outcome = 'released', detail = 'api_unavailable:000'`), GUARD(/decided once, from sending/));
    await expectPgError(client, () => upd(`send_outcome = 'sending'`), GUARD(/decided once, from sending/));
    // provider_message_id / detail move only WITH the outcome.
    await expectPgError(client, () => upd(`provider_message_id = 'wamid.other'`), GUARD(/written only with the outcome/));
    await expectPgError(client, () => upd(`detail = 'scope:meta_368'`), GUARD(/written only with the outcome/));
    // A same-value write passes.
    expect((await upd(`provider_message_id = provider_message_id`)).rowCount).toBe(1);
  });

  it('⭐ the trigger — attempts never decreases; consumed_at / invalidated_at are set once and never cleared', async () => {
    const { client } = getTx();
    const a = await seed(client);
    const upd = (id: string, set: string) => client.query(`UPDATE ${T} SET ${set} WHERE code_id = $1`, [id]);
    expect((await upd(a.codeId, 'attempts = 1')).rowCount).toBe(1);
    await expectPgError(client, () => upd(a.codeId, 'attempts = 0'), GUARD(/attempts never decreases/));
    expect((await upd(a.codeId, 'attempts = 2, invalidated_at = now()')).rowCount).toBe(1);
    await expectPgError(client, () => upd(a.codeId, 'invalidated_at = NULL'), GUARD(/invalidated_at is set once/));
    await expectPgError(client, () => upd(a.codeId, `invalidated_at = now() + interval '1 second'`), GUARD(/invalidated_at is set once/));
    // ⭐ A dead code is never consumed (the CHECK).
    await expectPgError(client, () => upd(a.codeId, 'consumed_at = now()'), CHECK('member_wa_opt_in_codes_consumed_live_check'));
    const b = await seed(client);
    expect((await upd(b.codeId, 'consumed_at = now()')).rowCount).toBe(1);
    await expectPgError(client, () => upd(b.codeId, 'consumed_at = NULL'), GUARD(/consumed_at is set once/));
    // ⭐ attempts = 3 is refused (the CHECK); attempts = 2 without invalidation is refused (dead-after-two).
    const c = await seed(client);
    await expectPgError(client, () => upd(c.codeId, 'attempts = 3, invalidated_at = now()'), CHECK('member_wa_opt_in_codes_attempts_check'));
    await expectPgError(client, () => upd(c.codeId, 'attempts = 2'), CHECK('member_wa_opt_in_codes_dead_after_two_check'));
  });
});
