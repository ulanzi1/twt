// The field-worker reads — Story 13.1 (AC10; QE4, QE11, QE17; TR10). Two halves:
//   1. OWN-COMMITTING (TR10): the as-of ORDERING CONTRACT needs real, separately committed transaction stamps — inside one
//      test transaction `now()` is constant. The worker's events are COMMITTED to a fresh Pariwar (cleaned up by id under
//      replica mode); every CAPTURE is seeded inside a READ transaction that ROLLS BACK, with an explicit `captured_at`
//      computed IN SQL from the events' own stamps (⛔ a JS Date — µs precision). Every instant is a capture's.
//   2. Per-test ROLLBACK: the PII-free views, the list cap, the duplicate-mobile pre-check, `assertDistrictRecorded`.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import {
  activateFieldWorker,
  recordFieldWorkerKycCompleted,
  suspendFieldWorker,
  terminateFieldWorker,
} from '../../../src/field-worker/commands.js';
import { FieldWorkerCaptureNotFoundError, FieldWorkerDistrictUnknownError } from '../../../src/field-worker/errors.js';
import {
  assertDistrictRecorded,
  findLiveFieldWorkerByMobileIndex,
  getFieldWorker,
  getFieldWorkerStateAt,
  listFieldWorkersForPariwar,
  type FieldWorkerView,
} from '../../../src/field-worker/read.js';
import { createGeoTreeVersion } from '../../../src/geo-tree/index.js';
import {
  fieldWorkerId as toFieldWorkerId,
  memberAttributionId as toCaptureId,
  pariwarId as toPariwarId,
  type FieldWorkerId,
} from '../../../src/ids/index.js';
import { DATABASE_URL, getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedMember } from '../_helpers.js';
import { approval, caught, registerReal } from './_fixtures.js';

const ACTOR = randomUUID();

