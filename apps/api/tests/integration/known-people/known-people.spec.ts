// Story 6.36b — PEOPLE WHO KNOW ME, the member routes (Task 3; AC3–AC8, AC10, AC4's behaviour leg). Live DB, own-committing:
// every request runs on its own scoped connection, so the seeds COMMIT — each test mints a FRESH Pariwar.
//   · AC10: ONE 403 `known_people.not_available` on all seven routes for a non-`active` caller; ⛔ a token ⇒ 401;
//   · AC3: positions only; the caller, another Pariwar's member, ⛔ matched; the 4th request in a day ⇒ 429; a list
//     over 1,000 ⇒ 400 `request.validation` carrying ⛔ submitted value; one KMS audit line per request;
//   · AC5: 201 a new link / 200 the live one / the replay; ONE 404 `not_a_member`; 422 oneself; 400 ⛔ Idempotency-Key;
//     429 the 11th ask; 409 the re-ask rule and the cap;
//   · AC6 / AC8: the request shows the namer's registered name; accept / decline; 409 a closed request; withdraw;
//   · AC7: the namer's list — the name ONLY once accepted; remove ⇒ it leaves the named member's list;
//   · AC4: a run of planted numbers in a match and an ask — ⛔ their digits in the request / error logs, the console,
//     the audit lines, the KMS line, any row, any error body.

import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';

import { KNOWN_PEOPLE_ERROR_CODES as CODES } from '@twt/contracts';
import { encryption, kyc as kycDomain, notifications, withPariwarScope, ids } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { kmsEventToAuditInput } from '../../../src/audit/audit-log-sink.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
const BASE = '/api/v1/member/known-people';
type Json = Record<string, unknown>;

