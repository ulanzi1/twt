// Story 6.36f — THE MARKS-ONLY NOMINEE SAVE (`POST /api/v1/member/life-events/nominees/marks`; Task 3; AC2, AC3, AC5; MK1–MK7,
// MK11; `2026-10-26-407`). Live DB, own-committing (the 6.36e spec's shape): every request runs on its own scoped connection,
// so each test mints a FRESH Pariwar and a fresh declarer (the 4-a-day `nominee_link_resolve` counter starts at zero).
//   · AC2 — the route + the guards: a removal, a swap (two `new` picks ⇒ both CARRIED, two units), a `new` mark (one unit, one
//     HMAC, the marked member's request), a `keep` beside a removal, a body in REVERSED rank order (TR11), the no-change save
//     (MK5), the basis refusals (`marks_stale` — uncharged, ⛔ HMAC; a save landing between the charge and the main tx — charged;
//     a missing / extra rank; `marks_no_declaration`), the shared guards (claim-locked, terminal, ⛔ elevation, the 5th lookup,
//     the caller gate, a stale keep), a detail in the body ⇒ 400, a failure after the link insert rolls back.
//   · AC3 — the COPY: byte-identical ciphertext, the projection unchanged, the copy decrypts (G3 — TR2's tripwire), ⛔ KMS call
//     for the details; a split that disagrees fails closed; the READERS driven through the route: the staff warning, the 6.36e
//     exclusion before / after the cut (V15), the export (`(rank, versionNo)` join), the erasure scrub.
//   · AC5 — the event as a full save's; `member_nominees.marks_saved` IN PLACE OF `.declared`; ⛔ a number in any line.
//   · MK11 — a test that DOCUMENTS today's behaviour (named as such): a correction of an OLDER version hides a live link.

import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';
import { setTimeout as delay } from 'node:timers/promises';

import { NOMINEE_LINK_ERROR_CODES as CODES, ProfileSection } from '@twt/contracts';
import { claim, dataExport, encryption, ids, member as memberDomain, nominee } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { kmsEventToAuditInput } from '../../../src/audit/audit-log-sink.js';
import * as memberAuthRepo from '../../../src/modules/auth/member/member-auth.repo.js';
import { signAccessToken, signPariwarSelect, signSignupContinuation } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { decryptNomineeField } from '../../../src/modules/nominee/nominee-crypto.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
const LIFE_EVENTS = '/api/v1/member/life-events/nominees';
const MARKS = '/api/v1/member/life-events/nominees/marks';
const LINKS = '/api/v1/member/life-events/nominee-links';
const REQUESTS = '/api/v1/member/nominee-links/requests';
type Json = Record<string, unknown>;
type Mark = { kind: 'new'; mobile: string; foundBy: 'contacts' | 'picker' | 'typed' } | { kind: 'keep'; linkId: string };
type LinkRow = { link_id: string; rank: number; state: string; answer: string | null; end_reason: string | null; carried_from_link_id: string | null; asked_at: Date; responded_at: Date | null; version_id: string };
type VersionRow = {
  version_id: string;
  rank: number;
  version_no: number;
  kind: string;
  source: string;
  name_ciphertext: string | null;
  mobile_ciphertext: string | null;
  address_ciphertext: string | null;
  relationship: string | null;
  split_pct: number | null;
  recorded_at: Date;
};

