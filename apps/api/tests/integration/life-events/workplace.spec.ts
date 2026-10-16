// Story 6.36a (Task 4; AC3, AC3b, AC4, AC7) — the workplace routes E2E through `app.inject` (live DB). Each test mints its
// OWN Pariwar (`randomUUID()` — the handlers commit; ⛔ the fixed PARIWAR_A) and seeds a small list COMMITTED.
//   · GET …/workplaces/districts — the LISTED spellings (a retired one ⛔); `hasList: false` with ⛔ import;
//   · GET …/workplaces — the search (⛔ another Pariwar's row, ⛔ delisted); a forged cursor 400; an over-cap limit 400;
//   · POST …/posting, each arm: `workplace` (the posting's district = the WORKPLACE's, AC7), `not_listed` (the request row
//     + the posting, the event's `not_listed`, ⛔ the typed text in the event / audit / logs), `retired`, and the no-list
//     Pariwar's `district_only`;
//   · every refusal family (422, ONE code each — an unknown, a delisted and another Pariwar's workplace INDISTINGUISHABLE);
//     the schema failures (400 `request.validation`);
//   · the Idempotency-Key: required (400); a replay returns the same result and writes ⛔ a second row;
//   · a transfer ends the older open request; GET …/postings shows the history newest first.

import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';

import { ids, member as memberDomain } from '@twt/domain';
import { WORKPLACE_REFUSAL_CODES, WORKPLACE_SEARCH_TEXT_MAX_WIRE, WorkplaceKindWire, WorkplaceRequestStateWire } from '@twt/contracts';
import { describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
type Json = Record<string, unknown>;

async function seedMember(t: TestApp, pariwarId: string): Promise<string> {
  const memberId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const mid = ids.memberId(memberId);
    const pid = ids.pariwarId(pariwarId);
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.signup_initiated', actorId: memberId,
      payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
    });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.kyc_manual_fallback', actorId: memberId,
      payload: { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual', actor: 'member', reason: 'manual_fallback' },
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
  return memberId;
}

interface Listed {
  readonly pariwarId: string;
  readonly ids: Record<string, string>;
}