describe.skipIf(!hasDatabase)('Story 6.36b — people who know me (member routes)', { timeout: 30000 }, () => {
  let t: TestApp;
  const logLines: string[] = [];
  const kmsLines: unknown[] = [];

  beforeAll(async () => {
    const logStream = new Writable({
      write(chunk: Buffer, _enc, done) {
        logLines.push(chunk.toString('utf-8'));
        done();
      },
    });
    t = await createTestApp({ logStream });
    // Capture the batch path's KMS audit line as the sink would WRITE it (the mapping included).
    (t.deps.encryption.kms as { auditHook?: unknown }).auditHook = (op: 'computeHmac', ref: { resourceName: string }, ctx: never) => {
      kmsLines.push(kmsEventToAuditInput(op, ref, ctx));
    };
  });

  afterAll(async () => {
    await teardown(t);
  });

  /** A member of `pariwarId` in `state`, with a real identity row (blind index of `mobile`) and a KYC name, committed. */
  async function seed(pariwarId: string, opts: { state?: string; mobile: string; name: string }): Promise<string> {
    const enc = t.deps.encryption;
    const id = randomUUID();
    const canonical = encryption.normalizeMobile(opts.mobile)!;
    await t.pool.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, $3, 1)`, [id, pariwarId, opts.state ?? 'active']);
    await t.pool.query(`INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index) VALUES ($1, $2, $3, $4)`, [
      id,
      pariwarId,
      await encryption.encryptMobile(canonical, enc),
      await encryption.mobileBlindIndex(canonical, enc),
    ]);
    await t.pool.query(
      `INSERT INTO member_kyc_profiles (member_id, pariwar_id, name_ciphertext, dob_ciphertext, verification_strength, source)
       VALUES ($1, $2, $3, $4, 'aadhaar_kyc', 'digilocker')`,
      [id, pariwarId, await encryption.encryptKycField(opts.name, pariwarId, enc), await encryption.encryptKycField('1980-01-01', pariwarId, enc)],
    );
    return id;
  }

  const token = (memberId: string, pariwarId: string) => signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);

  async function call(
    method: 'GET' | 'POST',
    url: string,
    opts: { tok?: string; payload?: Json; key?: string | null } = {},
  ): Promise<{ status: number; body: Json; raw: string }> {
    const res = await t.app.inject({
      method,
      url,
      payload: opts.payload,
      headers: {
        origin: 'http://localhost:3001',
        ...(opts.tok ? { authorization: `Bearer ${opts.tok}` } : {}),
        ...(opts.key === null ? {} : { 'idempotency-key': opts.key ?? randomUUID() }),
      },
    });
    let body: Json = {};
    try {
      body = res.json();
    } catch {
      body = {};
    }
    return { status: res.statusCode, body, raw: res.body };
  }

  const code = (r: { body: Json }) => (r.body['error'] as { code?: string } | undefined)?.code;

  /** The member-to-member form for `name` in `pariwarId` (the REAL producer — ⛔ a transcribed form). */
  async function shown(pariwarId: string, name: string): Promise<string> {
    const mode = await withPariwarScope(t.pool, pariwarId, (db) => kycDomain.resolvePublicNamePresentationMode(db, ids.pariwarId(pariwarId)));
    return notifications.resolveMemberFacingDeceasedName(mode, name);
  }

  let n = 0;
  /** A fresh valid Indian mobile per call (⛔ shared across Pariwars by accident). */
  const nextMobile = () => `9${String(100000000 + (n += 1) + Math.floor(Math.random() * 1e6) * 100).slice(-9)}`;

  it('AC10 — ONE 403 known_people.not_available on EVERY route for a non-active caller; ⛔ a token ⇒ 401', async () => {
    const p = randomUUID();
    for (const state of ['pending-fee', 'lock-in', 'active-in-grace', 'withdrawn']) {
      const me = await seed(p, { state, mobile: nextMobile(), name: 'Asha Devi' });
      const tok = token(me, p);
      const link = randomUUID();
      const results = [
        await call('POST', `${BASE}/contact-matches`, { tok, payload: { numbers: ['+919876500001'] } }),
        await call('POST', BASE, { tok, payload: { mobile: '9876500001', foundBy: 'typed' } }),
        await call('GET', BASE, { tok }),
        await call('POST', `${BASE}/${link}/remove`, { tok }),
        await call('GET', `${BASE}/requests`, { tok }),
        await call('POST', `${BASE}/requests/${link}/answer`, { tok, payload: { answer: 'accept' } }),
        await call('POST', `${BASE}/requests/${link}/withdraw`, { tok }),
      ];
      for (const r of results) {
        expect(r.status, state).toBe(403);
        expect(code(r), state).toBe(CODES.notAvailable);
      }
    }
    expect((await call('GET', BASE)).status).toBe(401);
    expect((await call('POST', `${BASE}/contact-matches`, { payload: { numbers: ['1'] } })).status).toBe(401);
  });

  it('AC3 — matching: positions only; ⛔ the caller, ⛔ another Pariwar; 4th request ⇒ 429; ONE KMS audit line per request', async () => {
    const p = randomUUID();
    const other = randomUUID();
    const myMobile = nextMobile();
    const friend = nextMobile();
    const foreign = nextMobile();
    const me = await seed(p, { mobile: myMobile, name: 'Asha Devi' });
    await seed(p, { mobile: friend, name: 'Meena Kumari' });
    await seed(other, { mobile: foreign, name: 'Ravi Kumar' });
    const tok = token(me, p);
    kmsLines.length = 0;
    t.auditSink.events.length = 0;
    const r = await call('POST', `${BASE}/contact-matches`, { tok, payload: { numbers: [`+91${myMobile}`, `0${friend}`, foreign, 'abc', `+91 ${friend}`] } });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ matched: [1, 4] });
    expect(kmsLines).toHaveLength(1);
    expect((kmsLines[0] as { resourceLocator: string }).resourceLocator).toMatch(/\/member_mobile\/contact_match:n=3$/);
    expect((kmsLines[0] as { pariwarId: string }).pariwarId).toBe(p);
    const audit = t.auditSink.ofType('member_known_people.contacts_matched');
    expect(audit).toHaveLength(1);
    expect(audit[0]!.context).toEqual({ submitted: 5, checked: 3, matched: 2 });
    expect(audit[0]!.resourceLocator).toBe(`member:${me}`);
    for (let i = 0; i < 2; i += 1) expect((await call('POST', `${BASE}/contact-matches`, { tok, payload: { numbers: [friend] } })).status).toBe(200);
    const fourth = await call('POST', `${BASE}/contact-matches`, { tok, payload: { numbers: [friend] } });
    expect(fourth.status).toBe(429);
    expect(code(fourth)).toBe(CODES.dailyLimit);
  });

  it('AC3 — a list over 1,000 (or an entry over 32 characters) ⇒ 400 request.validation carrying ⛔ submitted value', async () => {
    const p = randomUUID();
    const me = await seed(p, { mobile: nextMobile(), name: 'Asha Devi' });
    const tok = token(me, p);
    const planted = '7012398765';
    for (const numbers of [Array.from({ length: 1001 }, () => `+91${planted}`), [`+91${planted}`.repeat(3)]]) {
      const r = await call('POST', `${BASE}/contact-matches`, { tok, payload: { numbers } });
      expect(r.status).toBe(400);
      expect(code(r)).toBe('request.validation');
      expect(r.raw).not.toContain(planted);
    }
  });

  it('AC5 — ask: 201 new · 200 the live one · the replay · ONE 404 · 422 self · 400 ⛔ key · 409 cooldown and cap · 429 the 11th', async () => {
    const p = randomUUID();
    const other = randomUUID();
    const myMobile = nextMobile();
    const me = await seed(p, { mobile: myMobile, name: 'Asha Devi' });
    const tok = token(me, p);
    const b = nextMobile();
    await seed(p, { mobile: b, name: 'Meena Kumari' });
    const key = randomUUID();
    const first = await call('POST', BASE, { tok, key, payload: { mobile: b, foundBy: 'contacts' } });
    expect(first.status).toBe(201);
    const link = first.body['link'] as { linkId: string; label: string; name: string | null };
    expect(link).toMatchObject({ label: 'asked', name: null });
    // the replay (SAME key) returns the original 201; a new key for the same live person ⇒ 200, the same link
    const replay = await call('POST', BASE, { tok, key, payload: { mobile: b, foundBy: 'contacts' } });
    expect(replay.status).toBe(201);
    expect(replay.body).toEqual(first.body);
    const again = await call('POST', BASE, { tok, payload: { mobile: `+91${b}`, foundBy: 'typed' } });
    expect(again.status).toBe(200);
    expect((again.body['link'] as { linkId: string }).linkId).toBe(link.linkId);
    expect((await t.pool.query(`SELECT count(*)::int AS n FROM member_known_people WHERE namer_member_id = $1`, [me])).rows[0].n).toBe(1);
    // ONE 404 for: unknown, pending, withdrawn, erased, reported dead, another Pariwar's, a non-number
    const pending = nextMobile();
    await seed(p, { state: 'pending-kyc', mobile: pending, name: 'X Y' });
    const withdrawn = nextMobile();
    await seed(p, { state: 'withdrawn', mobile: withdrawn, name: 'X Y' });
    const erased = nextMobile();
    await seed(p, { state: 'anonymized', mobile: erased, name: 'X Y' });
    const dead = nextMobile();
    const deadId = await seed(p, { mobile: dead, name: 'X Y' });
    await t.pool.query(
      `BEGIN; SET LOCAL app.claim_state_writer = 'on';
       INSERT INTO claims (claim_case_id, pariwar_id, deceased_member_id, intake_channels, current_state, state_event_version)
       VALUES ('${randomUUID()}', '${p}', '${deadId}', ARRAY['member_app']::claim_intake_channel[], 'intake_pending', 1); COMMIT;`,
    );
    const foreign = nextMobile();
    await seed(other, { mobile: foreign, name: 'X Y' });
    for (const mobile of [nextMobile(), pending, withdrawn, erased, dead, foreign, '12345']) {
      const r = await call('POST', BASE, { tok, payload: { mobile, foundBy: 'typed' } });
      expect(r.status, mobile).toBe(404);
      expect(code(r)).toBe(CODES.notAMember);
    }
    const self = await call('POST', BASE, { tok, payload: { mobile: myMobile, foundBy: 'typed' } });
    expect(self.status).toBe(422);
    expect(code(self)).toBe(CODES.self);
    const noKey = await call('POST', BASE, { tok, key: null, payload: { mobile: b, foundBy: 'typed' } });
    expect(noKey.status).toBe(400);
    expect(code(noKey)).toBe(CODES.idempotencyKeyRequired);
    // (each ask above was charged against the 10-a-day counter — start the rest of the test from zero)
    await t.pool.query(`DELETE FROM member_daily_counters WHERE member_id = $1 AND counter = 'known_people_ask'`, [me]);
    // the re-ask rule — a declined link within 60 days
    const c = nextMobile();
    const cId = await seed(p, { mobile: c, name: 'Rekha Singh' });
    await t.pool.query(
      `INSERT INTO member_known_people (pariwar_id, namer_member_id, named_member_id, found_by, state, asked_at, responded_at, ended_at)
       VALUES ($1, $2, $3, 'typed', 'declined', now() - interval '3 days', now() - interval '2 days', now() - interval '2 days')`,
      [p, me, cId],
    );
    const cooldown = await call('POST', BASE, { tok, payload: { mobile: c, foundBy: 'typed' } });
    expect(cooldown.status).toBe(409);
    expect(code(cooldown)).toBe(CODES.cannotAskNow);
    // the cap — two more live links fill it
    for (const m of [nextMobile(), nextMobile()]) {
      await seed(p, { mobile: m, name: 'Sunita Rao' });
      expect((await call('POST', BASE, { tok, payload: { mobile: m, foundBy: 'picker' } })).status).toBe(201);
    }
    const fourth = nextMobile();
    await seed(p, { mobile: fourth, name: 'Kavita Jha' });
    const capped = await call('POST', BASE, { tok, payload: { mobile: fourth, foundBy: 'picker' } });
    expect(capped.status).toBe(409);
    expect(code(capped)).toBe(CODES.limitReached);
    // the counter: 1 (cooldown) + 2 + 1 (capped) = 4 charged; then the 11th ask in the IST day ⇒ 429
    const asks = async () => (await t.pool.query(`SELECT count FROM member_daily_counters WHERE member_id = $1 AND counter = 'known_people_ask'`, [me])).rows[0]?.count;
    expect(await asks()).toBe(4);
    await t.pool.query(`UPDATE member_daily_counters SET count = 10 WHERE member_id = $1 AND counter = 'known_people_ask'`, [me]);
    const eleventh = await call('POST', BASE, { tok, payload: { mobile: fourth, foundBy: 'picker' } });
    expect(eleventh.status).toBe(429);
    expect(code(eleventh)).toBe(CODES.dailyLimit);
    expect(await asks()).toBe(10);
  });

  it('AC6 / AC7 / AC8 — the request carries the namer\'s name; accept; the namer sees the name; withdraw; remove leaves the list', async () => {
    const p = randomUUID();
    const namerMobile = nextMobile();
    const namer = await seed(p, { mobile: namerMobile, name: 'Asha Devi' });
    const namedMobile = nextMobile();
    const named = await seed(p, { mobile: namedMobile, name: 'Meena Kumari' });
    const nt = token(namer, p);
    const dt = token(named, p);
    const asked = await call('POST', BASE, { tok: nt, payload: { mobile: namedMobile, foundBy: 'contacts' } });
    const linkId = (asked.body['link'] as { linkId: string }).linkId;
    // the namer's list: `asked`, ⛔ a name
    const before = await call('GET', BASE, { tok: nt });
    expect(before.body).toEqual({ items: [expect.objectContaining({ linkId, label: 'asked', name: null })], freeSlots: 2 });
    // the named member's request: the namer's registered name, in the member-to-member form
    const reqs = await call('GET', `${BASE}/requests`, { tok: dt });
    expect(reqs.body).toEqual({ items: [expect.objectContaining({ linkId, state: 'asked', name: await shown(p, 'Asha Devi') })], nextCursor: null, hasMore: false });
    const accepted = await call('POST', `${BASE}/requests/${linkId}/answer`, { tok: dt, payload: { answer: 'accept' } });
    expect(accepted.status).toBe(200);
    expect(accepted.body).toEqual({ linkId, state: 'accepted' });
    expect(t.auditSink.ofType('member_known_people.accepted').at(-1)?.resourceLocator).toBe(`member:${namer}`);
    // answered ⇒ closed
    const again = await call('POST', `${BASE}/requests/${linkId}/answer`, { tok: dt, payload: { answer: 'decline' } });
    expect(again.status).toBe(409);
    expect(code(again)).toBe(CODES.requestClosed);
    // the namer now sees the registered name
    const after = await call('GET', BASE, { tok: nt });
    expect((after.body['items'] as Json[])[0]).toMatchObject({ linkId, label: 'accepted', name: await shown(p, 'Meena Kumari') });
    // the accepted request stays in the named member's list (the withdraw entry)
    expect(((await call('GET', `${BASE}/requests`, { tok: dt })).body['items'] as Json[]).map((i) => i['state'])).toEqual(['accepted']);
    // withdraw ⇒ the namer sees not_accepted, ⛔ a name
    expect((await call('POST', `${BASE}/requests/${linkId}/withdraw`, { tok: dt })).body).toEqual({ linkId, state: 'withdrawn' });
    expect((await call('GET', BASE, { tok: nt })).body).toEqual({ items: [expect.objectContaining({ linkId, label: 'not_accepted', name: null })], freeSlots: 3 });
    // remove: a fresh link to someone else, then removed — it leaves THAT member's list; the named member is ⛔ told
    const third = nextMobile();
    const thirdId = await seed(p, { mobile: third, name: 'Kavita Jha' });
    const l2 = ((await call('POST', BASE, { tok: nt, payload: { mobile: third, foundBy: 'typed' } })).body['link'] as { linkId: string }).linkId;
    expect((await call('POST', `${BASE}/${l2}/remove`, { tok: nt })).body).toEqual({ linkId: l2, state: 'removed' });
    expect((await call('GET', `${BASE}/requests`, { tok: token(thirdId, p) })).body).toEqual({ items: [], nextCursor: null, hasMore: false });
    // ⛔ another member's link
    const notMine = await call('POST', `${BASE}/${linkId}/remove`, { tok: dt });
    expect(notMine.status).toBe(404);
    expect(code(notMine)).toBe(CODES.notFound);
  });

  /** Flip a member's lifecycle state as the projector would (the guard admits only its writer flag) — a fixture. */
  async function setState(memberId: string, state: string): Promise<void> {
    const c = await t.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(`SET LOCAL app.member_state_writer = 'on'`);
      await c.query(`UPDATE members SET state = $2 WHERE member_id = $1`, [memberId, state]);
      await c.query('COMMIT');
    } finally {
      c.release();
    }
  }

  it('review R6 — a completed write\'s replay reaches ONLY a caller who is still active; otherwise the ONE 403', async () => {
    const p = randomUUID();
    const namer = await seed(p, { mobile: nextMobile(), name: 'Asha Devi' });
    const named = nextMobile();
    await seed(p, { mobile: named, name: 'Meena Kumari' });
    const tok = token(namer, p);
    const linkId = ((await call('POST', BASE, { tok, payload: { mobile: named, foundBy: 'typed' } })).body['link'] as { linkId: string }).linkId;
    const key = randomUUID();
    expect((await call('POST', `${BASE}/${linkId}/remove`, { tok, key })).status).toBe(200);
    expect((await call('POST', `${BASE}/${linkId}/remove`, { tok, key })).body).toEqual({ linkId, state: 'removed' }); // the replay, while active
    await setState(namer, 'active-in-grace');
    const replay = await call('POST', `${BASE}/${linkId}/remove`, { tok, key });
    expect(replay.status).toBe(403);
    expect(code(replay)).toBe(CODES.notAvailable);
    // ⛔ a key at all: still the ONE 403 (the state is checked before the key)
    const noKey = await call('POST', `${BASE}/${linkId}/remove`, { tok, key: null });
    expect(noKey.status).toBe(403);
    expect(code(noKey)).toBe(CODES.notAvailable);
  });

  it('review R2 — the namer\'s list: every live link listed and counted, whatever `limit` and the ended history', async () => {
    const p = randomUUID();
    const namer = await seed(p, { mobile: nextMobile(), name: 'Asha Devi' });
    const friend = await seed(p, { mobile: nextMobile(), name: 'Meena Kumari' });
    const decliner = await seed(p, { mobile: nextMobile(), name: 'Rekha Singh' });
    await t.pool.query(
      `INSERT INTO member_known_people (pariwar_id, namer_member_id, named_member_id, found_by, state, asked_at, responded_at)
       VALUES ($1, $2, $3, 'contacts', 'accepted', now() - interval '20 days', now() - interval '19 days')`,
      [p, namer, friend],
    );
    await t.pool.query(
      `INSERT INTO member_known_people (pariwar_id, namer_member_id, named_member_id, found_by, state, asked_at, responded_at, ended_at)
       SELECT $1, $2, $3, 'typed', 'declined', now() - make_interval(hours => 100 - i), now() - interval '1 hour', now() - interval '1 hour'
         FROM generate_series(1, 50) AS i`,
      [p, namer, decliner],
    );
    const tok = token(namer, p);
    for (const q of ['', '?limit=1']) {
      const r = await call('GET', `${BASE}${q}`, { tok });
      const items = r.body['items'] as { label: string; name: string | null }[];
      expect(items.filter((i) => i.label === 'accepted'), q).toEqual([expect.objectContaining({ label: 'accepted', name: await shown(p, 'Meena Kumari') })]);
      expect(items.filter((i) => i.label === 'not_accepted'), q).toHaveLength(q === '' ? 50 : 1);
      expect(r.body['freeSlots'], q).toBe(2);
    }
  });

  it('review R3 — the requests naming a member page by cursor: 51 accepted links, all reachable; a forged cursor ⇒ 400', async () => {
    const p = randomUUID();
    const me = await seed(p, { mobile: nextMobile(), name: 'Meena Kumari' });
    const namers = (
      await t.pool.query<{ member_id: string }>(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version)
         SELECT gen_random_uuid(), $1, 'active', 1 FROM generate_series(1, 51) RETURNING member_id`,
        [p],
      )
    ).rows.map((r) => r.member_id);
    await t.pool.query(
      `INSERT INTO member_known_people (pariwar_id, namer_member_id, named_member_id, found_by, state, asked_at, responded_at)
       SELECT $1, n, $2, 'contacts', 'accepted', now() - make_interval(hours => o::int), now() - make_interval(hours => o::int) + interval '1 minute'
         FROM unnest($3::uuid[]) WITH ORDINALITY AS t(n, o)`,
      [p, me, namers],
    );
    const tok = token(me, p);
    const first = await call('GET', `${BASE}/requests`, { tok });
    expect(first.status).toBe(200);
    expect(first.body['items']).toHaveLength(50);
    expect(first.body['hasMore']).toBe(true);
    const cursor = first.body['nextCursor'] as string;
    expect(typeof cursor).toBe('string');
    const second = await call('GET', `${BASE}/requests?cursor=${encodeURIComponent(cursor)}`, { tok });
    expect(second.status).toBe(200); // the server's own cursor passes its own contract
    expect(second.body).toMatchObject({ hasMore: false, nextCursor: null });
    const ids = [...(first.body['items'] as { linkId: string }[]), ...(second.body['items'] as { linkId: string }[])].map((i) => i.linkId);
    const all = (await t.pool.query<{ link_id: string }>(`SELECT link_id FROM member_known_people WHERE named_member_id = $1 ORDER BY asked_at DESC`, [me])).rows;
    expect(ids).toEqual(all.map((r) => r.link_id)); // every one, newest first, ⛔ a duplicate
    // the oldest — absent from the first page — can be withdrawn
    const oldest = all.at(-1)!.link_id;
    expect((await call('POST', `${BASE}/requests/${oldest}/withdraw`, { tok })).body).toEqual({ linkId: oldest, state: 'withdrawn' });
    // a cursor this server did not issue ⇒ 400 (⛔ a 500 from the cast); a non-active caller still gets the ONE 403
    const forged = Buffer.from(JSON.stringify(['open', '2026-02-30T10:00:00.000000Z', randomUUID()]), 'utf8').toString('base64url');
    const bad = await call('GET', `${BASE}/requests?cursor=${forged}`, { tok });
    expect(bad.status).toBe(400);
    expect(code(bad)).toBe(CODES.cursorInvalid);
    await setState(me, 'withdrawn');
    const denied = await call('GET', `${BASE}/requests?cursor=${forged}`, { tok });
    expect(denied.status).toBe(403);
    expect(code(denied)).toBe(CODES.notAvailable);
  });

  it('AC4 — planted numbers in a match and an ask: ⛔ their digits in any log, console line, audit line, KMS line, row or error body', async () => {
    const p = randomUUID();
    const me = await seed(p, { mobile: nextMobile(), name: 'Asha Devi' });
    const tok = token(me, p);
    const memberNumber = nextMobile();
    await seed(p, { mobile: memberNumber, name: 'Meena Kumari' });
    const planted = ['7012345601', '8123456702', '6234567803', '9345678904'];
    const forms = (d: string) => [d, `+91${d}`, `+91 ${d.slice(0, 5)} ${d.slice(5)}`, `0${d}`];
    const consoleSpy = [vi.spyOn(console, 'log'), vi.spyOn(console, 'error'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'info')];
    logLines.length = 0;
    kmsLines.length = 0;
    t.auditSink.events.length = 0;
    const bodies: string[] = [];
    try {
      bodies.push((await call('POST', `${BASE}/contact-matches`, { tok, payload: { numbers: [...planted.flatMap(forms), memberNumber] } })).raw);
      for (const d of planted) bodies.push((await call('POST', BASE, { tok, payload: { mobile: `+91 ${d}`, foundBy: 'typed' } })).raw); // 404s
      bodies.push((await call('POST', BASE, { tok, payload: { mobile: memberNumber, foundBy: 'contacts' } })).raw); // 201
      bodies.push((await call('POST', `${BASE}/contact-matches`, { tok, payload: { numbers: Array.from({ length: 1001 }, () => planted[0]!) } })).raw); // 400
      bodies.push((await call('POST', BASE, { tok, payload: { mobile: planted[1]!.repeat(4), foundBy: 'typed' } })).raw); // 400
    } finally {
      for (const s of consoleSpy) s.mockRestore();
    }
    const rows = await t.pool.query(
      `SELECT row_to_json(k)::text AS j FROM member_known_people k WHERE pariwar_id = $1
       UNION ALL SELECT row_to_json(c)::text FROM member_daily_counters c WHERE pariwar_id = $1
       UNION ALL SELECT row_to_json(c)::text FROM pariwar_daily_counters c WHERE pariwar_id = $1`,
      [p],
    );
    expect(rows.rows.length).toBeGreaterThan(0); // positive control — the sources were captured
    expect(logLines.length).toBeGreaterThan(0);
    expect(t.auditSink.events.length).toBeGreaterThan(0);
    expect(kmsLines.length).toBeGreaterThan(0);
    const haystacks: [string, string][] = [
      ['request/error logs', logLines.join('\n')],
      ['console', consoleSpy.flatMap((s) => s.mock.calls.map((c) => JSON.stringify(c))).join('\n')],
      ['audit lines', JSON.stringify(t.auditSink.events)],
      ['KMS lines', JSON.stringify(kmsLines)],
      ['rows', rows.rows.map((r: { j: string }) => r.j).join('\n')],
      ['error bodies', bodies.join('\n')],
    ];
    for (const d of [...planted, memberNumber]) {
      for (const [where, text] of haystacks) {
        expect(text.includes(d), `${d} in ${where}`).toBe(false);
        expect(text.includes(`${d.slice(0, 5)} ${d.slice(5)}`), `${d} (spaced) in ${where}`).toBe(false);
      }
    }
  });
});