describe.skipIf(!hasDatabase)('getFieldWorkerStateAt — the ordering contract (own-committing, AC10)', () => {
  const PARIWAR = randomUUID();
  const DECOY_PARIWAR = randomUUID();
  const P = toPariwarId(PARIWAR);
  let pool: pg.Pool;
  const created: string[] = [];
  const base = (id: FieldWorkerId) => ({ pariwarId: P, fieldWorkerId: id, auditId: randomUUID(), actor: 'operator' as const, actorId: ACTOR });
  /** Story 13.1a AD3 — the two approval commands take a verified `field_worker.approve` result (+ the approver's name). */
  const approve = (id: FieldWorkerId) => ({ ...base(id), ...approval(PARIWAR, 'Patna', ACTOR) });

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4, ssl: false });
    pool.on('error', (err) => console.error('[field-worker read.spec pool]', err.message));
  });

  afterAll(async () => {
    if (!pool) return;
    const admin = await pool.connect();
    try {
      await admin.query('BEGIN');
      await admin.query("SET LOCAL session_replication_role = 'replica'");
      await admin.query('DELETE FROM field_workers WHERE pariwar_id = $1 AND field_worker_id = ANY($2)', [PARIWAR, created]);
      await admin.query('DELETE FROM events_log WHERE pariwar_id = $1 AND stream_id = ANY($2)', [PARIWAR, created]);
      await admin.query('COMMIT');
    } catch (e) {
      await admin.query('ROLLBACK').catch(() => undefined);
      console.error('[field-worker read.spec] cleanup:', (e as Error).message);
    } finally {
      admin.release();
      await pool.end();
    }
  });

  /** One committed transaction, as twt_app under the Pariwar. */
  async function committed<T>(fn: (c: pg.PoolClient) => Promise<T>, client?: pg.PoolClient): Promise<T> {
    const c = client ?? (await pool.connect());
    try {
      if (!client) await c.query('BEGIN');
      await c.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(c, PARIWAR);
      const out = await fn(c);
      await c.query('COMMIT');
      return out;
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      c.release();
    }
  }

  /** The events' exact stamps as text, by version. */
  async function stamps(id: string): Promise<string[]> {
    return (await pool.query<{ t: string }>('SELECT occurred_at::text AS t FROM events_log WHERE stream_id = $1 ORDER BY event_version', [id])).rows.map((r) => r.t);
  }

  /**
   * Seed a capture in `pariwar` with `captured_at` = the SQL expression `stampSql` (e.g. `'<stamp>'::timestamptz +
   * interval '1 microsecond'`), inside a READ transaction that rolls back; run `read` against it there.
   */
  async function withCapture<T>(pariwar: string, stampSql: string, read: (captureId: string, c: pg.PoolClient) => Promise<T>): Promise<T> {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const memberId = await seedMember(bindScopedDb(c), pariwar);
      const { rows } = await c.query<{ attribution_id: string }>(
        `INSERT INTO member_attribution (member_id, pariwar_id, attribution_source, captured_at)
           VALUES ($1, $2, '123456', ${stampSql}) RETURNING attribution_id`,
        [memberId, pariwar],
      );
      return await read(rows[0]!.attribution_id, c);
    } finally {
      await c.query('ROLLBACK').catch(() => undefined);
      c.release();
    }
  }

  const at = (stamp: string, offset = '0 microseconds') => `('${stamp}'::timestamptz + interval '${offset}')`;
  const stateAt = (id: FieldWorkerId) => (captureId: string, c: pg.PoolClient) =>
    getFieldWorkerStateAt(bindScopedDb(c), P, id, { captureId: toCaptureId(captureId) });

  it('(a) the INVERSION: v3 (activated) carries an EARLIER stamp than v2 (kyc) — a capture just past v3 ⇒ pending_kyc (prefix {v1}), ⛔ active with KYC pending', async () => {
    const id = await committed((c) => registerReal(c, PARIWAR, { actorId: ACTOR }));
    created.push(id);
    // Open the SLOW transaction FIRST (its now() is fixed at its first statement)…
    const slow = await pool.connect();
    await slow.query('BEGIN');
    await slow.query('SELECT now()');
    // …commit kyc_completed from another connection (v2 — the LATER stamp)…
    await committed((c) => recordFieldWorkerKycCompleted(c, approve(id)));
    // …then activate on SLOW (v3 — the EARLIER stamp).
    await committed((c) => activateFieldWorker(c, approve(id)), slow);
    const [v1, v2, v3] = await stamps(id);
    // The precondition: the inversion really happened.
    expect((await pool.query<{ inverted: boolean }>('SELECT $1::timestamptz < $2::timestamptz AS inverted', [v3, v2])).rows[0]!.inverted).toBe(true);
    expect(v1).toBeDefined();

    const justPastV3 = await withCapture(PARIWAR, at(v3!, '1 microsecond'), stateAt(id));
    expect(justPastV3).toMatchObject({ state: 'pending_kyc', kycStatus: 'pending', version: 1 });
    const justPastV2 = await withCapture(PARIWAR, at(v2!, '1 microsecond'), stateAt(id));
    expect(justPastV2).toMatchObject({ state: 'active', kycStatus: 'completed', version: 3 });
  });

  it('(b) the TIE counts (an event stamped exactly AT the capture is included); 1 µs before it is excluded — µs order, in SQL', async () => {
    const id = await committed((c) => registerReal(c, PARIWAR, { actorId: ACTOR }));
    created.push(id);
    await committed(async (c) => {
      await recordFieldWorkerKycCompleted(c, approve(id));
      await activateFieldWorker(c, approve(id));
    });
    await committed((c) => suspendFieldWorker(c, { ...base(id), reasonCode: 'under_review' }));
    const [, , , v4] = await stamps(id);
    expect(await withCapture(PARIWAR, at(v4!), stateAt(id))).toMatchObject({ state: 'suspended', reasonCode: 'under_review' });
    expect(await withCapture(PARIWAR, at(v4!, '-1 microsecond'), stateAt(id))).toMatchObject({ state: 'active', reasonCode: null });
  });

  // CR27 (Task 1.4, I2) — the approval's two events are one transaction, so they carry ONE stamp. A cut at that stamp includes
  // BOTH (the tie counts) and a cut one microsecond before excludes BOTH: the as-of read never shows a half-approved worker
  // (`pending_kyc` with the identity check completed, or `active` with it pending).
  it('(b) the approval PAIR shares one stamp: a cut AT it sees both events, 1 µs before it sees neither — never one of them', async () => {
    const id = await committed((c) => registerReal(c, PARIWAR, { actorId: ACTOR }));
    created.push(id);
    await committed(async (c) => {
      await recordFieldWorkerKycCompleted(c, approve(id));
      await activateFieldWorker(c, approve(id));
    });
    const [v1, v2, v3] = await stamps(id);
    // The precondition: the tie really exists (one transaction ⇒ one now()), so the cut can land on it.
    expect(v2).toBeDefined();
    expect(v3).toBe(v2);
    expect(v2! > v1!).toBe(true);
    expect(await withCapture(PARIWAR, at(v2!), stateAt(id))).toMatchObject({ state: 'active', kycStatus: 'completed', version: 3 });
    expect(await withCapture(PARIWAR, at(v2!, '-1 microsecond'), stateAt(id))).toMatchObject({ state: 'pending_kyc', kycStatus: 'pending', version: 1 });
  });

  it("(c) 'now' equals the stored projection in every state", async () => {
    const id = await committed((c) => registerReal(c, PARIWAR, { actorId: ACTOR }));
    created.push(id);
    const check = async (): Promise<void> => {
      const c = await pool.connect();
      try {
        const db = bindScopedDb(c);
        const row = await getFieldWorker(db, P, id);
        const now = await getFieldWorkerStateAt(db, P, id, 'now');
        expect(now).toMatchObject({ state: row!.currentState, version: row!.stateEventVersion, kycStatus: row!.kycStatus, reasonCode: row!.stateReasonCode, district: row!.district, endedOn: row!.endedOn });
      } finally {
        c.release();
      }
    };
    await check();
    await committed((c) => recordFieldWorkerKycCompleted(c, approve(id)));
    await check();
    await committed((c) => activateFieldWorker(c, approve(id)));
    await check();
    await committed((c) => suspendFieldWorker(c, { ...base(id), reasonCode: 'at_worker_request' }));
    await check();
    const today = (await pool.query<{ d: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS d")).rows[0]!.d;
    await committed((c) => terminateFieldWorker(c, { ...base(id), reasonCode: 'inactive', endedOn: today }));
    await check();
  });

  it('(d) a capture BEFORE the genesis ⇒ pending_kyc (the worker exists); an unknown id ⇒ null; an unknown or FOREIGN capture ⇒ the typed error; a malformed one ⇒ TypeError before SQL', async () => {
    const id = await committed((c) => registerReal(c, PARIWAR, { actorId: ACTOR }));
    created.push(id);
    const [v1] = await stamps(id);
    expect(await withCapture(PARIWAR, at(v1!, '-1 second'), stateAt(id))).toMatchObject({ state: 'pending_kyc', version: 0 });
    const c = await pool.connect();
    try {
      const db = bindScopedDb(c);
      expect(await getFieldWorkerStateAt(db, P, toFieldWorkerId(randomUUID()), 'now')).toBeNull();
      expect(await caught(() => getFieldWorkerStateAt(db, P, id, { captureId: toCaptureId(randomUUID()) }))).toBeInstanceOf(FieldWorkerCaptureNotFoundError);
      for (const bad of [undefined, null, new Date(), 'later', {}, { captureId: 'not-a-uuid' }, { captureId: randomUUID(), extra: 1 }, [randomUUID()]]) {
        expect(await caught(() => getFieldWorkerStateAt(db, P, id, bad as never))).toBeInstanceOf(TypeError);
      }
    } finally {
      c.release();
    }
    // A DECOY capture in ANOTHER Pariwar, read as the OWNER role (RLS is NOT the filter here — 13.2 TR3): still refused.
    const foreign = await withCapture(DECOY_PARIWAR, at(v1!, '1 second'), (captureId, rc) =>
      caught(() => getFieldWorkerStateAt(bindScopedDb(rc), P, id, { captureId: toCaptureId(captureId) })),
    );
    expect(foreign).toBeInstanceOf(FieldWorkerCaptureNotFoundError);
  });
});

