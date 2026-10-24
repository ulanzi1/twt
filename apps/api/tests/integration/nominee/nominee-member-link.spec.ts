// Story 6.36e — A NOMINEE WHO IS ALSO A MEMBER, the member routes (Task 3; AC3, AC4, AC9). Live DB, own-committing: every
// request runs on its own scoped connection, so the seeds COMMIT — each test mints a FRESH Pariwar (and a fresh declarer, so
// the 4-a-day `nominee_link_resolve` counter starts at zero).
//   · AC3 — the declare (`POST /api/v1/member/life-events/nominees`): a new mark; a KEEP on the same rank (the answer,
//     `responded_at`, `asked_at` carried, ⛔ re-asked; the old row `redeclared`); a keep moved to the other rank (a swap — ⛔
//     409); a rank given a new mark / vacated / re-saved without; a `confirmed` mark re-saved without ⇒ ended, ⛔ 500 (V1);
//     a stale keep ⇒ 409; every unresolvable mark AND a caller-gate refusal ⇒ the SAME 422 body; duplicate ⇒ 422; the 5th
//     new mark in an IST day ⇒ 429 with ⛔ KMS call (V2); an `active-in-grace` declarer's keep and plain re-save (V11); the
//     SIGNUP route — a mark ⇒ 400 with ⛔ KMS call and ⛔ write, a plain re-save ENDS a live mark (NE4, V20); a locked
//     declaration ⇒ 409 and ⛔ link row; a failure AFTER the insert rolls the whole save back. ⚠ The answer racing a carry
//     (two connections) is the domain's `member-links-concurrency.spec.ts` — the handler adds nothing between the lock and
//     the carry.
//   · AC4 — the marked member: the request names the declarer (the registered name); "Yes, that's me" ⇒ the declarer sees
//     `confirmed` + the name; "No" ⇒ `not_me`, ⛔ name; ONE answer (409 the second; the replay returns the first); another
//     member's mark ⇒ 404; a declarer named by a claim ⇒ ⛔ listed and 409; a non-answerer ⇒ the ONE 403; ⛔ key ⇒ 400.
//   · AC9 — a planted mark number: ⛔ its digits in a log line, an audit line, the KMS line or an error body; the audit
//     lines carry `nominee_link:<id>` + `{ rank }` only.

import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';

import { NOMINEE_LINK_ERROR_CODES as CODES } from '@twt/contracts';
import { claim, encryption, ids, kyc as kycDomain, member as memberDomain, notifications, withPariwarScope } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { kmsEventToAuditInput } from '../../../src/audit/audit-log-sink.js';
import * as memberAuthRepo from '../../../src/modules/auth/member/member-auth.repo.js';
import { signAccessToken, signPariwarSelect, signSignupContinuation } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
const LIFE_EVENTS = '/api/v1/member/life-events/nominees';
const SIGNUP = '/api/v1/member/nominees';
const LINKS = '/api/v1/member/life-events/nominee-links';
const REQUESTS = '/api/v1/member/nominee-links/requests';
type Json = Record<string, unknown>;
type Mark = { kind: 'new'; mobile: string; foundBy: 'contacts' | 'picker' | 'typed' } | { kind: 'keep'; linkId: string };
type LinkRow = { link_id: string; rank: number; state: string; answer: string | null; end_reason: string | null; carried_from_link_id: string | null; asked_at: Date; responded_at: Date | null };