describe.skipIf(!hasDatabase)('Story 6.36f — the marks-only nominee save', { timeout: 60000 }, () => {
  let t: TestApp;
  const logLines: string[] = [];
  const kmsLines: { action: string; resourceLocator: string }[] = [];
  const hmacLines = () => kmsLines.filter((l) => l.action === 'kms.compute_hmac');
  /** Every KMS call that is ⛔ an HMAC — a details encrypt or decrypt (`encryptDek` / `decryptDek`). */
  const dekLines = () => kmsLines.filter((l) => l.action !== 'kms.compute_hmac');

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

  /** A member-stream event on `memberId` (the declare reads the stream). */
  async function step(pariwarId: string, memberId: string, eventType: string, payload: Json, actorId: string | null = memberId) {
    await inScope(pariwarId, (s) =>
      memberDomain.projectMemberState(s.client, {
        memberId: ids.memberId(memberId),
        pariwarId: ids.pariwarId(pariwarId),
        eventType: eventType as never,
        payload: payload as never,
        actorId,
      }),
    );
  }

  /** A DECLARER walked through the real lifecycle events to `active`, elevated for `nominee_change`. */
  async function declarer(pariwarId: string): Promise<string> {
    const memberId = randomUUID();
    await step(pariwarId, memberId, 'member.signup_initiated', { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' });
    await step(pariwarId, memberId, 'member.kyc_manual_fallback', { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual', actor: 'member', reason: 'manual_fallback' });
    await step(pariwarId, memberId, 'member.vyawastha_shulk_paid', { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'payment', actor: 'member', utr: 'TEST-UTR-636F', amount_inr: 1000 });
    await step(pariwarId, memberId, 'member.lock_in_expired', { from_state: 'lock-in', to_state: 'active', trigger: 'lock_in_expiry', actor: 'system', kyc_verified: true }, null);
    await elevate(memberId);
    return memberId;
  }

  const elevate = (memberId: string) =>
    memberAuthRepo.insertElevation(t.deps.pool, { memberId, actionContext: 'nominee_change', elevatedUntil: new Date(Date.now() + 10 * 60 * 1000) });

  /** A member of `pariwarId` in `state`, with a real identity row (the blind index of `mobile`) and a KYC name, committed. */
  async function member(pariwarId: string, opts: { mobile: string; name: string; state?: string }): Promise<string> {
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

  /** File a claim naming `deceasedMemberId` — the D3 lock's predicate. */
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

  const token = (memberId: string, pariwarId: string) => signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);

  async function call(method: 'GET' | 'POST', url: string, opts: { tok?: string; payload?: Json; key?: string } = {}) {
    const res = await t.app.inject({
      method,
      url,
      payload: opts.payload,
      headers: {
        origin: 'http://localhost:3001',
        ...(opts.tok ? { authorization: `Bearer ${opts.tok}` } : {}),
        ...(opts.key ? { 'idempotency-key': opts.key } : {}),
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

  /** A FULL declare body: one entry per mark (`null` ⇒ ⛔ mark on that rank); rank 1 carries an address. */
  const full = (...marks: (Mark | null)[]): Json => ({
    nominees: marks.map((m, i) => ({
      name: i === 0 ? 'Asha Devi' : 'Ravi Kumar',
      relationship: i === 0 ? 'spouse' : 'son',
      mobile: i === 0 ? '9876543210' : '9988776655',
      ...(i === 0 ? { address: '12 Station Road, Indore' } : {}),
      ...(m === null ? {} : { memberLink: m }),
    })),
  });
  const mark = (mobile: string, foundBy: 'contacts' | 'picker' | 'typed' = 'picker'): Mark => ({ kind: 'new', mobile, foundBy });
  const keep = (linkId: string): Mark => ({ kind: 'keep', linkId });

  /** The basis the phone would see (the links read's `ranks`). */
  async function basis(tok: string): Promise<{ rank: 1 | 2; versionNo: number }[]> {
    const r = await call('GET', LINKS, { tok });
    expect(r.status, r.raw).toBe(200);
    return r.body['ranks'] as { rank: 1 | 2; versionNo: number }[];
  }
  /** A marks body from the CURRENT basis: `byRank[rank]` is that rank's mark (`null` ⇒ none). */
  async function marksFor(tok: string, byRank: Record<number, Mark | null>): Promise<Json> {
    return { marks: (await basis(tok)).map((b) => ({ rank: b.rank, versionNo: b.versionNo, memberLink: byRank[b.rank] ?? null })) };
  }

  async function links(declarerId: string): Promise<LinkRow[]> {
    const r = await t.pool.query<LinkRow>(
      `SELECT link_id, rank, state, answer, end_reason, carried_from_link_id, asked_at, responded_at, version_id
         FROM member_nominee_links WHERE declarer_member_id = $1 ORDER BY asked_at, link_id`,
      [declarerId],
    );
    return r.rows;
  }
  const live = async (declarerId: string) => (await links(declarerId)).filter((l) => l.state === 'live');
  const nomineeOf = async (linkId: string) =>
    (await t.pool.query<{ m: string }>(`SELECT nominee_member_id AS m FROM member_nominee_links WHERE link_id = $1`, [linkId])).rows[0]!.m;

  async function versions(memberId: string): Promise<VersionRow[]> {
    return (
      await t.pool.query<VersionRow>(
        `SELECT version_id, rank, version_no, kind, source, name_ciphertext, mobile_ciphertext, address_ciphertext, relationship, split_pct, recorded_at
           FROM member_nominee_versions WHERE member_id = $1 ORDER BY rank, version_no`,
        [memberId],
      )
    ).rows;
  }
  async function projection(memberId: string) {
    return (
      await t.pool.query<{ rank: number; name_ciphertext: string; mobile_ciphertext: string; address_ciphertext: string | null; relationship: string; split_pct: number }>(
        `SELECT rank, name_ciphertext, mobile_ciphertext, address_ciphertext, relationship, split_pct FROM member_nominees WHERE member_id = $1 ORDER BY rank`,
        [memberId],
      )
    ).rows;
  }
  const declaredEvents = async (memberId: string) =>
    (await t.pool.query<{ payload: Json }>(`SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'member.nominees_declared' ORDER BY event_version`, [memberId]))
      .rows.map((r) => r.payload);
  const counter = async (memberId: string) =>
    (await t.pool.query(`SELECT count FROM member_daily_counters WHERE member_id = $1 AND counter = 'nominee_link_resolve'`, [memberId])).rows;
  const nomineeAudit = () => [...t.auditSink.ofType('member_nominees.declared'), ...t.auditSink.ofType('member_nominees.marks_saved')];

  let n = 0;
  /** A fresh valid Indian mobile per call (⛔ shared across Pariwars by accident). */
  const nextMobile = () => `9${String(100000000 + (n += 1) + Math.floor(Math.random() * 1e6) * 100).slice(-9)}`;

  /** A declarer with a saved declaration (`marks` per rank, through the FULL save) — returns its id and token. */
  async function declared(p: string, ...marks: (Mark | null)[]) {
    const d = await declarer(p);
    const tok = token(d, p);
    const r = await call('POST', LIFE_EVENTS, { tok, payload: full(...marks) });
    expect(r.status, r.raw).toBe(200);
    return { d, tok };
  }

  // ── AC2 — the route and the guards ─────────────────────────────────────────────────────────────────────────────────

  it('AC2 / AC5 — a REMOVAL: the link ends `removed_by_declarer`, one new version per rank, ⛔ re-ask; audit `marks_saved` IN PLACE OF `.declared`', async () => {
    const p = randomUUID();
    const mobile = nextMobile();
    await member(p, { mobile, name: 'Meena Kumari' });
    const { d, tok } = await declared(p, mark(mobile), null);
    const [linked] = await live(d);
    t.auditSink.events.length = 0;
    const r = await call('POST', MARKS, { tok, payload: await marksFor(tok, {}) });
    expect(r.status, r.raw).toBe(200);
    expect(r.body).toMatchObject({ locked: false, nominees: [{ rank: 1, splitPct: 75 }, { rank: 2, splitPct: 25 }] });
    expect((await links(d)).find((l) => l.link_id === linked!.link_id)).toMatchObject({ state: 'ended', end_reason: 'removed_by_declarer' });
    expect(await live(d)).toEqual([]);
    expect((await versions(d)).map((v) => [v.rank, v.version_no, v.kind, v.source])).toEqual([
      [1, 1, 'declared', 'member'],
      [1, 2, 'declared', 'member'],
      [2, 1, 'declared', 'member'],
      [2, 2, 'declared', 'member'],
    ]);
    expect(t.auditSink.ofType('member_nominees.declared')).toEqual([]);
    const saved = t.auditSink.ofType('member_nominees.marks_saved');
    expect(saved).toHaveLength(1);
    expect(saved[0]!.context).toEqual({ nominee_count: 2, split: '75-25', versions: '1:2:declared,2:2:declared' });
    expect(t.auditSink.ofType('member_nominee_links.ended').map((e) => e.resourceLocator)).toEqual([`nominee_link:${linked!.link_id}`]);
    expect(t.auditSink.ofType('member_nominee_links.asked')).toEqual([]);
  });

  it('AC2 — a SWAP (two `new` picks of the members live on the other rank): both CARRIED (answer, `asked_at` kept), old rows `redeclared`, TWO units, ONE HMAC batch', async () => {
    const p = randomUUID();
    const [m1, m2] = [nextMobile(), nextMobile()];
    const [b1, b2] = [await member(p, { mobile: m1, name: 'One' }), await member(p, { mobile: m2, name: 'Two' })];
    const { d, tok } = await declared(p, mark(m1), mark(m2));
    const before = await live(d);
    const on = (rank: number) => before.find((l) => l.rank === rank)!;
    expect((await call('POST', `${REQUESTS}/${on(1).link_id}/answer`, { tok: token(b1, p), payload: { answer: 'yes' }, key: randomUUID() })).status).toBe(200);
    const answered = (await live(d)).find((l) => l.rank === 1)!;
    kmsLines.length = 0;
    const r = await call('POST', MARKS, { tok, payload: await marksFor(tok, { 1: mark(m2), 2: mark(m1) }) });
    expect(r.status, r.raw).toBe(200);
    const after = await live(d);
    const r1 = after.find((l) => l.rank === 1)!;
    const r2 = after.find((l) => l.rank === 2)!;
    expect(await nomineeOf(r1.link_id)).toBe(b2);
    expect(await nomineeOf(r2.link_id)).toBe(b1);
    expect(r1.carried_from_link_id).toBe(on(2).link_id);
    expect(r2).toMatchObject({ carried_from_link_id: on(1).link_id, answer: 'confirmed' });
    expect(r2.asked_at.toISOString()).toBe(answered.asked_at.toISOString());
    expect(r2.responded_at!.toISOString()).toBe(answered.responded_at!.toISOString());
    for (const old of before) expect((await links(d)).find((l) => l.link_id === old.link_id)).toMatchObject({ state: 'ended', end_reason: 'redeclared' });
    expect(await counter(d)).toEqual([{ count: 4 }]); // 2 (the full save) + 2 (the swap)
    expect(hmacLines()).toHaveLength(1);
    expect(hmacLines()[0]!.resourceLocator).toMatch(/\/member_mobile\/nominee_link_resolve:n=2$/);
  });

  it('AC2 / AC5 — a NEW mark: asked, ONE unit, ONE HMAC; the marked member\'s requests list it (`-396` Q2 A); ⛔ the number in any log, audit or KMS line', async () => {
    const p = randomUUID();
    const mobile = nextMobile();
    const b = await member(p, { mobile, name: 'Meena Kumari' });
    const { d, tok } = await declared(p, null);
    kmsLines.length = 0;
    logLines.length = 0;
    t.auditSink.events.length = 0;
    const r = await call('POST', MARKS, { tok, payload: await marksFor(tok, { 1: mark(`+91 ${mobile}`, 'contacts') }) });
    expect(r.status, r.raw).toBe(200);
    const [asked] = await live(d);
    expect(asked).toMatchObject({ rank: 1, answer: null, carried_from_link_id: null });
    expect(await nomineeOf(asked!.link_id)).toBe(b);
    expect(await counter(d)).toEqual([{ count: 1 }]);
    expect(hmacLines()).toHaveLength(1);
    expect(t.auditSink.ofType('member_nominee_links.asked').map((e) => [e.resourceLocator, e.context])).toEqual([[`nominee_link:${asked!.link_id}`, { rank: 1 }]]);
    const requests = await call('GET', REQUESTS, { tok: token(b, p) });
    expect(requests.body).toMatchObject({ items: [{ linkId: asked!.link_id, answer: null }] });
    const digits = mobile.slice(-7);
    for (const line of [...logLines, JSON.stringify(t.auditSink.events), JSON.stringify(kmsLines)]) expect(line).not.toContain(digits);
  });

  it('AC2 — a `keep` beside a removal: the kept link is carried, the other ends `removed_by_declarer`', async () => {
    const p = randomUUID();
    const [m1, m2] = [nextMobile(), nextMobile()];
    await member(p, { mobile: m1, name: 'One' });
    await member(p, { mobile: m2, name: 'Two' });
    const { d, tok } = await declared(p, mark(m1), mark(m2));
    const before = await live(d);
    const l1 = before.find((l) => l.rank === 1)!;
    const l2 = before.find((l) => l.rank === 2)!;
    const r = await call('POST', MARKS, { tok, payload: await marksFor(tok, { 1: keep(l1.link_id), 2: null }) });
    expect(r.status, r.raw).toBe(200);
    expect((await live(d)).map((l) => [l.rank, l.carried_from_link_id])).toEqual([[1, l1.link_id]]);
    expect((await links(d)).find((l) => l.link_id === l2.link_id)).toMatchObject({ state: 'ended', end_reason: 'removed_by_declarer' });
  });

  it('AC2 / TR11 — a body in REVERSED rank order applies each mark to its OWN `rank`, and copies each rank\'s OWN details', async () => {
    const p = randomUUID();
    const m2 = nextMobile();
    const b2 = await member(p, { mobile: m2, name: 'Two' });
    const { d, tok } = await declared(p, null, null);
    const ranks = await basis(tok);
    const body = { marks: [{ rank: 2, versionNo: ranks[1]!.versionNo, memberLink: mark(m2) }, { rank: 1, versionNo: ranks[0]!.versionNo, memberLink: null }] };
    const r = await call('POST', MARKS, { tok, payload: body });
    expect(r.status, r.raw).toBe(200);
    const [l] = await live(d);
    expect(l!.rank).toBe(2);
    expect(await nomineeOf(l!.link_id)).toBe(b2);
    const v = await versions(d);
    const of = (rank: number, no: number) => v.find((x) => x.rank === rank && x.version_no === no)!;
    expect(of(2, 2).name_ciphertext).toBe(of(2, 1).name_ciphertext);
    expect(of(1, 2).name_ciphertext).toBe(of(1, 1).name_ciphertext);
    expect(of(2, 2).relationship).toBe('son');
    expect(l!.version_id).toBe(of(2, 2).version_id);
  });

  it('AC2 / MK5 — a save that changes nothing (a `keep` on its own rank; a `new` re-pick of the member live there) ⇒ 200, ⛔ version, ⛔ event, ⛔ `member_nominees.*` line', async () => {
    const p = randomUUID();
    const mobile = nextMobile();
    await member(p, { mobile, name: 'One' });
    const { d, tok } = await declared(p, mark(mobile));
    const [l] = await live(d);
    const v = (await versions(d)).length;
    const e = (await declaredEvents(d)).length;
    t.auditSink.events.length = 0;
    const kept = await call('POST', MARKS, { tok, payload: await marksFor(tok, { 1: keep(l!.link_id) }) });
    expect(kept.status, kept.raw).toBe(200);
    expect(kept.body).toMatchObject({ nominees: [{ rank: 1 }], locked: false });
    const repick = await call('POST', MARKS, { tok, payload: await marksFor(tok, { 1: mark(mobile) }) });
    expect(repick.status, repick.raw).toBe(200);
    expect((await versions(d)).length).toBe(v);
    expect((await declaredEvents(d)).length).toBe(e);
    expect(nomineeAudit()).toEqual([]);
    expect(t.auditSink.events.filter((x) => x.type.startsWith('member_nominee_links.'))).toEqual([]);
    expect((await live(d)).map((x) => x.link_id)).toEqual([l!.link_id]); // ⛔ even a carry row
    // ⚠ Recorded (MK5): the `new` re-pick's lookup unit was spent before the plan could see nothing changes
    expect(await counter(d)).toEqual([{ count: 2 }]);
  });

  it('AC2 / MK3 — a STALE versionNo ⇒ 409 `marks_stale`, ⛔ charged and ⛔ HMAC\'d even with a `new` mark; a missing or extra rank ⇒ the same 409; ⛔ write', async () => {
    const p = randomUUID();
    const mobile = nextMobile();
    await member(p, { mobile, name: 'One' });
    const { d, tok } = await declared(p, null);
    const v = (await versions(d)).length;
    kmsLines.length = 0;
    const stale = await call('POST', MARKS, { tok, payload: { marks: [{ rank: 1, versionNo: 2, memberLink: mark(mobile) }] } });
    expect(stale.status, stale.raw).toBe(409);
    expect(code(stale)).toBe(CODES.marksStale);
    expect(await counter(d)).toEqual([]);
    expect(hmacLines()).toEqual([]);
    const extra = await call('POST', MARKS, { tok, payload: { marks: [{ rank: 1, versionNo: 1, memberLink: null }, { rank: 2, versionNo: 1, memberLink: null }] } });
    expect([extra.status, code(extra)]).toEqual([409, CODES.marksStale]);
    const two = await declared(p, null, null);
    const missing = await call('POST', MARKS, { tok: two.tok, payload: { marks: [{ rank: 1, versionNo: 1, memberLink: null }] } });
    expect([missing.status, code(missing)]).toEqual([409, CODES.marksStale]);
    expect((await versions(d)).length).toBe(v);
    expect((await versions(two.d)).length).toBe(2);
  });

  it('AC2 / MK3 — a save committed BETWEEN the charge tx and the main tx ⇒ 409 `marks_stale` WITH the unit charged (recorded — consistent with 6.36e, ⛔ refund)', async () => {
    const p = randomUUID();
    const mobile = nextMobile();
    await member(p, { mobile, name: 'One' });
    const { d, tok } = await declared(p, null);
    const body = await marksFor(tok, { 1: mark(mobile) });
    const kms = t.deps.encryption.kms as { computeHmac: (...a: unknown[]) => Promise<Buffer> };
    const real = kms.computeHmac;
    let raced = false;
    // The HMAC runs AFTER the charge tx committed and BEFORE the main tx — a full re-save there moves the version on.
    kms.computeHmac = async (...a: unknown[]) => {
      if (!raced) {
        raced = true;
        expect((await call('POST', LIFE_EVENTS, { tok, payload: full(null) })).status).toBe(200);
      }
      return real.apply(kms, a);
    };
    try {
      const r = await call('POST', MARKS, { tok, payload: body });
      expect(r.status, r.raw).toBe(409);
      expect(code(r)).toBe(CODES.marksStale);
    } finally {
      kms.computeHmac = real;
    }
    expect(raced).toBe(true);
    expect(await counter(d)).toEqual([{ count: 1 }]);
    expect(await links(d)).toEqual([]);
  });

  it('AC2 / MK3 — ⛔ declaration, or a projection rank with ⛔ version row (pre-0119 data) ⇒ 409 `marks_no_declaration` (fail closed, ⛔ a stale loop)', async () => {
    const p = randomUUID();
    const d = await declarer(p);
    const tok = token(d, p);
    const none = await call('POST', MARKS, { tok, payload: { marks: [{ rank: 1, versionNo: 1, memberLink: null }] } });
    expect([none.status, code(none)]).toEqual([409, CODES.marksNoDeclaration]);
    // a projection row written with ⛔ version (the 0119 "NO BACKFILL" shape)
    await t.pool.query(
      `INSERT INTO member_nominees (member_id, pariwar_id, rank, name_ciphertext, relationship, mobile_ciphertext, split_pct) VALUES ($1, $2, 1, 'enc:v1:x', 'spouse', 'enc:v1:y', 100)`,
      [d, p],
    );
    expect(await basis(tok)).toEqual([]); // the links read offers ⛔ basis for it — the phone hides the entry card
    const orphan = await call('POST', MARKS, { tok, payload: { marks: [{ rank: 1, versionNo: 1, memberLink: null }] } });
    expect([orphan.status, code(orphan)]).toEqual([409, CODES.marksNoDeclaration]);
    expect(await versions(d)).toEqual([]);
  });

  it('AC2 — the SHARED guards: a claim-locked declaration ⇒ 409 `locked_claim_filed`; a terminal member ⇒ 409; ⛔ elevation ⇒ 403 from the preHandler; ⛔ write', async () => {
    const p = randomUUID();
    const locked = await declared(p, null);
    const lockedBody = await marksFor(locked.tok, {});
    await fileClaim(p, locked.d);
    const r1 = await call('POST', MARKS, { tok: locked.tok, payload: lockedBody });
    expect([r1.status, code(r1)]).toEqual([409, 'nominee.locked_claim_filed']);
    expect((await versions(locked.d)).length).toBe(1);

    const gone = await declared(p, null);
    const goneBody = await marksFor(gone.tok, {});
    await step(p, gone.d, 'member.withdrawal_completed', { from_state: 'active', to_state: 'withdrawn', trigger: 'withdrawal', actor: 'member' });
    const r2 = await call('POST', MARKS, { tok: gone.tok, payload: goneBody });
    expect([r2.status, code(r2)]).toEqual([409, 'nominee.member_terminal']);
    expect((await versions(gone.d)).length).toBe(1);

    const plain = await declared(p, null);
    const plainBody = await marksFor(plain.tok, {});
    await t.pool.query(`DELETE FROM member_step_up_elevations WHERE member_id = $1`, [plain.d]);
    kmsLines.length = 0;
    const r3 = await call('POST', MARKS, { tok: plain.tok, payload: { marks: [{ ...(plainBody['marks'] as Json[])[0]!, memberLink: mark(nextMobile()) }] } });
    expect([r3.status, code(r3)]).toEqual([403, 'auth.step_up_required']);
    expect(kmsLines).toEqual([]);
    expect(await counter(plain.d)).toEqual([]);
    expect((await versions(plain.d)).length).toBe(1);
  });

  it('R2 / MK2 — a terminal transition committed while the marks save waits on the projection row is re-read before copying', async () => {
    const p = randomUUID();
    const mobile = nextMobile();
    await member(p, { mobile, name: 'One' });
    const { d, tok } = await declared(p, mark(mobile));
    const body = await marksFor(tok, {}); // an actual removal, not MK5's no-op
    const before = { versions: await versions(d), projection: await projection(d), links: await links(d), events: await declaredEvents(d) };
    const holder = await openScopeTx(t.deps, p);
    let request: ReturnType<typeof call> | undefined;
    let finished = false;
    kmsLines.length = 0;
    t.auditSink.events.length = 0;
    try {
      await nominee.getMemberNominees(holder.tx, ids.pariwarId(p), ids.memberId(d), { forUpdate: true });
      const holderPid = (await holder.client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
      request = call('POST', MARKS, { tok, payload: body }).finally(() => { finished = true; });
      let blocked = false;
      const deadline = Date.now() + 5000;
      while (!blocked && !finished && Date.now() < deadline) {
        const r = await t.pool.query<{ blocked: boolean }>(
          `SELECT EXISTS (SELECT 1 FROM pg_stat_activity
             WHERE datname = current_database() AND $1::int = ANY(pg_blocking_pids(pid))
               AND wait_event_type = 'Lock' AND query ILIKE '%member_nominees%' AND query ILIKE '%for update%') AS blocked`,
          [holderPid],
        );
        blocked = r.rows[0]!.blocked;
        if (!blocked) await delay(10);
      }
      expect(blocked, 'the marks request must pass guardDeclare and wait behind this test’s projection-row lock').toBe(true);
      // The fixture isolates visibility of the real lifecycle event after the row wait. It does not
      // perform a full RTBF or claim to resolve MK2's separately deferred scrub/save race.
      await memberDomain.projectMemberState(holder.client, {
        memberId: ids.memberId(d),
        pariwarId: ids.pariwarId(p),
        eventType: 'member.rtbf_anonymized',
        payload: { from_state: 'active', to_state: 'anonymized', trigger: 'rtbf', actor: 'member' },
        actorId: d,
      });
      await closeScopeTx(holder, true);
      const r = await request;
      expect([r.status, code(r)]).toEqual([409, 'nominee.member_terminal']);
      expect(await versions(d)).toEqual(before.versions);
      expect(await projection(d)).toEqual(before.projection);
      expect(await links(d)).toEqual(before.links);
      expect(await declaredEvents(d)).toEqual(before.events);
      expect(nomineeAudit()).toEqual([]);
      expect(kmsLines).toEqual([]);
    } finally {
      await closeScopeTx(holder, false);
      await request;
    }
  });

  it('R3 / families 3 + 12 — another declarer’s real keep-link is refused within the Pariwar and across Pariwars', async () => {
    const p = randomUUID();
    const q = randomUUID();
    const mobile = nextMobile();
    await member(p, { mobile, name: 'One' });
    const owner = await declared(p, mark(mobile));
    const same = await declared(p, null);
    const cross = await declared(q, null);
    const [theirs] = await live(owner.d);
    const subjects = [owner, same, cross];
    const before = await Promise.all(subjects.map(async ({ d }) => ({ versions: await versions(d), projection: await projection(d), links: await links(d) })));
    t.auditSink.events.length = 0;
    kmsLines.length = 0;
    for (const other of [same, cross]) {
      const r = await call('POST', MARKS, { tok: other.tok, payload: await marksFor(other.tok, { 1: keep(theirs!.link_id) }) });
      expect([r.status, code(r)]).toEqual([409, CODES.linkStale]);
    }
    for (const [i, { d }] of subjects.entries()) {
      expect({ versions: await versions(d), projection: await projection(d), links: await links(d) }).toEqual(before[i]);
    }
    expect(nomineeAudit()).toEqual([]);
    expect(kmsLines).toEqual([]);
  });

  it('R3 / family 3 — missing, tampered, wrong-kind and non-member bearers cannot mutate marks', async () => {
    const p = randomUUID();
    const { d, tok } = await declared(p, null);
    const body = await marksFor(tok, {});
    const before = { versions: await versions(d), projection: await projection(d), links: await links(d), events: await declaredEvents(d) };
    // Keep the signature unchanged while replacing a claim: this must fail JWT verification.
    const [header, encoded, signature] = tok.split('.');
    const payload = JSON.parse(Buffer.from(encoded!, 'base64url').toString('utf8')) as Json;
    const tampered = `${header}.${Buffer.from(JSON.stringify({ ...payload, sub: randomUUID() })).toString('base64url')}.${signature}`;
    const wrongKinds = [
      signSignupContinuation(t.app, { mobileBlindIndex: `idx-${randomUUID()}`, jti: randomUUID() }, ACCESS_TTL_MS),
      signPariwarSelect(t.app, { mobileBlindIndex: `idx-${randomUUID()}`, deviceId: 'test-device', jti: randomUUID() }, ACCESS_TTL_MS),
      // Deliberately outside MemberJwtClaims: the guard must reject it at runtime too.
      t.app.jwt.sign({ typ: 'system', sub: 'system', pariwar_id: p } as never, { expiresIn: 60 }),
    ];
    t.auditSink.events.length = 0;
    kmsLines.length = 0;
    const missing = await call('POST', MARKS, { payload: body });
    expect([missing.status, code(missing)]).toEqual([401, 'auth.session_required']);
    for (const bearer of [tampered, ...wrongKinds]) {
      const r = await call('POST', MARKS, { tok: bearer, payload: body });
      expect([r.status, code(r)]).toEqual([401, 'auth.session_required']);
    }
    // A nonexistent access-token principal has no server-side elevation and is refused before a scope tx.
    const ghost = await call('POST', MARKS, { tok: token(randomUUID(), p), payload: body });
    expect([ghost.status, code(ghost)]).toEqual([403, 'auth.step_up_required']);
    // A real member's elevation does not give their token access to another Pariwar's declaration.
    const wrongScope = await call('POST', MARKS, { tok: token(d, randomUUID()), payload: body });
    expect([wrongScope.status, code(wrongScope)]).toEqual([409, CODES.marksNoDeclaration]);
    expect({ versions: await versions(d), projection: await projection(d), links: await links(d), events: await declaredEvents(d) }).toEqual(before);
    expect(nomineeAudit()).toEqual([]);
    expect(kmsLines).toEqual([]);
  });

  it('AC2 — the 5th lookup in an IST day ⇒ 429 with ⛔ KMS call; a stale `keep` ⇒ 409 `link_stale`', async () => {
    const p = randomUUID();
    const [m1, m2] = [nextMobile(), nextMobile()];
    await member(p, { mobile: m1, name: 'One' });
    await member(p, { mobile: m2, name: 'Two' });
    const { d, tok } = await declared(p, mark(m1), mark(m2)); // 2
    expect((await call('POST', MARKS, { tok, payload: await marksFor(tok, { 1: mark(m2), 2: mark(m1) }) })).status).toBe(200); // 4
    const body = await marksFor(tok, { 1: mark(m1), 2: null });
    kmsLines.length = 0;
    const fifth = await call('POST', MARKS, { tok, payload: body });
    expect([fifth.status, code(fifth)]).toEqual([429, CODES.linkDailyLimit]);
    expect(kmsLines).toEqual([]);
    expect(await counter(d)).toEqual([{ count: 4 }]);
    const stale = await call('POST', MARKS, { tok, payload: await marksFor(tok, { 1: keep(randomUUID()) }) });
    expect([stale.status, code(stale)]).toEqual([409, CODES.linkStale]);
  });

  it('AC2 — an `active-in-grace` declarer: a removal and a `keep` succeed; a `new` mark ⇒ the caller gate\'s 422 (unchanged)', async () => {
    const p = randomUUID();
    const [m1, m2] = [nextMobile(), nextMobile()];
    await member(p, { mobile: m1, name: 'One' });
    await member(p, { mobile: m2, name: 'Two' });
    const { d, tok } = await declared(p, mark(m1), mark(m2));
    await step(p, d, 'member.grace_entered', { from_state: 'active', to_state: 'active-in-grace', trigger: 'grace_entered', actor: 'system' }, null);
    const l1 = (await live(d)).find((l) => l.rank === 1)!;
    const kept = await call('POST', MARKS, { tok, payload: await marksFor(tok, { 1: keep(l1.link_id), 2: null }) });
    expect(kept.status, kept.raw).toBe(200);
    expect((await live(d)).map((l) => l.rank)).toEqual([1]);
    const removed = await call('POST', MARKS, { tok, payload: await marksFor(tok, {}) });
    expect(removed.status, removed.raw).toBe(200);
    expect(await live(d)).toEqual([]);
    const gate = await call('POST', MARKS, { tok, payload: await marksFor(tok, { 1: mark(m2) }) });
    expect([gate.status, code(gate)]).toEqual([422, CODES.linkNotFound]);
  });

  it('AC1 / AC2 — a DETAIL in the body (`name`, `relationship`, `mobile`) ⇒ 400 before any guard; ⛔ write', async () => {
    const p = randomUUID();
    const { d, tok } = await declared(p, null);
    const [b] = await basis(tok);
    for (const extra of [{ name: 'Someone Else' }, { relationship: 'mother' }, { mobile: '9123456789' }]) {
      const r = await call('POST', MARKS, { tok, payload: { marks: [{ rank: 1, versionNo: b!.versionNo, memberLink: null, ...extra }] } });
      expect(r.status, JSON.stringify(extra)).toBe(400);
    }
    const twice = await call('POST', MARKS, { tok, payload: { marks: [{ rank: 1, versionNo: 1, memberLink: null }, { rank: 1, versionNo: 1, memberLink: null }] } });
    expect(twice.status).toBe(400);
    expect((await versions(d)).length).toBe(1);
  });

  it('AC2 — a failure AFTER the link insert rolls the WHOLE marks save back: ⛔ link row, ⛔ version', async () => {
    const p = randomUUID();
    const mobile = nextMobile();
    await member(p, { mobile, name: 'One' });
    const { d, tok } = await declared(p, null);
    const body = await marksFor(tok, { 1: mark(mobile) });
    const tag = randomUUID().replace(/-/g, '').slice(0, 12);
    await t.pool.query(`CREATE FUNCTION test_636f_fail_${tag}() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.pariwar_id = '${p}'::uuid THEN RAISE EXCEPTION 'injected after the link insert'; END IF; RETURN NULL; END $$`);
    await t.pool.query(`CREATE CONSTRAINT TRIGGER test_636f_fail_${tag} AFTER INSERT ON member_nominee_links
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION test_636f_fail_${tag}()`);
    try {
      const r = await call('POST', MARKS, { tok, payload: body });
      expect(r.status).toBe(500);
    } finally {
      await t.pool.query(`DROP TRIGGER test_636f_fail_${tag} ON member_nominee_links`);
      await t.pool.query(`DROP FUNCTION test_636f_fail_${tag}()`);
    }
    expect(await links(d)).toEqual([]);
    expect((await versions(d)).length).toBe(1);
  });

  // ── AC3 — the copy and its readers ─────────────────────────────────────────────────────────────────────────────────

  it('⭐ AC3 / G3 — the COPY: byte-identical ciphertext (NULL stays NULL), the projection unchanged, the copy DECRYPTS to the original (TR2), ⛔ KMS call for the details', async () => {
    const p = randomUUID();
    const mobile = nextMobile();
    await member(p, { mobile, name: 'One' });
    const { d, tok } = await declared(p, null, null);
    const before = await projection(d);
    const body = await marksFor(tok, { 2: mark(mobile) });
    kmsLines.length = 0;
    const r = await call('POST', MARKS, { tok, payload: body });
    expect(r.status, r.raw).toBe(200);
    expect(dekLines()).toEqual([]); // ⛔ encryptDek / decryptDek — only the new mark's HMAC batch
    expect(hmacLines()).toHaveLength(1);
    const copies = (await versions(d)).filter((v) => v.version_no === 2);
    expect(copies.map((c) => c.rank)).toEqual([1, 2]);
    for (const c of copies) {
      const was = before.find((b) => b.rank === c.rank)!;
      expect([c.kind, c.source]).toEqual(['declared', 'member']);
      expect([c.name_ciphertext, c.mobile_ciphertext, c.address_ciphertext, c.relationship, c.split_pct]).toEqual([
        was.name_ciphertext,
        was.mobile_ciphertext,
        was.address_ciphertext,
        was.relationship,
        was.split_pct,
      ]);
    }
    expect(copies[0]!.address_ciphertext).not.toBeNull();
    expect(copies[1]!.address_ciphertext).toBeNull();
    expect(await projection(d)).toEqual(before);
    const enc = t.deps.encryption;
    expect(await decryptNomineeField(copies[0]!.name_ciphertext!, p, enc)).toBe('Asha Devi');
    expect(await decryptNomineeField(copies[0]!.mobile_ciphertext!, p, enc)).toBe('9876543210');
    expect(await decryptNomineeField(copies[1]!.name_ciphertext!, p, enc)).toBe('Ravi Kumar');
  });

  it('AC3 / MK2 — a stored split that disagrees with the derived one ⇒ fail closed (500), ⛔ write', async () => {
    const p = randomUUID();
    const mobile = nextMobile();
    await member(p, { mobile, name: 'One' });
    const { d, tok } = await declared(p, null);
    await t.pool.query(`UPDATE member_nominees SET split_pct = 75 WHERE member_id = $1`, [d]);
    const r = await call('POST', MARKS, { tok, payload: await marksFor(tok, { 1: mark(mobile) }) });
    expect(r.status).toBe(500);
    expect((await versions(d)).length).toBe(1);
    expect(await links(d)).toEqual([]);
  });

  it('AC3 — the READERS see a marks-only version like any member version: the staff warning fires inside its window; the exclusion counts a pre-cut link and ⛔ a post-cut one (V15)', async () => {
    const p = randomUUID();
    const mobile = nextMobile();
    const b = await member(p, { mobile, name: 'One' });
    const { d, tok } = await declared(p, null);
    const r = await call('POST', MARKS, { tok, payload: await marksFor(tok, { 1: mark(mobile) }) });
    expect(r.status, r.raw).toBe(200);
    const [v1, v2] = await versions(d);
    const ms = (x: Date, delta: number) => new Date(x.getTime() + delta);
    const pid = ids.pariwarId(p);
    const mid = ids.memberId(d);
    const warning = (recentFrom: Date, cut: Date) =>
      inScope(p, (s) => claim.getPeerMeshNomineeChangeBeforeFiling(s.tx, { pariwarId: pid, deceasedMemberId: mid, cut: { filingDate: '2026-10-26', cut, recentFrom } as never }));
    // a window that holds ONLY the marks-only version
    expect(await warning(ms(v1!.recorded_at, 1), ms(v2!.recorded_at, 1))).toBe(true);
    expect(await warning(ms(v1!.recorded_at, 1), v2!.recorded_at)).toBe(false);
    const { all, ofLinks } = await inScope(p, async (s) => {
      const all = await nominee.listNomineeDeclarationVersions(s.tx, pid, mid);
      const ofLinks = await nominee.listNomineeLinksOfVersions(s.tx, pid, all.map((v) => v.versionId));
      return { all, ofLinks };
    });
    expect(claim.peerMeshNomineeLinkedMembersAsOf(all, ofLinks, ms(v2!.recorded_at, 1))).toEqual([b]);
    expect(claim.peerMeshNomineeLinkedMembersAsOf(all, ofLinks, v2!.recorded_at)).toEqual([]);
  });

  it('AC3 — the EXPORT (strict contract): the extra `nomineeHistory[]` row, `marked[]` one row per version joinable by (rank, versionNo); the ERASURE scrubs the copies', async () => {
    const p = randomUUID();
    const mobile = nextMobile();
    await member(p, { mobile, name: 'One' });
    const { d, tok } = await declared(p, mark(mobile));
    const [l] = await live(d);
    expect((await call('POST', MARKS, { tok, payload: await marksFor(tok, {}) })).status).toBe(200); // remove
    expect((await call('POST', MARKS, { tok, payload: await marksFor(tok, { 1: mark(mobile) }) })).status).toBe(200); // mark again
    expect(l).toBeDefined();
    const pid = ids.pariwarId(p);
    const mid = ids.memberId(d);
    const sections = await inScope(p, (s) =>
      dataExport.assembleMemberExport(s.tx, t.deps.encryption, { exportId: randomUUID(), memberId: mid, pariwarId: pid, now: new Date() }),
    );
    const profile = ProfileSection.parse(sections['profile.json']);
    expect(JSON.stringify(sections)).not.toMatch(/enc:v\d/); // MK6 — ⛔ a version ciphertext in the export
    expect(profile.nomineeHistory.map((h) => [h.rank, h.versionNo, h.kind, h.source, h.name])).toEqual([
      [1, 1, 'declared', 'member', 'Asha Devi'],
      [1, 2, 'declared', 'member', 'Asha Devi'],
      [1, 3, 'declared', 'member', 'Asha Devi'],
    ]);
    const marked = profile.nomineeLinks.marked;
    expect(marked.map((m) => [m.rank, m.versionNo, m.state])).toEqual([
      [1, 1, 'ended'],
      [1, 3, 'live'],
    ]);
    for (const m of marked) expect(profile.nomineeHistory.some((h) => h.rank === m.rank && h.versionNo === m.versionNo)).toBe(true);
    // the erasure scrubs EVERY declared version's ciphertext — the server copies included
    const before = await versions(d);
    const projected = await projection(d);
    await inScope(p, (s) => memberDomain.anonymizeMember(s.tx, t.deps.encryption, { memberId: mid, pariwarId: pid }));
    const after = await versions(d);
    expect(after).toHaveLength(3);
    for (const v of after) {
      const was = before.find((x) => x.version_id === v.version_id)!;
      expect(v.name_ciphertext).not.toBe(was.name_ciphertext);
      expect(v.mobile_ciphertext).not.toBe(was.mobile_ciphertext);
    }
    // the projection is scrubbed in place (⛔ deleted)
    for (const row of await projection(d)) expect(row.name_ciphertext).not.toBe(projected.find((x) => x.rank === row.rank)!.name_ciphertext);
  });

  // ── AC5 — the event ────────────────────────────────────────────────────────────────────────────────────────────────

  it('AC5 — `member.nominees_declared` is emitted EXACTLY as a full save emits it (same keys, `source: member`, the versions; ⛔ new field)', async () => {
    const p = randomUUID();
    const mobile = nextMobile();
    await member(p, { mobile, name: 'One' });
    const { d, tok } = await declared(p, null, null);
    expect((await call('POST', MARKS, { tok, payload: await marksFor(tok, { 1: mark(mobile) }) })).status).toBe(200);
    const [byFull, byMarks] = await declaredEvents(d);
    expect(Object.keys(byMarks!).sort()).toEqual(Object.keys(byFull!).sort());
    expect(byMarks).toMatchObject({
      trigger: 'nominee_declaration',
      actor: 'member',
      nominee_count: 2,
      split: '75-25',
      source: 'member',
      versions: [
        { rank: 1, version_no: 2, kind: 'declared' },
        { rank: 2, version_no: 2, kind: 'declared' },
      ],
    });
  });

  // ── MK11 — DOCUMENTS today's behaviour (a pre-existing 6.36e edge, ⛔ fixed here — deferred-work carries it) ──────────

  it('MK11 (DOCUMENTS TODAY\'S BEHAVIOUR) — a correction of an OLDER version hides the live link from the links read; a marks-only re-pick re-hangs it on a fresh head (⛔ a no-op loop); a full save ends it `redeclared`', async () => {
    const p = randomUUID();
    const mobile = nextMobile();
    const b = await member(p, { mobile, name: 'One' });
    const { d, tok } = await declared(p, null); // v1
    expect((await call('POST', MARKS, { tok, payload: await marksFor(tok, { 1: mark(mobile) }) })).status).toBe(200); // v2 + link
    const [v1] = await versions(d);
    // A staff correction of the OLDER v1 (reachable for a save only after an innocence unlock): v3, ⛔ projected.
    // ⚠ ONE instant for `recorded_at` and `effective_at` — two `clock_timestamp()` calls differ by µs and trip the CHECK.
    await t.pool.query(
      `INSERT INTO member_nominee_versions (member_id, pariwar_id, rank, version_no, declaration_id, kind, source, name_ciphertext, relationship,
                                            mobile_ciphertext, address_ciphertext, split_pct, recorded_at, effective_at, corrects_version_id)
       SELECT member_id, pariwar_id, rank, 3, gen_random_uuid(), 'declared', 'correction', name_ciphertext, relationship, mobile_ciphertext,
              address_ciphertext, split_pct, c.at, c.at, version_id
         FROM member_nominee_versions, (SELECT clock_timestamp() AS at) c WHERE version_id = $1`,
      [v1!.version_id],
    );
    const read = await call('GET', LINKS, { tok });
    expect(read.body['links']).toEqual([]); // the link on v2 is HIDDEN (the read uses the max version_no, v3)
    expect(read.body['ranks']).toEqual([{ rank: 1, versionNo: 2, relationship: 'spouse' }]); // the basis is the PROJECTED v2
    // a marks-only re-pick: `onHead = false` ⇒ ⛔ "nothing changed" — a fresh head version (v4) and the link carried onto it
    expect((await call('POST', MARKS, { tok, payload: await marksFor(tok, { 1: mark(mobile) }) })).status).toBe(200);
    const [shown] = (await call('GET', LINKS, { tok })).body['links'] as { linkId: string }[];
    expect(shown).toBeDefined();
    expect(await nomineeOf(shown!.linkId)).toBe(b);
    // the same state again, then a FULL save without a mark: the hidden link ends `redeclared` (⛔ `removed_by_declarer`)
    const [, , , v4] = await versions(d);
    await t.pool.query(
      `INSERT INTO member_nominee_versions (member_id, pariwar_id, rank, version_no, declaration_id, kind, source, name_ciphertext, relationship,
                                            mobile_ciphertext, address_ciphertext, split_pct, recorded_at, effective_at, corrects_version_id)
       SELECT member_id, pariwar_id, rank, 5, gen_random_uuid(), 'declared', 'correction', name_ciphertext, relationship, mobile_ciphertext,
              address_ciphertext, split_pct, c.at, c.at, $2
         FROM member_nominee_versions, (SELECT clock_timestamp() AS at) c WHERE version_id = $1`,
      [v4!.version_id, (await versions(d))[2]!.version_id],
    );
    expect((await call('POST', LIFE_EVENTS, { tok, payload: full(null) })).status).toBe(200);
    expect((await links(d)).find((l) => l.link_id === shown!.linkId)).toMatchObject({ state: 'ended', end_reason: 'redeclared' });
  });
});
