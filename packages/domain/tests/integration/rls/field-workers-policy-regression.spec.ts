// field_workers table + RLS policy regression — Story 13.1 (AC1; architecture "every RLS policy ships with a test").
// Mirrors marketplace-modules-policy-regression: the catalog shape (columns, enums sourced from the domain tuples, named
// CHECKs, the FK-target UNIQUE, the partial unique mobile index — compared NORMALISED, never the rendered string), the
// grants (⛔ DELETE / TRUNCATE), ENABLE + FORCE with three per-command policies, positive + negative isolation, the withCheck
// 42501, the fail-closed probe, and the `FOR UPDATE` row lock every transition takes first (QE13). Raw INSERTs set the
// writer guard so the 0200 trigger (which runs BEFORE the RLS WITH CHECK) steps aside. Live DB only.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  FIELD_WORKER_KYC_STATUSES,
  FIELD_WORKER_REASON_CODES,
  FIELD_WORKER_STATES,
} from '../../../src/schema/field_workers.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';
import { GUARD_ON, RAW_INSERT_SQL, expectSqlRejected, rawInsertParams } from '../field-worker/_fixtures.js';

/** Collapse whitespace and drop parentheses, so a predicate compares by content (AC1 — Postgres re-renders it). */
const normalise = (sql: string): string => sql.replace(/[()\s]+/g, ' ').trim().toLowerCase();

