// The 0200 write guard and CHECKs, by raw SQL — Story 13.1 (AC2; I1–I3, I6, I10). Owner role (RLS cannot answer first),
// per-test ROLLBACK. Every trigger refusal is P0001 with the direct-write PREFIX AND the refusing RULE's own text (review
// R3-12: every RAISE shares the prefix, so a prefix-only match could not tell which rule fired — with the writer flag lost,
// rule (a) would answer every guarded leg); every CHECK is 23514 BY NAME. The projector-driven legs (a real transition, I4)
// live in `projector-trigger.spec.ts`.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A } from '../_helpers.js';
import {
  DIRECT_WRITE_PREFIX,
  GUARD_OFF,
  GUARD_ON,
  RAW_INSERT_SQL,
  expectSqlRejected,
  guardedUpdate,
  rawInsertParams,
} from './_fixtures.js';

/** Each trigger rule's distinguishing text — a fragment of its RAISE message in migration 0200 (review R3-12). */
const RULE = {
  unguardedInsert: 'only the event-replay projector may create',
  unguardedUpdate: 'only the event-replay projector may update',
  genesisShape: 'a genesis INSERT must be',
  terminated: 'a terminated field worker is never updated',
  identity: 'identity is immutable',
  version: 'state_event_version must strictly increase',
  kycBackwards: 'kyc_status never goes completed -> pending',
  districtCoincides: 'a district change must not coincide',
  delete: 'a field-worker row is never deleted',
  approver: 'approved_by_display is set once', // Story 13.1a — 0201 rule (f)
} as const;

/** Run `text`, expect P0001 with the direct-write prefix and `rule`'s text; the tx stays usable (a savepoint). */
async function expectDirectWrite(client: pg.PoolClient, text: string, params: unknown[], rule: string): Promise<void> {
  await client.query('SAVEPOINT expect_direct_write');
  let caught: { code?: string; message?: string } | null = null;
  try {
    await client.query(text, params);
  } catch (e) {
    caught = e as { code?: string; message?: string };
  }
  await client.query('ROLLBACK TO SAVEPOINT expect_direct_write');
  await client.query('RELEASE SAVEPOINT expect_direct_write');
  expect(caught, `expected P0001 from: ${text}`).not.toBeNull();
  expect(caught!.code).toBe('P0001');
  expect(caught!.message).toMatch(new RegExp(`^${DIRECT_WRITE_PREFIX}`));
  expect(caught!.message, `the refusing rule for: ${text}`).toContain(rule);
}

/** A genesis row as the owner, guarded. */
async function seed(client: pg.PoolClient, district = 'Patna'): Promise<string> {
  const id = randomUUID();
  await client.query(GUARD_ON);
  await client.query(RAW_INSERT_SQL, rawInsertParams(id, PARIWAR_A, { district }));
  await client.query(GUARD_OFF);
  return id;
}

async function rowOf(client: pg.PoolClient, id: string): Promise<Record<string, unknown>> {
  return (await client.query('SELECT *, ended_on::text AS ended_on FROM field_workers WHERE field_worker_id = $1', [id])).rows[0];
}

