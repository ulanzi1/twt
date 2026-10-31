// Story 12.1 — the `marketplace_modules` table (AC1) and its whole-row write guard (AC2, I1–I3). Live DB.
//
// Every AC2 leg is raw SQL under twt_app with the writer guard set / unset via `SET LOCAL` (the
// alerts-policy-regression shape) — the trigger is the RUNTIME guard that also catches raw SQL, so it is
// tested WITHOUT the projector. Each rejected statement runs inside a savepoint (`expectSqlRejected`).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  MARKETPLACE_MODULE_ARCHIVE_REASONS,
  MARKETPLACE_MODULE_STATES,
} from '../../../src/schema/marketplace_modules.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';
import { RAW_INSERT_SQL, expectSqlRejected, rawInsertParams, rawInsertSqlWith } from './_fixtures.js';
import {
  MODULE_STATE_DIRECT_WRITE_MESSAGE_PREFIX,
  ModuleStateDirectWriteError,
  isModuleStateDirectWriteError,
  pgMessageOf,
} from '../../../src/marketplace/errors.js';

const GUARD_ON = "SET LOCAL app.marketplace_module_state_writer = 'on'";
const GUARD_OFF = "SET LOCAL app.marketplace_module_state_writer = 'off'";

describe.skipIf(!hasDatabase)('marketplace_modules — table shape (AC1)', () => {
  setupLiveDb();

  it('has exactly the QE5 columns, types and NOT NULLs', async () => {
    const { client } = getTx();
    const r = await client.query<{ column_name: string; udt_name: string; is_nullable: string; column_default: string | null }>(
      `SELECT column_name, udt_name, is_nullable, column_default FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'marketplace_modules' ORDER BY ordinal_position`,
    );
    expect(r.rows.map((c) => [c.column_name, c.udt_name, c.is_nullable])).toEqual([
      ['module_id', 'uuid', 'NO'],
      ['pariwar_id', 'uuid', 'NO'],
      ['partner_id', 'uuid', 'NO'],
      ['name_en', 'text', 'NO'],
      ['name_hi', 'text', 'NO'],
      ['description_en', 'text', 'NO'],
      ['description_hi', 'text', 'NO'],
      ['eligibility_filter', 'jsonb', 'NO'],
      ['scope_filter', 'jsonb', 'NO'],
      ['valid_from', 'timestamptz', 'NO'],
      ['valid_until', 'timestamptz', 'NO'],
      ['slot_capacity', 'int4', 'YES'],
      ['lead_handoff_url', 'text', 'NO'],
      ['lead_handoff_signing_key_secret_name', 'text', 'NO'],
      ['branding_bundle', 'jsonb', 'NO'],
      ['manifest_schema_version', 'int2', 'NO'],
      ['current_state', 'marketplace_module_state', 'NO'],
      ['state_event_version', 'int8', 'NO'],
      ['slots_remaining', 'int4', 'YES'],
      ['archive_reason', 'marketplace_module_archive_reason', 'YES'],
      ['audit_id', 'uuid', 'NO'],
      ['created_at', 'timestamptz', 'NO'],
      ['updated_at', 'timestamptz', 'NO'],
    ]);
    // ⛔ default on module_id (caller-minted, QE15); now() on the two timestamps only.
    const defaults = Object.fromEntries(r.rows.map((c) => [c.column_name, c.column_default]));
    expect(defaults['module_id']).toBeNull();
    expect(defaults['created_at']).toBe('now()');
    expect(defaults['updated_at']).toBe('now()');
  });

  it('the pgEnums are sourced from the domain tuples', async () => {
    const { client } = getTx();
    const labels = async (t: string) =>
      (
        await client.query<{ enumlabel: string }>(
          'SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = $1 ORDER BY e.enumsortorder',
          [t],
        )
      ).rows.map((x) => x.enumlabel);
    expect(await labels('marketplace_module_state')).toEqual([...MARKETPLACE_MODULE_STATES]);
    expect(await labels('marketplace_module_archive_reason')).toEqual([...MARKETPLACE_MODULE_ARCHIVE_REASONS]);
  });

  it('carries exactly the six named CHECKs, the PK and the two indexes, and ⛔ foreign key', async () => {
    const { client } = getTx();
    const cons = await client.query<{ conname: string; contype: string }>(
      `SELECT conname, contype FROM pg_constraint WHERE conrelid = 'marketplace_modules'::regclass ORDER BY conname`,
    );
    expect(cons.rows.filter((c) => c.contype === 'c').map((c) => c.conname)).toEqual([
      'marketplace_modules_archive_reason_pair',
      'marketplace_modules_capacity_positive',
      'marketplace_modules_manifest_schema_version_v1',
      'marketplace_modules_slots_pair',
      'marketplace_modules_slots_range',
      'marketplace_modules_window',
    ]);
    expect(cons.rows.filter((c) => c.contype === 'f')).toEqual([]);
    const idx = await client.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'marketplace_modules' ORDER BY indexname`,
    );
    expect(idx.rows.map((i) => i.indexname)).toEqual([
      'marketplace_modules_pariwar_id_idx',
      'marketplace_modules_pariwar_state_idx',
      'marketplace_modules_pkey',
    ]);
  });

  // RP2 — by COLUMNS and ORDER, not only by name: a reordered or swapped column list passes a names-only check.
  it('the two B-tree indexes are over (pariwar_id) and (pariwar_id, current_state), in that order', async () => {
    const { client } = getTx();
    const defs = await client.query<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'marketplace_modules'
         AND indexname IN ('marketplace_modules_pariwar_id_idx', 'marketplace_modules_pariwar_state_idx') ORDER BY indexname`,
    );
    const byName = Object.fromEntries(defs.rows.map((r) => [r.indexname, r.indexdef]));
    expect(byName['marketplace_modules_pariwar_id_idx']).toMatch(/USING btree \(pariwar_id\)$/);
    expect(byName['marketplace_modules_pariwar_state_idx']).toMatch(/USING btree \(pariwar_id, current_state\)$/);
  });

  it('twt_app has SELECT / INSERT / UPDATE and ⛔ DELETE; RLS is ENABLE + FORCE with the three named policies', async () => {
    const { client } = getTx();
    const priv = await client.query<Record<string, boolean>>(
      `SELECT has_table_privilege('twt_app', 'marketplace_modules', 'SELECT') AS s,
              has_table_privilege('twt_app', 'marketplace_modules', 'INSERT') AS i,
              has_table_privilege('twt_app', 'marketplace_modules', 'UPDATE') AS u,
              has_table_privilege('twt_app', 'marketplace_modules', 'DELETE') AS d,
              has_table_privilege('twt_app', 'marketplace_modules', 'TRUNCATE') AS t`,
    );
    expect(priv.rows[0]).toEqual({ s: true, i: true, u: true, d: false, t: false });
    const rls = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'marketplace_modules'`,
    );
    expect(rls.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
    const pol = await client.query<{ policyname: string; cmd: string; qual: string | null; with_check: string | null }>(
      `SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'marketplace_modules' ORDER BY policyname`,
    );
    expect(pol.rows.map((p) => [p.policyname, p.cmd])).toEqual([
      ['marketplace_modules_tenant_isolation_insert', 'INSERT'],
      ['marketplace_modules_tenant_isolation_select', 'SELECT'],
      ['marketplace_modules_tenant_isolation_update', 'UPDATE'],
    ]);
    for (const p of pol.rows) {
      for (const clause of [p.qual, p.with_check].filter((x): x is string => x !== null)) {
        expect(clause).toContain("current_setting('app.pariwar_id'::text, true)");
        expect(clause).toContain('NULLIF');
      }
    }
  });

  it('the write-guard trigger is installed BEFORE INSERT OR UPDATE, FOR EACH ROW', async () => {
    const { client } = getTx();
    const r = await client.query<{ tgname: string; def: string }>(
      `SELECT tgname, pg_get_triggerdef(oid) AS def FROM pg_trigger
        WHERE tgrelid = 'marketplace_modules'::regclass AND NOT tgisinternal`,
    );
    expect(r.rows.map((t) => t.tgname)).toEqual(['marketplace_modules_state_write_guard']);
    expect(r.rows[0]!.def).toMatch(/BEFORE INSERT OR UPDATE ON public\.marketplace_modules FOR EACH ROW EXECUTE FUNCTION marketplace_modules_reject_unguarded_state_write\(\)/);
  });

  it('QE8’s two events_log partial unique indexes exist with the right keys and predicate', async () => {
    const { client } = getTx();
    const r = await client.query<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'events_log'
         AND indexname IN ('module_lead_member_uq', 'module_lead_id_uq') ORDER BY indexname`,
    );
    expect(r.rows.map((x) => x.indexname)).toEqual(['module_lead_id_uq', 'module_lead_member_uq']);
    const [byId, byMember] = r.rows;
    expect(byId!.indexdef).toContain('CREATE UNIQUE INDEX');
    expect(byId!.indexdef).toContain("'lead_id'");
    expect(byId!.indexdef).not.toContain('stream_id'); // GLOBAL — a lead id is used once, anywhere
    expect(byId!.indexdef).toContain("'module.lead_submitted'");
    expect(byMember!.indexdef).toContain('CREATE UNIQUE INDEX');
    expect(byMember!.indexdef).toContain('stream_id');
    expect(byMember!.indexdef).toContain("'member_id'");
    expect(byMember!.indexdef).toContain("'module.lead_submitted'");
  });
});

