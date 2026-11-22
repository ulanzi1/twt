// Story 12.5b (Task 1; AC1, AC2, AC4 (e), AC8 grants, AC10 floor, AC11 FK; QE1) — migrations 0216 + 0217, live. Per-test ROLLBACK.
// The route columns' pairing CHECK and immutability, the v1 CHECK, the handoff BACKSTOP trigger (with a `trust_sends` control INSERT
// that lands), and the three figure tables: their grants for `twt_app` AND `twt_service` (TR33 — CI connects as the superuser, so this
// catalog read is the only check before production that the jobs login can purge and export), FORCE RLS, per-command policies, the
// visits' FOR DELETE policy under FORCE (a DELETE matching 0 rows silently is the failure it prevents), and the named CHECKs.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { PARTNER_FORM_COUNT_KINDS } from '../../../src/schema/marketplace_partner_form_counts.js';
import { PARTNER_FORM_FIGURE_FLOOR } from '../../../src/schema/marketplace_partner_form_totals.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';
import {
  RAW_INSERT_SQL,
  SEEDED_PARTNER_FORM_URL,
  expectSqlRejected,
  rawInsertParams,
  rawInsertSqlWith,
  seedPartner,
} from './_fixtures.js';
import { expectRefused, insertHandoffRaw, seedLeadConsent, seedMemberRow, seedModule } from './_lead-handoff-fixtures.js';

type Client = ReturnType<typeof getTx>['client'];

const GUARD_ON = "SET LOCAL app.marketplace_module_state_writer = 'on'";
const GUARD_OFF = "SET LOCAL app.marketplace_module_state_writer = 'off'";
const VISITS = 'marketplace_partner_form_visits';
const COUNTS = 'marketplace_partner_form_counts';
const TOTALS = 'marketplace_partner_form_totals';

/** A raw module INSERT under the writer guard, as the superuser. */
async function rawModule(client: Client, sqlText: string, params: unknown[]): Promise<void> {
  await client.query(GUARD_ON);
  await client.query(sqlText, params);
  await client.query(GUARD_OFF);
}

async function insertVisit(client: Client, pariwarId: string, moduleId: string, memberId: string, openedAtSql = 'clock_timestamp()') {
  const id = randomUUID();
  await client.query(
    `INSERT INTO ${VISITS} (visit_id, pariwar_id, module_id, member_id, opened_at) VALUES ($1, $2, $3, $4, ${openedAtSql})`,
    [id, pariwarId, moduleId, memberId],
  );
  return id;
}

async function insertTotals(client: Client, pariwarId: string, moduleId: string, o: { figure: number | null; belowFloor: boolean }) {
  await client.query(
    `INSERT INTO ${TOTALS} (totals_id, pariwar_id, module_id, period_start, period_end, stage_order, stage_label, figure, below_floor,
       entered_by_actor_id, audit_id) VALUES ($1, $2, $3, '2026-11-01', '2026-11-30', 1, 'Started', $4, $5, $6, $7)`,
    [randomUUID(), pariwarId, moduleId, o.figure, o.belowFloor, randomUUID(), randomUUID()],
  );
}

