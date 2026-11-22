// marketplace_lead_handoffs — migration 0215 + RLS policy regression (Story 12.5; AC1; checklist family 5 — added by the code review of
// 2026-11-22, patch 3). The `field-worker-code-sms-sends-policy-regression` shape. Asserted DIRECTLY against the catalog and the table,
// ⛔ inferred through a command: positive / negative RLS BOTH ways, the connection-level fail-closed probe (read, insert AND update), the
// FORCE-RLS catalog guard, the three per-command policies with their expressions, cross-tenant WITH CHECK by its OWN message (a missing
// grant is also 42501 — the message tells them apart), ⛔ DELETE and ⛔ TRUNCATE for `twt_app`, the three FKs by name and their
// `NO ACTION`, the EXACT set of CHECKs and the three no other spec names, the seven indexes by definition, and the guard trigger.
// The DB ↔ TS lockstep, the column grants and every guard refusal are `marketplace/lead-handoff-schema.spec.ts`'s.
// Live DB only; per-test ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';
import { SEALED_PLACEHOLDER, insertHandoffRaw, seedHandoffWorld, type HandoffWorld } from '../marketplace/_lead-handoff-fixtures.js';

type Client = ReturnType<typeof getTx>['client'];

const TABLE = 'marketplace_lead_handoffs';