describe.skipIf(!hasDatabase)('field_workers write guard (AC2 — I1–I3, I6, I10)', () => {
  setupLiveDb();

  it('I1: an UNGUARDED INSERT is refused — CONTROL: the same INSERT guarded succeeds', async () => {
    const { client } = getTx();
    const id = randomUUID();
    await expectDirectWrite(client, RAW_INSERT_SQL, rawInsertParams(id, PARIWAR_A), RULE.unguardedInsert);
    await client.query(GUARD_ON);
    await client.query(RAW_INSERT_SQL, rawInsertParams(id, PARIWAR_A));
    expect((await rowOf(client, id)).current_state).toBe('pending_kyc');
  });

  it('I1: an UNGUARDED UPDATE of ANY column is refused — `audit_id` alone, a projected column, an identity column', async () => {
    const { client } = getTx();
    const id = await seed(client);
    for (const set of ['audit_id = gen_random_uuid()', "kyc_status = 'completed', state_event_version = 2", "registered_by_display = 'X'"]) {
      await expectDirectWrite(client, `UPDATE field_workers SET ${set} WHERE field_worker_id = $1`, [id], RULE.unguardedUpdate);
    }
  });

  it('I3: a guarded INSERT that is not the genesis shape is refused (state, kyc, version, reason, ended_on, blank district)', async () => {
    const { client } = getTx();
    await client.query(GUARD_ON);
    const cases: [string, unknown[]][] = [
      ['state', rawInsertParams(randomUUID(), PARIWAR_A, { currentState: 'active', kycStatus: 'completed' })],
      ['kyc', rawInsertParams(randomUUID(), PARIWAR_A, { kycStatus: 'completed' })],
      ['version', rawInsertParams(randomUUID(), PARIWAR_A, { stateEventVersion: 2 })],
      ['blank district', rawInsertParams(randomUUID(), PARIWAR_A, { district: '   ' })],
    ];
    for (const [, params] of cases) await expectDirectWrite(client, RAW_INSERT_SQL, params, RULE.genesisShape);
    // A reason or an ended_on at genesis — the INSERT column list carries neither, so add them.
    await expectDirectWrite(
      client,
      RAW_INSERT_SQL.replace('district, audit_id)', 'district, audit_id, state_reason_code)').replace('$12)', "$12, 'under_review')"),
      rawInsertParams(randomUUID(), PARIWAR_A),
      RULE.genesisShape,
    );
    await expectDirectWrite(
      client,
      RAW_INSERT_SQL.replace('district, audit_id)', 'district, audit_id, ended_on)').replace('$12)', "$12, '2026-11-01')"),
      rawInsertParams(randomUUID(), PARIWAR_A),
      RULE.genesisShape,
    );
  });

  it('I2: a GUARDED UPDATE that changes an identity column is refused — name, mobile index, pariwar, display, created_at', async () => {
    const { client } = getTx();
    const id = await seed(client);
    await client.query(GUARD_ON);
    for (const set of [
      "name_ciphertext = 'enc:v1:other'",
      "mobile_blind_index = 'other-index'",
      `pariwar_id = '${randomUUID()}'`,
      "registered_by_display = 'Someone Else'",
      "created_at = now() - interval '1 day'",
    ]) {
      await expectDirectWrite(client, `UPDATE field_workers SET ${set}, state_event_version = 2 WHERE field_worker_id = $1`, [id], RULE.identity);
    }
  });

  it('I3: a guarded UPDATE with a non-increasing version is refused — CONTROL: version + 1 passes', async () => {
    const { client } = getTx();
    const id = await seed(client);
    await client.query(GUARD_ON);
    await expectDirectWrite(client, "UPDATE field_workers SET kyc_status = 'completed', state_event_version = 1 WHERE field_worker_id = $1", [id], RULE.version);
    await client.query("UPDATE field_workers SET kyc_status = 'completed', state_event_version = 2 WHERE field_worker_id = $1", [id]);
    expect((await rowOf(client, id)).kyc_status).toBe('completed');
  });

  it('I3 (d′): kyc_status never goes completed → pending, even guarded', async () => {
    const { client } = getTx();
    const id = await seed(client);
    await guardedUpdate(client, id, "kyc_status = 'completed', state_event_version = 2");
    await client.query(GUARD_ON);
    await expectDirectWrite(client, "UPDATE field_workers SET kyc_status = 'pending', state_event_version = 3 WHERE field_worker_id = $1", [id], RULE.kycBackwards);
  });

  it('I3 (e′): a district change together with a state / kyc / reason / ended_on change is refused — CONTROL: a district-only move passes', async () => {
    const { client } = getTx();
    const id = await seed(client);
    await guardedUpdate(client, id, "kyc_status = 'completed', state_event_version = 2");
    await guardedUpdate(client, id, "current_state = 'active', state_event_version = 3, approved_by_display = 'Raw Approver'");
    await client.query(GUARD_ON);
    for (const extra of [
      "current_state = 'suspended', state_reason_code = 'under_review'",
      "current_state = 'terminated', state_reason_code = 'inactive', ended_on = '2026-11-01'",
    ]) {
      await expectDirectWrite(client, `UPDATE field_workers SET district = 'Gaya', ${extra}, state_event_version = 4 WHERE field_worker_id = $1`, [id], RULE.districtCoincides);
    }
    // kyc: from a fresh pending row.
    const fresh = await seed(client);
    await client.query(GUARD_ON);
    await expectDirectWrite(client, "UPDATE field_workers SET district = 'Gaya', kyc_status = 'completed', state_event_version = 2 WHERE field_worker_id = $1", [fresh], RULE.districtCoincides);
    // CONTROL — the district alone.
    await client.query("UPDATE field_workers SET district = 'Gaya', state_event_version = 4 WHERE field_worker_id = $1", [id]);
    expect((await rowOf(client, id)).district).toBe('Gaya');
  });

  it('I6: a GUARDED UPDATE of ANY column on a TERMINATED row is refused (the trigger’s own rule)', async () => {
    const { client } = getTx();
    const id = await seed(client);
    await guardedUpdate(client, id, "current_state = 'terminated', state_reason_code = 'registered_in_error', ended_on = '2026-11-01', state_event_version = 2");
    await client.query(GUARD_ON);
    for (const set of [
      "current_state = 'pending_kyc', state_reason_code = NULL, ended_on = NULL",
      'audit_id = gen_random_uuid()',
      "district = 'Gaya'",
      'updated_at = now()',
    ]) {
      await expectDirectWrite(client, `UPDATE field_workers SET ${set}, state_event_version = 3 WHERE field_worker_id = $1`, [id], RULE.terminated);
    }
  });

  it('I10: a DELETE as the OWNER is refused by the BEFORE DELETE trigger (P0001)', async () => {
    const { client } = getTx();
    const id = await seed(client);
    await expectDirectWrite(client, 'DELETE FROM field_workers WHERE field_worker_id = $1', [id], RULE.delete);
    // ⛔ "the row survived" here (review R3-11): `expectDirectWrite` has already rolled back to its savepoint, so the row would be
    // back even had the DELETE succeeded — the P0001 with the delete rule's own text IS the proof.
  });
});