describe.skipIf(!hasDatabase)('field_workers table + RLS policy regression (AC1)', () => {
  setupLiveDb();

  it('AC1: exactly QE4’s columns, types, NOT NULLs and defaults', async () => {
    const { client } = getTx();
    const r = await client.query<{ column_name: string; udt_name: string; is_nullable: string; column_default: string | null }>(
      `SELECT column_name, udt_name, is_nullable, column_default FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'field_workers' ORDER BY ordinal_position`,
    );
    expect(r.rows.map((c) => [c.column_name, c.udt_name, c.is_nullable])).toEqual([
      ['field_worker_id', 'uuid', 'NO'],
      ['pariwar_id', 'uuid', 'NO'],
      ['name_ciphertext', 'text', 'NO'],
      ['mobile_ciphertext', 'text', 'NO'],
      ['mobile_blind_index', 'text', 'NO'],
      ['registered_by_user_id', 'uuid', 'NO'],
      ['registered_by_display', 'text', 'NO'],
      ['created_at', 'timestamptz', 'NO'],
      ['current_state', 'field_worker_state', 'NO'],
      ['state_event_version', 'int8', 'NO'],
      ['kyc_status', 'field_worker_kyc_status', 'NO'],
      ['state_reason_code', 'field_worker_reason_code', 'YES'],
      ['district', 'text', 'NO'],
      ['ended_on', 'date', 'YES'],
      ['audit_id', 'uuid', 'NO'],
      ['updated_at', 'timestamptz', 'NO'],
      ['approved_by_display', 'text', 'YES'], // Story 13.1a (0201) — the approver, NULL until the approval
    ]);
    const defaults = Object.fromEntries(r.rows.filter((c) => c.column_default !== null).map((c) => [c.column_name, c.column_default]));
    // ⛔ default on the id (caller-minted, QE3); only the two timestamps default to now().
    expect(defaults).toEqual({ created_at: 'now()', updated_at: 'now()' });
  });

  it('AC1: the three pgEnums carry exactly the domain tuples, in order', async () => {
    const { client } = getTx();
    const labels = async (t: string): Promise<string[]> =>
      (
        await client.query<{ l: string }>(
          `SELECT e.enumlabel AS l FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = $1 ORDER BY e.enumsortorder`,
          [t],
        )
      ).rows.map((x) => x.l);
    expect(await labels('field_worker_state')).toEqual([...FIELD_WORKER_STATES]);
    expect(await labels('field_worker_kyc_status')).toEqual([...FIELD_WORKER_KYC_STATUSES]);
    expect(await labels('field_worker_reason_code')).toEqual([...FIELD_WORKER_REASON_CODES]);
  });

  it('AC1: the named CHECKs, the FK-target UNIQUE and the primary key — and nothing else', async () => {
    const { client } = getTx();
    const r = await client.query<{ conname: string; contype: string; def: string }>(
      `SELECT conname, contype, pg_get_constraintdef(oid) AS def FROM pg_constraint
        WHERE conrelid = 'field_workers'::regclass ORDER BY conname`,
    );
    expect(r.rows.map((c) => [c.conname, c.contype])).toEqual([
      ['field_workers_active_needs_kyc', 'c'],
      ['field_workers_approved_by_display_nonblank', 'c'], // Story 13.1a (0201)
      ['field_workers_approved_by_state', 'c'], // Story 13.1a (0201) — NOT VALID (its header)
      ['field_workers_district_nonblank', 'c'],
      ['field_workers_ended_on_pair', 'c'],
      ['field_workers_pariwar_worker_uq', 'u'],
      ['field_workers_pkey', 'p'],
      ['field_workers_registered_by_display_nonblank', 'c'],
      ['field_workers_state_reason_pair', 'c'],
      ['field_workers_state_reason_subset', 'c'],
    ]);
    expect(r.rows.find((c) => c.conname === 'field_workers_pariwar_worker_uq')!.def).toBe('UNIQUE (pariwar_id, field_worker_id)');
    expect(r.rows.find((c) => c.conname === 'field_workers_approved_by_state')!.def).toMatch(/ NOT VALID$/);
  });

  it('AC1: the partial unique mobile index (column list + predicate, normalised) and the keyset list index (Story 13.1a AD10)', async () => {
    const { client } = getTx();
    const r = await client.query<{ indexname: string; def: string; uniq: boolean; pred: string | null }>(
      `SELECT c.relname AS indexname, pg_get_indexdef(i.indexrelid) AS def, i.indisunique AS uniq,
              pg_get_expr(i.indpred, i.indrelid) AS pred
         FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
        WHERE i.indrelid = 'field_workers'::regclass ORDER BY c.relname`,
    );
    const byName = new Map(r.rows.map((x) => [x.indexname, x]));
    expect([...byName.keys()]).toEqual([
      'field_workers_pariwar_created_idx',
      'field_workers_pariwar_mobile_live_uq',
      'field_workers_pariwar_worker_uq',
      'field_workers_pkey',
    ]);
    // Review R3-17 — the column list EXACTLY (the text between `using btree` and the predicate / the end), ⛔ a prefix match a third column passes.
    const columnsOf = (def: string): string => normalise(def).replace(/^.* using btree /, '').replace(/ where .*$/, '');
    const live = byName.get('field_workers_pariwar_mobile_live_uq')!;
    expect(live.uniq).toBe(true);
    expect(columnsOf(live.def)).toBe('pariwar_id, mobile_blind_index');
    // Postgres adds a `::field_worker_state` cast to the literal — strip it before comparing the predicate.
    expect(normalise(live.pred!.replace(/::field_worker_state/g, ''))).toBe("current_state <> 'terminated'");
    // Story 13.1a AD10 (0201, amended by decision 2026-11-05-448) — the keyset index replaced 0200's `(pariwar_id, current_state)`; its DESC
    // suffixes are part of the match, and `current_state` is ⛔ a column of it (an enum filter is not an index condition under RLS).
    expect(columnsOf(byName.get('field_workers_pariwar_created_idx')!.def)).toBe('pariwar_id, created_at desc, field_worker_id desc');
    expect(byName.get('field_workers_pariwar_created_idx')!.pred).toBeNull();
  });

  it('AC1: twt_app holds SELECT, INSERT, UPDATE — ⛔ DELETE, ⛔ TRUNCATE; RLS is ENABLE + FORCE with three per-command policies', async () => {
    const { client } = getTx();
    const grants = await client.query<{ privilege_type: string }>(
      `SELECT privilege_type FROM information_schema.role_table_grants
        WHERE table_name = 'field_workers' AND grantee = 'twt_app' ORDER BY privilege_type`,
    );
    expect(grants.rows.map((g) => g.privilege_type)).toEqual(['INSERT', 'SELECT', 'UPDATE']);
    const rel = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = 'field_workers'::regclass`,
    );
    expect(rel.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
    const pol = await client.query<{ policyname: string; cmd: string; roles: string[] }>(
      `SELECT policyname, cmd, roles::text[] AS roles FROM pg_policies WHERE tablename = 'field_workers' ORDER BY policyname`,
    );
    expect(pol.rows.map((p) => [p.policyname, p.cmd, p.roles])).toEqual([
      ['field_workers_tenant_isolation_insert', 'INSERT', ['twt_app']],
      ['field_workers_tenant_isolation_select', 'SELECT', ['twt_app']],
      ['field_workers_tenant_isolation_update', 'UPDATE', ['twt_app']],
    ]);
  });

  /** Seed one worker row per tenant (each under its own scope, as twt_app). Returns [aId, bId]. */
  async function seedBoth(): Promise<[string, string]> {
    const { client } = getTx();
    const a = randomUUID();
    const b = randomUUID();
    await enterAppScope(client, PARIWAR_B);
    await client.query(GUARD_ON);
    await client.query(RAW_INSERT_SQL, rawInsertParams(b, PARIWAR_B));
    await enterAppScope(client, PARIWAR_A);
    await client.query(GUARD_ON);
    await client.query(RAW_INSERT_SQL, rawInsertParams(a, PARIWAR_A));
    return [a, b];
  }

  it('positive / negative: scope A reads A’s rows and ⛔ B’s, and scope B the reverse', async () => {
    const { client } = getTx();
    const [a, b] = await seedBoth();
    await enterAppScope(client, PARIWAR_A);
    const ra = await client.query<{ field_worker_id: string }>('SELECT field_worker_id FROM field_workers WHERE field_worker_id = ANY($1)', [[a, b]]);
    expect(ra.rows.map((x) => x.field_worker_id)).toEqual([a]);
    await enterAppScope(client, PARIWAR_B);
    const rb = await client.query<{ field_worker_id: string }>('SELECT field_worker_id FROM field_workers WHERE field_worker_id = ANY($1)', [[a, b]]);
    expect(rb.rows.map((x) => x.field_worker_id)).toEqual([b]);
  });

  it('negative: an INSERT for another tenant is rejected by withCheck (42501)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await client.query(GUARD_ON);
    await expectSqlRejected(client, RAW_INSERT_SQL, rawInsertParams(randomUUID(), PARIWAR_B), '42501');
  });

  it('negative: an UPDATE cannot reach another tenant’s row (0 rows), even guarded', async () => {
    const { client } = getTx();
    const [, b] = await seedBoth();
    await enterAppScope(client, PARIWAR_A);
    await client.query(GUARD_ON);
    const r = await client.query("UPDATE field_workers SET kyc_status = 'completed', state_event_version = 2 WHERE field_worker_id = $1", [b]);
    expect(r.rowCount).toBe(0);
  });

  it('fail-closed: twt_app with NO scope sees zero rows and cannot insert', async () => {
    const { client } = getTx();
    await seedBoth();
    await enterAppRoleNoScope(client);
    await client.query("SELECT set_config('app.pariwar_id', '', true)");
    expect((await client.query('SELECT 1 FROM field_workers')).rows).toHaveLength(0);
    await client.query(GUARD_ON);
    await expectSqlRejected(client, RAW_INSERT_SQL, rawInsertParams(randomUUID(), PARIWAR_A), '42501');
  });

  it('as twt_app: DELETE and TRUNCATE are refused (42501 — ⛔ grant, I10)', async () => {
    const { client } = getTx();
    const [a] = await seedBoth();
    await enterAppScope(client, PARIWAR_A);
    await expectSqlRejected(client, 'DELETE FROM field_workers WHERE field_worker_id = $1', [a], '42501');
    await expectSqlRejected(client, 'TRUNCATE field_workers', [], '42501');
  });

  it('QE13: twt_app can take the transition lock — SELECT … FOR UPDATE on its own tenant’s row', async () => {
    const { client } = getTx();
    const [a, b] = await seedBoth();
    await enterAppScope(client, PARIWAR_A);
    const own = await client.query('SELECT field_worker_id FROM field_workers WHERE field_worker_id = $1 AND pariwar_id = $2 FOR UPDATE', [a, PARIWAR_A]);
    expect(own.rowCount).toBe(1);
    const other = await client.query('SELECT field_worker_id FROM field_workers WHERE field_worker_id = $1 FOR UPDATE', [b]);
    expect(other.rowCount).toBe(0);
  });
});