describe.skipIf(!hasDatabase)('Story 12.5b — the route marker (0216)', () => {
  setupLiveDb();

  it('AC1: a v2 partner_form row lands with its page, ⛔ handoff URL, ⛔ secret, ⛔ places; a trust_sends row as before', async () => {
    const { client } = getTx();
    const partnerId = await seedPartner(client, PARIWAR_A);
    const pf = randomUUID();
    await rawModule(client, rawInsertSqlWith({ route: 'partner_form' }), rawInsertParams(pf, PARIWAR_A, { partnerId, capacity: null }));
    const ts = randomUUID();
    await rawModule(client, RAW_INSERT_SQL, rawInsertParams(ts, PARIWAR_A, { partnerId }));
    const { rows } = await client.query(
      `SELECT module_id, lead_route, partner_form_url, lead_handoff_url, lead_handoff_signing_key_secret_name, slot_capacity, manifest_schema_version
         FROM marketplace_modules WHERE module_id = ANY($1::uuid[]) ORDER BY lead_route`,
      [[pf, ts]],
    );
    expect(rows).toEqual([
      {
        module_id: ts,
        lead_route: 'trust_sends',
        partner_form_url: null,
        lead_handoff_url: 'https://leads.partner.example/x',
        lead_handoff_signing_key_secret_name: 'k',
        slot_capacity: 5,
        manifest_schema_version: 1,
      },
      {
        module_id: pf,
        lead_route: 'partner_form',
        partner_form_url: SEEDED_PARTNER_FORM_URL,
        lead_handoff_url: null,
        lead_handoff_signing_key_secret_name: null,
        slot_capacity: null,
        manifest_schema_version: 2,
      },
    ]);
  });

  it.each([
    ['a partner_form row with places', (s: string) => s, { capacity: 5 }],
    ['a partner_form row with a handoff URL', (s: string) => s.replace("NULL, NULL, '{", "'https://leads.partner.example/x', NULL, '{"), { capacity: null }],
    ['a partner_form row with a signing key', (s: string) => s.replace("NULL, NULL, '{", "NULL, 'k', '{"), { capacity: null }],
    ['a partner_form row with ⛔ page', (s: string) => s.replace(`'${SEEDED_PARTNER_FORM_URL}',`, 'NULL,'), { capacity: null }],
  ])('AC1: the pairing CHECK refuses %s (23514, by name)', async (_label, bend, o) => {
    const { client } = getTx();
    const partnerId = await seedPartner(client, PARIWAR_A);
    await client.query(GUARD_ON);
    const base = rawInsertSqlWith({ route: 'partner_form' });
    const text = bend(base);
    // Each bend changes the template (the places leg bends the PARAMS instead).
    if (o.capacity === null) expect(text).not.toBe(base);
    await expectSqlRejected(client, text, rawInsertParams(randomUUID(), PARIWAR_A, { partnerId, ...o }), '23514', 'marketplace_modules_route_columns');
  });

  it('AC1: the pairing CHECK refuses a trust_sends row that also carries a partner page, or lacks its handoff URL (23514)', async () => {
    const { client } = getTx();
    const partnerId = await seedPartner(client, PARIWAR_A);
    await client.query(GUARD_ON);
    const withPage = RAW_INSERT_SQL.replace("'trust_sends', NULL,", "'trust_sends', 'https://partner.example/apply?offer=x',");
    const noUrl = RAW_INSERT_SQL.replace("'https://leads.partner.example/x', 'k',", "NULL, 'k',");
    expect(withPage).not.toBe(RAW_INSERT_SQL);
    expect(noUrl).not.toBe(RAW_INSERT_SQL);
    for (const text of [withPage, noUrl]) {
      await expectSqlRejected(client, text, rawInsertParams(randomUUID(), PARIWAR_A, { partnerId }), '23514', 'marketplace_modules_route_columns');
    }
  });

  it('AC2: a v1 row can never be partner_form (23514 marketplace_modules_v1_is_trust_sends); a version outside (1, 2) is refused', async () => {
    const { client } = getTx();
    const partnerId = await seedPartner(client, PARIWAR_A);
    await client.query(GUARD_ON);
    await expectSqlRejected(
      client,
      rawInsertSqlWith({ route: 'partner_form', schemaVersion: 1 }),
      rawInsertParams(randomUUID(), PARIWAR_A, { partnerId, capacity: null }),
      '23514',
      'marketplace_modules_v1_is_trust_sends',
    );
    await expectSqlRejected(
      client,
      rawInsertSqlWith({ schemaVersion: 3 }),
      rawInsertParams(randomUUID(), PARIWAR_A, { partnerId }),
      '23514',
      'marketplace_modules_manifest_schema_version',
    );
    // Control: a v2 trust_sends row lands.
    await client.query(rawInsertSqlWith({ schemaVersion: 2 }), rawInsertParams(randomUUID(), PARIWAR_A, { partnerId }));
  });

  it('AC1: ⛔ INSERT may omit the route — ⛔ default (23502)', async () => {
    const { client } = getTx();
    const partnerId = await seedPartner(client, PARIWAR_A);
    await client.query(GUARD_ON);
    const omitted = RAW_INSERT_SQL.replace(' lead_route, partner_form_url,', ' partner_form_url,').replace(" 'trust_sends', NULL,", ' NULL,');
    expect(omitted).not.toContain('lead_route');
    await expectSqlRejected(client, omitted, rawInsertParams(randomUUID(), PARIWAR_A, { partnerId }), '23502');
  });

  it('AC1: both new columns are refused on a guarded UPDATE (P0001, the 0193 whole-row trigger — unchanged)', async () => {
    const { client } = getTx();
    const partnerId = await seedPartner(client, PARIWAR_A);
    const pf = randomUUID();
    await rawModule(client, rawInsertSqlWith({ route: 'partner_form' }), rawInsertParams(pf, PARIWAR_A, { partnerId, capacity: null }));
    await enterAppScope(client, PARIWAR_A);
    await client.query(GUARD_ON);
    await expectSqlRejected(
      client,
      `UPDATE marketplace_modules SET partner_form_url = 'https://partner.example/apply?offer=other', state_event_version = 2 WHERE module_id = $1`,
      [pf],
      'P0001',
    );
    await expectSqlRejected(
      client,
      `UPDATE marketplace_modules SET lead_route = 'trust_sends', lead_handoff_url = 'https://leads.partner.example/x',
              lead_handoff_signing_key_secret_name = 'k', partner_form_url = NULL, state_event_version = 2 WHERE module_id = $1`,
      [pf],
      'P0001',
    );
    // Control: a legal projected UPDATE of the same row passes.
    expect((await client.query(`UPDATE marketplace_modules SET current_state = 'active', state_event_version = 2 WHERE module_id = $1`, [pf])).rowCount).toBe(1);
  });

  it('AC4 (e): a raw handoff INSERT for a partner_form module is refused P0001 by the route guard — as twt_app AND as the superuser; a trust_sends control lands', async () => {
    const { client } = getTx();
    const partnerId = await seedPartner(client, PARIWAR_A);
    const pf = await seedModule(client, PARIWAR_A, partnerId, { route: 'partner_form' });
    const ts = await seedModule(client, PARIWAR_A, partnerId);
    const memberId = await seedMemberRow(client, PARIWAR_A);
    const world = async (moduleId: string) => {
      const leadId = randomUUID();
      const consentId = await seedLeadConsent(client, PARIWAR_A, { subjectId: memberId, artifactRef: leadId });
      return { pariwarId: PARIWAR_A as string, partnerId, moduleId, memberId, leadId, consentId };
    };
    const bad = await world(pf);
    // The superuser (⛔ RLS) — the backstop binds every role at default settings.
    await client.query('SAVEPOINT su');
    await expect(insertHandoffRaw(client, bad)).rejects.toMatchObject({
      code: 'P0001',
      message: expect.stringContaining('marketplace_lead_handoffs route rejected'),
    });
    await client.query('ROLLBACK TO SAVEPOINT su');
    // twt_app, under the module's own scope (the module row is visible to the trigger through the SELECT policy).
    const bad2 = await world(pf);
    await enterAppScope(client, PARIWAR_A);
    await expectRefused(
      client,
      `INSERT INTO marketplace_lead_handoffs (lead_id, pariwar_id, module_id, member_id, consent_id, envelope_version, member_fields_ciphertext, audit_id)
       VALUES ($1, $2, $3, $4, $5, 1, 'x', $6)`,
      [bad2.leadId, bad2.pariwarId, bad2.moduleId, bad2.memberId, bad2.consentId, randomUUID()],
      'P0001',
      { message: 'a partner_form offer never passes a member on' },
    );
    await client.query('RESET ROLE');
    // Control: the same INSERT for a trust_sends module lands.
    const good = await world(ts);
    await insertHandoffRaw(client, good);
    expect((await client.query('SELECT 1 FROM marketplace_lead_handoffs WHERE lead_id = $1', [good.leadId])).rows).toHaveLength(1);
  });

  it('AC4 (e): an UNKNOWN module still fails on the composite FK (23503) — the trigger lets it through', async () => {
    const { client } = getTx();
    const partnerId = await seedPartner(client, PARIWAR_A);
    const ts = await seedModule(client, PARIWAR_A, partnerId);
    const memberId = await seedMemberRow(client, PARIWAR_A);
    const leadId = randomUUID();
    const consentId = await seedLeadConsent(client, PARIWAR_A, { subjectId: memberId, artifactRef: leadId });
    await client.query('SAVEPOINT fk');
    await expect(
      insertHandoffRaw(client, { pariwarId: PARIWAR_A, partnerId, moduleId: randomUUID(), memberId, leadId, consentId }),
    ).rejects.toMatchObject({ code: '23503', constraint: 'marketplace_lead_handoffs_module_fk' });
    await client.query('ROLLBACK TO SAVEPOINT fk');
    void ts;
  });
});