describe.skipIf(!hasDatabase)('field_workers CHECKs, by name (AC2 — 23514)', () => {
  setupLiveDb();

  async function seeded(): Promise<{ client: pg.PoolClient; id: string }> {
    const { client } = getTx();
    return { client, id: await seed(client) };
  }

  it('_active_needs_kyc: a guarded move to active while kyc is pending', async () => {
    const { client, id } = await seeded();
    await client.query(GUARD_ON);
    await expectSqlRejected(client, "UPDATE field_workers SET current_state = 'active', state_event_version = 2 WHERE field_worker_id = $1", [id], '23514', 'field_workers_active_needs_kyc');
  });

  it('_state_reason_pair: suspended without a reason; a reason on an active worker', async () => {
    const { client, id } = await seeded();
    await guardedUpdate(client, id, "kyc_status = 'completed', state_event_version = 2");
    await guardedUpdate(client, id, "current_state = 'active', state_event_version = 3, approved_by_display = 'Raw Approver'");
    await client.query(GUARD_ON);
    await expectSqlRejected(client, "UPDATE field_workers SET current_state = 'suspended', state_event_version = 4 WHERE field_worker_id = $1", [id], '23514', 'field_workers_state_reason_pair');
    await expectSqlRejected(client, "UPDATE field_workers SET state_reason_code = 'under_review', state_event_version = 4 WHERE field_worker_id = $1", [id], '23514', 'field_workers_state_reason_pair');
  });

  it('_state_reason_subset: `reassigned` stored as a suspension reason; `under_review` as a termination reason', async () => {
    const { client, id } = await seeded();
    await guardedUpdate(client, id, "kyc_status = 'completed', state_event_version = 2");
    await guardedUpdate(client, id, "current_state = 'active', state_event_version = 3, approved_by_display = 'Raw Approver'");
    await client.query(GUARD_ON);
    await expectSqlRejected(client, "UPDATE field_workers SET current_state = 'suspended', state_reason_code = 'reassigned', state_event_version = 4 WHERE field_worker_id = $1", [id], '23514', 'field_workers_state_reason_subset');
    await expectSqlRejected(client, "UPDATE field_workers SET current_state = 'terminated', state_reason_code = 'under_review', ended_on = '2026-11-01', state_event_version = 4 WHERE field_worker_id = $1", [id], '23514', 'field_workers_state_reason_subset');
  });

  it('_state_reason_subset (0203 + 0204, Story 13.1c AC6 (g)): `died` stored as a suspension reason is refused; on a terminated row it is accepted', async () => {
    const { client, id } = await seeded();
    await guardedUpdate(client, id, "kyc_status = 'completed', state_event_version = 2");
    await guardedUpdate(client, id, "current_state = 'active', state_event_version = 3, approved_by_display = 'Raw Approver'");
    await client.query(GUARD_ON);
    await expectSqlRejected(client, "UPDATE field_workers SET current_state = 'suspended', state_reason_code = 'died', state_event_version = 4 WHERE field_worker_id = $1", [id], '23514', 'field_workers_state_reason_subset');
    // CONTROL — the same row, ended `died`.
    await client.query("UPDATE field_workers SET current_state = 'terminated', state_reason_code = 'died', ended_on = '2026-11-01', state_event_version = 4 WHERE field_worker_id = $1", [id]);
    const row = await rowOf(client, id);
    expect(row.current_state).toBe('terminated');
    expect(row.state_reason_code).toBe('died');
  });

  it('_ended_on_pair: a transition to terminated without ended_on; an ended_on on a live worker', async () => {
    const { client, id } = await seeded();
    await client.query(GUARD_ON);
    await expectSqlRejected(client, "UPDATE field_workers SET current_state = 'terminated', state_reason_code = 'inactive', state_event_version = 2 WHERE field_worker_id = $1", [id], '23514', 'field_workers_ended_on_pair');
    await expectSqlRejected(client, "UPDATE field_workers SET ended_on = '2026-11-01', state_event_version = 2 WHERE field_worker_id = $1", [id], '23514', 'field_workers_ended_on_pair');
  });

  it('_district_nonblank and _registered_by_display_nonblank (a blank district moved to, a blank display at genesis)', async () => {
    const { client, id } = await seeded();
    await client.query(GUARD_ON);
    await expectSqlRejected(client, "UPDATE field_workers SET district = ' ', state_event_version = 2 WHERE field_worker_id = $1", [id], '23514', 'field_workers_district_nonblank');
    await expectSqlRejected(client, RAW_INSERT_SQL, rawInsertParams(randomUUID(), PARIWAR_A, { registeredByDisplay: '  ' }), '23514', 'field_workers_registered_by_display_nonblank');
  });

  it('the partial unique: a second LIVE worker with the same mobile index ⇒ 23505 by name; once the first is terminated, the mobile registers again', async () => {
    const { client } = getTx();
    const first = randomUUID();
    await client.query(GUARD_ON);
    await client.query(RAW_INSERT_SQL, rawInsertParams(first, PARIWAR_A, { mobileBlindIndex: 'same-mobile' }));
    await expectSqlRejected(client, RAW_INSERT_SQL, rawInsertParams(randomUUID(), PARIWAR_A, { mobileBlindIndex: 'same-mobile' }), '23505', 'field_workers_pariwar_mobile_live_uq');
    await client.query("UPDATE field_workers SET current_state = 'terminated', state_reason_code = 'registered_in_error', ended_on = '2026-11-01', state_event_version = 2 WHERE field_worker_id = $1", [first]);
    await client.query(RAW_INSERT_SQL, rawInsertParams(randomUUID(), PARIWAR_A, { mobileBlindIndex: 'same-mobile' }));
  });
});