describe.skipIf(!hasDatabase)('field-worker reads (per-test ROLLBACK)', () => {
  setupLiveDb();

  it('getFieldWorker / listFieldWorkersForPariwar return a FieldWorkerView WITHOUT the three PII columns (runtime), with district and ended_on text', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await registerReal(client, PARIWAR_A, { district: 'Gaya', actorId: ACTOR });
    const db = bindScopedDb(client);
    const one = (await getFieldWorker(db, toPariwarId(PARIWAR_A), id))!;
    const list = await listFieldWorkersForPariwar(db, toPariwarId(PARIWAR_A));
    for (const view of [one, list.find((w) => w.fieldWorkerId === id)!]) {
      for (const key of ['nameCiphertext', 'mobileCiphertext', 'mobileBlindIndex']) expect(Object.keys(view)).not.toContain(key);
      expect(JSON.stringify(view)).not.toContain('enc:v1:');
      expect(view).toMatchObject({ district: 'Gaya', currentState: 'pending_kyc', endedOn: null, registeredByUserId: ACTOR });
    }
    // Type-level (review R5): `NoPii` is `never` iff none of the PII keys is a key of the view. The annotation below stops
    // COMPILING — `tsc` covers `tests/**` — the moment one is added. (An empty array assigned to the keys' union cannot fail:
    // `[]` is assignable to any array type.)
    type NoPii = Extract<keyof FieldWorkerView, 'nameCiphertext' | 'mobileCiphertext' | 'mobileBlindIndex'>;
    const noPiiKeyOnTheView: [NoPii] extends [never] ? true : false = true;
    expect(noPiiKeyOnTheView).toBe(true);
  });

  it('every read carries an explicit pariwar_id — as the OWNER role (RLS bypassed), Pariwar A’s reads never return B’s worker', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_B);
    const inB = await registerReal(client, PARIWAR_B, { mobileBlindIndex: 'shared-index', actorId: ACTOR });
    await client.query('RESET ROLE'); // the owner — RLS is NOT the filter
    const db = bindScopedDb(client);
    const A = toPariwarId(PARIWAR_A);
    expect(await getFieldWorker(db, A, inB)).toBeNull();
    expect((await listFieldWorkersForPariwar(db, A, { limit: 200 })).some((w) => w.fieldWorkerId === inB)).toBe(false);
    expect(await findLiveFieldWorkerByMobileIndex(db, A, 'shared-index')).toBeNull();
    expect(await getFieldWorkerStateAt(db, A, inB, 'now')).toBeNull();
    expect(await findLiveFieldWorkerByMobileIndex(db, toPariwarId(PARIWAR_B), 'shared-index')).toBe(inB);
  });

  it('listFieldWorkersForPariwar is capped (200) with 201 rows present, defaults to 50, and refuses a non-integer limit with RangeError (⛔ NaN dropping the LIMIT)', async () => {
    const { client } = getTx();
    const p = randomUUID();
    await enterAppScope(client, p);
    // Review R5 — ONE MORE than the cap, so `limit: 100_000` returning exactly 200 can only be the clamp (three rows proved
    // nothing: they come back whether or not a clamp exists). One set-based insert, as the projector would write them: the
    // projected columns only behind the guard trigger's writer setting. Review R2-7: the LITERAL values 200 and 50 are asserted
    // (AC10's cap and the default page) — ⛔ the exported constants, which would let the cap drift to 2000 and still pass.
    await client.query("SET LOCAL app.field_worker_state_writer = 'on'");
    await client.query(
      `INSERT INTO field_workers (field_worker_id, pariwar_id, name_ciphertext, mobile_ciphertext, mobile_blind_index, registered_by_user_id,
                                  registered_by_display, current_state, state_event_version, kyc_status, district, audit_id)
         SELECT gen_random_uuid(), $1, 'enc:v1:x', 'enc:v1:y', 'idx-' || g, $2, 'Seed', 'pending_kyc', 1, 'pending', 'Patna', gen_random_uuid()
           FROM generate_series(1, $3::int) AS g`,
      [p, ACTOR, 201],
    );
    await client.query('RESET app.field_worker_state_writer');
    const db = bindScopedDb(client);
    const P = toPariwarId(p);
    expect(await listFieldWorkersForPariwar(db, P, { limit: 100_000 })).toHaveLength(200);
    expect(await listFieldWorkersForPariwar(db, P)).toHaveLength(50);
    expect(await listFieldWorkersForPariwar(db, P, { limit: 2 })).toHaveLength(2);
    for (const limit of [Number.NaN, 1.5, Number.POSITIVE_INFINITY]) {
      expect(await caught(() => listFieldWorkersForPariwar(db, toPariwarId(p), { limit }))).toBeInstanceOf(RangeError);
    }
  });

  it('findLiveFieldWorkerByMobileIndex ignores a TERMINATED holder (the partial index’s predicate)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await registerReal(client, PARIWAR_A, { mobileBlindIndex: 'gone-index', actorId: ACTOR });
    const db = bindScopedDb(client);
    expect(await findLiveFieldWorkerByMobileIndex(db, toPariwarId(PARIWAR_A), 'gone-index')).toBe(id);
    const today = (await client.query<{ d: string }>("SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date::text AS d")).rows[0]!.d;
    await terminateFieldWorker(client, { pariwarId: toPariwarId(PARIWAR_A), fieldWorkerId: id, auditId: randomUUID(), actor: 'operator', actorId: ACTOR, reasonCode: 'registered_in_error', endedOn: today });
    expect(await findLiveFieldWorkerByMobileIndex(db, toPariwarId(PARIWAR_A), 'gone-index')).toBeNull();
  });

  it('assertDistrictRecorded: with NO tree — a LISTED workplace district passes, a retired / unknown / differently-spelt one is refused', async () => {
    const { client } = getTx();
    const p = toPariwarId(randomUUID());
    await enterAppScope(client, p);
    await client.query(`INSERT INTO workplace_districts (pariwar_id, district, status) VALUES ($1, 'Patna', 'listed'), ($1, 'Gaya', 'retired')`, [p]);
    const db = bindScopedDb(client);
    const at = (await client.query<{ now: Date }>('SELECT now() AS now')).rows[0]!.now;
    await assertDistrictRecorded(db, p, 'Patna', at);
    for (const bad of ['Gaya', 'Nalanda', 'patna', 'Patna ']) {
      expect(await caught(() => assertDistrictRecorded(db, p, bad, at)), bad).toBeInstanceOf(FieldWorkerDistrictUnknownError);
    }
  });

  it('assertDistrictRecorded: with a tree IN FORCE — only its district nodes pass (a listed workplace district outside it does not)', async () => {
    const { client } = getTx();
    const p = toPariwarId(randomUUID());
    await enterAppScope(client, p);
    await client.query(`INSERT INTO workplace_districts (pariwar_id, district, status) VALUES ($1, 'Outside', 'listed')`, [p]);
    const at = (await client.query<{ now: Date }>('SELECT now() AS now')).rows[0]!.now;
    await createGeoTreeVersion(bindScopedDb(client), {
      pariwarId: p,
      nodes: [
        { dimension: 'state', value: 'Bihar', parent_dimension: null, parent_value: null },
        { dimension: 'district', value: 'Patna', parent_dimension: 'state', parent_value: 'Bihar' },
      ],
      effectiveAt: new Date(at.getTime() - 3_600_000),
    });
    const db = bindScopedDb(client);
    await assertDistrictRecorded(db, p, 'Patna', at);
    expect(await caught(() => assertDistrictRecorded(db, p, 'Outside', at))).toBeInstanceOf(FieldWorkerDistrictUnknownError);
    expect(await caught(() => assertDistrictRecorded(db, p, 'Bihar', at))).toBeInstanceOf(FieldWorkerDistrictUnknownError); // a state node is not a district
  });
});
