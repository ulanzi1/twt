// Story 13.1a (AD10; AC6, AC7, AC8; I7, I11) — the keyset page, the sealed identity and the recorded districts, live.
// Per-test ROLLBACK. Rows are seeded as the OWNER with explicit `created_at` literals (one transaction has one `now()`, 13.1
// TR10 — an ordering assertion on default stamps would compare ties only), under the writer guard (the 0200/0201 trigger
// requires the genesis shape on INSERT, so the non-genesis states are seeded under `session_replication_role = 'replica'`,
// which the CHECKs still bind). RLS legs drop to twt_app with `enterAppScope`.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import { FieldWorkerDistrictUnknownError } from '../../../src/field-worker/errors.js';
import {
  assertDistrictRecorded,
  decodeFieldWorkerCursor,
  getFieldWorkerSealedIdentity,
  listRecordedDistricts,
  pageFieldWorkersForPariwar,
} from '../../../src/field-worker/read.js';
import { bindScopedDb } from '../../../src/db.js';
import { fieldWorkerId as toFieldWorkerId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { FieldWorkerState } from '../../../src/schema/field_workers.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope } from '../_helpers.js';

interface SeedRow {
  readonly id?: string;
  readonly state?: FieldWorkerState;
  readonly district?: string;
  /** A `timestamptz` LITERAL (⛔ a JS Date — ms only). */
  readonly createdAt: string;
}

/** Seed one worker in ANY state as the owner (replica mode skips the genesis-shape trigger; the CHECKs still hold). */
async function seedWorker(client: pg.PoolClient, pariwarId: string, r: SeedRow): Promise<string> {
  const id = r.id ?? randomUUID();
  const state = r.state ?? 'pending_kyc';
  const shape: Record<FieldWorkerState, { kyc: string; reason: string | null; endedOn: string | null; approver: string | null }> = {
    pending_kyc: { kyc: 'pending', reason: null, endedOn: null, approver: null },
    active: { kyc: 'completed', reason: null, endedOn: null, approver: 'Meera' },
    suspended: { kyc: 'completed', reason: 'under_review', endedOn: null, approver: 'Meera' },
    terminated: { kyc: 'completed', reason: 'inactive', endedOn: '2026-11-01', approver: 'Meera' },
  };
  const s = shape[state];
  await client.query("SET LOCAL session_replication_role = 'replica'");
  await client.query(
    `INSERT INTO field_workers (field_worker_id, pariwar_id, name_ciphertext, mobile_ciphertext, mobile_blind_index, registered_by_user_id,
                                registered_by_display, created_at, current_state, state_event_version, kyc_status, state_reason_code,
                                district, ended_on, audit_id, approved_by_display)
       VALUES ($1, $2, $3, 'enc:v1:mobile', $4, $5, 'Asha Verma', $6::timestamptz, $7, 1, $8, $9, $10, $11, $12, $13)`,
    [id, pariwarId, `enc:v1:name-${id}`, `idx-${id}`, randomUUID(), r.createdAt, state, s.kyc, s.reason, r.district ?? 'Patna', s.endedOn, randomUUID(), s.approver],
  );
  await client.query("SET LOCAL session_replication_role = 'origin'");
  return id;
}

/** Walk every page of `opts` with the real cursor, returning the ids in order. */
async function walk(client: pg.PoolClient, pariwarId: string, opts: { state: FieldWorkerState; district?: string; limit?: number }, between?: () => Promise<void>): Promise<string[]> {
  const db = bindScopedDb(client);
  const out: string[] = [];
  let cursor: string | null = null;
  let pages = 0;
  do {
    const page = await pageFieldWorkersForPariwar(db, toPariwarId(pariwarId), { ...opts, ...(cursor === null ? {} : { after: decodeFieldWorkerCursor(cursor) }) });
    out.push(...page.items.map((i) => i.view.fieldWorkerId));
    cursor = page.nextCursor;
    pages += 1;
    if (pages === 1 && between) await between();
    if (pages > 100) throw new Error('runaway cursor');
  } while (cursor !== null);
  return out;
}

describe.skipIf(!hasDatabase)('pageFieldWorkersForPariwar — the keyset page (AD10, AC6)', () => {
  setupLiveDb();

  it('orders created_at DESC, field_worker_id DESC — TIED stamps broken by id; the cursor walks every row EXACTLY once', async () => {
    const { client } = getTx();
    const p = randomUUID();
    const tied = '2026-11-01 09:00:00.000001+00';
    const ids: string[] = [];
    for (let i = 0; i < 7; i += 1) ids.push(await seedWorker(client, p, { createdAt: tied }));
    for (let i = 0; i < 5; i += 1) ids.push(await seedWorker(client, p, { createdAt: `2026-11-0${2 + i} 09:00:00+00` }));
    // Expected order: the five later stamps newest first, then the seven tied rows by id DESC.
    const later = ids.slice(7).reverse();
    const tiedSorted = ids.slice(0, 7).sort().reverse();
    const walked = await walk(client, p, { state: 'pending_kyc', limit: 3 });
    expect(walked).toEqual([...later, ...tiedSorted]);
    expect(new Set(walked).size).toBe(12);
  });

  it('a worker registered BETWEEN two page requests causes no skipped and no duplicated row (it is newer — it sorts before the cursor)', async () => {
    const { client } = getTx();
    const p = randomUUID();
    const ids: string[] = [];
    for (let i = 0; i < 6; i += 1) ids.push(await seedWorker(client, p, { createdAt: `2026-10-0${1 + i} 09:00:00+00` }));
    let late = '';
    const walked = await walk(client, p, { state: 'pending_kyc', limit: 2 }, async () => {
      late = await seedWorker(client, p, { createdAt: '2026-11-04 09:00:00+00' });
    });
    expect(walked).toEqual([...ids].reverse());
    expect(walked).not.toContain(late);
  });

  it('the state and district filters (byte-equal — I11); the default 20 and the ceiling 25 (a bulk-PII guard)', async () => {
    const { client } = getTx();
    const p = randomUUID();
    const patnaActive = await seedWorker(client, p, { state: 'active', createdAt: '2026-11-01 09:00:00+00' });
    await seedWorker(client, p, { state: 'active', district: 'Gaya', createdAt: '2026-11-01 09:00:01+00' });
    await seedWorker(client, p, { state: 'suspended', createdAt: '2026-11-01 09:00:02+00' });
    const db = bindScopedDb(client);
    const P = toPariwarId(p);
    expect((await pageFieldWorkersForPariwar(db, P, { state: 'active', district: 'Patna' })).items.map((i) => i.view.fieldWorkerId)).toEqual([patnaActive]);
    expect((await pageFieldWorkersForPariwar(db, P, { state: 'active', district: 'patna' })).items).toEqual([]);
    expect((await pageFieldWorkersForPariwar(db, P, { state: 'active', district: 'Patna ' })).items).toEqual([]);
    expect((await pageFieldWorkersForPariwar(db, P, { state: 'active' })).items).toHaveLength(2);
    expect((await pageFieldWorkersForPariwar(db, P, { state: 'terminated' })).items).toEqual([]);
    // The row carries the NAME ciphertext only — ⛔ the mobile, ⛔ the blind index.
    const row = (await pageFieldWorkersForPariwar(db, P, { state: 'suspended' })).items[0]!;
    expect(row.nameCiphertext).toMatch(/^enc:v1:name-/);
    expect(JSON.stringify(row)).not.toMatch(/enc:v1:mobile|idx-/);

    const many = randomUUID();
    for (let i = 0; i < 30; i += 1) await seedWorker(client, many, { createdAt: `2026-10-01 09:00:${String(i).padStart(2, '0')}+00` });
    const M = toPariwarId(many);
    const first = await pageFieldWorkersForPariwar(db, M, { state: 'pending_kyc' });
    expect(first.items).toHaveLength(20);
    expect(first.nextCursor).not.toBeNull();
    expect((await pageFieldWorkersForPariwar(db, M, { state: 'pending_kyc', limit: 500 })).items).toHaveLength(25);
    expect((await walk(client, many, { state: 'pending_kyc', limit: 25 })).length).toBe(30);
  });

  it('RLS: as twt_app scoped to A, B’s rows never appear — even with the explicit predicate naming B', async () => {
    const { client } = getTx();
    const a = randomUUID();
    const b = randomUUID();
    const mine = await seedWorker(client, a, { createdAt: '2026-11-01 09:00:00+00' });
    await seedWorker(client, b, { createdAt: '2026-11-01 09:00:00+00' });
    await enterAppScope(client, a);
    const db = bindScopedDb(client);
    expect((await pageFieldWorkersForPariwar(db, toPariwarId(a), { state: 'pending_kyc' })).items.map((i) => i.view.fieldWorkerId)).toEqual([mine]);
    expect((await pageFieldWorkersForPariwar(db, toPariwarId(b), { state: 'pending_kyc' })).items).toEqual([]);
  });
});

describe.skipIf(!hasDatabase)('the keyset query uses field_workers_pariwar_state_created_idx with NO Sort (AD10 — EXPLAIN, seeded + ANALYZE)', () => {
  setupLiveDb();

  // 20,000 rows (~625 per Pariwar and state): at ~40 rows a range the planner rightly prefers a bitmap scan + a tiny Sort (seen once
  // under the full ci:local run), so the proof seeds a volume where the ordered index scan is the plan that matters.
  it('≥ 2,000 rows (20,000) over ≥ 8 Pariwars and all four states: an index scan on the new index, no Sort node — first page AND a cursor page; a district page uses the index too', async () => {
    const { client } = getTx();
    const pariwars = Array.from({ length: 8 }, () => randomUUID());
    await client.query("SET LOCAL session_replication_role = 'replica'");
    await client.query(
      `INSERT INTO field_workers (field_worker_id, pariwar_id, name_ciphertext, mobile_ciphertext, mobile_blind_index, registered_by_user_id,
                                  registered_by_display, created_at, current_state, state_event_version, kyc_status, state_reason_code,
                                  district, ended_on, audit_id, approved_by_display)
       SELECT gen_random_uuid(), ($1::uuid[])[1 + (g % 8)], 'enc:v1:n', 'enc:v1:m', 'idx-' || g || '-' || gen_random_uuid(), gen_random_uuid(), 'Asha',
              timestamptz '2026-01-01 00:00:00+00' + (g || ' seconds')::interval,
              s.state::field_worker_state, 1,
              (CASE WHEN s.state = 'pending_kyc' THEN 'pending' ELSE 'completed' END)::field_worker_kyc_status,
              (CASE s.state WHEN 'suspended' THEN 'under_review' WHEN 'terminated' THEN 'inactive' END)::field_worker_reason_code,
              (ARRAY['Patna','Gaya','Nalanda','Siwan'])[1 + ((g / 32) % 4)],
              CASE WHEN s.state = 'terminated' THEN date '2026-11-01' END,
              gen_random_uuid(),
              CASE WHEN s.state = 'pending_kyc' THEN NULL ELSE 'Meera' END
         FROM generate_series(1, 20000) AS g
         CROSS JOIN LATERAL (SELECT (ARRAY['pending_kyc','active','suspended','terminated'])[1 + ((g / 8) % 4)] AS state) s`,
      [pariwars],
    );
    await client.query("SET LOCAL session_replication_role = 'origin'");
    await client.query('ANALYZE field_workers');
    const states = await client.query<{ n: string }>('SELECT count(DISTINCT current_state) AS n FROM field_workers WHERE pariwar_id = ANY($1)', [pariwars]);
    expect(Number(states.rows[0]!.n)).toBe(4);

    const plan = async (sql: string, params: unknown[]): Promise<string> =>
      (await client.query<{ 'QUERY PLAN': string }>(`EXPLAIN ${sql}`, params)).rows.map((r) => r['QUERY PLAN']).join('\n');
    const base = `SELECT field_worker_id FROM field_workers WHERE pariwar_id = $1 AND current_state = $2`;
    const order = ' ORDER BY created_at DESC, field_worker_id DESC LIMIT 21';
    for (const [sql, params] of [
      [base + order, [pariwars[0], 'active']],
      [base + ` AND (created_at, field_worker_id) < ($3::timestamptz, $4::uuid)` + order, [pariwars[2], 'active', '2026-01-01 04:00:00+00', randomUUID()]],
    ] as const) {
      const text = await plan(sql, [...params]);
      expect(text, text).toContain('field_workers_pariwar_state_created_idx');
      expect(text, text).not.toMatch(/\bSort\b/);
    }
    // ⚠ AD10's recorded cost: `district` is a FILTER on the index range, not an index column — the planner may answer a district
    // page with a bitmap scan of the (pariwar, state) range plus a small Sort (here ~75 rows). It still reads the new index; add
    // `district` to the index if a Pariwar outgrows that (AD10).
    const districtPlan = await plan(base + ` AND district = $3` + order, [pariwars[1], 'pending_kyc', 'Gaya']);
    expect(districtPlan, districtPlan).toContain('field_workers_pariwar_state_created_idx');
  });
});

describe.skipIf(!hasDatabase)('getFieldWorkerSealedIdentity — only while the worker is in the gate’s district (`-447` item 1)', () => {
  setupLiveDb();

  it('returns the view, both ciphertexts and the approver for the district the gate passed; null for another district, another Pariwar or an unknown id', async () => {
    const { client } = getTx();
    const p = randomUUID();
    const id = await seedWorker(client, p, { state: 'active', createdAt: '2026-11-01 09:00:00+00' });
    const db = bindScopedDb(client);
    const P = toPariwarId(p);
    const got = await getFieldWorkerSealedIdentity(db, P, toFieldWorkerId(id), { district: 'Patna' });
    expect(got).toMatchObject({ approvedByDisplay: 'Meera', nameCiphertext: `enc:v1:name-${id}`, mobileCiphertext: 'enc:v1:mobile', view: { fieldWorkerId: id, district: 'Patna', currentState: 'active' } });
    expect(got!.view).not.toHaveProperty('nameCiphertext');
    expect(await getFieldWorkerSealedIdentity(db, P, toFieldWorkerId(id), { district: 'Gaya' })).toBeNull();
    expect(await getFieldWorkerSealedIdentity(db, P, toFieldWorkerId(id), { district: 'patna' })).toBeNull();
    expect(await getFieldWorkerSealedIdentity(db, toPariwarId(randomUUID()), toFieldWorkerId(id), { district: 'Patna' })).toBeNull();
    expect(await getFieldWorkerSealedIdentity(db, P, toFieldWorkerId(randomUUID()), { district: 'Patna' })).toBeNull();
  });
});

describe.skipIf(!hasDatabase)('listRecordedDistricts — the two sources assertDistrictRecorded judges (AC8)', () => {
  setupLiveDb();

  const at = async (client: pg.PoolClient): Promise<Date> => (await client.query<{ now: Date }>('SELECT now() AS now')).rows[0]!.now;

  it('no tree: the LISTED workplace districts, sorted by UTF-16 code unit, exact bytes, retired ones out — and every one passes assertDistrictRecorded', async () => {
    const { client } = getTx();
    const p = randomUUID();
    await client.query(`INSERT INTO workplace_districts (pariwar_id, district, status) SELECT $1, d, 'listed' FROM unnest($2::text[]) AS d`, [p, ['gaya', 'Patna', 'Gaya', 'Nalanda']]);
    await client.query(`INSERT INTO workplace_districts (pariwar_id, district, status) VALUES ($1, 'Old', 'retired')`, [p]);
    const db = bindScopedDb(client);
    const now = await at(client);
    const r = await listRecordedDistricts(db, toPariwarId(p), now);
    expect(r).toEqual({ districts: ['Gaya', 'Nalanda', 'Patna', 'gaya'], truncated: false });
    for (const d of r.districts) await expect(assertDistrictRecorded(db, toPariwarId(p), d, now)).resolves.toBeUndefined();
    await expect(assertDistrictRecorded(db, toPariwarId(p), 'Old', now)).rejects.toBeInstanceOf(FieldWorkerDistrictUnknownError);
  });

  it('no tree, more than 200 listed: the first 200 and truncated = true (the screens then take an exact typed district)', async () => {
    const { client } = getTx();
    const p = randomUUID();
    const names = Array.from({ length: 205 }, (_v, i) => `D${String(i).padStart(3, '0')}`);
    await client.query(`INSERT INTO workplace_districts (pariwar_id, district, status) SELECT $1, d, 'listed' FROM unnest($2::text[]) AS d`, [p, names]);
    const db = bindScopedDb(client);
    const now = await at(client);
    const r = await listRecordedDistricts(db, toPariwarId(p), now);
    expect(r.truncated).toBe(true);
    expect(r.districts).toHaveLength(200);
    // A listed district BEYOND the first 200 is still a recorded one (exact membership, not the capped page).
    await expect(assertDistrictRecorded(db, toPariwarId(p), 'D204', now)).resolves.toBeUndefined();
  });

  it('a tree in force: its district nodes only (never the workplace list), de-duplicated, never truncated — parity with assertDistrictRecorded', async () => {
    const { client } = getTx();
    const p = randomUUID();
    await client.query(`INSERT INTO workplace_districts (pariwar_id, district, status) VALUES ($1, 'Listed Only', 'listed')`, [p]);
    await client.query(
      `INSERT INTO geo_tree_versions (pariwar_id, version, effective_at, tree_document) VALUES ($1, 1, now() - interval '1 hour', $2::jsonb)`,
      [p, JSON.stringify({ version: 1, nodes: [{ dimension: 'state', value: 'Bihar' }, { dimension: 'district', value: 'Patna', parent: 'Bihar' }, { dimension: 'district', value: 'Gaya', parent: 'Bihar' }] })],
    );
    const db = bindScopedDb(client);
    const now = await at(client);
    const r = await listRecordedDistricts(db, toPariwarId(p), now);
    expect(r).toEqual({ districts: ['Gaya', 'Patna'], truncated: false });
    for (const d of r.districts) await expect(assertDistrictRecorded(db, toPariwarId(p), d, now)).resolves.toBeUndefined();
    await expect(assertDistrictRecorded(db, toPariwarId(p), 'Listed Only', now)).rejects.toBeInstanceOf(FieldWorkerDistrictUnknownError);
  });
});