// Story 13.1a (migration 0201; decision `-447` item 2) — the approver's display name: set ONCE, by the approval write only.
describe.skipIf(!hasDatabase)('field_workers.approved_by_display (0201 — rule (f) and two CHECKs)', () => {
  setupLiveDb();

  async function kycDone(client: pg.PoolClient): Promise<string> {
    const id = await seed(client);
    await guardedUpdate(client, id, "kyc_status = 'completed', state_event_version = 2");
    return id;
  }

  it('a genesis INSERT with an approver is refused (the genesis shape) — CONTROL: the column is NULL after a genesis', async () => {
    const { client } = getTx();
    const id = await seed(client);
    expect((await rowOf(client, id)).approved_by_display).toBeNull();
    await client.query(GUARD_ON);
    const bad = randomUUID();
    await expectDirectWrite(
      client,
      RAW_INSERT_SQL.replace('audit_id)', 'audit_id, approved_by_display)').replace('$12)', "$12, 'Too Early')"),
      rawInsertParams(bad, PARIWAR_A),
      RULE.genesisShape,
    );
  });

  it('rule (f): the approver may be set ONLY in the pending_kyc → active write — set on a kyc-only write, on a suspend, renamed or cleared ⇒ refused', async () => {
    const { client } = getTx();
    const id = await kycDone(client);
    await client.query(GUARD_ON);
    // On the kyc-only write (state stays pending_kyc) — rule (f) answers before the CHECK.
    await expectDirectWrite(client, "UPDATE field_workers SET approved_by_display = 'Early', state_event_version = 3 WHERE field_worker_id = $1", [id], RULE.approver);
    // CONTROL — the approval write sets it.
    await client.query("UPDATE field_workers SET current_state = 'active', approved_by_display = 'Meera', state_event_version = 3 WHERE field_worker_id = $1", [id]);
    expect((await rowOf(client, id)).approved_by_display).toBe('Meera');
    for (const set of ["approved_by_display = 'Renamed'", 'approved_by_display = NULL', "current_state = 'suspended', state_reason_code = 'under_review', approved_by_display = 'Other'"]) {
      await expectDirectWrite(client, `UPDATE field_workers SET ${set}, state_event_version = 4 WHERE field_worker_id = $1`, [id], RULE.approver);
    }
    // A later transition that leaves it alone passes, and keeps it.
    await client.query("UPDATE field_workers SET current_state = 'suspended', state_reason_code = 'under_review', state_event_version = 4 WHERE field_worker_id = $1", [id]);
    expect((await rowOf(client, id)).approved_by_display).toBe('Meera');
  });

  it('_approved_by_state: an activation WITHOUT an approver ⇒ 23514 by name (NOT VALID still checks every new write)', async () => {
    const { client } = getTx();
    const id = await kycDone(client);
    await client.query(GUARD_ON);
    await expectSqlRejected(client, "UPDATE field_workers SET current_state = 'active', state_event_version = 3 WHERE field_worker_id = $1", [id], '23514', 'field_workers_approved_by_state');
  });

  // CR26 — the CHECK's other two arms. The trigger's rule (f) answers first on every guarded path, so each arm is reached with
  // the triggers off (`session_replication_role = 'replica'`, the owner role), and each has its CONTROL: the same write with the
  // value the arm demands is accepted — so the refusal is the CHECK's, not a different constraint's.
  it('_approved_by_state, arm `pending_kyc ⇒ NULL`: an approver on a pending_kyc row ⇒ 23514 by name — CONTROL: NULL is accepted', async () => {
    const { client } = getTx();
    const id = await seed(client);
    await client.query("SET LOCAL session_replication_role = 'replica'");
    await expectSqlRejected(client, "UPDATE field_workers SET approved_by_display = 'Early' WHERE field_worker_id = $1", [id], '23514', 'field_workers_approved_by_state');
    // The control is that this does not throw: the row was already NULL, so reading it back would prove nothing.
    await client.query('UPDATE field_workers SET approved_by_display = NULL WHERE field_worker_id = $1', [id]);
  });

  it('_approved_by_state, arm `suspended ⇒ NOT NULL`: a suspended row without an approver ⇒ 23514 by name — CONTROL: with one it is accepted', async () => {
    const { client } = getTx();
    const id = await kycDone(client);
    await client.query("SET LOCAL session_replication_role = 'replica'");
    const suspend = "UPDATE field_workers SET current_state = 'suspended', state_reason_code = 'under_review', state_event_version = 3";
    await expectSqlRejected(client, `${suspend} WHERE field_worker_id = $1`, [id], '23514', 'field_workers_approved_by_state');
    await client.query(`${suspend}, approved_by_display = 'Meera' WHERE field_worker_id = $1`, [id]);
    expect(await rowOf(client, id)).toMatchObject({ current_state: 'suspended', approved_by_display: 'Meera' });
  });

  it('_approved_by_display_nonblank: a blank approver ⇒ 23514 by name', async () => {
    const { client } = getTx();
    const id = await kycDone(client);
    await client.query(GUARD_ON);
    await expectSqlRejected(
      client,
      "UPDATE field_workers SET current_state = 'active', approved_by_display = '   ', state_event_version = 3 WHERE field_worker_id = $1",
      [id],
      '23514',
      'field_workers_approved_by_display_nonblank',
    );
  });
});
