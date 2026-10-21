// Story 5.13 (Task 1.3; AC3, AC4; WC2, WC3, WC15–WC17) — the code accessors over `member_wa_opt_in_codes` (migration 0178). Live
// DB; per-test ROLLBACK, run as `twt_app` under the Pariwar scope (RLS applies — T19). ⚠ One BEGIN/ROLLBACK ⇒ one `now()` (T6):
// every expiry / wait leg seeds explicit past timestamps by INSERT (the trigger freezes `expires_at` / `created_at`).
//   · checkCodeSendAllowed — the ONE refusal order; the WC3 wait (rate-limited releases wait, other releases and refusals ⛔).
//   · insertCodeSlot — the LOWEST free seq (⭐ seq 1 sending, seq 2 accepted, seq 1 released ⇒ the next claim takes seq 1, ⛔ 23505).
//   · getCodeState — codesRemaining / liveCode / liveCodeDelivery (the newest live row decides).
//   · recordWrongAttempt — every live row, invalidated at 2, ⛔ live code a no-op; consumeCode — atomic, ⛔ a dead code.

import { createHash, randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { MemberLifecycleState } from '../../../src/schema/members.js';
import { memberId as toMemberId, pariwarId as toPariwarId, type MemberWaOptInId } from '../../../src/ids/index.js';
import {
  checkCodeSendAllowed,
  consumeCode,
  findLiveCodes,
  getCodeState,
  insertCodeSlot,
  recordCodeSendOutcome,
  recordWrongAttempt,
} from '../../../src/wa-opt-in/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const hash = (code: string): string => createHash('sha256').update(code).digest('hex');
const ON = { enabled: true, displayPhoneNumber: '+91 98100 00000' } as const;
const SIGNING_UP: MemberLifecycleState = 'pending-fee';

/** As the superuser: one opt-in row for a fresh member (PENDING by default); then enter `twt_app` under scope A. */
async function seedMember(client: Client, state = 'PENDING') {
  const memberId = toMemberId(randomUUID());
  const { rows } = await client.query<{ opt_in_id: string }>(
    `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index)
     VALUES ($1, $2, $3, $4, $5) RETURNING opt_in_id`,
    [PARIWAR_A, memberId, state, `TWT-${randomUUID().slice(0, 8).toUpperCase()}`, `bidx-${memberId}`],
  );
  return { memberId, optInId: rows[0]!.opt_in_id as MemberWaOptInId, pariwarId: toPariwarId(PARIWAR_A) };
}

/** As the superuser: a code row with explicit (past) timestamps — the wait and expiry legs. */
async function seedCode(
  client: Client,
  m: Awaited<ReturnType<typeof seedMember>>,
  over: { seq?: number; outcome?: string; detail?: string | null; wamid?: string | null; agoSeconds?: number; ttlSeconds?: number; code?: string } = {},
): Promise<string> {
  const ago = over.agoSeconds ?? 120;
  const { rows } = await client.query<{ code_id: string }>(
    `INSERT INTO member_wa_opt_in_codes (pariwar_id, opt_in_id, member_id, send_seq, code_hash, send_outcome, detail, provider_message_id, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, clock_timestamp() - make_interval(secs => $9), clock_timestamp() - make_interval(secs => $9) + make_interval(secs => $10))
     RETURNING code_id`,
    [m.pariwarId, m.optInId, m.memberId, over.seq ?? 1, hash(over.code ?? '111111'), over.outcome ?? 'accepted', over.detail ?? null,
      over.wamid !== undefined ? over.wamid : (over.outcome ?? 'accepted') === 'accepted' ? `wamid.${randomUUID()}` : null, ago, over.ttlSeconds ?? 600],
  );
  return rows[0]!.code_id;
}

describe.skipIf(!hasDatabase)('Story 5.13 — the WhatsApp code accessors (member_wa_opt_in_codes)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐ the refusal ORDER: channel → already_active / not_pending → not_signing_up → yes_ended_before → limit → too_soon', async () => {
    const { client, tx } = getTx();
    const m = await seedMember(client);
    await seedCode(client, m, { seq: 1 });
    await seedCode(client, m, { seq: 2 });
    await client.query(
      `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index) VALUES ($1, $2, 'REVOKED', 'TWT-OLDOLD01', 'x')`,
      [PARIWAR_A, m.memberId],
    );
    const fresh = await seedMember(client);
    const active = await seedMember(client, 'ACTIVE');
    await enterAppScope(client, PARIWAR_A);
    const check = (memberId: typeof m.memberId, memberState: MemberLifecycleState, config: typeof ON | { enabled: boolean; displayPhoneNumber: string | null } | null = ON) =>
      checkCodeSendAllowed(tx, { pariwarId: m.pariwarId, memberId, memberState, config });
    // Everything wrong at once ⇒ the FIRST rule wins, each time one is removed.
    expect(await check(m.memberId, 'active', null)).toMatchObject({ ok: false, refusal: 'channel_unavailable' });
    expect(await check(m.memberId, 'active', { enabled: false, displayPhoneNumber: '+91' })).toMatchObject({ ok: false, refusal: 'channel_unavailable' });
    expect(await check(m.memberId, 'active', { enabled: true, displayPhoneNumber: null })).toMatchObject({ ok: false, refusal: 'channel_unavailable' });
    expect(await check(active.memberId, 'active', { enabled: false, displayPhoneNumber: null })).toMatchObject({ refusal: 'channel_unavailable' });
    expect(await check(active.memberId, 'active')).toMatchObject({ ok: false, refusal: 'already_active' });
    expect(await check(toMemberId(randomUUID()), SIGNING_UP)).toMatchObject({ ok: false, refusal: 'not_pending', pending: null, codeState: null });
    expect(await check(m.memberId, 'active')).toMatchObject({ ok: false, refusal: 'not_signing_up' });
    expect(await check(m.memberId, 'lock-in')).toMatchObject({ ok: false, refusal: 'not_signing_up' });
    expect(await check(m.memberId, 'pending-kyc')).toMatchObject({ ok: false, refusal: 'yes_ended_before' });
    // The fresh member: 0 codes ⇒ allowed; pending-kyc and pending-fee both count as signing up.
    expect(await check(fresh.memberId, 'pending-kyc')).toMatchObject({ ok: true, codeState: { codesRemaining: 2, liveCode: false, retryAfterSeconds: null } });
    expect(await check(fresh.memberId, 'pending-fee')).toMatchObject({ ok: true });
  });

  it('⭐ limit and too_soon — two counted sends ⇒ limit; a send < 60 s ago ⇒ too_soon with a clamped relative wait', async () => {
    const { client, tx } = getTx();
    const spent = await seedMember(client);
    await seedCode(client, spent, { seq: 1, outcome: 'refused', detail: 'recipient:meta_131026' });
    await seedCode(client, spent, { seq: 2, agoSeconds: 5 });
    const recent = await seedMember(client);
    await seedCode(client, recent, { seq: 1, agoSeconds: 15 });
    await enterAppScope(client, PARIWAR_A);
    const check = (memberId: typeof spent.memberId) => checkCodeSendAllowed(tx, { pariwarId: spent.pariwarId, memberId, memberState: SIGNING_UP, config: ON });
    // `limit` before `too_soon`; at 0 remaining the wait is ⛔ reported.
    expect(await check(spent.memberId)).toMatchObject({ ok: false, refusal: 'limit', codeState: { codesRemaining: 0, retryAfterSeconds: null } });
    const r = await check(recent.memberId);
    expect(r).toMatchObject({ ok: false, refusal: 'too_soon', codeState: { codesRemaining: 1, liveCode: true } });
    const wait = r.codeState!.retryAfterSeconds!;
    expect(wait).toBeGreaterThanOrEqual(44);
    expect(wait).toBeLessThanOrEqual(46);
  });

  it('⭐ WC3 — the wait: a rate-limited release waits; a connection-refused release, a scope release and a refused send do ⛔', async () => {
    const { client, tx } = getTx();
    const cases: [string, Record<string, unknown>, boolean][] = [
      ['rate-limited release', { outcome: 'released', detail: 'rate_limited:130429' }, true],
      ['connection refused', { outcome: 'released', detail: 'api_unavailable:000' }, false],
      ['scope release', { outcome: 'released', detail: 'scope:meta_131048' }, false],
      ['refused (counted)', { outcome: 'refused', detail: 'recipient:meta_131026' }, false],
      ['may_have_sent (counted)', { outcome: 'may_have_sent', detail: 'may_have_sent:timeout' }, true],
      ['sending (counted)', { outcome: 'sending' }, true],
    ];
    const seeded: [string, Awaited<ReturnType<typeof seedMember>>, boolean][] = [];
    for (const [name, over, waits] of cases) {
      const m = await seedMember(client);
      await seedCode(client, m, { ...over, agoSeconds: 10 });
      seeded.push([name, m, waits]);
    }
    await enterAppScope(client, PARIWAR_A);
    for (const [name, m, waits] of seeded) {
      const state = await getCodeState(tx, { pariwarId: m.pariwarId, optInId: m.optInId });
      expect(state.retryAfterSeconds === null ? 'none' : 'waits', name).toBe(waits ? 'waits' : 'none');
    }
  });

  it('⭐ the seq rule — seq 1 sending, seq 2 claimed and accepted, seq 1 then released ⇒ the next claim takes seq 1 (⛔ a 23505)', async () => {
    const { client, tx } = getTx();
    const m = await seedMember(client);
    await enterAppScope(client, PARIWAR_A);
    const first = await insertCodeSlot(tx, { ...m, codeHash: hash('111111') });
    expect(first).toMatchObject({ sendSeq: 1, codesRemaining: 1 });
    const second = await insertCodeSlot(tx, { ...m, codeHash: hash('222222') });
    expect(second).toMatchObject({ sendSeq: 2, codesRemaining: 0 });
    expect(await recordCodeSendOutcome(tx, { pariwarId: m.pariwarId, codeId: second.codeId, record: { outcome: 'accepted', providerMessageId: 'wamid.2' } })).toBe(true);
    expect(await recordCodeSendOutcome(tx, { pariwarId: m.pariwarId, codeId: first.codeId, record: { outcome: 'released', detail: 'api_unavailable:000' } })).toBe(true);
    // A recorded outcome is ⛔ recorded again (WHERE send_outcome = 'sending').
    expect(await recordCodeSendOutcome(tx, { pariwarId: m.pariwarId, codeId: first.codeId, record: { outcome: 'refused', detail: 'recipient:meta_131026' } })).toBe(false);
    expect(await getCodeState(tx, { pariwarId: m.pariwarId, optInId: m.optInId })).toMatchObject({ codesRemaining: 1, liveCode: true, liveCodeDelivery: 'sent' });
    const third = await insertCodeSlot(tx, { ...m, codeHash: hash('333333') });
    expect(third).toMatchObject({ sendSeq: 1, codesRemaining: 0 });
    // ⛔ free seq ⇒ an invariant breach, thrown (the caller checks first under the lock).
    await client.query('SAVEPOINT no_free_seq');
    await expect(insertCodeSlot(tx, { ...m, codeHash: hash('444444') })).rejects.toThrow(/free send seq/);
    await client.query('ROLLBACK TO SAVEPOINT no_free_seq');
    // `expires_at − created_at` is EXACTLY ten minutes (one clock read).
    const { rows } = await client.query<{ secs: number }>(
      `SELECT extract(epoch FROM expires_at - created_at)::int AS secs FROM member_wa_opt_in_codes WHERE code_id = $1`,
      [third.codeId],
    );
    expect(rows[0]!.secs).toBe(600);
  });

  it('⭐ getCodeState — liveCodeDelivery: the NEWEST live row decides; an expired, consumed, released or refused row is ⛔ live', async () => {
    const { client, tx } = getTx();
    const a = await seedMember(client);
    await seedCode(client, a, { seq: 1, outcome: 'may_have_sent', detail: 'may_have_sent:timeout', agoSeconds: 200 });
    await seedCode(client, a, { seq: 2, outcome: 'accepted', agoSeconds: 100 });
    const b = await seedMember(client);
    await seedCode(client, b, { seq: 1, outcome: 'accepted', agoSeconds: 200 });
    await seedCode(client, b, { seq: 2, outcome: 'sending', agoSeconds: 100 });
    const expired = await seedMember(client);
    await seedCode(client, expired, { seq: 1, agoSeconds: 700 });
    const refused = await seedMember(client);
    await seedCode(client, refused, { seq: 1, outcome: 'refused', detail: 'unknown_scope:meta_100' });
    await enterAppScope(client, PARIWAR_A);
    const st = (m: typeof a) => getCodeState(tx, { pariwarId: m.pariwarId, optInId: m.optInId });
    expect(await st(a)).toMatchObject({ codesRemaining: 0, liveCode: true, liveCodeDelivery: 'sent' });
    expect(await st(b)).toMatchObject({ codesRemaining: 0, liveCode: true, liveCodeDelivery: 'uncertain' });
    expect(await st(expired)).toMatchObject({ codesRemaining: 1, liveCode: false, liveCodeDelivery: null, retryAfterSeconds: null });
    expect(await st(refused)).toMatchObject({ codesRemaining: 1, liveCode: false, liveCodeDelivery: null, retryAfterSeconds: null });
    expect(await findLiveCodes(tx, { pariwarId: a.pariwarId, optInId: a.optInId })).toHaveLength(2);
    expect(await findLiveCodes(tx, expired)).toHaveLength(0);
  });

  it('⭐ recordWrongAttempt — increments EVERY live code, invalidates each at 2; ⛔ live code is a no-op; consumeCode refuses a dead code', async () => {
    const { client, tx } = getTx();
    const m = await seedMember(client);
    const c1 = await seedCode(client, m, { seq: 1, code: '111111' });
    const c2 = await seedCode(client, m, { seq: 2, code: '222222' });
    await enterAppScope(client, PARIWAR_A);
    expect(await recordWrongAttempt(tx, m)).toEqual({ attemptsRemaining: 1, codesRemaining: 0, liveCode: true });
    const after1 = await client.query<{ attempts: number; dead: boolean }>(
      `SELECT attempts, invalidated_at IS NOT NULL AS dead FROM member_wa_opt_in_codes WHERE opt_in_id = $1 ORDER BY send_seq`, [m.optInId],
    );
    expect(after1.rows).toEqual([{ attempts: 1, dead: false }, { attempts: 1, dead: false }]);
    expect(await recordWrongAttempt(tx, m)).toEqual({ attemptsRemaining: 0, codesRemaining: 0, liveCode: false });
    const after2 = await client.query<{ attempts: number; dead: boolean }>(
      `SELECT attempts, invalidated_at IS NOT NULL AS dead FROM member_wa_opt_in_codes WHERE opt_in_id = $1 ORDER BY send_seq`, [m.optInId],
    );
    expect(after2.rows).toEqual([{ attempts: 2, dead: true }, { attempts: 2, dead: true }]);
    // ⛔ live code ⇒ a no-op (attempts stay 2 — ⛔ a 23514).
    expect(await recordWrongAttempt(tx, m)).toEqual({ attemptsRemaining: 0, codesRemaining: 0, liveCode: false });
    expect(await consumeCode(tx, { pariwarId: m.pariwarId, codeId: c1 })).toBe(false);
    expect(await consumeCode(tx, { pariwarId: m.pariwarId, codeId: c2 })).toBe(false);
  });

  it('⭐ consumeCode — atomic: a live code once (a second consume finds ⛔ row); an expired code ⛔; another Pariwar\'s ⛔', async () => {
    const { client, tx } = getTx();
    const m = await seedMember(client);
    const live = await seedCode(client, m, { seq: 1 });
    const old = await seedMember(client);
    const expired = await seedCode(client, old, { seq: 1, agoSeconds: 700 });
    // Another Pariwar's code — invisible under scope A (RLS) and filtered by pariwar_id.
    const bMember = toMemberId(randomUUID());
    const bOpt = await client.query<{ opt_in_id: string }>(
      `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index) VALUES ($1, $2, 'PENDING', $3, 'b') RETURNING opt_in_id`,
      [PARIWAR_B, bMember, `TWT-${randomUUID().slice(0, 8).toUpperCase()}`],
    );
    const bCode = await seedCode(client, { pariwarId: toPariwarId(PARIWAR_B), memberId: bMember, optInId: bOpt.rows[0]!.opt_in_id as MemberWaOptInId }, { seq: 1 });
    await enterAppScope(client, PARIWAR_A);
    expect(await consumeCode(tx, { pariwarId: m.pariwarId, codeId: live })).toBe(true);
    expect(await consumeCode(tx, { pariwarId: m.pariwarId, codeId: live })).toBe(false);
    expect(await getCodeState(tx, m)).toMatchObject({ liveCode: false, codesRemaining: 1 });
    expect(await consumeCode(tx, { pariwarId: old.pariwarId, codeId: expired })).toBe(false);
    expect(await consumeCode(tx, { pariwarId: toPariwarId(PARIWAR_B), codeId: bCode })).toBe(false);
    expect(await consumeCode(tx, { pariwarId: m.pariwarId, codeId: bCode })).toBe(false);
  });
});
