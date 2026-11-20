// The personal data breach register — migration 0208 regression (Story 14.3, Task 3; AC4; decision `2026-11-20-467` DL4).
// GLOBAL, append-only tables with RLS FORCED and ZERO policies — the first of that kind here, so there is no policy file and this
// spec is the whole pin: (i) the privilege sets (`twt_app` EMPTY, `twt_service` exactly SELECT + INSERT); (ii) the writes EXECUTED
// on the production login's shape — a BYPASSRLS role IN ROLE `twt_service` — by CALLING `openBreachIncident` and
// `appendBreachEntryInTx` (the superuser this suite connects as hides a missing grant, and a row lock would fail only there);
// (iii) the bare NOBYPASSRLS group sees no row; (iv) the append-only triggers; (v) the CHECKs; (vi) each CHECK list equals its
// domain tuple; (vii) `recorded_at` is the DB's clock; then the accessors' rules and reads.
// Live DB only; per-test ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  BREACH_DETECTION_SOURCES,
  BREACH_ENTRY_KINDS,
  BreachRegisterError,
  appendBreachEntryInTx,
  countMembersOnRecord,
  listBreachIncidents,
  listBreachSignals,
  openBreachIncident,
  readBreachIncident,
} from '../../../src/breach/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';

type Client = ReturnType<typeof getTx>['client'];

const INCIDENTS = 'breach_incidents';
const ENTRIES = 'breach_incident_entries';

async function expectPgError(
  client: Client,
  run: () => Promise<unknown>,
  expected: { readonly code: string; readonly constraint?: string; readonly column?: string; readonly message?: unknown },
): Promise<void> {
  await client.query('SAVEPOINT expect_pg_error');
  await expect(run()).rejects.toMatchObject(expected);
  await client.query('ROLLBACK TO SAVEPOINT expect_pg_error');
}

const DENIED = { code: '42501', message: expect.stringMatching(/permission denied/) };
/** SQLSTATE 23000 = `integrity_constraint_violation` (0208's function; not 0188's P0001). */
const APPEND_ONLY = { code: '23000', message: expect.stringMatching(/append-only/) };

async function tablePrivileges(client: Client, table: string, grantee: string): Promise<string[]> {
  const { rows } = await client.query<{ privilege_type: string }>(
    `SELECT privilege_type FROM information_schema.role_table_grants WHERE table_name = $1 AND grantee = $2 ORDER BY 1`,
    [table, grantee],
  );
  return rows.map((r) => r.privilege_type);
}

async function checkValues(client: Client, conname: string): Promise<string[]> {
  const { rows } = await client.query<{ def: string }>(`SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1`, [conname]);
  expect(rows).toHaveLength(1);
  return [...rows[0]!.def.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]!).sort();
}

const ACTOR = randomUUID();
const open = (client: Client, over: Partial<Parameters<typeof openBreachIncident>[1]> = {}) =>
  openBreachIncident(client, {
    incidentId: randomUUID(),
    isRehearsal: true,
    title: 'Spec incident',
    becameAwareAt: new Date(Date.now() - 60 * 60 * 1000),
    detectionSource: 'other',
    actorId: ACTOR,
    actorDisplay: 'Spec Admin',
    auditId: randomUUID(),
    ...over,
  });
const append = (client: Client, incidentId: string, kind: (typeof BREACH_ENTRY_KINDS)[number], payload: Record<string, unknown>) =>
  appendBreachEntryInTx(client, { entryId: randomUUID(), incidentId, kind, payload, actorId: ACTOR, actorDisplay: 'Spec Admin', auditId: randomUUID() });