describe.skipIf(!hasDatabase)('Story 6.36e — a nominee who is also a member (member routes)', { timeout: 60000 }, () => {
  let t: TestApp;
  const logLines: string[] = [];
  const kmsLines: { action: string; resourceLocator: string }[] = [];
  /** The HMAC lines only — a declare also encrypts the nominee's fields (their own KMS lines, ⛔ the mark's). */
  const hmacLines = () => kmsLines.filter((l) => l.action === 'kms.compute_hmac');

  beforeAll(async () => {
    const logStream = new Writable({
      write(chunk: Buffer, _enc, done) {
        logLines.push(chunk.toString('utf-8'));
        done();
      },
    });
    t = await createTestApp({ logStream });
    (t.deps.encryption.kms as { auditHook?: unknown }).auditHook = (op: 'computeHmac', ref: { resourceName: string }, ctx: never) => {
      kmsLines.push(kmsEventToAuditInput(op, ref, ctx) as { action: string; resourceLocator: string });
    };
  });

  afterAll(async () => {
    await teardown(t);
  });

  async function inScope<T>(pariwarId: string, fn: (s: Awaited<ReturnType<typeof openScopeTx>>) => Promise<T>): Promise<T> {
    const scopeTx = await openScopeTx(t.deps, pariwarId);
    try {
      const out = await fn(scopeTx);
      await closeScopeTx(scopeTx, true);
      return out;
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
  }

  /** A DECLARER walked through the real lifecycle events to `to` (the declare reads the event stream), elevated for `nominee_change`. */
  async function declarer(pariwarId: string, to: 'active' | 'active-in-grace' | 'pending-fee' = 'active'): Promise<string> {
    const memberId = randomUUID();
    await inScope(pariwarId, async (s) => {
      const step = (eventType: string, payload: Json, actorId: string | null = memberId) =>
        memberDomain.projectMemberState(s.client, {
          memberId: ids.memberId(memberId),
          pariwarId: ids.pariwarId(pariwarId),
          eventType: eventType as never,
          payload: payload as never,
          actorId,
        });
      await step('member.signup_initiated', { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' });
      await step('member.kyc_manual_fallback', { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual', actor: 'member', reason: 'manual_fallback' });
      if (to === 'pending-fee') return;
      await step('member.vyawastha_shulk_paid', { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'payment', actor: 'member', utr: 'TEST-UTR-636E', amount_inr: 1000 });
      await step('member.lock_in_expired', { from_state: 'lock-in', to_state: 'active', trigger: 'lock_in_expiry', actor: 'system', kyc_verified: true }, null);
      if (to === 'active-in-grace') {
        await step('member.grace_entered', { from_state: 'active', to_state: 'active-in-grace', trigger: 'grace_entered', actor: 'system' }, null);
      }
    });
    await memberAuthRepo.insertElevation(t.deps.pool, { memberId, actionContext: 'nominee_change', elevatedUntil: new Date(Date.now() + 10 * 60 * 1000) });
    return memberId;
  }

  /** Move a seeded declarer into grace (a real event — the caller gate reads `members.state`, the declare the stream). */
  async function enterGrace(pariwarId: string, memberId: string): Promise<void> {
    await inScope(pariwarId, (s) =>
      memberDomain.projectMemberState(s.client, {
        memberId: ids.memberId(memberId),
        pariwarId: ids.pariwarId(pariwarId),
        eventType: 'member.grace_entered',
        payload: { from_state: 'active', to_state: 'active-in-grace', trigger: 'grace_entered', actor: 'system' },
        actorId: null,
      }),
    );
  }

  /** A member of `pariwarId` in `state`, with a real identity row (the blind index of `mobile`) and a KYC name, committed. */
  async function member(pariwarId: string, opts: { state?: string; mobile: string; name: string; id?: string }): Promise<string> {
    const enc = t.deps.encryption;
    const id = opts.id ?? randomUUID();
    const canonical = encryption.normalizeMobile(opts.mobile)!;
    if (!opts.id) {
      await t.pool.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, $3, 1)`, [id, pariwarId, opts.state ?? 'active']);
    }
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

  /** File a claim naming `deceasedMemberId` (the claim row + `claim.intake_initiated`) — the "reported dead" predicate. */
  async function fileClaim(pariwarId: string, deceasedMemberId: string): Promise<void> {
    await inScope(pariwarId, (s) =>
      claim.projectClaimState(s.client, {
        claimCaseId: ids.claimId(randomUUID()),
        pariwarId: ids.pariwarId(pariwarId),
        deceasedMemberId: ids.memberId(deceasedMemberId),
        intakeChannels: ['helpline'],
        claimantActorId: null,
        eventType: 'claim.intake_initiated',
        payload: {
          from_state: null,
          to_state: 'intake_pending',
          trigger: 'seed',
          actor: 'system',
          deceased_member_id: deceasedMemberId,
          intake_channel: 'helpline',
          claimant_actor_id: null,
        },
        actorId: null,
      }),
    );
  }

  /** The member-to-member form for `name` in `pariwarId` (the REAL producer — ⛔ a transcribed form). */
  async function shown(pariwarId: string, name: string): Promise<string> {
    const mode = await withPariwarScope(t.pool, pariwarId, (db) => kycDomain.resolvePublicNamePresentationMode(db, ids.pariwarId(pariwarId)));
    return notifications.resolveMemberFacingDeceasedName(mode, name);
  }

  const token = (memberId: string, pariwarId: string) => signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);

  async function call(method: 'GET' | 'POST', url: string, opts: { tok?: string; payload?: Json; key?: string | null } = {}) {
    const res = await t.app.inject({
      method,
      url,
      payload: opts.payload,
      headers: {
        origin: 'http://localhost:3001',
        ...(opts.tok ? { authorization: `Bearer ${opts.tok}` } : {}),
        ...(opts.key === null || opts.key === undefined ? {} : { 'idempotency-key': opts.key }),
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
  /** The error envelope WITHOUT its per-request id — two refusals are "the same body" when this is equal. */
  const sameBody = (r: { body: Json }) => {
    const rest = { ...((r.body['error'] ?? {}) as Json) };
    delete rest['request_id'];
    return rest;
  };

  /** A declare body: one entry per mark (`null` ⇒ ⛔ mark on that rank). */
  const body = (...marks: (Mark | null)[]): Json => ({
    nominees: marks.map((m, i) => ({
      name: i === 0 ? 'Asha Devi' : 'Ravi Kumar',
      relationship: i === 0 ? 'spouse' : 'son',
      mobile: i === 0 ? '9876543210' : '9988776655',
      ...(m === null ? {} : { memberLink: m }),
    })),
  });
  const mark = (mobile: string, foundBy: 'contacts' | 'picker' | 'typed' = 'contacts'): Mark => ({ kind: 'new', mobile, foundBy });
  const keep = (linkId: string): Mark => ({ kind: 'keep', linkId });

  async function links(declarerId: string): Promise<LinkRow[]> {
    const r = await t.pool.query<LinkRow>(
      `SELECT link_id, rank, state, answer, end_reason, carried_from_link_id, asked_at, responded_at
         FROM member_nominee_links WHERE declarer_member_id = $1 ORDER BY asked_at, link_id`,
      [declarerId],
    );
    return r.rows;
  }
  const live = async (declarerId: string) => (await links(declarerId)).filter((l) => l.state === 'live');

  let n = 0;
  /** A fresh valid Indian mobile per call (⛔ shared across Pariwars by accident). */
  const nextMobile = () => `9${String(100000000 + (n += 1) + Math.floor(Math.random() * 1e6) * 100).slice(-9)}`;

  // ── AC3 — the declare ──────────────────────────────────────────────────────────────────────────────────────────────

  it('AC3 — a NEW mark: one live `asked` link on the rank; the declarer reads it; ONE KMS line; the audit line is `nominee_link:<id>` + `{ rank }`', async () => {
    const p = randomUUID();
    const d = await declarer(p);
    await member(p, { mobile: nextMobile(), name: 'Someone Else' }); // a second eligible member — the mark resolves to ONE
    const mobile = nextMobile();
    const b2 = await member(p, { mobile, name: 'Meena Kumari' });
    const tok = token(d, p);
    kmsLines.length = 0;
    t.auditSink.events.length = 0;
    const r = await call('POST', LIFE_EVENTS, { tok, payload: body(mark(`+91 ${mobile}`)) });
    expect(r.status, r.raw).toBe(200);
    const rows = await live(d);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ rank: 1, answer: null, carried_from_link_id: null });
    expect((await t.pool.query(`SELECT nominee_member_id FROM member_nominee_links WHERE link_id = $1`, [rows[0]!.link_id])).rows[0]).toEqual({ nominee_member_id: b2 });
    expect(hmacLines()).toHaveLength(1);
    expect(hmacLines()[0]!.resourceLocator).toMatch(/\/member_mobile\/nominee_link_resolve:n=1$/);
    const asked = t.auditSink.ofType('member_nominee_links.asked');
    expect(asked).toHaveLength(1);
    expect(asked[0]!.resourceLocator).toBe(`nominee_link:${rows[0]!.link_id}`);
    expect(asked[0]!.context).toEqual({ rank: 1 });
    expect((await call('GET', LINKS, { tok })).body).toEqual({ links: [{ rank: 1, linkId: rows[0]!.link_id, label: 'asked', name: null }] });
  });

  it('AC3 — a KEEP on the same rank carries the answer, `responded_at` and `asked_at` (⛔ re-asked); the old row ends `redeclared`', async () => {
    const p = randomUUID();
    const d = await declarer(p);
    const mobile = nextMobile();
    const b = await member(p, { mobile, name: 'Meena Kumari' });
    const tok = token(d, p);
    expect((await call('POST', LIFE_EVENTS, { tok, payload: body(mark(mobile)) })).status).toBe(200);
    const [first] = await live(d);
    expect((await call('POST', `${REQUESTS}/${first!.link_id}/answer`, { tok: token(b, p), payload: { answer: 'yes' }, key: randomUUID() })).status).toBe(200);
    const answered = (await live(d))[0]!;
    t.auditSink.events.length = 0;
    expect((await call('POST', LIFE_EVENTS, { tok, payload: body(keep(first!.link_id)) })).status).toBe(200);
    const all = await links(d);
    const old = all.find((l) => l.link_id === first!.link_id)!;
    const carried = all.find((l) => l.state === 'live')!;
    expect(old).toMatchObject({ state: 'ended', end_reason: 'redeclared' });
    expect(carried).toMatchObject({ rank: 1, answer: 'confirmed', carried_from_link_id: first!.link_id });
    expect(carried.asked_at.toISOString()).toBe(answered.asked_at.toISOString());
    expect(carried.responded_at!.toISOString()).toBe(answered.responded_at!.toISOString());
    expect(t.auditSink.ofType('member_nominee_links.carried').map((e) => e.resourceLocator)).toEqual([`nominee_link:${carried.link_id}`]);
    expect(t.auditSink.ofType('member_nominee_links.ended').map((e) => e.resourceLocator)).toEqual([`nominee_link:${old.link_id}`]);
    expect(t.auditSink.ofType('member_nominee_links.asked')).toEqual([]);
    expect((await call('GET', LINKS, { tok })).body).toEqual({
      links: [{ rank: 1, linkId: carried.link_id, label: 'confirmed', name: await shown(p, 'Meena Kumari') }],
    });
  });

  it('AC3 — ranks SWAPPED: each keep is carried to the rank it is submitted on (⛔ 409); a rank given a NEW mark ends its old one `redeclared`', async () => {
    const p = randomUUID();
    const d = await declarer(p);
    const [m1, m2, m3] = [nextMobile(), nextMobile(), nextMobile()];
    const [b1, b2] = [await member(p, { mobile: m1, name: 'One' }), await member(p, { mobile: m2, name: 'Two' })];
    await member(p, { mobile: m3, name: 'Three' });
    const tok = token(d, p);
    expect((await call('POST', LIFE_EVENTS, { tok, payload: body(mark(m1), mark(m2)) })).status).toBe(200);
    const before = await live(d);
    const on = (rank: number) => before.find((l) => l.rank === rank)!.link_id;
    const swap = await call('POST', LIFE_EVENTS, { tok, payload: body(keep(on(2)), keep(on(1))) });
    expect(swap.status, swap.raw).toBe(200);
    const after = await live(d);
    const who = async (linkId: string) => (await t.pool.query(`SELECT nominee_member_id AS m FROM member_nominee_links WHERE link_id = $1`, [linkId])).rows[0].m as string;
    expect(await who(after.find((l) => l.rank === 1)!.link_id)).toBe(b2);
    expect(await who(after.find((l) => l.rank === 2)!.link_id)).toBe(b1);
    // rank 1 gets a NEW mark ⇒ its live link ends `redeclared`; rank 2 is kept
    const rank1 = after.find((l) => l.rank === 1)!.link_id;
    const rank2 = after.find((l) => l.rank === 2)!.link_id;
    expect((await call('POST', LIFE_EVENTS, { tok, payload: body(mark(m3), keep(rank2)) })).status).toBe(200);
    expect((await links(d)).find((l) => l.link_id === rank1)).toMatchObject({ state: 'ended', end_reason: 'redeclared' });
  });

  it('AC3 — re-saved WITHOUT a mark ⇒ `removed_by_declarer`; a VACATED rank ⇒ `redeclared`; a `confirmed` mark re-saved without ⇒ ended, ⛔ 500 (V1)', async () => {
    const p = randomUUID();
    const d = await declarer(p);
    const [m1, m2] = [nextMobile(), nextMobile()];
    const b1 = await member(p, { mobile: m1, name: 'One' });
    await member(p, { mobile: m2, name: 'Two' });
    const tok = token(d, p);
    expect((await call('POST', LIFE_EVENTS, { tok, payload: body(mark(m1), mark(m2)) })).status).toBe(200);
    const first = await live(d);
    const r1 = first.find((l) => l.rank === 1)!.link_id;
    const r2 = first.find((l) => l.rank === 2)!.link_id;
    expect((await call('POST', `${REQUESTS}/${r1}/answer`, { tok: token(b1, p), payload: { answer: 'yes' }, key: randomUUID() })).status).toBe(200);
    const r = await call('POST', LIFE_EVENTS, { tok, payload: body(null) }); // 2 → 1, rank 1 without a mark
    expect(r.status, r.raw).toBe(200);
    const all = await links(d);
    expect(all.find((l) => l.link_id === r1)).toMatchObject({ state: 'ended', end_reason: 'removed_by_declarer', answer: 'confirmed' });
    expect(all.find((l) => l.link_id === r2)).toMatchObject({ state: 'ended', end_reason: 'redeclared' });
    expect(await live(d)).toEqual([]);
    expect((await call('GET', LINKS, { tok })).body).toEqual({ links: [] });
  });

  it('AC3 — a STALE keep ⇒ 409 `nominee.link_stale`; the same member on both ranks ⇒ 422 `nominee.link_duplicate`; ⛔ write either way', async () => {
    const p = randomUUID();
    const d = await declarer(p);
    const mobile = nextMobile();
    await member(p, { mobile, name: 'One' });
    const tok = token(d, p);
    expect((await call('POST', LIFE_EVENTS, { tok, payload: body(mark(mobile)) })).status).toBe(200);
    const linkId = (await live(d))[0]!.link_id;
    const versions = async () => Number((await t.pool.query(`SELECT count(*) AS n FROM member_nominee_versions WHERE member_id = $1`, [d])).rows[0].n);
    const v = await versions();
    const stale = await call('POST', LIFE_EVENTS, { tok, payload: body(keep(randomUUID())) });
    expect(stale.status).toBe(409);
    expect(code(stale)).toBe(CODES.linkStale);
    const dup = await call('POST', LIFE_EVENTS, { tok, payload: body(keep(linkId), mark(mobile)) });
    expect(dup.status).toBe(422);
    expect(code(dup)).toBe(CODES.linkDuplicate);
    expect(await versions()).toBe(v);
    expect((await live(d)).map((l) => l.link_id)).toEqual([linkId]);
  });

  it('AC3 / TR7 — every unresolvable mark AND a caller the gate refuses ⇒ the SAME 422 body; ⛔ write', async () => {
    const p = randomUUID();
    const other = randomUUID();
    const d = await declarer(p);
    const declarerMobile = nextMobile();
    await member(p, { id: d, mobile: declarerMobile, name: 'Declarer' });
    const withdrawn = nextMobile();
    const pending = nextMobile();
    const foreign = nextMobile();
    const dead = nextMobile();
    await member(p, { state: 'withdrawn', mobile: withdrawn, name: 'Gone' });
    await member(p, { state: 'pending-fee', mobile: pending, name: 'New' });
    await member(other, { mobile: foreign, name: 'Elsewhere' });
    await fileClaim(p, await member(p, { mobile: dead, name: 'Reported' }));
    const bodies: Json[] = [];
    for (const mobile of [nextMobile() /* ⛔ a member */, withdrawn, pending, foreign, dead, '0000000000']) {
      const fresh = await declarer(p); // a fresh daily counter for each
      const r = await call('POST', LIFE_EVENTS, { tok: token(fresh, p), payload: body(mark(mobile, 'typed')) });
      expect(r.status, mobile).toBe(422);
      bodies.push(sameBody(r));
      expect(await links(fresh)).toEqual([]);
    }
    // the declarer marks THEMSELVES (`d`'s number is an eligible member to anyone else)
    const self = await call('POST', LIFE_EVENTS, { tok: token(d, p), payload: body(mark(declarerMobile)) });
    expect(self.status).toBe(422);
    bodies.push(sameBody(self));
    // the CALLER gate: an `active-in-grace` declarer making a NEW mark
    const graceful = await declarer(p, 'active-in-grace');
    const eligible = nextMobile();
    await member(p, { mobile: eligible, name: 'Fine' });
    kmsLines.length = 0;
    const gate = await call('POST', LIFE_EVENTS, { tok: token(graceful, p), payload: body(mark(eligible)) });
    expect(gate.status).toBe(422);
    bodies.push(sameBody(gate));
    // NE5 / TR14 — the gate refuses BEFORE the HMAC: ⛔ HMAC line. THIS is what proves the order. The counter assertion proves
    // only that a refused charge leaves ⛔ row (it rolls back whatever its position — it cannot go RED if the HMAC moved earlier).
    expect(hmacLines()).toEqual([]);
    expect((await t.pool.query(`SELECT 1 FROM member_daily_counters WHERE member_id = $1 AND counter = 'nominee_link_resolve'`, [graceful])).rows).toEqual([]);
    for (const b of bodies) expect(b).toEqual({ code: CODES.linkNotFound, message: bodies[0]!['message'] });
  });

  it('AC3 / V2 — the 5th NEW mark in an IST day ⇒ 429 `nominee.link_daily_limit` and ⛔ KMS call; a keep is ⛔ charged', async () => {
    const p = randomUUID();
    const d = await declarer(p);
    const [m1, m2] = [nextMobile(), nextMobile()];
    await member(p, { mobile: m1, name: 'One' });
    await member(p, { mobile: m2, name: 'Two' });
    const tok = token(d, p);
    expect((await call('POST', LIFE_EVENTS, { tok, payload: body(mark(m1), mark(m2)) })).status).toBe(200); // 2
    expect((await call('POST', LIFE_EVENTS, { tok, payload: body(mark(m2), mark(m1)) })).status).toBe(200); // 4
    const kept = await live(d);
    expect((await call('POST', LIFE_EVENTS, { tok, payload: body(keep(kept[0]!.link_id), keep(kept[1]!.link_id)) })).status).toBe(200);
    kmsLines.length = 0;
    const fifth = await call('POST', LIFE_EVENTS, { tok, payload: body(mark(m1)) });
    expect(fifth.status).toBe(429);
    expect(code(fifth)).toBe(CODES.linkDailyLimit);
    expect(kmsLines).toEqual([]); // ⛔ ANY KMS call — the refusal comes before the HMAC and the encryption
    expect((await t.pool.query(`SELECT count FROM member_daily_counters WHERE member_id = $1 AND counter = 'nominee_link_resolve'`, [d])).rows).toEqual([{ count: 4 }]);
  });

  it('AC3 / code review 2026-10-24 — the refusals that need no lookup spend ⛔ budget: an unusable number, a missing step-up, a locked declaration; the OTP retry charges ONCE', async () => {
    const p = randomUUID();
    const d = await declarer(p);
    const mobile = nextMobile();
    await member(p, { mobile, name: 'One' });
    const tok = token(d, p);
    const counter = async () => (await t.pool.query(`SELECT count FROM member_daily_counters WHERE member_id = $1 AND counter = 'nominee_link_resolve'`, [d])).rows;
    // an unusable number ⇒ the ONE 422, decided BEFORE the charge
    const junk = await call('POST', LIFE_EVENTS, { tok, payload: body(mark('0000000000')) });
    expect(junk.status).toBe(422);
    expect(code(junk)).toBe(CODES.linkNotFound);
    expect(await counter()).toEqual([]);
    // the first-ever declaration needs no step-up; every later save is a re-declaration that does
    expect((await call('POST', LIFE_EVENTS, { tok, payload: body(null) })).status).toBe(200);
    await t.pool.query(`DELETE FROM member_step_up_elevations WHERE member_id = $1`, [d]);
    kmsLines.length = 0;
    const stepUp = await call('POST', LIFE_EVENTS, { tok, payload: body(mark(mobile)) });
    expect(stepUp.status).toBe(403);
    expect(code(stepUp)).toBe('auth.step_up_required');
    expect(await counter()).toEqual([]); // ⛔ charged — the OTP retry below is the FIRST charge
    expect(hmacLines()).toEqual([]);
    expect(await links(d)).toEqual([]);
    await memberAuthRepo.insertElevation(t.deps.pool, { memberId: d, actionContext: 'nominee_change', elevatedUntil: new Date(Date.now() + 10 * 60 * 1000) });
    expect((await call('POST', LIFE_EVENTS, { tok, payload: body(mark(mobile)) })).status).toBe(200);
    expect(await counter()).toEqual([{ count: 1 }]); // ONE mark, charged ONCE across the step-up round trip
    // a claim has locked the declaration ⇒ 409, ⛔ charged
    await fileClaim(p, d);
    const locked = await call('POST', LIFE_EVENTS, { tok, payload: body(mark(mobile)) });
    expect(locked.status).toBe(409);
    expect(code(locked)).toBe('nominee.locked_claim_filed');
    expect(await counter()).toEqual([{ count: 1 }]);
  });

  it('AC3 / V11 — an `active-in-grace` declarer\'s KEEP and plain re-save succeed (⛔ gated)', async () => {
    const p = randomUUID();
    const d = await declarer(p);
    const mobile = nextMobile();
    await member(p, { mobile, name: 'One' });
    const tok = token(d, p);
    expect((await call('POST', LIFE_EVENTS, { tok, payload: body(mark(mobile)) })).status).toBe(200);
    await enterGrace(p, d);
    const linkId = (await live(d))[0]!.link_id;
    const kept = await call('POST', LIFE_EVENTS, { tok, payload: body(keep(linkId)) });
    expect(kept.status, kept.raw).toBe(200);
    expect(await live(d)).toHaveLength(1);
    expect((await call('POST', LIFE_EVENTS, { tok, payload: body(null) })).status).toBe(200);
    expect(await live(d)).toEqual([]);
  });

  it('AC3 / NE4 — the SIGNUP route: a mark ⇒ 400 `nominee.link_not_available` with ⛔ KMS call and ⛔ write; a plain re-save ENDS a live mark', async () => {
    const p = randomUUID();
    const d = await declarer(p);
    const mobile = nextMobile();
    await member(p, { mobile, name: 'One' });
    const tok = token(d, p);
    expect((await call('POST', LIFE_EVENTS, { tok, payload: body(mark(mobile)) })).status).toBe(200);
    const linkId = (await live(d))[0]!.link_id;
    const versions = async () => Number((await t.pool.query(`SELECT count(*) AS n FROM member_nominee_versions WHERE member_id = $1`, [d])).rows[0].n);
    const v = await versions();
    kmsLines.length = 0;
    for (const m of [mark(mobile), keep(linkId)]) {
      const r = await call('POST', SIGNUP, { tok, payload: body(m) });
      expect(r.status).toBe(400);
      expect(code(r)).toBe(CODES.linkNotAvailable);
    }
    expect(kmsLines).toEqual([]);
    expect(await versions()).toBe(v);
    expect((await t.pool.query(`SELECT count FROM member_daily_counters WHERE member_id = $1 AND counter = 'nominee_link_resolve'`, [d])).rows).toEqual([{ count: 1 }]);
    const plain = await call('POST', SIGNUP, { tok, payload: body(null) });
    expect(plain.status, plain.raw).toBe(200);
    expect((await links(d)).find((l) => l.link_id === linkId)).toMatchObject({ state: 'ended', end_reason: 'removed_by_declarer' });
  });

  it('AC3 — a LOCKED declaration (a claim names the declarer) ⇒ 409 and ⛔ link row written or ended', async () => {
    const p = randomUUID();
    const d = await declarer(p);
    const mobile = nextMobile();
    await member(p, { mobile, name: 'One' });
    const tok = token(d, p);
    expect((await call('POST', LIFE_EVENTS, { tok, payload: body(mark(mobile)) })).status).toBe(200);
    const before = await links(d);
    await fileClaim(p, d);
    for (const payload of [body(keep(before[0]!.link_id)), body(null)]) {
      const r = await call('POST', LIFE_EVENTS, { tok, payload });
      expect(r.status).toBe(409);
      expect(code(r)).toBe('nominee.locked_claim_filed');
    }
    expect(await links(d)).toEqual(before);
  });

  it('AC3 — a failure AFTER the link insert rolls the WHOLE save back: ⛔ link row, ⛔ version', async () => {
    const p = randomUUID();
    const d = await declarer(p);
    const mobile = nextMobile();
    await member(p, { mobile, name: 'One' });
    const tag = randomUUID().replace(/-/g, '').slice(0, 12);
    // A DEFERRED constraint trigger fires at COMMIT — after every statement of the save, the link insert included. Scoped to
    // this test's Pariwar (⛔ any other test's row), dropped in `finally`.
    await t.pool.query(`CREATE FUNCTION test_636e_fail_${tag}() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.pariwar_id = '${p}'::uuid THEN RAISE EXCEPTION 'injected after the link insert'; END IF; RETURN NULL; END $$`);
    await t.pool.query(`CREATE CONSTRAINT TRIGGER test_636e_fail_${tag} AFTER INSERT ON member_nominee_links
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION test_636e_fail_${tag}()`);
    try {
      const r = await call('POST', LIFE_EVENTS, { tok: token(d, p), payload: body(mark(mobile)) });
      expect(r.status).toBe(500);
    } finally {
      await t.pool.query(`DROP TRIGGER test_636e_fail_${tag} ON member_nominee_links`);
      await t.pool.query(`DROP FUNCTION test_636e_fail_${tag}()`);
    }
    expect(await links(d)).toEqual([]);
    expect((await t.pool.query(`SELECT count(*)::int AS n FROM member_nominee_versions WHERE member_id = $1`, [d])).rows[0].n).toBe(0);
  });

  // ── AC4 — the marked member ────────────────────────────────────────────────────────────────────────────────────────

  it('AC4 — the request names the DECLARER; "Yes" ⇒ the declarer sees `confirmed` + the name; ONE answer (replay = the first; a second ⇒ 409)', async () => {
    const p = randomUUID();
    const d = await declarer(p);
    await member(p, { id: d, mobile: nextMobile(), name: 'Declarer Devi' });
    const mobile = nextMobile();
    const b = await member(p, { mobile, name: 'Meena Kumari' });
    expect((await call('POST', LIFE_EVENTS, { tok: token(d, p), payload: body(mark(mobile)) })).status).toBe(200);
    const linkId = (await live(d))[0]!.link_id;
    const tokB = token(b, p);
    const list = await call('GET', REQUESTS, { tok: tokB });
    expect(list.status).toBe(200);
    expect(list.body).toMatchObject({ items: [{ linkId, answer: null, name: await shown(p, 'Declarer Devi') }], nextCursor: null, hasMore: false });
    t.auditSink.events.length = 0;
    const key = randomUUID();
    const yes = await call('POST', `${REQUESTS}/${linkId}/answer`, { tok: tokB, payload: { answer: 'yes' }, key });
    expect(yes.status).toBe(200);
    expect(yes.body).toEqual({ linkId, answer: 'confirmed' });
    const audit = t.auditSink.ofType('member_nominee_links.confirmed');
    expect(audit).toHaveLength(1);
    expect(audit[0]!.resourceLocator).toBe(`nominee_link:${linkId}`);
    expect(audit[0]!.context).toEqual({ rank: 1 });
    const replay = await call('POST', `${REQUESTS}/${linkId}/answer`, { tok: tokB, payload: { answer: 'yes' }, key });
    expect(replay).toMatchObject({ status: 200, body: { linkId, answer: 'confirmed' } });
    const second = await call('POST', `${REQUESTS}/${linkId}/answer`, { tok: tokB, payload: { answer: 'not_me' }, key: randomUUID() });
    expect(second.status).toBe(409);
    expect(code(second)).toBe(CODES.requestClosed);
    expect((await call('GET', LINKS, { tok: token(d, p) })).body).toEqual({ links: [{ rank: 1, linkId, label: 'confirmed', name: await shown(p, 'Meena Kumari') }] });
    expect((await call('GET', REQUESTS, { tok: tokB })).body).toMatchObject({ items: [{ linkId, answer: 'confirmed' }] });
  });

  it('AC4 — "No, that\'s not me" ⇒ the declarer sees `not_me` and ⛔ name; another member\'s mark ⇒ 404; ⛔ key ⇒ 400; a bad cursor ⇒ 400', async () => {
    const p = randomUUID();
    const d = await declarer(p);
    const [m1, m2] = [nextMobile(), nextMobile()];
    const b1 = await member(p, { mobile: m1, name: 'One' });
    const b2 = await member(p, { mobile: m2, name: 'Two' });
    expect((await call('POST', LIFE_EVENTS, { tok: token(d, p), payload: body(mark(m1), mark(m2)) })).status).toBe(200);
    const rows = await live(d);
    const r1 = rows.find((l) => l.rank === 1)!.link_id;
    const r2 = rows.find((l) => l.rank === 2)!.link_id;
    expect((await call('POST', `${REQUESTS}/${r1}/answer`, { tok: token(b1, p), payload: { answer: 'not_me' }, key: randomUUID() })).body).toEqual({
      linkId: r1,
      answer: 'not_me',
    });
    const notMine = await call('POST', `${REQUESTS}/${r2}/answer`, { tok: token(b1, p), payload: { answer: 'yes' }, key: randomUUID() });
    expect(notMine.status).toBe(404);
    expect(code(notMine)).toBe(CODES.notFound);
    const noKey = await call('POST', `${REQUESTS}/${r2}/answer`, { tok: token(b2, p), payload: { answer: 'yes' } });
    expect(noKey.status).toBe(400);
    expect(code(noKey)).toBe(CODES.idempotencyKeyRequired);
    const forged = Buffer.from(JSON.stringify(['open', 'not-a-time', r1]), 'utf8').toString('base64url');
    const bad = await call('GET', `${REQUESTS}?cursor=${forged}`, { tok: token(b2, p) });
    expect(bad.status).toBe(400);
    expect(code(bad)).toBe(CODES.cursorInvalid);
    expect((await call('GET', LINKS, { tok: token(d, p) })).body).toEqual({
      links: [
        { rank: 1, linkId: r1, label: 'not_me', name: null },
        { rank: 2, linkId: r2, label: 'asked', name: null },
      ],
    });
  });

  it('AC4 / V13 — a declarer named by a claim: the request is ⛔ listed and its answer ⇒ 409; a non-answerer ⇒ the ONE 403', async () => {
    const p = randomUUID();
    const d = await declarer(p);
    const mobile = nextMobile();
    const b = await member(p, { mobile, name: 'One' });
    expect((await call('POST', LIFE_EVENTS, { tok: token(d, p), payload: body(mark(mobile)) })).status).toBe(200);
    const linkId = (await live(d))[0]!.link_id;
    await fileClaim(p, d);
    expect((await call('GET', REQUESTS, { tok: token(b, p) })).body).toMatchObject({ items: [] });
    const closed = await call('POST', `${REQUESTS}/${linkId}/answer`, { tok: token(b, p), payload: { answer: 'yes' }, key: randomUUID() });
    expect(closed.status).toBe(409);
    expect(code(closed)).toBe(CODES.requestClosed);
    for (const state of ['pending-fee', 'withdrawn']) {
      const tok = token(await member(p, { state, mobile: nextMobile(), name: 'X' }), p);
      for (const r of [await call('GET', REQUESTS, { tok }), await call('POST', `${REQUESTS}/${linkId}/answer`, { tok, payload: { answer: 'yes' }, key: randomUUID() })]) {
        expect(r.status, state).toBe(403);
        expect(code(r), state).toBe(CODES.notAvailable);
      }
    }
    expect((await call('GET', REQUESTS)).status).toBe(401);
    expect((await call('GET', LINKS)).status).toBe(401);
  });

  // ── AC2 / NE3 — contact matching for a nominee ─────────────────────────────────────────────────────────────────────

  it('family 12(a) — a `keep` naming ANOTHER declarer\'s real live link ⇒ 409 `nominee.link_stale`; ⛔ write; the other\'s link untouched', async () => {
    const p = randomUUID();
    const [d1, d2] = [await declarer(p), await declarer(p)];
    const mobile = nextMobile();
    await member(p, { mobile, name: 'One' });
    expect((await call('POST', LIFE_EVENTS, { tok: token(d1, p), payload: body(mark(mobile)) })).status).toBe(200);
    const theirs = (await live(d1))[0]!;
    const before = await links(d1);
    const r = await call('POST', LIFE_EVENTS, { tok: token(d2, p), payload: body(keep(theirs.link_id)) });
    expect(r.status).toBe(409);
    expect(code(r)).toBe(CODES.linkStale);
    expect(await links(d2)).toEqual([]);
    expect(await links(d1)).toEqual(before); // ⛔ carried, ⛔ ended
  });

  it('family 3 — the answer route denies a missing token, a token of the WRONG KIND, a non-member principal and ANOTHER Pariwar\'s member; the link stays open', async () => {
    const p = randomUUID();
    const q = randomUUID(); // another Pariwar, with its own active member
    const d = await declarer(p);
    await member(p, { id: d, mobile: nextMobile(), name: 'Declarer Devi' });
    const mobile = nextMobile();
    await member(p, { mobile, name: 'Meena Kumari' });
    const outsider = await member(q, { mobile: nextMobile(), name: 'Elsewhere' });
    expect((await call('POST', LIFE_EVENTS, { tok: token(d, p), payload: body(mark(mobile)) })).status).toBe(200);
    const linkId = (await live(d))[0]!.link_id;
    const url = `${REQUESTS}/${linkId}/answer`;
    const wrongKinds = [
      signSignupContinuation(t.app, { mobileBlindIndex: `idx-${randomUUID()}`, jti: randomUUID() }, ACCESS_TTL_MS),
      signPariwarSelect(t.app, { mobileBlindIndex: `idx-${randomUUID()}`, deviceId: 'test-device', jti: randomUUID() }, ACCESS_TTL_MS),
    ];
    expect((await call('POST', url, { payload: { answer: 'yes' }, key: randomUUID() })).status).toBe(401);
    for (const tok of wrongKinds) expect((await call('POST', url, { tok, payload: { answer: 'yes' }, key: randomUUID() })).status).toBe(401);
    // a session for a member that is not a member of this Pariwar's roster at all ⇒ the ONE 403
    const ghost = await call('POST', url, { tok: token(randomUUID(), p), payload: { answer: 'yes' }, key: randomUUID() });
    expect(ghost.status).toBe(403);
    expect(code(ghost)).toBe(CODES.notAvailable);
    // an ACTIVE member of ANOTHER Pariwar passes the gate there, and finds nothing here
    const cross = await call('POST', url, { tok: token(outsider, q), payload: { answer: 'yes' }, key: randomUUID() });
    expect(cross.status).toBe(404);
    expect(code(cross)).toBe(CODES.notFound);
    expect((await call('GET', REQUESTS, { tok: token(outsider, q) })).body).toMatchObject({ items: [] });
    expect(await live(d)).toMatchObject([{ link_id: linkId, answer: null }]); // ⛔ answered by any of them
  });

  it('family 11 — a marked member in renewal GRACE sees the request and can answer it (the answerer gate admits `active-in-grace`)', async () => {
    const p = randomUUID();
    const d = await declarer(p);
    await member(p, { id: d, mobile: nextMobile(), name: 'Declarer Devi' });
    const mobile = nextMobile();
    const b = await member(p, { state: 'active-in-grace', mobile, name: 'Meena Kumari' });
    expect((await call('POST', LIFE_EVENTS, { tok: token(d, p), payload: body(mark(mobile)) })).status).toBe(200); // eligible to be marked
    const linkId = (await live(d))[0]!.link_id;
    const tokB = token(b, p);
    expect((await call('GET', REQUESTS, { tok: tokB })).body).toMatchObject({ items: [{ linkId, answer: null }] });
    const yes = await call('POST', `${REQUESTS}/${linkId}/answer`, { tok: tokB, payload: { answer: 'yes' }, key: randomUUID() });
    expect(yes).toMatchObject({ status: 200, body: { linkId, answer: 'confirmed' } });
  });

  it('family 2 — TWO connections: two answers to one link ⇒ exactly one 200 and one 409, ONE answer written; two concurrent saves of one mark ⇒ one live link', async () => {
    const p = randomUUID();
    const d = await declarer(p);
    await member(p, { id: d, mobile: nextMobile(), name: 'Declarer Devi' });
    const mobile = nextMobile();
    const b = await member(p, { mobile, name: 'Meena Kumari' });
    const tokD = token(d, p);
    // two saves of the SAME mark at once: serialised by the D3 lock; the second sees the first's link and CARRIES it
    const saves = await Promise.all([call('POST', LIFE_EVENTS, { tok: tokD, payload: body(mark(mobile)) }), call('POST', LIFE_EVENTS, { tok: tokD, payload: body(mark(mobile)) })]);
    expect(saves.map((r) => r.status)).toEqual([200, 200]);
    expect(await live(d)).toHaveLength(1);
    // … and the second one CARRIED the first's link (`planNomineeLinks`: a `new` mark of the member already live on that rank) —
    // ⛔ ended it and asked again: under the old planner BOTH rows have no `carried_from_link_id` and this fails
    const both = await links(d);
    expect(both).toHaveLength(2);
    expect(both.filter((l) => l.carried_from_link_id !== null)).toHaveLength(1);
    expect(both.filter((l) => l.state === 'ended')).toMatchObject([{ end_reason: 'redeclared' }]);
    const linkId = (await live(d))[0]!.link_id;
    const tokB = token(b, p);
    const answers = await Promise.all([
      call('POST', `${REQUESTS}/${linkId}/answer`, { tok: tokB, payload: { answer: 'yes' }, key: randomUUID() }),
      call('POST', `${REQUESTS}/${linkId}/answer`, { tok: tokB, payload: { answer: 'not_me' }, key: randomUUID() }),
    ]);
    expect(answers.map((r) => r.status).sort()).toEqual([200, 409]);
    const winner = answers.find((r) => r.status === 200)!;
    const loser = answers.find((r) => r.status === 409)!;
    expect(code(loser)).toBe(CODES.requestClosed);
    expect((await live(d))[0]!.answer).toBe(winner.body['answer'] === 'confirmed' ? 'confirmed' : 'not_me');
  });

  it('NE3 / V12 — contact matching with `purpose: nominee_link` logs its OWN KMS purpose; the SAME daily counter as 6.36b', async () => {
    const p = randomUUID();
    const me = await member(p, { mobile: nextMobile(), name: 'Asha Devi' });
    const friend = nextMobile();
    await member(p, { mobile: friend, name: 'Meena Kumari' });
    const tok = token(me, p);
    kmsLines.length = 0;
    const nominee = await call('POST', '/api/v1/member/known-people/contact-matches', { tok, payload: { numbers: [friend], purpose: 'nominee_link' } });
    expect(nominee).toMatchObject({ status: 200, body: { matched: [0] } });
    const plain = await call('POST', '/api/v1/member/known-people/contact-matches', { tok, payload: { numbers: [friend] } });
    expect(plain).toMatchObject({ status: 200, body: { matched: [0] } });
    expect(hmacLines().map((l) => l.resourceLocator.replace(/^.*\/member_mobile\//, ''))).toEqual(['contact_match_nominee:n=1', 'contact_match:n=1']);
    expect((await t.pool.query(`SELECT count FROM member_daily_counters WHERE member_id = $1 AND counter = 'contact_match_requests'`, [me])).rows).toEqual([{ count: 2 }]);
  });

  // ── AC9 — the number ───────────────────────────────────────────────────────────────────────────────────────────────

  it('AC9 — a planted mark number: ⛔ its digits in a log line, an audit line, the KMS line or an error body', async () => {
    const p = randomUUID();
    const d = await declarer(p);
    const planted = '7012398765';
    await member(p, { mobile: planted, name: 'Planted' });
    const tok = token(d, p);
    logLines.length = 0;
    kmsLines.length = 0;
    t.auditSink.events.length = 0;
    const ok = await call('POST', LIFE_EVENTS, { tok, payload: body(mark(`+91${planted}`)) });
    expect(ok.status).toBe(200);
    const miss = await call('POST', LIFE_EVENTS, { tok, payload: body(mark(`+91${planted.replace('765', '000')}`)) });
    expect(miss.status).toBe(422);
    const dupBody = await call('POST', LIFE_EVENTS, { tok, payload: body(mark(planted), mark(`0${planted}`)) });
    for (const r of [ok, miss, dupBody]) expect(r.raw).not.toContain(planted.slice(-6));
    const sinks = JSON.stringify([logLines, kmsLines, t.auditSink.events]);
    expect(sinks).not.toContain(planted.slice(-6));
    expect(sinks).not.toContain(planted.replace('765', '000').slice(-6));
    for (const e of t.auditSink.events.filter((x) => x.type.startsWith('member_nominee_links.'))) {
      expect(e.resourceLocator).toMatch(/^nominee_link:[0-9a-f-]{36}$/);
      expect(Object.keys(e.context ?? {})).toEqual(['rank']);
    }
  });
});