/** A raw INSERT of exactly the named columns (the session user bypasses the column grant; `twt_app` is held to it). */
function insertRow(client: Client, v: Record<string, unknown>) {
  const cols = Object.keys(v);
  return client.query(`INSERT INTO ${TABLE} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${String(i + 1)}`).join(', ')})`, Object.values(v));
}

/** The eight columns W1 writes, for `w`. */
function w1(w: HandoffWorld, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    lead_id: w.leadId,
    pariwar_id: w.pariwarId,
    module_id: w.moduleId,
    member_id: w.memberId,
    consent_id: w.consentId,
    envelope_version: 1,
    member_fields_ciphertext: SEALED_PLACEHOLDER,
    audit_id: randomUUID(),
    ...over,
  };
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

const CHECK = (constraint: string) => ({ code: '23514', constraint });
const FK = (constraint: string) => ({ code: '23503', constraint });
const RLS_REFUSED = { code: '42501', message: expect.stringMatching(/row-level security/) };
const GRANT_REFUSED = { code: '42501', message: expect.stringMatching(/permission denied/) };

describe.skipIf(!hasDatabase)('the partner lead-handoff record — migration 0215 + RLS policy regression', { timeout: 20000 }, () => {
  setupLiveDb();

  it('positive + negative, BOTH ways: under scope A only A rows, under scope B only B rows', async () => {
    const { client } = getTx();
    const a = await seedHandoffWorld(client, PARIWAR_A);
    await insertHandoffRaw(client, a);
    const b = await seedHandoffWorld(client, PARIWAR_B);
    await insertHandoffRaw(client, b);
    await enterAppScope(client, PARIWAR_A);
    const underA = await client.query<{ lead_id: string; pariwar_id: string }>(`SELECT lead_id, pariwar_id FROM ${TABLE}`);
    expect(underA.rows.map((r) => r.lead_id)).toContain(a.leadId);
    expect(underA.rows.every((r) => r.pariwar_id === PARIWAR_A)).toBe(true);
    await enterAppScope(client, PARIWAR_B);
    const underB = await client.query<{ lead_id: string; pariwar_id: string }>(`SELECT lead_id, pariwar_id FROM ${TABLE}`);
    expect(underB.rows.map((r) => r.lead_id)).toContain(b.leadId);
    expect(underB.rows.every((r) => r.pariwar_id === PARIWAR_B)).toBe(true);
  });

  it('connection-level fail-closed: the app role with NO scope reads ⛔ row, updates ⛔ row, and cannot insert one', async () => {
    const { client } = getTx();
    const a = await seedHandoffWorld(client, PARIWAR_A);
    await insertHandoffRaw(client, a);
    const fresh = await seedHandoffWorld(client, PARIWAR_A);
    await enterAppRoleNoScope(client);
    expect((await client.query(`SELECT 1 FROM ${TABLE}`)).rows).toHaveLength(0);
    // The erasure's shape of UPDATE (the granted columns): with no scope it matches nothing — it does not error, it does not write.
    expect((await client.query(`UPDATE ${TABLE} SET member_fields_ciphertext = NULL, status = 'cancelled', outcome_detail = 'cancelled:member_erased' WHERE lead_id = $1`, [a.leadId])).rowCount).toBe(0);
    await expectPgError(client, () => insertRow(client, w1(fresh)), RLS_REFUSED);
    await client.query('RESET ROLE');
    expect((await client.query(`SELECT status, member_fields_ciphertext FROM ${TABLE} WHERE lead_id = $1`, [a.leadId])).rows[0]).toEqual({
      status: 'due',
      member_fields_ciphertext: SEALED_PLACEHOLDER,
    });
  });

  it('FORCE RLS: rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1 AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())`,
      [TABLE],
    );
    expect(rows).toEqual([{ relrowsecurity: true, relforcerowsecurity: true }]);
  });

  it('the policies are per-command for `twt_app` ONLY — SELECT, INSERT, UPDATE (⛔ FOR ALL, ⛔ DELETE), each on the Pariwar GUC', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ cmd: string; roles: string; permissive: string; qual: string | null; with_check: string | null }>(
      `SELECT cmd, roles::text AS roles, permissive, qual, with_check FROM pg_policies WHERE schemaname = current_schema() AND tablename = $1 ORDER BY cmd`,
      [TABLE],
    );
    expect(rows.map((r) => r.cmd)).toEqual(['INSERT', 'SELECT', 'UPDATE']);
    expect(rows.every((r) => r.roles === '{twt_app}' && r.permissive === 'PERMISSIVE')).toBe(true);
    const onGuc = /^\(pariwar_id = \(NULLIF\(current_setting\('app\.pariwar_id'::text, true\), ''::text\)\)::uuid\)$/;
    const by = Object.fromEntries(rows.map((r) => [r.cmd, r]));
    expect(by['SELECT']!.qual).toMatch(onGuc);
    expect(by['INSERT']!.with_check).toMatch(onGuc);
    // The UPDATE policy binds BOTH sides: the row it finds and the row it leaves.
    expect(by['UPDATE']!.qual).toMatch(onGuc);
    expect(by['UPDATE']!.with_check).toMatch(onGuc);
  });

  it('cross-tenant INSERT: under scope A a row carrying Pariwar B is refused by WITH CHECK — by ITS message; A\'s own lands', async () => {
    const { client } = getTx();
    const a = await seedHandoffWorld(client, PARIWAR_A);
    const b = await seedHandoffWorld(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, w1(b)), RLS_REFUSED);
    expect((await insertRow(client, w1(a))).rowCount).toBe(1);
  });

  it('cross-tenant UPDATE: under scope A, B\'s row is not found (0 rows) and A\'s own row cannot be MOVED to B', async () => {
    const { client } = getTx();
    const a = await seedHandoffWorld(client, PARIWAR_A);
    await insertHandoffRaw(client, a);
    const b = await seedHandoffWorld(client, PARIWAR_B);
    await insertHandoffRaw(client, b);
    await enterAppScope(client, PARIWAR_A);
    expect((await client.query(`UPDATE ${TABLE} SET member_fields_ciphertext = NULL, status = 'cancelled', outcome_detail = 'cancelled:member_erased' WHERE lead_id = $1`, [b.leadId])).rowCount).toBe(0);
    // `pariwar_id` is outside the UPDATE grant, so the move is refused before RLS is asked.
    await expectPgError(client, () => client.query(`UPDATE ${TABLE} SET pariwar_id = $2 WHERE lead_id = $1`, [a.leadId, PARIWAR_B]), GRANT_REFUSED);
    await client.query('RESET ROLE');
    expect((await client.query(`SELECT status FROM ${TABLE} WHERE lead_id = $1`, [b.leadId])).rows[0]).toEqual({ status: 'due' });
  });

  it('`twt_app` has ⛔ DELETE and ⛔ TRUNCATE', async () => {
    const { client } = getTx();
    const a = await seedHandoffWorld(client, PARIWAR_A);
    await insertHandoffRaw(client, a);
    const { rows } = await client.query<{ privilege_type: string }>(
      `SELECT privilege_type FROM information_schema.table_privileges WHERE table_schema = current_schema() AND table_name = $1 AND grantee = 'twt_app' ORDER BY privilege_type`,
      [TABLE],
    );
    expect(rows.map((r) => r.privilege_type)).toEqual(['SELECT']);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => client.query(`DELETE FROM ${TABLE} WHERE lead_id = $1`, [a.leadId]), GRANT_REFUSED);
    await expectPgError(client, () => client.query(`TRUNCATE ${TABLE}`), GRANT_REFUSED);
  });

  it('the three FKs, by name: a missing member, a missing consent, and ANOTHER Pariwar\'s module (composite) — each NO ACTION', async () => {
    const { client } = getTx();
    const a = await seedHandoffWorld(client, PARIWAR_A);
    const b = await seedHandoffWorld(client, PARIWAR_B);
    await expectPgError(client, () => insertRow(client, w1(a, { member_id: randomUUID() })), FK('marketplace_lead_handoffs_member_fk'));
    await expectPgError(client, () => insertRow(client, w1(a, { consent_id: randomUUID() })), FK('marketplace_lead_handoffs_consent_fk'));
    await expectPgError(client, () => insertRow(client, w1(a, { module_id: b.moduleId })), FK('marketplace_lead_handoffs_module_fk'));
    const { rows } = await client.query<{ conname: string; del: string; upd: string; def: string }>(
      `SELECT conname, confdeltype::text AS del, confupdtype::text AS upd, pg_get_constraintdef(oid) AS def
         FROM pg_constraint WHERE conrelid = $1::regclass AND contype = 'f' ORDER BY conname`,
      [TABLE],
    );
    expect(rows.map((r) => r.conname)).toEqual(['marketplace_lead_handoffs_consent_fk', 'marketplace_lead_handoffs_member_fk', 'marketplace_lead_handoffs_module_fk']);
    // 'a' = NO ACTION: under the refuse-DELETE guard a cascade could never run (G16).
    expect(rows.every((r) => r.del === 'a' && r.upd === 'a')).toBe(true);
    expect(rows.find((r) => r.conname === 'marketplace_lead_handoffs_module_fk')!.def).toContain('FOREIGN KEY (pariwar_id, module_id) REFERENCES marketplace_modules(pariwar_id, module_id)');
  });

  it('one handoff per consent (UNIQUE), one per lead (the primary key)', async () => {
    const { client } = getTx();
    const a = await seedHandoffWorld(client, PARIWAR_A);
    await insertHandoffRaw(client, a);
    await expectPgError(client, () => insertRow(client, w1(a, { lead_id: randomUUID() })), { code: '23505', constraint: 'marketplace_lead_handoffs_consent_id_unique' });
    const other = await seedHandoffWorld(client, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, w1(other, { lead_id: a.leadId })), { code: '23505', constraint: 'marketplace_lead_handoffs_pkey' });
  });

  it('the CHECKs are EXACTLY these ten — a dropped or added one fails here', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ conname: string }>(`SELECT conname FROM pg_constraint WHERE conrelid = $1::regclass AND contype = 'c' ORDER BY conname`, [TABLE]);
    expect(rows.map((r) => r.conname)).toEqual([
      'marketplace_lead_handoffs_attempt_count_check',
      'marketplace_lead_handoffs_attempting_claim_check',
      'marketplace_lead_handoffs_cancelled_fields_check',
      'marketplace_lead_handoffs_claim_token_check',
      'marketplace_lead_handoffs_delivered_at_check',
      'marketplace_lead_handoffs_envelope_version_check',
      'marketplace_lead_handoffs_outcome_detail_check',
      'marketplace_lead_handoffs_partner_reference_check',
      'marketplace_lead_handoffs_status_check',
      'marketplace_lead_handoffs_status_detail_check',
    ]);
  });

  it('the three CHECKs no other spec names: the envelope version, the claim token\'s length, delivered ⇔ delivered_at', async () => {
    const { client } = getTx();
    const a = await seedHandoffWorld(client, PARIWAR_A);
    // On INSERT the guard does not run, so the CHECK is what refuses a version other than 1.
    await expectPgError(client, () => insertRow(client, w1(a, { envelope_version: 2 })), CHECK('marketplace_lead_handoffs_envelope_version_check'));
    await expectPgError(client, () => insertRow(client, w1(a, { status: 'attempting', claim_token: '', claimed_at: new Date() })), CHECK('marketplace_lead_handoffs_claim_token_check'));
    await expectPgError(client, () => insertRow(client, w1(a, { status: 'attempting', claim_token: 'x'.repeat(201), claimed_at: new Date() })), CHECK('marketplace_lead_handoffs_claim_token_check'));
    // delivered ⇔ delivered_at, both directions.
    await expectPgError(client, () => insertRow(client, w1(a, { status: 'delivered', outcome_detail: 'delivered:http_2xx:200' })), CHECK('marketplace_lead_handoffs_delivered_at_check'));
    await expectPgError(client, () => insertRow(client, w1(a, { delivered_at: new Date() })), CHECK('marketplace_lead_handoffs_delivered_at_check'));
    // Control: the legal twins land.
    expect((await insertRow(client, w1(a, { status: 'attempting', claim_token: 'x'.repeat(200), claimed_at: new Date() }))).rowCount).toBe(1);
  });

  it('the indexes, by definition: the claim\'s, the lapse\'s and the purge\'s are PARTIAL; two are tenant-scoped', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = current_schema() AND tablename = $1 ORDER BY indexname`,
      [TABLE],
    );
    const def = Object.fromEntries(rows.map((r) => [r.indexname, r.indexdef.replace(/^.* USING /, 'USING ')]));
    expect(def).toEqual({
      marketplace_lead_handoffs_attempting_idx: "USING btree (claimed_at) WHERE (status = 'attempting'::text)",
      marketplace_lead_handoffs_consent_id_unique: 'USING btree (consent_id)',
      marketplace_lead_handoffs_due_idx: "USING btree (next_attempt_at, updated_at) WHERE (status = 'due'::text)",
      marketplace_lead_handoffs_pariwar_member_idx: 'USING btree (pariwar_id, member_id)',
      marketplace_lead_handoffs_pariwar_module_idx: 'USING btree (pariwar_id, module_id)',
      marketplace_lead_handoffs_pkey: 'USING btree (lead_id)',
      marketplace_lead_handoffs_purge_idx:
        "USING btree (updated_at) WHERE ((member_fields_ciphertext IS NOT NULL) AND (status = ANY (ARRAY['delivered'::text, 'failed_delivery'::text])))",
    });
    expect(rows.filter((r) => r.indexdef.startsWith('CREATE UNIQUE INDEX')).map((r) => r.indexname)).toEqual([
      'marketplace_lead_handoffs_consent_id_unique',
      'marketplace_lead_handoffs_pkey',
    ]);
  });

  // Story 12.5b (0216, QE4 (e)) added the route backstop BESIDE the guard — ⛔ a replacement of it.
  it('the triggers are EXACTLY two row triggers, enabled: the guard (BEFORE UPDATE OR DELETE) and the route guard (BEFORE INSERT)', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ tgname: string; tgenabled: string; def: string }>(
      `SELECT tgname, tgenabled::text AS tgenabled, pg_get_triggerdef(oid) AS def FROM pg_trigger WHERE tgrelid = $1::regclass AND NOT tgisinternal
        ORDER BY tgname`,
      [TABLE],
    );
    expect(rows.map((r) => r.tgname)).toEqual(['marketplace_lead_handoffs_guard', 'marketplace_lead_handoffs_route_guard']);
    expect(rows.every((r) => r.tgenabled === 'O')).toBe(true);
    expect(rows[0]!.def).toMatch(/BEFORE DELETE OR UPDATE ON .*marketplace_lead_handoffs FOR EACH ROW EXECUTE FUNCTION marketplace_lead_handoffs_guard\(\)/);
    expect(rows[1]!.def).toMatch(
      /BEFORE INSERT ON .*marketplace_lead_handoffs FOR EACH ROW EXECUTE FUNCTION marketplace_lead_handoffs_reject_partner_form_route\(\)/,
    );
  });
});