describe.skipIf(!hasDatabase)('Story 12.5b — the three figure tables (0217)', () => {
  setupLiveDb();

  it('AC8 / TR33: the grants are EXACTLY the QE1 table — for twt_app AND twt_service', async () => {
    const { client } = getTx();
    const table = await client.query<{ grantee: string; table_name: string; privilege_type: string }>(
      `SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants
        WHERE grantee IN ('twt_app', 'twt_service') AND table_name = ANY($1::text[]) ORDER BY grantee, table_name, privilege_type`,
      [[VISITS, COUNTS, TOTALS]],
    );
    expect(table.rows.map((r) => `${r.grantee}:${r.table_name}:${r.privilege_type}`)).toEqual([
      `twt_app:${COUNTS}:INSERT`,
      `twt_app:${COUNTS}:SELECT`,
      `twt_app:${TOTALS}:INSERT`,
      `twt_app:${TOTALS}:SELECT`,
      `twt_app:${VISITS}:DELETE`,
      `twt_app:${VISITS}:SELECT`,
      `twt_service:${VISITS}:DELETE`,
      `twt_service:${VISITS}:SELECT`,
    ]);
    // Column grants: the visits INSERT is narrowed (opened_at is the DB clock); the counts UPDATE is `count` alone.
    const cols = await client.query<{ table_name: string; privilege_type: string; column_name: string }>(
      `SELECT table_name, privilege_type, column_name FROM information_schema.column_privileges
        WHERE grantee = 'twt_app' AND table_name = ANY($1::text[]) AND privilege_type IN ('INSERT', 'UPDATE')`,
      [[VISITS, COUNTS]],
    );
    const of = (t: string, p: string) => cols.rows.filter((r) => r.table_name === t && r.privilege_type === p).map((r) => r.column_name).sort();
    expect(of(VISITS, 'INSERT')).toEqual(['member_id', 'module_id', 'pariwar_id', 'visit_id']);
    expect(of(VISITS, 'UPDATE')).toEqual([]);
    expect(of(COUNTS, 'UPDATE')).toEqual(['count']);
    expect(of(COUNTS, 'INSERT')).toEqual(['count', 'day', 'kind', 'module_id', 'pariwar_id']);
  });

  it('FORCE RLS on all three, with exactly the per-command policies (⛔ FOR ALL), each on the Pariwar GUC', async () => {
    const { client } = getTx();
    const rel = await client.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = ANY($1::text[]) ORDER BY relname`,
      [[VISITS, COUNTS, TOTALS]],
    );
    expect(rel.rows.every((r) => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
    expect(rel.rows).toHaveLength(3);
    const pol = await client.query<{ tablename: string; policyname: string; cmd: string; roles: string; qual: string | null; with_check: string | null }>(
      `SELECT tablename, policyname, cmd, roles::text AS roles, qual, with_check FROM pg_policies WHERE tablename = ANY($1::text[]) ORDER BY tablename, cmd`,
      [[VISITS, COUNTS, TOTALS]],
    );
    expect(pol.rows.map((r) => `${r.tablename}:${r.cmd}`)).toEqual([
      `${COUNTS}:INSERT`,
      `${COUNTS}:SELECT`,
      `${COUNTS}:UPDATE`,
      `${TOTALS}:INSERT`,
      `${TOTALS}:SELECT`,
      `${VISITS}:DELETE`,
      `${VISITS}:INSERT`,
      `${VISITS}:SELECT`,
    ]);
    const onGuc = /^\(pariwar_id = \(NULLIF\(current_setting\('app\.pariwar_id'::text, true\), ''::text\)\)::uuid\)$/;
    // Review RP5: each command's REQUIRED clause must be PRESENT and on the GUC — filtering NULLs first let a policy with its tenant
    // predicate left out pass, and a policy with no USING / WITH CHECK admits every row for its command. SELECT and DELETE filter by
    // USING alone; INSERT checks by WITH CHECK alone; UPDATE needs both. (Postgres stores no clause a command cannot have.)
    const required: Record<string, { qual: boolean; withCheck: boolean }> = {
      SELECT: { qual: true, withCheck: false },
      DELETE: { qual: true, withCheck: false },
      INSERT: { qual: false, withCheck: true },
      UPDATE: { qual: true, withCheck: true },
    };
    for (const p of pol.rows) {
      expect(p.roles).toBe('{twt_app}');
      expect(p.policyname).toBe(`${p.tablename}_tenant_isolation_${p.cmd.toLowerCase()}`);
      const need = required[p.cmd];
      expect(need, `${p.policyname}: an unexpected command ${p.cmd}`).toBeDefined();
      if (need!.qual) expect(p.qual, `${p.policyname} USING`).toMatch(onGuc);
      else expect(p.qual, `${p.policyname} USING`).toBeNull();
      if (need!.withCheck) expect(p.with_check, `${p.policyname} WITH CHECK`).toMatch(onGuc);
      else expect(p.with_check, `${p.policyname} WITH CHECK`).toBeNull();
    }
  });

  // Review RP5 (checklist family 5): the catalog says WHAT the policies are; these say they WORK, for the two tables the visits legs
  // below do not reach. As `twt_app`: another Pariwar's rows are invisible and un-updatable, a row naming another Pariwar is refused
  // on INSERT, and with ⛔ scope nothing is seen and nothing is written. Every leg has a control that lands in its own scope.
  it('RP5 / counts: as twt_app, another Pariwar\'s counts are invisible and un-updatable; a row for another Pariwar or with ⛔ scope is refused', async () => {
    const { client } = getTx();
    const ma = await seedModule(client, PARIWAR_A, await seedPartner(client, PARIWAR_A), { route: 'partner_form' });
    const mb = await seedModule(client, PARIWAR_B, await seedPartner(client, PARIWAR_B), { route: 'partner_form' });
    const insertCount = `INSERT INTO ${COUNTS} (pariwar_id, module_id, day, kind, count) VALUES ($1, $2, current_date, 'card_shown', 1)`;
    await client.query(insertCount, [PARIWAR_B, mb]); // B's row, as the superuser
    await enterAppScope(client, PARIWAR_A);
    // Control: A's own row lands and is seen and bumped.
    expect((await client.query(insertCount, [PARIWAR_A, ma])).rowCount).toBe(1);
    expect((await client.query(`UPDATE ${COUNTS} SET count = count + 1 WHERE module_id = $1`, [ma])).rowCount).toBe(1);
    expect((await client.query(`SELECT pariwar_id, count FROM ${COUNTS} WHERE module_id = ANY($1::uuid[])`, [[ma, mb]])).rows).toEqual([
      { pariwar_id: PARIWAR_A, count: '2' },
    ]);
    // B's row: invisible, and an UPDATE matches nothing.
    expect((await client.query(`UPDATE ${COUNTS} SET count = count + 1 WHERE module_id = $1`, [mb])).rowCount).toBe(0);
    // A row naming B, from A's scope → the INSERT WITH CHECK (42501).
    await expectSqlRejected(client, `INSERT INTO ${COUNTS} (pariwar_id, module_id, day, kind, count) VALUES ($1, $2, current_date, 'came_back', 1)`, [PARIWAR_B, mb], '42501');
    // ⛔ scope: nothing seen, nothing updated, nothing inserted.
    await client.query('RESET ROLE');
    await enterAppRoleNoScope(client);
    await client.query("SELECT set_config('app.pariwar_id', '', true)");
    expect((await client.query(`SELECT 1 FROM ${COUNTS} WHERE module_id = ANY($1::uuid[])`, [[ma, mb]])).rows).toHaveLength(0);
    expect((await client.query(`UPDATE ${COUNTS} SET count = count + 1 WHERE module_id = ANY($1::uuid[])`, [[ma, mb]])).rowCount).toBe(0);
    await expectSqlRejected(client, `INSERT INTO ${COUNTS} (pariwar_id, module_id, day, kind, count) VALUES ($1, $2, current_date, 'came_back', 1)`, [PARIWAR_A, ma], '42501');
    await client.query('RESET ROLE');
    // B's row is exactly as the superuser wrote it.
    expect((await client.query(`SELECT count FROM ${COUNTS} WHERE module_id = $1`, [mb])).rows).toEqual([{ count: '1' }]);
  });

  it('RP5 / totals: as twt_app, another Pariwar\'s totals are invisible; an entry for another Pariwar or with ⛔ scope is refused', async () => {
    const { client } = getTx();
    const ma = await seedModule(client, PARIWAR_A, await seedPartner(client, PARIWAR_A), { route: 'partner_form' });
    const mb = await seedModule(client, PARIWAR_B, await seedPartner(client, PARIWAR_B), { route: 'partner_form' });
    await insertTotals(client, PARIWAR_B, mb, { figure: 7, belowFloor: false }); // B's entry, as the superuser
    await enterAppScope(client, PARIWAR_A);
    // Control: A's own entry lands and is seen.
    await insertTotals(client, PARIWAR_A, ma, { figure: 9, belowFloor: false });
    expect((await client.query(`SELECT pariwar_id, figure FROM ${TOTALS} WHERE module_id = ANY($1::uuid[])`, [[ma, mb]])).rows).toEqual([
      { pariwar_id: PARIWAR_A, figure: 9 },
    ]);
    // An entry naming B, from A's scope → the INSERT WITH CHECK (42501).
    await client.query('SAVEPOINT other_pariwar');
    await expect(insertTotals(client, PARIWAR_B, mb, { figure: 8, belowFloor: false })).rejects.toMatchObject({ code: '42501' });
    await client.query('ROLLBACK TO SAVEPOINT other_pariwar');
    // ⛔ scope: nothing seen, nothing inserted.
    await client.query('RESET ROLE');
    await enterAppRoleNoScope(client);
    await client.query("SELECT set_config('app.pariwar_id', '', true)");
    expect((await client.query(`SELECT 1 FROM ${TOTALS} WHERE module_id = ANY($1::uuid[])`, [[ma, mb]])).rows).toHaveLength(0);
    await client.query('SAVEPOINT noscope');
    await expect(insertTotals(client, PARIWAR_A, ma, { figure: 8, belowFloor: false })).rejects.toMatchObject({ code: '42501' });
    await client.query('ROLLBACK TO SAVEPOINT noscope');
    await client.query('RESET ROLE');
    expect((await client.query(`SELECT pariwar_id, figure FROM ${TOTALS} WHERE module_id = ANY($1::uuid[]) ORDER BY figure`, [[ma, mb]])).rows).toEqual([
      { pariwar_id: PARIWAR_B, figure: 7 },
      { pariwar_id: PARIWAR_A, figure: 9 },
    ]);
  });

  it('visits: under FORCE RLS a twt_app DELETE removes only its own Pariwar\'s rows (the FOR DELETE policy works); ⛔ UPDATE (42501)', async () => {
    const { client } = getTx();
    const pa = await seedPartner(client, PARIWAR_A);
    const pb = await seedPartner(client, PARIWAR_B);
    const ma = await seedModule(client, PARIWAR_A, pa, { route: 'partner_form' });
    const mb = await seedModule(client, PARIWAR_B, pb, { route: 'partner_form' });
    const memA = await seedMemberRow(client, PARIWAR_A);
    const memB = await seedMemberRow(client, PARIWAR_B);
    await insertVisit(client, PARIWAR_A, ma, memA);
    await insertVisit(client, PARIWAR_A, ma, memA);
    const control = await insertVisit(client, PARIWAR_B, mb, memB);
    await enterAppScope(client, PARIWAR_A);
    const del = await client.query(`DELETE FROM ${VISITS} WHERE member_id = ANY($1::uuid[])`, [[memA, memB]]);
    expect(del.rowCount).toBe(2);
    await expectSqlRejected(client, `UPDATE ${VISITS} SET opened_at = now()`, [], '42501');
    await client.query('RESET ROLE');
    expect((await client.query(`SELECT visit_id FROM ${VISITS} WHERE member_id = ANY($1::uuid[])`, [[memA, memB]])).rows).toEqual([
      { visit_id: control },
    ]);
  });

  it('visits: twt_app cannot set opened_at (column grant), cannot insert into another Pariwar (WITH CHECK), and with ⛔ scope sees nothing', async () => {
    const { client } = getTx();
    const pa = await seedPartner(client, PARIWAR_A);
    const ma = await seedModule(client, PARIWAR_A, pa, { route: 'partner_form' });
    const memA = await seedMemberRow(client, PARIWAR_A);
    await insertVisit(client, PARIWAR_A, ma, memA);
    await enterAppScope(client, PARIWAR_B);
    await expectSqlRejected(
      client,
      `INSERT INTO ${VISITS} (visit_id, pariwar_id, module_id, member_id) VALUES ($1, $2, $3, $4)`,
      [randomUUID(), PARIWAR_A, ma, memA],
      '42501',
    );
    await enterAppScope(client, PARIWAR_A);
    await expectSqlRejected(
      client,
      `INSERT INTO ${VISITS} (visit_id, pariwar_id, module_id, member_id, opened_at) VALUES ($1, $2, $3, $4, now() - interval '200 days')`,
      [randomUUID(), PARIWAR_A, ma, memA],
      '42501',
    );
    // Control: the narrowed INSERT lands, its clock the DB's.
    expect(
      (await client.query(`INSERT INTO ${VISITS} (visit_id, pariwar_id, module_id, member_id) VALUES ($1, $2, $3, $4)`, [randomUUID(), PARIWAR_A, ma, memA]))
        .rowCount,
    ).toBe(1);
    await client.query('RESET ROLE');
    await enterAppRoleNoScope(client);
    await client.query("SELECT set_config('app.pariwar_id', '', true)");
    expect((await client.query(`SELECT 1 FROM ${VISITS}`)).rows).toHaveLength(0);
    expect((await client.query(`DELETE FROM ${VISITS} WHERE member_id = $1`, [memA])).rowCount).toBe(0);
  });

  it('visits: the composite module FK refuses ANOTHER Pariwar\'s module; the member FK a missing member (23503, by name)', async () => {
    const { client } = getTx();
    const pb = await seedPartner(client, PARIWAR_B);
    const mb = await seedModule(client, PARIWAR_B, pb, { route: 'partner_form' });
    const memA = await seedMemberRow(client, PARIWAR_A);
    await expectRefused(
      client,
      `INSERT INTO ${VISITS} (visit_id, pariwar_id, module_id, member_id) VALUES ($1, $2, $3, $4)`,
      [randomUUID(), PARIWAR_A, mb, memA],
      '23503',
      { constraint: 'marketplace_partner_form_visits_module_fk' },
    );
    const pa = await seedPartner(client, PARIWAR_A);
    const ma = await seedModule(client, PARIWAR_A, pa, { route: 'partner_form' });
    await expectRefused(
      client,
      `INSERT INTO ${VISITS} (visit_id, pariwar_id, module_id, member_id) VALUES ($1, $2, $3, $4)`,
      [randomUUID(), PARIWAR_A, ma, randomUUID()],
      '23503',
      { constraint: 'marketplace_partner_form_visits_member_fk' },
    );
  });

  it('counts: the kind CHECK holds exactly PARTNER_FORM_COUNT_KINDS; a count below 1 is refused', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ def: string }>(
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'marketplace_partner_form_counts_kind_check'`,
    );
    const listed = [...rows[0]!.def.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]);
    expect([...listed].sort()).toEqual([...PARTNER_FORM_COUNT_KINDS].sort());
    const pa = await seedPartner(client, PARIWAR_A);
    const ma = await seedModule(client, PARIWAR_A, pa, { route: 'partner_form' });
    await expectRefused(client, `INSERT INTO ${COUNTS} (pariwar_id, module_id, day, kind, count) VALUES ($1, $2, current_date, 'card_shown', 0)`, [PARIWAR_A, ma], '23514', {
      constraint: 'marketplace_partner_form_counts_count_check',
    });
    await expectRefused(client, `INSERT INTO ${COUNTS} (pariwar_id, module_id, day, kind, count) VALUES ($1, $2, current_date, 'member_seen', 1)`, [PARIWAR_A, ma], '23514', {
      constraint: 'marketplace_partner_form_counts_kind_check',
    });
    // ⛔ member column, by construction (I4).
    const colNames = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
      [COUNTS],
    );
    expect(colNames.rows.map((r) => r.column_name)).toEqual(['pariwar_id', 'module_id', 'day', 'kind', 'count']);
  });

  it('AC10: totals — a figure below 5 is unstorable; "fewer than 5" is below_floor with a NULL figure; insert-only for twt_app', async () => {
    const { client } = getTx();
    const pa = await seedPartner(client, PARIWAR_A);
    const ma = await seedModule(client, PARIWAR_A, pa, { route: 'partner_form' });
    expect(PARTNER_FORM_FIGURE_FLOOR).toBe(5);
    for (const bad of [
      { figure: 4, belowFloor: false },
      { figure: 3, belowFloor: true },
      { figure: null, belowFloor: false },
      { figure: 0, belowFloor: false },
    ]) {
      await client.query('SAVEPOINT tot');
      await expect(insertTotals(client, PARIWAR_A, ma, bad)).rejects.toMatchObject({
        code: '23514',
        constraint: 'marketplace_partner_form_totals_floor_check',
      });
      await client.query('ROLLBACK TO SAVEPOINT tot');
    }
    // Controls: 5 is shown as 5; below the floor carries ⛔ number.
    await insertTotals(client, PARIWAR_A, ma, { figure: 5, belowFloor: false });
    await insertTotals(client, PARIWAR_A, ma, { figure: null, belowFloor: true });
    await enterAppScope(client, PARIWAR_A);
    await expectSqlRejected(client, `UPDATE ${TOTALS} SET figure = 6`, [], '42501');
    await expectSqlRejected(client, `DELETE FROM ${TOTALS}`, [], '42501');
  });

  it('the named CHECKs of the three tables are exactly these', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ conname: string }>(
      `SELECT conname FROM pg_constraint WHERE conrelid = ANY(ARRAY[$1::regclass, $2::regclass, $3::regclass]) AND contype IN ('c', 'f') ORDER BY conname`,
      [VISITS, COUNTS, TOTALS],
    );
    expect(rows.map((r) => r.conname)).toEqual([
      'marketplace_partner_form_counts_count_check',
      'marketplace_partner_form_counts_kind_check',
      'marketplace_partner_form_counts_module_fk',
      'marketplace_partner_form_totals_floor_check',
      'marketplace_partner_form_totals_module_fk',
      'marketplace_partner_form_totals_period_check',
      'marketplace_partner_form_totals_stage_label_check',
      'marketplace_partner_form_totals_stage_order_check',
      'marketplace_partner_form_visits_member_fk',
      'marketplace_partner_form_visits_module_fk',
    ]);
  });
});