/** COMMITTED as the superuser: two listed spellings (+ a retired one), four schools (one delisted) and an office. */
async function seedList(t: TestApp, pariwarId = randomUUID()): Promise<Listed> {
  const batchId = randomUUID();
  await t.pool.query(
    `INSERT INTO workplace_import_batches (batch_id, pariwar_id, source_name, source_url, retrieved_on, licence, attribution, state_code)
     VALUES ($1, $2, 'fixture', 'https://example.test', '2026-10-14', 'ODC-BY-1.0', 'fixture', '10')`,
    [batchId, pariwarId],
  );
  await t.pool.query(
    `INSERT INTO workplace_districts (pariwar_id, district, status, source_batch_id) VALUES ($1, 'Gaya', 'listed', $2), ($1, 'Patna', 'listed', $2), ($1, 'Old Patna', 'retired', $2)`,
    [pariwarId, batchId],
  );
  const rows: [string, string, string, string, string | null][] = [
    ['GMS RAMPUR', 'Patna', 'school', 'listed', 'Rampur'],
    ['UPS RAMPUR TOLA', 'Patna', 'school', 'listed', 'Bakhtiyarpur'],
    ['CLOSED SCHOOL', 'Patna', 'school', 'delisted', null],
    ['GMS GAYA', 'Gaya', 'school', 'listed', null],
    ['DEO OFFICE PATNA', 'Patna', 'office', 'listed', null],
  ];
  const out: Record<string, string> = {};
  let code = 10280100100;
  for (const [name, district, kind, status, village] of rows) {
    const id = randomUUID();
    out[name] = id;
    code += 1;
    const school = kind === 'school';
    // A STAFF row carries its actor (0165's `source <> 'staff' OR created_by_actor_id IS NOT NULL` — code review round 2).
    await t.pool.query(
      `INSERT INTO workplaces (workplace_id, pariwar_id, kind, name, district, village_name, udise_school_code, block_code, source, import_batch_id, status, created_by_actor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id,
        pariwarId,
        kind,
        name,
        district,
        village,
        school ? String(code) : null,
        school ? String(code).slice(0, 6) : null,
        school ? 'import' : 'staff',
        school ? batchId : null,
        status,
        school ? null : randomUUID(),
      ],
    );
  }
  return { pariwarId, ids: out };
}

function token(t: TestApp, memberId: string, pariwarId: string): string {
  return signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
}

async function call(
  t: TestApp,
  method: 'GET' | 'POST',
  url: string,
  opts: { payload?: Json; token?: string; key?: string | null } = {},
): Promise<{ status: number; body: Json }> {
  const res = await t.app.inject({
    method,
    url,
    payload: opts.payload,
    headers: {
      origin: 'http://localhost:3001',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...(method === 'POST' && opts.key !== null ? { 'idempotency-key': opts.key ?? randomUUID() } : {}),
    },
  });
  let body: Json = {};
  try {
    body = res.json();
  } catch {
    body = {};
  }
  return { status: res.statusCode, body };
}

const POST = '/api/v1/member/life-events/posting';
const errCode = (r: { body: Json }) => (r.body.error as { code?: string } | undefined)?.code;

async function postingsOf(t: TestApp, memberId: string) {
  return (
    await t.pool.query<{ district: string; workplace_id: string | null; workplace_request_id: string | null; started_on: string | null; is_retirement: boolean }>(
      `SELECT district, workplace_id, workplace_request_id, started_on::text, is_retirement FROM member_postings WHERE member_id = $1 ORDER BY created_at, posting_id`,
      [memberId],
    )
  ).rows;
}

async function events(t: TestApp, memberId: string): Promise<Json[]> {
  return (
    await t.pool.query<{ payload: Json }>(`SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'member.posting_updated' ORDER BY event_version`, [memberId])
  ).rows.map((r) => r.payload);
}

describe.skipIf(!hasDatabase)('Story 6.36a — the workplace routes (E2E, live DB)', { timeout: 30000 }, () => {
  it('the wire vocabularies are LOCKSTEP with the domain (refusal codes, kinds, request states)', () => {
    expect([...WORKPLACE_REFUSAL_CODES]).toEqual([...memberDomain.WORKPLACE_REFUSAL_CODES]);
    expect([...WorkplaceKindWire.options]).toEqual(['school', 'office']);
    expect([...WorkplaceRequestStateWire.options]).toEqual(['pending', 'suggested', 'confirmed', 'withdrawn', 'closed']);
    // The search text's bound — the contract fronts it, the domain clamps to its twin (review 2026-10-15, R2-13).
    expect(WORKPLACE_SEARCH_TEXT_MAX_WIRE).toBe(memberDomain.WORKPLACE_SEARCH_TEXT_MAX);
  });

  it('GET …/workplaces/districts: the LISTED spellings A–Z (⛔ a retired one); `hasList: false` with ⛔ import', async () => {
    const t = await createTestApp();
    try {
      const l = await seedList(t);
      const tok = token(t, await seedMember(t, l.pariwarId), l.pariwarId);
      const r = await call(t, 'GET', '/api/v1/member/life-events/workplaces/districts', { token: tok });
      expect(r.status).toBe(200);
      expect(r.body).toEqual({ items: [{ district: 'Gaya' }, { district: 'Patna' }], nextCursor: null, hasMore: false, hasList: true });
      // [Review][Patch] 2026-10-15 — `limit` is honoured AND `hasMore` says so (it was hard-coded false).
      const page = await call(t, 'GET', '/api/v1/member/life-events/workplaces/districts?limit=1', { token: tok });
      expect(page.body).toEqual({ items: [{ district: 'Gaya' }], nextCursor: null, hasMore: true, hasList: true });
      // An exact fit (and the cap itself) is ⛔ "more".
      expect((await call(t, 'GET', '/api/v1/member/life-events/workplaces/districts?limit=2', { token: tok })).body.hasMore).toBe(false);
      expect((await call(t, 'GET', '/api/v1/member/life-events/workplaces/districts?limit=200', { token: tok })).body.hasMore).toBe(false);
      const bare = randomUUID();
      const r2 = await call(t, 'GET', '/api/v1/member/life-events/workplaces/districts', { token: token(t, await seedMember(t, bare), bare) });
      expect(r2.body).toEqual({ items: [], nextCursor: null, hasMore: false, hasList: false });
      expect((await call(t, 'GET', '/api/v1/member/life-events/workplaces/districts?limit=201', { token: tok })).status).toBe(400);
      expect((await call(t, 'GET', '/api/v1/member/life-events/workplaces/districts')).status).toBe(401);
      // The WRITE too (checklist 3 — attested, ⛔ by construction only; review R2-16).
      expect((await call(t, 'POST', POST, { payload: { choice: 'retired', district: 'Patna', startedOn: '2024-01-01' } })).status).toBe(401);
    } finally {
      await teardown(t);
    }
  });

  it("GET …/workplaces: the search (⛔ delisted, ⛔ another Pariwar's row); a forged cursor 400; an over-cap limit 400", async () => {
    const t = await createTestApp();
    try {
      const a = await seedList(t);
      await seedList(t); // another Pariwar with the same names
      const tok = token(t, await seedMember(t, a.pariwarId), a.pariwarId);
      const r = await call(t, 'GET', '/api/v1/member/life-events/workplaces?district=Patna&kind=school&q=ramp', { token: tok });
      expect(r.status).toBe(200);
      expect(r.body).toEqual({
        items: [
          { workplaceId: a.ids['GMS RAMPUR'], kind: 'school', name: 'GMS RAMPUR', district: 'Patna', villageName: 'Rampur', clusterName: null },
          { workplaceId: a.ids['UPS RAMPUR TOLA'], kind: 'school', name: 'UPS RAMPUR TOLA', district: 'Patna', villageName: 'Bakhtiyarpur', clusterName: null },
        ],
        nextCursor: null,
        hasMore: false,
      });
      const page = await call(t, 'GET', '/api/v1/member/life-events/workplaces?district=Patna&kind=school&limit=1', { token: tok });
      expect((page.body.items as unknown[]).length).toBe(1);
      expect(page.body.hasMore).toBe(true);
      const next = await call(t, 'GET', `/api/v1/member/life-events/workplaces?district=Patna&kind=school&limit=1&cursor=${page.body.nextCursor as string}`, { token: tok });
      expect((next.body.items as { name: string }[])[0]!.name).toBe('UPS RAMPUR TOLA');
      const offices = await call(t, 'GET', '/api/v1/member/life-events/workplaces?district=Patna&kind=office', { token: tok });
      expect((offices.body.items as { name: string }[]).map((i) => i.name)).toEqual(['DEO OFFICE PATNA']);
      const forged = await call(t, 'GET', '/api/v1/member/life-events/workplaces?district=Patna&kind=school&cursor=bm9wZQ', { token: tok });
      expect(forged.status).toBe(400);
      expect(errCode(forged)).toBe('workplace.cursor_invalid');
      expect((await call(t, 'GET', '/api/v1/member/life-events/workplaces?district=Patna&kind=school&limit=51', { token: tok })).status).toBe(400);
      expect((await call(t, 'GET', '/api/v1/member/life-events/workplaces?district=Patna&kind=temple', { token: tok })).status).toBe(400);
    } finally {
      await teardown(t);
    }
  });

  it('POST `workplace`: the posting\'s district is the WORKPLACE\'s (AC7); the event carries the id / kind / date; the audit the district + the choice', async () => {
    const t = await createTestApp();
    try {
      const l = await seedList(t);
      const memberId = await seedMember(t, l.pariwarId);
      const tok = token(t, memberId, l.pariwarId);
      const r = await call(t, 'POST', POST, { token: tok, payload: { choice: 'workplace', workplaceId: l.ids['GMS GAYA']!, startedOn: '2019-06-01' } });
      expect(r.status).toBe(200);
      expect(r.body.posting).toMatchObject({ recorded: true, is_retirement: false });
      expect(await postingsOf(t, memberId)).toEqual([
        { district: 'Gaya', workplace_id: l.ids['GMS GAYA'], workplace_request_id: null, started_on: '2019-06-01', is_retirement: false },
      ]);
      expect((await events(t, memberId))[0]).toMatchObject({
        district: 'Gaya',
        is_retirement: false,
        workplace_id: l.ids['GMS GAYA'],
        workplace_kind: 'school',
        started_on: '2019-06-01',
        not_listed: false,
      });
      const audit = t.auditSink.ofType('member_life_events.posting_updated').at(-1) as { context?: Json } | undefined;
      expect(audit?.context).toEqual({ district: 'Gaya', choice: 'workplace', is_retirement: false });
    } finally {
      await teardown(t);
    }
  });

  it("POST `not_listed`: the request row + the posting; ⛔ the typed text in the event, the audit or the logs", async () => {
    const logLines: string[] = [];
    const logStream = new Writable({
      write(chunk: Buffer | string, _enc, cb) {
        logLines.push(chunk.toString());
        cb();
      },
    });
    const t = await createTestApp({ logStream });
    try {
      const l = await seedList(t);
      const memberId = await seedMember(t, l.pariwarId);
      const tok = token(t, memberId, l.pariwarId);
      const TYPED = 'Shanti Niketan Vidyalaya Zxq';
      const r = await call(t, 'POST', POST, { token: tok, payload: { choice: 'not_listed', district: 'Patna', typedName: TYPED, typedPlace: 'Ward Qzx', startedOn: '2021-07-01' } });
      expect(r.status).toBe(200);
      const req = await t.pool.query<{ request_id: string; state: string; typed_name: string; typed_place: string; district: string; started_on: string }>(
        `SELECT request_id, state, typed_name, typed_place, district, started_on::text FROM workplace_requests WHERE member_id = $1`,
        [memberId],
      );
      expect(req.rows).toEqual([{ request_id: expect.any(String), state: 'pending', typed_name: TYPED, typed_place: 'Ward Qzx', district: 'Patna', started_on: '2021-07-01' }]);
      expect(await postingsOf(t, memberId)).toEqual([
        { district: 'Patna', workplace_id: null, workplace_request_id: req.rows[0]!.request_id, started_on: '2021-07-01', is_retirement: false },
      ]);
      const ev = await events(t, memberId);
      expect(ev[0]).toMatchObject({ district: 'Patna', not_listed: true, workplace_id: null, workplace_kind: null, started_on: '2021-07-01' });
      // [Review][Patch] 2026-10-15 (R2-12) — the REFUSAL paths too: a 422 (a phone number in the name) and a 400 (an extra key
      // carrying text) must not echo the typed text into the logs either — an error serializer that echoed the body would.
      const refused = await call(t, 'POST', POST, { token: tok, payload: { choice: 'not_listed', district: 'Patna', typedName: 'Kxq School 98765 43210', startedOn: '2021-07-01' } });
      expect([refused.status, errCode(refused)]).toEqual([422, 'workplace.typed_name_invalid']);
      const invalid = await call(t, 'POST', POST, { token: tok, payload: { choice: 'not_listed', district: 'Patna', typedName: 'Jxq School', startedOn: '2021-07-01', extra: 'Wxq leak' } });
      expect([invalid.status, errCode(invalid)]).toEqual([400, 'request.validation']);
      for (const needle of ['Zxq', 'Qzx', 'Kxq', 'Jxq', 'Wxq']) {
        expect(JSON.stringify(ev)).not.toContain(needle);
        expect(JSON.stringify(t.auditSink.events)).not.toContain(needle);
        expect(logLines.join('\n')).not.toContain(needle);
      }
      expect((t.auditSink.ofType('member_life_events.posting_updated').at(-1) as { context?: Json }).context).toEqual({ district: 'Patna', choice: 'not_listed', is_retirement: false });
    } finally {
      await teardown(t);
    }
  });

  it('POST `retired`: the retirement row with its date (Epic 4\'s anchor); a later transfer ends the older open request; GET …/postings newest first', async () => {
    const t = await createTestApp();
    try {
      const l = await seedList(t);
      const memberId = await seedMember(t, l.pariwarId);
      const tok = token(t, memberId, l.pariwarId);
      expect((await call(t, 'POST', POST, { token: tok, payload: { choice: 'not_listed', district: 'Patna', typedName: 'Village School', startedOn: '2015-01-01' } })).status).toBe(200);
      expect((await call(t, 'POST', POST, { token: tok, payload: { choice: 'workplace', workplaceId: l.ids['GMS RAMPUR']!, startedOn: '2018-04-01' } })).status).toBe(200);
      const st = await t.pool.query<{ state: string }>(`SELECT state FROM workplace_requests WHERE member_id = $1`, [memberId]);
      expect(st.rows.map((r) => r.state)).toEqual(['withdrawn']);
      const ret = await call(t, 'POST', POST, { token: tok, payload: { choice: 'retired', district: 'Patna', startedOn: '2024-03-31' } });
      expect(ret.status).toBe(200);
      expect(ret.body.posting).toMatchObject({ recorded: true, is_retirement: true });
      const hist = await call(t, 'GET', '/api/v1/member/life-events/postings', { token: tok });
      expect(hist.status).toBe(200);
      const items = hist.body.items as { isRetirement: boolean; startedOn: string; workplace: { name: string } | null; request: { state: string; typedName: string } | null }[];
      expect(items.map((i) => [i.isRetirement, i.startedOn, i.workplace?.name ?? null, i.request?.state ?? null])).toEqual([
        [true, '2024-03-31', null, null],
        [false, '2018-04-01', 'GMS RAMPUR', null],
        [false, '2015-01-01', null, 'withdrawn'],
      ]);
      expect(items[2]!.request!.typedName).toBe('Village School');
      expect((await call(t, 'GET', '/api/v1/member/life-events/postings?limit=101', { token: tok })).status).toBe(400);
    } finally {
      await teardown(t);
    }
  });

  it('every refusal family answers 422 with ONE code — an unknown, a delisted and another Pariwar\'s workplace INDISTINGUISHABLE', async () => {
    const t = await createTestApp();
    try {
      const l = await seedList(t);
      const other = await seedList(t);
      const memberId = await seedMember(t, l.pariwarId);
      const tok = token(t, memberId, l.pariwarId);
      const post = (payload: Json) => call(t, 'POST', POST, { token: tok, payload });
      const notFound = [
        await post({ choice: 'workplace', workplaceId: randomUUID(), startedOn: '2019-01-01' }),
        await post({ choice: 'workplace', workplaceId: l.ids['CLOSED SCHOOL']!, startedOn: '2019-01-01' }),
        await post({ choice: 'workplace', workplaceId: other.ids['GMS RAMPUR']!, startedOn: '2019-01-01' }),
      ];
      for (const r of notFound) {
        expect(r.status).toBe(422);
        expect(errCode(r)).toBe('workplace.not_found');
      }
      expect(new Set(notFound.map((r) => JSON.stringify({ ...(r.body.error as Json), request_id: null }))).size).toBe(1);
      for (const district of ['Muzaffarpur', 'Old Patna', 'patna']) {
        const r = await post({ choice: 'retired', district, startedOn: '2024-01-01' });
        expect([r.status, errCode(r)], district).toEqual([422, 'workplace.district_not_found']);
      }
      const tomorrowIst = new Date(Date.now() + 330 * 60_000 + 86_400_000).toISOString().slice(0, 10);
      for (const startedOn of [tomorrowIst, '1949-12-31', '2023-02-30']) {
        const r = await post({ choice: 'workplace', workplaceId: l.ids['GMS RAMPUR']!, startedOn });
        expect([r.status, errCode(r)], startedOn).toEqual([422, 'workplace.start_date_invalid']);
      }
      for (const typedName of ['', '   ', 'Call ९८७६५४३२१०', 'x'.repeat(121)]) {
        const r = await post({ choice: 'not_listed', district: 'Patna', typedName, startedOn: '2020-01-01' });
        expect([r.status, errCode(r)], typedName).toEqual([422, 'workplace.typed_name_invalid']);
      }
      const dOnly = await post({ choice: 'district_only', district: 'Patna' });
      expect([dOnly.status, errCode(dOnly)]).toEqual([422, 'workplace.choice_unavailable']);
      // ⛔ A refused write leaves ⛔ a row behind.
      expect(await postingsOf(t, memberId)).toEqual([]);
      expect((await t.pool.query(`SELECT 1 FROM workplace_requests WHERE member_id = $1`, [memberId])).rowCount).toBe(0);
      // Before the previous start: a posting from 2020, then one from 2019.
      expect((await post({ choice: 'workplace', workplaceId: l.ids['GMS RAMPUR']!, startedOn: '2020-01-01' })).status).toBe(200);
      const earlier = await post({ choice: 'workplace', workplaceId: l.ids['GMS GAYA']!, startedOn: '2019-12-31' });
      expect([earlier.status, errCode(earlier)]).toEqual([422, 'workplace.start_date_invalid']);
    } finally {
      await teardown(t);
    }
  });

  it('the schema failures answer 400 request.validation (an unknown choice, a non-uuid id, a date not YYYY-MM-DD, an extra key)', async () => {
    const t = await createTestApp();
    try {
      const l = await seedList(t);
      const tok = token(t, await seedMember(t, l.pariwarId), l.pariwarId);
      for (const payload of [
        { choice: 'transfer', district: 'Patna' },
        { choice: 'workplace', workplaceId: 'not-a-uuid', startedOn: '2019-01-01' },
        { choice: 'workplace', workplaceId: l.ids['GMS RAMPUR']!, startedOn: '01-06-2019' },
        { choice: 'retired', district: 'Patna', startedOn: '2024-01-01', typedName: 'x' },
        { district: 'Patna' },
      ] as Json[]) {
        const r = await call(t, 'POST', POST, { token: tok, payload });
        expect([r.status, errCode(r)], JSON.stringify(payload)).toEqual([400, 'request.validation']);
      }
    } finally {
      await teardown(t);
    }
  });

  it('the Idempotency-Key is required (400); a replay returns the same result and writes ⛔ a second row', async () => {
    const t = await createTestApp();
    try {
      const l = await seedList(t);
      const memberId = await seedMember(t, l.pariwarId);
      const tok = token(t, memberId, l.pariwarId);
      const payload = { choice: 'workplace', workplaceId: l.ids['GMS RAMPUR']!, startedOn: '2019-01-01' };
      const none = await call(t, 'POST', POST, { token: tok, payload, key: null });
      expect([none.status, errCode(none)]).toEqual([400, 'life_events.idempotency_key_required']);
      const key = randomUUID();
      const first = await call(t, 'POST', POST, { token: tok, payload, key });
      const replay = await call(t, 'POST', POST, { token: tok, payload, key });
      expect(first.status).toBe(200);
      expect(replay).toEqual(first);
      expect(await postingsOf(t, memberId)).toHaveLength(1);
      expect(await events(t, memberId)).toHaveLength(1);
      // [Review][Patch] 2026-10-15 — the claim (and its result) outlives a member's retry window: ≥ 23 h, ⛔ the 300 s that
      // let a retry of the same answer after five minutes write a second row. The result is recorded (`completed`).
      const claim = await t.pool.query<{ status: string; held_s: number }>(
        `SELECT status, EXTRACT(EPOCH FROM (expires_at - created_at))::int AS held_s FROM idempotency_keys WHERE key = $1`,
        [`life_events.posting_update:${l.pariwarId}:${memberId}:${key}`],
      );
      expect(claim.rows[0]?.status).toBe('completed');
      expect(claim.rows[0]?.held_s).toBeGreaterThanOrEqual(23 * 60 * 60);
      // A refused attempt RELEASES its key: the corrected retry with the same key goes through.
      const k2 = randomUUID();
      expect((await call(t, 'POST', POST, { token: tok, payload: { ...payload, startedOn: '2099-01-01' }, key: k2 })).status).toBe(422);
      expect((await call(t, 'POST', POST, { token: tok, payload: { ...payload, startedOn: '2020-01-01' }, key: k2 })).status).toBe(200);
    } finally {
      await teardown(t);
    }
  });

  it('the posting write is rate-limited PER MEMBER (SW8): the N+1th write of one member is 429; another member is untouched', async () => {
    // [Review][Patch] 2026-10-15 — the limit was asserted by construction only. A LOW ceiling (env override, the
    // rate-limit.spec shape); `perMemberKey` + `hook: 'preHandler'` ⇒ the bucket is the member's actorId, ⛔ the shared IP.
    const t = await createTestApp({ env: { WRITE_RATE_MAX: '2' } });
    try {
      const l = await seedList(t);
      const a = await seedMember(t, l.pariwarId);
      const b = await seedMember(t, l.pariwarId);
      const tokA = token(t, a, l.pariwarId);
      const tokB = token(t, b, l.pariwarId);
      const payload = { choice: 'retired', district: 'Patna', startedOn: '2024-01-01' };
      const codes: number[] = [];
      for (let i = 0; i < 3; i += 1) codes.push((await call(t, 'POST', POST, { token: tokA, payload })).status);
      expect(codes).toEqual([200, 200, 429]);
      expect(await postingsOf(t, a)).toHaveLength(2);
      // The other member's bucket is its own.
      expect((await call(t, 'POST', POST, { token: tokB, payload })).status).toBe(200);
      // A 429 never reached the handler: ⛔ a claim was taken, so the same key is free afterwards — ⛔ asserted here (the
      // window is a minute); the audit line proves the hook fired.
      expect(t.auditSink.ofType('rate_limit.exceeded').length).toBeGreaterThanOrEqual(1);
    } finally {
      await teardown(t);
    }
  });

  it('a Pariwar with ⛔ list: ONLY `district_only` (the free-text box — SW7); the other arms answer choice_unavailable', async () => {
    const t = await createTestApp();
    try {
      const p = randomUUID();
      const memberId = await seedMember(t, p);
      const tok = token(t, memberId, p);
      const ok = await call(t, 'POST', POST, { token: tok, payload: { choice: 'district_only', district: 'Any Spelling', isRetirement: false, startedOn: '2018-01-01' } });
      expect(ok.status).toBe(200);
      expect(await postingsOf(t, memberId)).toEqual([{ district: 'Any Spelling', workplace_id: null, workplace_request_id: null, started_on: '2018-01-01', is_retirement: false }]);
      // [Review][Patch] 2026-10-15 (R2-7) — the audit line keeps 3.9's retirement flag for the district box.
      const retiredHere = await call(t, 'POST', POST, { token: tok, payload: { choice: 'district_only', district: 'Any Spelling', isRetirement: true } });
      expect(retiredHere.status).toBe(200);
      expect((t.auditSink.ofType('member_life_events.posting_updated').at(-1) as { context?: Json }).context).toEqual({ district: 'Any Spelling', choice: 'district_only', is_retirement: true });
      for (const payload of [
        { choice: 'workplace', workplaceId: randomUUID(), startedOn: '2019-01-01' },
        { choice: 'not_listed', district: 'Any Spelling', typedName: 'X', startedOn: '2019-01-01' },
        { choice: 'retired', district: 'Any Spelling', startedOn: '2024-01-01' },
      ] as Json[]) {
        const r = await call(t, 'POST', POST, { token: tok, payload });
        expect([r.status, errCode(r)], payload.choice as string).toEqual([422, 'workplace.choice_unavailable']);
      }
    } finally {
      await teardown(t);
    }
  });
});