describe.skipIf(!hasDatabase)('the breach register — migration 0208 regression', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐ RLS is enabled AND forced on both tables, with ZERO policies', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = ANY($1) ORDER BY relname`,
      [[INCIDENTS, ENTRIES]],
    );
    expect(rows).toEqual([
      { relname: ENTRIES, relrowsecurity: true, relforcerowsecurity: true },
      { relname: INCIDENTS, relrowsecurity: true, relforcerowsecurity: true },
    ]);
    const policies = await client.query(`SELECT policyname FROM pg_policies WHERE tablename = ANY($1)`, [[INCIDENTS, ENTRIES]]);
    expect(policies.rows).toEqual([]);
  });

  it('⭐ grants — `twt_app` holds NOTHING on either table; `twt_service` holds exactly SELECT + INSERT (no column grants either)', async () => {
    const { client } = getTx();
    for (const table of [INCIDENTS, ENTRIES]) {
      expect(await tablePrivileges(client, table, 'twt_app')).toEqual([]);
      expect(await tablePrivileges(client, table, 'twt_service')).toEqual(['INSERT', 'SELECT']);
      const cols = await client.query(
        `SELECT 1 FROM information_schema.column_privileges WHERE table_name = $1 AND grantee IN ('twt_app', 'twt_service') AND privilege_type IN ('UPDATE', 'REFERENCES')`,
        [table],
      );
      expect(cols.rowCount).toBe(0);
    }
  });

  it('⭐ `twt_app` (the member-facing pool) can neither read nor write a breach record', async () => {
    const { client } = getTx();
    const { incident } = await open(client);
    await client.query('SAVEPOINT app');
    await client.query('SET LOCAL ROLE twt_app');
    await expectPgError(client, () => client.query(`SELECT 1 FROM ${INCIDENTS}`), DENIED);
    await expectPgError(client, () => client.query(`SELECT 1 FROM ${ENTRIES}`), DENIED);
    await expectPgError(client, () => open(client), DENIED);
    await expectPgError(client, () => append(client, incident.incidentId, 'note', { text: 'x' }), DENIED);
    await client.query('ROLLBACK TO SAVEPOINT app');
  });

  // The grants exercised AS the production login's shape (0007 DD-3): a BYPASSRLS role that inherits `twt_service`, created inside
  // this test's transaction. The listing above says WHAT is granted; this says it is ENOUGH for the two writers — in particular
  // that the append takes no row lock (which would need an UPDATE privilege) — and no more than enough.
  it('⭐ AC4 — the writers on the service LOGIN\'s privileges (BYPASSRLS, IN ROLE twt_service): open + append succeed; ⛔ UPDATE / DELETE / TRUNCATE; the bare group sees no row', async () => {
    const { client } = getTx();
    const login = `twt_service_login_spec_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE ROLE ${login} NOLOGIN BYPASSRLS IN ROLE twt_service`);
    await client.query('SAVEPOINT svc');
    await client.query(`SET LOCAL ROLE ${login}`);
    const auditId = randomUUID();
    const opened = await open(client, { title: 'Service login', auditId });
    expect(opened.incident).toMatchObject({ title: 'Service login', isRehearsal: true, openedBy: ACTOR, openedByDisplay: 'Spec Admin' });
    const one = await append(client, opened.incident.incidentId, 'note', { text: 'first' });
    const two = await append(client, opened.incident.incidentId, 'mitigation', { measures: 'revoked a grant', status: 'implemented' });
    expect(two.entries.map((e) => e.kind)).toEqual(['note', 'mitigation']);
    expect(BigInt(two.entries[1]!.entrySeq) > BigInt(one.entries[0]!.entrySeq)).toBe(true);
    // …the reads too (SELECT is granted; BYPASSRLS passes the zero-policy FORCE RLS).
    expect((await readBreachIncident(client, opened.incident.incidentId))?.entries).toHaveLength(2);
    expect((await listBreachIncidents(client, 100)).some((i) => i.incident.incidentId === opened.incident.incidentId)).toBe(true);
    // …and no more: the grant refuses before the trigger.
    await expectPgError(client, () => client.query(`UPDATE ${INCIDENTS} SET title = 'rewritten' WHERE incident_id = $1`, [opened.incident.incidentId]), DENIED);
    await expectPgError(client, () => client.query(`DELETE FROM ${ENTRIES} WHERE incident_id = $1`, [opened.incident.incidentId]), DENIED);
    await expectPgError(client, () => client.query(`TRUNCATE ${ENTRIES}`), DENIED);
    await expectPgError(client, () => client.query(`SELECT 1 FROM ${INCIDENTS} WHERE incident_id = $1 FOR UPDATE`, [opened.incident.incidentId]), DENIED);
    await expectPgError(client, () => client.query(`SELECT 1 FROM ${INCIDENTS} WHERE incident_id = $1 FOR KEY SHARE`, [opened.incident.incidentId]), DENIED);
    // The NOLOGIN NOBYPASSRLS group alone is NOT the reader: FORCE RLS with no policy hides every row from it.
    await client.query('SET LOCAL ROLE twt_service');
    expect((await client.query(`SELECT 1 FROM ${INCIDENTS} WHERE incident_id = $1`, [opened.incident.incidentId])).rowCount).toBe(0);
    expect((await client.query(`SELECT 1 FROM ${ENTRIES}`)).rowCount).toBe(0);
    expect(await readBreachIncident(client, opened.incident.incidentId)).toBeNull();
    await client.query('ROLLBACK TO SAVEPOINT svc');
  });

  it('⭐ N3 — both tables are APPEND-ONLY for the superuser too: ⛔ UPDATE, ⛔ DELETE, ⛔ TRUNCATE (SQLSTATE 23000)', async () => {
    const { client } = getTx();
    const { incident } = await open(client);
    const { entries } = await append(client, incident.incidentId, 'note', { text: 'kept' });
    const entryId = entries[0]!.entryId;
    await expectPgError(client, () => client.query(`UPDATE ${INCIDENTS} SET title = 'rewritten' WHERE incident_id = $1`, [incident.incidentId]), APPEND_ONLY);
    await expectPgError(client, () => client.query(`UPDATE ${INCIDENTS} SET is_rehearsal = false WHERE incident_id = $1`, [incident.incidentId]), APPEND_ONLY);
    await expectPgError(client, () => client.query(`UPDATE ${ENTRIES} SET payload = '{}'::jsonb WHERE entry_id = $1`, [entryId]), APPEND_ONLY);
    await expectPgError(client, () => client.query(`DELETE FROM ${ENTRIES} WHERE entry_id = $1`, [entryId]), APPEND_ONLY);
    await expectPgError(client, () => client.query(`DELETE FROM ${INCIDENTS} WHERE incident_id = $1`, [incident.incidentId]), APPEND_ONLY);
    await expectPgError(client, () => client.query(`TRUNCATE ${ENTRIES}`), APPEND_ONLY);
    await expectPgError(client, () => client.query(`TRUNCATE ${INCIDENTS} CASCADE`), APPEND_ONLY);
    const trg = await client.query<{ tgname: string }>(
      `SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgrelid = ANY(ARRAY[$1::regclass, $2::regclass]) AND tgenabled = 'O' ORDER BY 1`,
      [INCIDENTS, ENTRIES],
    );
    expect(trg.rows.map((r) => r.tgname)).toEqual([
      'breach_incident_entries_no_truncate',
      'breach_incident_entries_no_update_delete',
      'breach_incident_entries_stamp',
      'breach_incidents_no_truncate',
      'breach_incidents_no_update_delete',
    ]);
  });

  it('⭐ the CHECKs — awareness later than `opened_at`, an unknown source or kind, title and reference bounds, a blank name, a non-object payload', async () => {
    const { client } = getTx();
    await expectPgError(client, () => open(client, { becameAwareAt: new Date(Date.now() + 60 * 60 * 1000) }), {
      code: '23514',
      constraint: 'breach_incidents_aware_before_opened_check',
    });
    await expectPgError(client, () => open(client, { detectionSource: 'made_up' as never }), { code: '23514', constraint: 'breach_incidents_detection_source_check' });
    for (const title of ['', '   ', 'x'.repeat(201)]) {
      await expectPgError(client, () => open(client, { title }), { code: '23514', constraint: 'breach_incidents_title_check' });
    }
    expect((await open(client, { title: 'x'.repeat(200) })).incident.title).toHaveLength(200);
    await expectPgError(client, () => open(client, { detectionSignalRef: 'r'.repeat(201) }), { code: '23514', constraint: 'breach_incidents_detection_signal_ref_check' });
    await expectPgError(client, () => open(client, { detectionSignalRef: '  ' }), { code: '23514', constraint: 'breach_incidents_detection_signal_ref_check' });
    const { incident } = await open(client);
    const raw = (kind: string, payload: string, display = 'Spec Admin') => () =>
      client.query(
        `INSERT INTO ${ENTRIES} (entry_id, incident_id, kind, payload, recorded_by, recorded_by_display, audit_id) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)`,
        [randomUUID(), incident.incidentId, kind, payload, ACTOR, display, randomUUID()],
      );
    await expectPgError(client, raw('made_up', '{}'), { code: '23514', constraint: 'breach_incident_entries_kind_check' });
    await expectPgError(client, raw('note', '[]'), { code: '23514', constraint: 'breach_incident_entries_payload_object_check' });
    await expectPgError(client, raw('note', '"text"'), { code: '23514', constraint: 'breach_incident_entries_payload_object_check' });
    await expectPgError(client, raw('note', '{}', '  '), { code: '23514', constraint: 'breach_incident_entries_display_check' });
    // An entry for an incident that does not exist is refused by the FK (the accessor answers "not found" before it gets here).
    await expectPgError(
      client,
      () =>
        client.query(
          `INSERT INTO ${ENTRIES} (entry_id, incident_id, kind, payload, recorded_by, recorded_by_display, audit_id) VALUES ($1, $2, 'note', '{}'::jsonb, $3, 'Spec Admin', $4)`,
          [randomUUID(), randomUUID(), ACTOR, randomUUID()],
        ),
      { code: '23503' },
    );
  });

  it('⭐ LOCKSTEP — each CHECK list is EXACTLY its domain tuple (`pg_get_constraintdef`)', async () => {
    const { client } = getTx();
    expect(await checkValues(client, 'breach_incident_entries_kind_check')).toEqual([...BREACH_ENTRY_KINDS].sort());
    expect(await checkValues(client, 'breach_incidents_detection_source_check')).toEqual([...BREACH_DETECTION_SOURCES].sort());
    expect(BREACH_ENTRY_KINDS).toHaveLength(14);
    expect(BREACH_DETECTION_SOURCES).toHaveLength(10);
  });

  it('⭐ `recorded_at` is the DB\'s clock at insert (a forged value is overwritten; it is never the transaction\'s start), and `entry_seq` cannot be written', async () => {
    const { client } = getTx();
    const { incident } = await open(client);
    const forged = await client.query<{ recorded_at: Date; tx_start: Date }>(
      `INSERT INTO ${ENTRIES} (entry_id, incident_id, kind, payload, recorded_at, recorded_by, recorded_by_display, audit_id)
       VALUES ($1, $2, 'note', '{}'::jsonb, '2999-01-01T00:00:00Z', $3, 'Spec Admin', $4) RETURNING recorded_at, now() AS tx_start`,
      [randomUUID(), incident.incidentId, ACTOR, randomUUID()],
    );
    expect(forged.rows[0]!.recorded_at.getTime()).toBeLessThan(Date.parse('2100-01-01T00:00:00Z'));
    expect(forged.rows[0]!.recorded_at.getTime()).toBeGreaterThan(forged.rows[0]!.tx_start.getTime());
    await expectPgError(
      client,
      () =>
        client.query(
          `INSERT INTO ${ENTRIES} (entry_id, entry_seq, incident_id, kind, payload, recorded_by, recorded_by_display, audit_id) VALUES ($1, 1, $2, 'note', '{}'::jsonb, $3, 'Spec Admin', $4)`,
          [randomUUID(), incident.incidentId, ACTOR, randomUUID()],
        ),
      { code: '428C9' },
    );
  });

  it('the append rules — unknown incident, nothing after `closed`, an extension must be later than the current due time; entries come back in `entry_seq` order', async () => {
    const { client } = getTx();
    await expect(append(client, randomUUID(), 'note', { text: 'x' })).rejects.toMatchObject({ code: 'breach.incident_not_found', status: 404 });
    await expect(append(client, 'not-a-uuid', 'note', { text: 'x' })).rejects.toBeInstanceOf(BreachRegisterError);
    const aware = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const { incident } = await open(client, { becameAwareAt: aware });
    const due = aware.getTime() + 72 * 60 * 60 * 1000;
    const iso = (ms: number) => new Date(ms).toISOString();
    await expect(append(client, incident.incidentId, 'board_extension_recorded', { grantedUntil: iso(due), reference: 'B-1' })).rejects.toMatchObject({
      code: 'breach.extension_not_after_due',
      status: 400,
      details: { currentDueAt: iso(due) },
    });
    await expect(append(client, incident.incidentId, 'board_extension_recorded', { reference: 'B-1' })).rejects.toMatchObject({ code: 'breach.extension_invalid', status: 400 });
    await append(client, incident.incidentId, 'board_extension_recorded', { grantedUntil: iso(due + 1000), reference: 'B-1' });
    // …the due time has moved: the same `grantedUntil` again is no longer later than it.
    await expect(append(client, incident.incidentId, 'board_extension_recorded', { grantedUntil: iso(due + 1000), reference: 'B-2' })).rejects.toMatchObject({
      code: 'breach.extension_not_after_due',
      details: { currentDueAt: iso(due + 1000) },
    });
    await append(client, incident.incidentId, 'note', { text: 'before closing' });
    const closed = await append(client, incident.incidentId, 'closed', { summary: 'done' });
    expect(closed.entries.map((e) => e.kind)).toEqual(['board_extension_recorded', 'note', 'closed']);
    for (const kind of ['note', 'closed', 'mitigation'] as const) {
      await expect(append(client, incident.incidentId, kind, { text: 'late' })).rejects.toMatchObject({ code: 'breach.incident_closed', status: 409 });
    }
    const read = await readBreachIncident(client, incident.incidentId);
    expect(read?.entries.map((e) => e.kind)).toEqual(['board_extension_recorded', 'note', 'closed']);
    expect(read?.entries.every((e) => e.recordedByDisplay === 'Spec Admin' && e.recordedBy === ACTOR)).toBe(true);
    await expect(append(client, incident.incidentId, 'note', { text: 'x' }).catch((e: unknown) => e)).resolves.toBeInstanceOf(BreachRegisterError);
  });

  it('a blank display name is refused before anything is written (open and append)', async () => {
    const { client } = getTx();
    await expect(open(client, { actorDisplay: '  ' })).rejects.toThrow(/display name/);
    const { incident } = await open(client);
    await expect(
      appendBreachEntryInTx(client, { entryId: randomUUID(), incidentId: incident.incidentId, kind: 'note', payload: { text: 'x' }, actorId: ACTOR, actorDisplay: '', auditId: randomUUID() }),
    ).rejects.toThrow(/display name/);
    expect((await readBreachIncident(client, incident.incidentId))?.entries).toEqual([]);
  });

  it('the reads — the list is newest first with a CLAMPED limit; a malformed or unknown id reads as null', async () => {
    const { client } = getTx();
    const a = await open(client, { title: 'older' });
    await client.query('SAVEPOINT later');
    const b = await open(client, { title: 'newer' });
    await append(client, b.incident.incidentId, 'note', { text: 'n' });
    const list = await listBreachIncidents(client, 100);
    const ids = list.map((i) => i.incident.incidentId);
    expect(ids).toContain(a.incident.incidentId);
    expect(ids).toContain(b.incident.incidentId);
    expect(list.find((i) => i.incident.incidentId === b.incident.incidentId)?.entries.map((e) => e.kind)).toEqual(['note']);
    for (let i = 1; i < list.length; i += 1) {
      expect(list[i - 1]!.incident.openedAt.getTime()).toBeGreaterThanOrEqual(list[i]!.incident.openedAt.getTime());
    }
    expect((await listBreachIncidents(client, 1)).length).toBe(1);
    expect((await listBreachIncidents(client, 0)).length).toBe(1);
    expect((await listBreachIncidents(client, -5)).length).toBe(1);
    expect((await listBreachIncidents(client, 100000)).length).toBeLessThanOrEqual(100);
    expect(await readBreachIncident(client, randomUUID())).toBeNull();
    expect(await readBreachIncident(client, 'nope')).toBeNull();
  });

  it('⭐ DL8 — signals: a failed, UNACKNOWLEDGED chain check is listed (an acknowledged one is not), and carries the incidents opened from it', async () => {
    const { client } = getTx();
    const failed = async (): Promise<string> => {
      const auditId = randomUUID();
      const { rows } = await client.query<{ check_id: string }>(
        `INSERT INTO audit_integrity_checks (chain_valid, start_seq, start_audit_id, end_seq, end_audit_id, first_broken_seq, first_broken_audit_id, rows_verified, verifier_actor, trigger_source)
         VALUES (false, 1, $1, 9, $1, 5, $1, 4, 'spec', 'manual') RETURNING check_id`,
        [auditId],
      );
      return rows[0]!.check_id;
    };
    const mine = await failed();
    const acked = await failed();
    await client.query(`INSERT INTO audit_integrity_acknowledgements (check_id, acknowledged_by, ticket_ref) VALUES ($1, $2, 'SPEC-1')`, [acked, ACTOR]);
    const before = await listBreachSignals(client, 50);
    const item = before.find((s) => s.checkId === mine);
    expect(item).toMatchObject({ checkId: mine, firstBrokenSeq: '5', rowsVerified: 4, incidentIds: [] });
    expect(before.some((s) => s.checkId === acked)).toBe(false);
    const { incident } = await open(client, { detectionSource: 'audit_chain_break', detectionSignalRef: mine });
    const after = await listBreachSignals(client, 50);
    expect(after.find((s) => s.checkId === mine)?.incidentIds).toEqual([incident.incidentId]);
    expect((await listBreachSignals(client, 100000)).length).toBeLessThanOrEqual(50);
  });

  it('DL9 — members on record: every lifecycle state is present, `total` leaves out `anonymized`, and the Pariwar count is distinct over the counted rows', async () => {
    const { client } = getTx();
    const before = await countMembersOnRecord(client);
    expect(Object.keys(before.byState).sort()).toEqual(
      ['active', 'active-in-grace', 'anonymized', 'lapsed-unpaid', 'lock-in', 'pending-fee', 'pending-kyc', 'pending-valid', 'withdrawn'].sort(),
    );
    const sum = Object.entries(before.byState).filter(([s]) => s !== 'anonymized').reduce((n, [, v]) => n + v, 0);
    expect(before.total).toBe(sum);
    expect(before.pariwarCount).toBeGreaterThanOrEqual(0);
    expect(before.asOf).toBeInstanceOf(Date);
  });
});