describe.skipIf(!hasDatabase)('marketplace_modules — the whole-row write guard (AC2, I1–I3)', () => {
  setupLiveDb();

  /** Insert a genesis-shaped row under the guard; leaves the guard ON. */
  async function seed(capacity: number | null = 5): Promise<string> {
    const { client } = getTx();
    const id = randomUUID();
    await client.query(GUARD_ON);
    await client.query(RAW_INSERT_SQL, rawInsertParams(id, PARIWAR_A, { capacity }));
    return id;
  }

  it('an UNGUARDED INSERT is rejected (P0001), even of the genesis shape', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expectSqlRejected(client, RAW_INSERT_SQL, rawInsertParams(randomUUID(), PARIWAR_A), 'P0001');
    await client.query(GUARD_OFF);
    await expectSqlRejected(client, RAW_INSERT_SQL, rawInsertParams(randomUUID(), PARIWAR_A), 'P0001');
  });

  it('a GUARDED INSERT must be the genesis shape (I3): (5,5) and the uncapped (NULL,NULL) pass; (5,4) fails', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await client.query(GUARD_ON);
    await client.query(RAW_INSERT_SQL, rawInsertParams(randomUUID(), PARIWAR_A));
    await client.query(RAW_INSERT_SQL, rawInsertParams(randomUUID(), PARIWAR_A, { capacity: null, slots: null }));
    await expectSqlRejected(client, RAW_INSERT_SQL, rawInsertParams(randomUUID(), PARIWAR_A, { capacity: 5, slots: 4 }), 'P0001');
    await expectSqlRejected(client, RAW_INSERT_SQL, rawInsertParams(randomUUID(), PARIWAR_A, { state: 'active' }), 'P0001');
    await expectSqlRejected(client, RAW_INSERT_SQL, rawInsertParams(randomUUID(), PARIWAR_A, { version: 2 }), 'P0001');
    await expectSqlRejected(
      client,
      RAW_INSERT_SQL,
      rawInsertParams(randomUUID(), PARIWAR_A, { state: 'draft', reason: 'trustee_archived' }),
      'P0001',
    );
  });

  it('an UNGUARDED UPDATE of ANY column is rejected — audit_id alone, slots_remaining alone, a content column', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await seed();
    await client.query(GUARD_OFF);
    await expectSqlRejected(client, 'UPDATE marketplace_modules SET audit_id = $2 WHERE module_id = $1', [id, randomUUID()], 'P0001');
    await expectSqlRejected(client, 'UPDATE marketplace_modules SET slots_remaining = 4 WHERE module_id = $1', [id], 'P0001');
    await expectSqlRejected(client, "UPDATE marketplace_modules SET name_en = 'x' WHERE module_id = $1", [id], 'P0001');
    await expectSqlRejected(client, 'UPDATE marketplace_modules SET updated_at = now() WHERE module_id = $1', [id], 'P0001');
  });

  it('a GUARDED UPDATE that changes any I2 content column is rejected (name_en, scope_filter, pariwar_id, created_at, …)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await seed();
    const legs: [string, unknown[]][] = [
      ["UPDATE marketplace_modules SET name_en = 'changed', state_event_version = 2 WHERE module_id = $1", [id]],
      [
        `UPDATE marketplace_modules SET scope_filter = '{"version":1,"scope":"state","values":["Bihar"]}', state_event_version = 2 WHERE module_id = $1`,
        [id],
      ],
      ['UPDATE marketplace_modules SET pariwar_id = $2, state_event_version = 2 WHERE module_id = $1', [id, randomUUID()]],
      ["UPDATE marketplace_modules SET created_at = now() - interval '1 day', state_event_version = 2 WHERE module_id = $1", [id]],
      ["UPDATE marketplace_modules SET lead_handoff_url = 'https://evil.example/x', state_event_version = 2 WHERE module_id = $1", [id]],
      ['UPDATE marketplace_modules SET slot_capacity = 6, state_event_version = 2 WHERE module_id = $1', [id]],
      ["UPDATE marketplace_modules SET valid_until = now() + interval '9 days', state_event_version = 2 WHERE module_id = $1", [id]],
    ];
    for (const [text, params] of legs) await expectSqlRejected(client, text, params, 'P0001');
  });

  it('a GUARDED UPDATE with a non-increasing version is rejected', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await seed();
    await expectSqlRejected(client, "UPDATE marketplace_modules SET current_state = 'active' WHERE module_id = $1", [id], 'P0001');
    await expectSqlRejected(
      client,
      "UPDATE marketplace_modules SET current_state = 'active', state_event_version = 0 WHERE module_id = $1",
      [id],
      'P0001',
    );
  });

  it('a GUARDED UPDATE that moves slots_remaining by anything but 0 / −1 is rejected', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await seed(5);
    await expectSqlRejected(client, 'UPDATE marketplace_modules SET slots_remaining = 3, state_event_version = 2 WHERE module_id = $1', [id], 'P0001');
    await expectSqlRejected(client, 'UPDATE marketplace_modules SET slots_remaining = 6, state_event_version = 2 WHERE module_id = $1', [id], 'P0001');
    await expectSqlRejected(client, 'UPDATE marketplace_modules SET slots_remaining = NULL, state_event_version = 2 WHERE module_id = $1', [id], 'P0001');
    // An uncapped module can never gain a capacity count.
    const uncapped = await seed(null);
    await expectSqlRejected(client, 'UPDATE marketplace_modules SET slots_remaining = 0, state_event_version = 2 WHERE module_id = $1', [uncapped], 'P0001');
  });

  // RP14 — the trigger compares the WHOLE row minus an exclusion chain. Pin the chain from the function's own
  // source (exactly the six projected columns, once for NEW and once for OLD), then refuse a change to EVERY
  // other column — so a column added later is immutable by default (C12) and one wrongly added to the chain fails.
  it('RP14: the exclusion chain is exactly the six projected columns, and every OTHER column is refused', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const fn = await client.query<{ def: string }>(
      `SELECT pg_get_functiondef('marketplace_modules_reject_unguarded_state_write'::regproc) AS def`,
    );
    const chained = [...fn.rows[0]!.def.matchAll(/ - '([a-z_]+)'/g)].map((m) => m[1]!);
    const PROJECTED = ['archive_reason', 'audit_id', 'current_state', 'slots_remaining', 'state_event_version', 'updated_at'];
    expect([...new Set(chained)].sort()).toEqual(PROJECTED);
    expect(chained).toHaveLength(PROJECTED.length * 2); // once for to_jsonb(NEW), once for to_jsonb(OLD)

    const BEND: Record<string, string> = {
      module_id: 'gen_random_uuid()',
      pariwar_id: 'gen_random_uuid()',
      partner_id: 'gen_random_uuid()',
      name_en: "'changed'",
      name_hi: "'changed'",
      description_en: "'changed'",
      description_hi: "'changed'",
      eligibility_filter: `'{"version":1,"clauses":[{"kind":"member_state_in","states":["active"]}]}'::jsonb`,
      scope_filter: `'{"version":1,"scope":"state","values":["Bihar"]}'::jsonb`,
      valid_from: "valid_from + interval '1 minute'",
      valid_until: "valid_until + interval '1 day'",
      slot_capacity: 'slot_capacity + 1',
      lead_handoff_url: "'https://evil.example/x'",
      lead_handoff_signing_key_secret_name: "'other-key'",
      branding_bundle: `'{"version":1,"logo_object_key":"x","accent_color_hex":null}'::jsonb`,
      manifest_schema_version: '2',
      created_at: "created_at - interval '1 day'",
    };
    const cols = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'marketplace_modules' ORDER BY column_name`,
    );
    const content = cols.rows.map((c) => c.column_name).filter((c) => !PROJECTED.includes(c));
    // A NEW column must get a leg here (⛔ silently untested).
    expect(content.sort()).toEqual(Object.keys(BEND).sort());

    const id = await seed();
    for (const col of content) {
      await expectSqlRejected(
        client,
        `UPDATE marketplace_modules SET ${col} = ${BEND[col]!}, state_event_version = 2 WHERE module_id = $1`,
        [id],
        'P0001',
      );
    }
  });

  it('RP14: a REAL trigger refusal becomes a ModuleStateDirectWriteError whose message carries the prefix exactly once', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await seed();
    await client.query(GUARD_OFF);
    await client.query('SAVEPOINT real_raise');
    let raised: unknown;
    try {
      await client.query("UPDATE marketplace_modules SET name_en = 'x' WHERE module_id = $1", [id]);
    } catch (e) {
      raised = e;
    }
    await client.query('ROLLBACK TO SAVEPOINT real_raise');
    expect(isModuleStateDirectWriteError(raised)).toBe(true);

    const err = new ModuleStateDirectWriteError(pgMessageOf(raised));
    expect(err.message.startsWith(`${MODULE_STATE_DIRECT_WRITE_MESSAGE_PREFIX}: `)).toBe(true);
    expect(err.message.split(MODULE_STATE_DIRECT_WRITE_MESSAGE_PREFIX)).toHaveLength(2); // exactly once
    expect(err.message).toContain('only the event-replay projector may update a module row');
    expect(err.message).not.toMatch(/^[^:]+: [—–-]/); // no stray separator left behind by the strip
  });

  it('a GUARDED UPDATE that changes state AND moves slots_remaining is rejected', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await seed(5);
    await expectSqlRejected(
      client,
      "UPDATE marketplace_modules SET current_state = 'active', slots_remaining = 4, state_event_version = 2 WHERE module_id = $1",
      [id],
      'P0001',
    );
  });

  it('legal guarded UPDATEs pass: a state change; then a same-state −1; the projected columns move', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await seed(5);
    await client.query(
      "UPDATE marketplace_modules SET current_state = 'active', state_event_version = 2, audit_id = $2, updated_at = now() WHERE module_id = $1",
      [id, randomUUID()],
    );
    await client.query('UPDATE marketplace_modules SET slots_remaining = 4, state_event_version = 3 WHERE module_id = $1', [id]);
    const r = await client.query('SELECT current_state, state_event_version, slots_remaining FROM marketplace_modules WHERE module_id = $1', [id]);
    expect(r.rows[0]).toEqual({ current_state: 'active', state_event_version: '3', slots_remaining: 4 });
  });

  it('⚠ a guarded slots_remaining 0 → −1 PASSES the trigger and is refused by marketplace_modules_slots_range (23514)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await seed(1);
    await client.query('UPDATE marketplace_modules SET slots_remaining = 0, state_event_version = 2 WHERE module_id = $1', [id]);
    await client.query('SAVEPOINT range');
    let err: { code?: string; constraint?: string } | null = null;
    try {
      await client.query('UPDATE marketplace_modules SET slots_remaining = -1, state_event_version = 3 WHERE module_id = $1', [id]);
    } catch (e) {
      err = e as { code?: string; constraint?: string };
    }
    await client.query('ROLLBACK TO SAVEPOINT range');
    expect(err?.code).toBe('23514');
    expect(err?.constraint).toBe('marketplace_modules_slots_range');
  });

  // RP2 — a GUARDED genesis INSERT passes the trigger's I3 shape rule, so the CHECK itself decides. Each is tripped BY NAME.
  // ⚠ `marketplace_modules_slots_pair` CANNOT be tripped under twt_app and is ⛔ tested: the INSERT rule forces
  // `slots_remaining = slot_capacity` (so the two are NULL together or neither is), and rules (b) and (d) refuse any later
  // change to either — the trigger SHADOWS that CHECK. It stays as the backstop for a role that bypasses the trigger.
  it.each([
    ['marketplace_modules_window', 'valid_until before valid_from', () => rawInsertSqlWith({ invertedWindow: true }), {}],
    ['marketplace_modules_capacity_positive', 'slot_capacity = 0', () => RAW_INSERT_SQL, { capacity: 0 }],
    ['marketplace_modules_manifest_schema_version_v1', 'manifest_schema_version = 2', () => rawInsertSqlWith({ schemaVersion: 2 }), {}],
  ])('RP2: %s fires for %s (23514, by name)', async (name, _why, sqlOf, opts) => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await client.query(GUARD_ON);
    await expectSqlRejected(client, sqlOf(), rawInsertParams(randomUUID(), PARIWAR_A, opts), '23514', name);
  });

  it('the archive pair CHECK holds: archived ⇔ a reason (23514 either way)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await seed();
    await expectSqlRejected(
      client,
      "UPDATE marketplace_modules SET current_state = 'archived', state_event_version = 2 WHERE module_id = $1",
      [id],
      '23514',
    );
    await expectSqlRejected(
      client,
      "UPDATE marketplace_modules SET archive_reason = 'trustee_archived', state_event_version = 2 WHERE module_id = $1",
      [id],
      '23514',
    );
  });
});
