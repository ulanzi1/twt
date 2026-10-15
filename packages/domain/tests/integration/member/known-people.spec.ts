// Story 6.36b — PEOPLE WHO KNOW ME, the domain (Task 2; AC2–AC8, AC10, AC12). Live DB; per-test ROLLBACK; every call
// runs as `twt_app` IN SCOPE (RLS on), the seeds as the superuser. Blind indexes are opaque strings here (⛔ KMS — the
// batch path is unit-tested in `tests/encryption/blind-index-many.test.ts`).
//   · matching: positions only; ONE predicate (active · ⛔ a claim naming them · ⛔ the caller); ⛔ another Pariwar's
//     member with the same index; an erased member (index RETAINED) ⛔ matched; duplicates; ⛔ a write but the counters;
//   · the counters: ⛔ charged for a non-active caller; 3 a day; 2,000 / rolling 30 IST days; 100,000 / Pariwar / day;
//     10 asks a day;
//   · asking: created / existing / self / ONE not_a_member / the re-ask rule (declined, lapsed, withdrawn — ⛔ removed) /
//     the cap; a stale ask lapsed first, dated asked_at + 30 days;
//   · the lists' labels and `freeSlots`; answering, removing, withdrawing; the erasure arm; the export reads.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { knownPersonLinkId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { KnownPersonLinkId, MemberId, PariwarId } from '../../../src/ids/index.js';
import { createFakeKmsProvider, mobileBlindIndex } from '../../../src/encryption/index.js';
import {
  askKnownPerson,
  matchContactNumbers,
  answerKnownPersonRequest,
  chargeContactMatch,
  chargeKnownPersonAsk,
  eraseKnownPeopleLinks,
  getKnownPeopleForExport,
  listMyKnownPeople,
  listRequestsNamingMe,
  matchedContactPositions,
  normaliseContactNumbers,
  removeKnownPerson,
  withdrawKnownPerson,
} from '../../../src/member/known-people.js';
import type { MemberLifecycleState } from '../../../src/schema/members.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope, seedClaim, seedMember } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];
const DAY = 24 * 60 * 60 * 1000;

/** A member with an identity row whose blind index is `index` (an opaque string — the number never appears). */
async function memberWithIndex(pariwarId: string, index: string, state: MemberLifecycleState = 'active'): Promise<MemberId> {
  const { tx, client } = getTx();
  const id = await seedMember(tx, pariwarId, { state });
  await client.query(
    `INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index) VALUES ($1, $2, 'enc:v1:x', $3)`,
    [id, pariwarId, index],
  );
  return toMemberId(id);
}

const idx = () => `idx-${randomUUID()}`;

/** Seed a link directly (superuser), with explicit dates. */
async function seedLink(
  client: Client,
  l: { pariwarId: string; namer: string; named: string; state?: string; askedAgoDays?: number; respondedAgoDays?: number | null; endedAgoDays?: number | null },
): Promise<KnownPersonLinkId> {
  const id = randomUUID();
  const ago = (d: number | null | undefined) => (d === null || d === undefined ? null : new Date(Date.now() - d * DAY));
  await client.query(
    `INSERT INTO member_known_people (link_id, pariwar_id, namer_member_id, named_member_id, found_by, state, asked_at, responded_at, ended_at)
     VALUES ($1, $2, $3, $4, 'contacts', $5, $6, $7, $8)`,
    [id, l.pariwarId, l.namer, l.named, l.state ?? 'asked', ago(l.askedAgoDays ?? 0.001), ago(l.respondedAgoDays), ago(l.endedAgoDays)],
  );
  return knownPersonLinkId(id);
}

async function linkRow(client: Client, linkId: string) {
  const { rows } = await client.query<{ state: string; asked_at: Date; ended_at: Date | null; responded_at: Date | null }>(
    `SELECT state, asked_at, ended_at, responded_at FROM member_known_people WHERE link_id = $1`,
    [linkId],
  );
  return rows[0];
}

function freshPariwar(): PariwarId {
  return toPariwarId(randomUUID());
}

describe.skipIf(!hasDatabase)('Story 6.36b — known people (domain)', { timeout: 20000 }, () => {
  setupLiveDb();

  describe('matching (AC3)', () => {
    it('returns ONLY the positions of eligible members of the CALLER\'S Pariwar — ⛔ an id, ⛔ a name', async () => {
      const { tx, client } = getTx();
      const p = freshPariwar();
      const other = freshPariwar();
      const [iCaller, iActive, iPending, iWithdrawn, iErased, iDead, iForeign, iGrace] = Array.from({ length: 8 }, idx);
      const caller = await memberWithIndex(p, iCaller!);
      await memberWithIndex(p, iActive!);
      await memberWithIndex(p, iPending!, 'pending-fee');
      await memberWithIndex(p, iWithdrawn!, 'withdrawn');
      await memberWithIndex(p, iErased!, 'anonymized'); // erasure RETAINS the index — the state join keeps them out
      const dead = await memberWithIndex(p, iDead!);
      await seedClaim(tx, p, { deceasedMemberId: dead, currentState: 'closed' }); // a claim in ANY state
      await memberWithIndex(other, iForeign!); // ⛔ another Pariwar's member, even one whose number is submitted
      await memberWithIndex(p, iGrace!, 'active-in-grace');
      await enterAppScope(client, p);
      // Positions 0..8: the caller, a match, five non-eligible, an unknown, a DUPLICATE of the match.
      const submitted = [iCaller!, iActive!, iPending!, iWithdrawn!, iErased!, iDead!, iForeign!, iGrace!, idx(), iActive!];
      const normalised = { distinct: [...new Set(submitted)], positions: [] as number[][] };
      normalised.positions = normalised.distinct.map((d) => submitted.flatMap((s, i) => (s === d ? [i] : [])));
      const positions = await matchedContactPositions(tx, { pariwarId: p, callerMemberId: caller, normalised, indexes: normalised.distinct });
      expect(positions).toEqual([1, 9]);
      // ⛔ nothing written
      expect((await client.query(`SELECT 1 FROM member_known_people WHERE pariwar_id = $1`, [p])).rows).toHaveLength(0);
    });

    it('matchContactNumbers end to end: charge → the batch HMACs (ONE audit line) → positions; a refusal moves ⛔ no counter', async () => {
      const { tx, client } = getTx();
      const audits: unknown[] = [];
      const base = createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(3), hmacKeyBytes: new Uint8Array(32).fill(5) });
      const enc = { kms: { ...base, auditHook: (_op: string, _ref: unknown, ctx: unknown) => audits.push(ctx) } as typeof base, kekRef: { resourceName: 'fake:k' }, hmacKeyRef: { resourceName: 'fake:h' } };
      const p = freshPariwar();
      const caller = await memberWithIndex(p, (await mobileBlindIndex('9000000001', enc))!);
      await memberWithIndex(p, (await mobileBlindIndex('9000000002', enc))!);
      audits.length = 0;
      await enterAppScope(client, p);
      const inScope = async <T,>(fn: (db: typeof tx) => Promise<T>): Promise<T> => {
        await client.query('SAVEPOINT scope');
        try {
          const out = await fn(tx);
          await client.query('RELEASE SAVEPOINT scope');
          return out;
        } catch (err) {
          await client.query('ROLLBACK TO SAVEPOINT scope');
          throw err;
        }
      };
      const numbers = ['+91 90000 00002', 'not a number', '09000000001', '9000000003'];
      const r = await matchContactNumbers({ pariwarId: p, callerMemberId: caller, numbers, enc, inScope });
      expect(r).toEqual({ kind: 'matched', positions: [0], submitted: 4, checked: 3 });
      expect(audits).toEqual([{ pariwarId: p, fieldClass: 'member_mobile', count: 3, purpose: 'contact_match' }]);
      const counters = async () =>
        (await client.query(`SELECT counter, count FROM member_daily_counters WHERE member_id = $1 ORDER BY counter`, [caller])).rows;
      expect(await counters()).toEqual([{ counter: 'contact_match_numbers', count: 3 }, { counter: 'contact_match_requests', count: 1 }]);
      // the monthly cap refuses — and the request counter does ⛔ move (the scope rolled back); ⛔ an HMAC
      await client.query(
        `UPDATE member_daily_counters SET count = 1999 WHERE member_id = $1 AND counter = 'contact_match_numbers'`,
        [caller],
      );
      audits.length = 0;
      expect(await matchContactNumbers({ pariwarId: p, callerMemberId: caller, numbers, enc, inScope })).toEqual({ kind: 'refused', reason: 'monthly_limit' });
      expect(audits).toEqual([]);
      expect(await counters()).toEqual([{ counter: 'contact_match_numbers', count: 1999 }, { counter: 'contact_match_requests', count: 1 }]);
    });

    it('normaliseContactNumbers: an entry that does ⛔ not normalise is dropped; duplicates share one HMAC', () => {
      const n = normaliseContactNumbers(['+91 98765 43210', '9876543210', '12345', '०९८७६५४३२१०', '919876543210', '+1 555 0100']);
      expect(n.distinct).toEqual(['+919876543210']);
      expect(n.positions).toEqual([[0, 1, 4]]);
    });
  });

  describe('the counters (AC3, AC5, AC10)', () => {
    it('a non-active caller is refused BEFORE any counter is charged', async () => {
      const { tx, client } = getTx();
      const p = freshPariwar();
      const pending = await memberWithIndex(p, idx(), 'pending-fee');
      await enterAppScope(client, p);
      expect(await chargeContactMatch(tx, { pariwarId: p, memberId: pending, numbers: 5 })).toEqual({ ok: false, reason: 'not_available' });
      expect(await chargeKnownPersonAsk(tx, { pariwarId: p, memberId: pending })).toEqual({ ok: false, reason: 'not_available' });
      expect((await client.query(`SELECT 1 FROM member_daily_counters WHERE member_id = $1`, [pending])).rows).toHaveLength(0);
    });

    it('3 matching requests a day; the 4th refused', async () => {
      const { tx, client } = getTx();
      const p = freshPariwar();
      const m = await memberWithIndex(p, idx());
      await enterAppScope(client, p);
      for (let i = 0; i < 3; i += 1) expect(await chargeContactMatch(tx, { pariwarId: p, memberId: m, numbers: 10 })).toEqual({ ok: true });
      expect(await chargeContactMatch(tx, { pariwarId: p, memberId: m, numbers: 10 })).toEqual({ ok: false, reason: 'daily_limit' });
    });

    it('2,000 numbers in a rolling 30 IST days — counted across days; a day 30 days back no longer counts', async () => {
      const { tx, client } = getTx();
      const p = freshPariwar();
      const m = await memberWithIndex(p, idx());
      const ins = `INSERT INTO member_daily_counters (pariwar_id, member_id, counter, day, count)
        VALUES ($1, $2, 'contact_match_numbers', ((clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::date - $3::int), $4)`;
      await client.query(ins, [p, m, 29, 1500]); // inside the window
      await client.query(ins, [p, m, 30, 1000]); // just outside
      await enterAppScope(client, p);
      expect(await chargeContactMatch(tx, { pariwarId: p, memberId: m, numbers: 501 })).toEqual({ ok: false, reason: 'monthly_limit' });
      expect(await chargeContactMatch(tx, { pariwarId: p, memberId: m, numbers: 500 })).toEqual({ ok: true });
    });

    it('100,000 numbers per Pariwar per IST day ⇒ busy', async () => {
      const { tx, client } = getTx();
      const p = freshPariwar();
      const m = await memberWithIndex(p, idx());
      await client.query(
        `INSERT INTO pariwar_daily_counters (pariwar_id, counter, day, count) VALUES ($1, 'contact_match_numbers', (clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::date, 99990)`,
        [p],
      );
      await enterAppScope(client, p);
      expect(await chargeContactMatch(tx, { pariwarId: p, memberId: m, numbers: 11 })).toEqual({ ok: false, reason: 'busy' });
      expect(await chargeContactMatch(tx, { pariwarId: p, memberId: m, numbers: 10 })).toEqual({ ok: true });
    });

    it('10 asks a day; the 11th refused', async () => {
      const { tx, client } = getTx();
      const p = freshPariwar();
      const m = await memberWithIndex(p, idx());
      await enterAppScope(client, p);
      for (let i = 0; i < 10; i += 1) expect(await chargeKnownPersonAsk(tx, { pariwarId: p, memberId: m })).toEqual({ ok: true });
      expect(await chargeKnownPersonAsk(tx, { pariwarId: p, memberId: m })).toEqual({ ok: false, reason: 'daily_limit' });
    });
  });

  describe('asking (AC2, AC5)', () => {
    it('created; the same live person again ⇒ the SAME link (⛔ a second row); oneself ⇒ self', async () => {
      const { tx, client } = getTx();
      const p = freshPariwar();
      const iNamer = idx();
      const iB = idx();
      const namer = await memberWithIndex(p, iNamer);
      const b = await memberWithIndex(p, iB);
      await enterAppScope(client, p);
      const first = await askKnownPerson(tx, { pariwarId: p, namerMemberId: namer, namedIndex: iB, foundBy: 'contacts' });
      expect(first.kind).toBe('created');
      const again = await askKnownPerson(tx, { pariwarId: p, namerMemberId: namer, namedIndex: iB, foundBy: 'typed' });
      expect(again).toEqual({ kind: 'existing', link: (first as { link: unknown }).link });
      expect((first as { link: { namedMemberId: string } }).link.namedMemberId).toBe(b);
      expect(await askKnownPerson(tx, { pariwarId: p, namerMemberId: namer, namedIndex: iNamer, foundBy: 'typed' })).toEqual({ kind: 'refused', reason: 'self' });
      expect((await client.query(`SELECT 1 FROM member_known_people WHERE namer_member_id = $1`, [namer])).rows).toHaveLength(1);
    });

    it('ONE not_a_member for: unknown, pending, withdrawn, erased, reported dead, another Pariwar\'s — and a null index', async () => {
      const { tx, client } = getTx();
      const p = freshPariwar();
      const other = freshPariwar();
      const namer = await memberWithIndex(p, idx());
      const iPending = idx();
      const iWithdrawn = idx();
      const iErased = idx();
      const iDead = idx();
      const iForeign = idx();
      await memberWithIndex(p, iPending, 'pending-kyc');
      await memberWithIndex(p, iWithdrawn, 'withdrawn');
      await memberWithIndex(p, iErased, 'anonymized');
      const dead = await memberWithIndex(p, iDead);
      await seedClaim(tx, p, { deceasedMemberId: dead });
      await memberWithIndex(other, iForeign);
      await enterAppScope(client, p);
      for (const namedIndex of [idx(), iPending, iWithdrawn, iErased, iDead, iForeign, null]) {
        expect(await askKnownPerson(tx, { pariwarId: p, namerMemberId: namer, namedIndex, foundBy: 'contacts' })).toEqual({ kind: 'refused', reason: 'not_a_member' });
      }
    });

    it('a non-active namer ⇒ not_available', async () => {
      const { tx, client } = getTx();
      const p = freshPariwar();
      const namer = await memberWithIndex(p, idx(), 'active-in-grace');
      const iB = idx();
      await memberWithIndex(p, iB);
      await enterAppScope(client, p);
      expect(await askKnownPerson(tx, { pariwarId: p, namerMemberId: namer, namedIndex: iB, foundBy: 'contacts' })).toEqual({ kind: 'refused', reason: 'not_available' });
    });

    it('the re-ask rule: declined, lapsed, withdrawn ⇒ cannot_ask_now until ended_at + 60 days; ⛔ a removed link', async () => {
      const { tx, client } = getTx();
      const p = freshPariwar();
      const namer = await memberWithIndex(p, idx());
      const cases: { seed: Partial<Parameters<typeof seedLink>[1]>; refused: boolean }[] = [
        { seed: { state: 'declined', askedAgoDays: 10, respondedAgoDays: 9, endedAgoDays: 9 }, refused: true },
        { seed: { state: 'declined', askedAgoDays: 70, respondedAgoDays: 61, endedAgoDays: 61 }, refused: false },
        { seed: { state: 'lapsed', askedAgoDays: 80, endedAgoDays: 50 }, refused: true },
        { seed: { state: 'lapsed', askedAgoDays: 95, endedAgoDays: 65 }, refused: false },
        { seed: { state: 'withdrawn', askedAgoDays: 40, respondedAgoDays: 35, endedAgoDays: 5 }, refused: true },
        { seed: { state: 'removed', askedAgoDays: 3, endedAgoDays: 1 }, refused: false },
        { seed: { state: 'asked', askedAgoDays: 31 }, refused: true }, // a STALE ask — lapsed first (ended 1 day ago) ⇒ refused
      ];
      for (const c of cases) {
        const iB = idx();
        const b = await memberWithIndex(p, iB);
        await seedLink(client, { pariwarId: p, namer: namer, named: b, ...c.seed });
        await client.query('SAVEPOINT s');
        await enterAppScope(client, p);
        const r = await askKnownPerson(tx, { pariwarId: p, namerMemberId: namer, namedIndex: iB, foundBy: 'contacts' });
        expect(r.kind === 'refused' ? r.reason : r.kind, JSON.stringify(c.seed)).toBe(c.refused ? 'cannot_ask_now' : 'created');
        await client.query('ROLLBACK TO SAVEPOINT s');
      }
    });

    it('the cap: three live ⇒ limit_reached; a STALE ask is lapsed first (dated asked_at + 30 days) and frees its slot', async () => {
      const { tx, client } = getTx();
      const p = freshPariwar();
      const namer = await memberWithIndex(p, idx());
      const [b, c, d] = [await memberWithIndex(p, idx()), await memberWithIndex(p, idx()), await memberWithIndex(p, idx())];
      await seedLink(client, { pariwarId: p, namer, named: b, state: 'accepted', askedAgoDays: 5, respondedAgoDays: 4 });
      await seedLink(client, { pariwarId: p, namer, named: c });
      const stale = await seedLink(client, { pariwarId: p, namer, named: d, askedAgoDays: 31 });
      const iE = idx();
      await memberWithIndex(p, iE);
      const iF = idx();
      await memberWithIndex(p, iF);
      await enterAppScope(client, p);
      expect((await askKnownPerson(tx, { pariwarId: p, namerMemberId: namer, namedIndex: iE, foundBy: 'picker' })).kind).toBe('created');
      const lapsed = await linkRow(client, stale);
      expect(lapsed?.state).toBe('lapsed');
      expect(lapsed!.ended_at!.getTime() - lapsed!.asked_at.getTime()).toBe(30 * DAY);
      expect(await askKnownPerson(tx, { pariwarId: p, namerMemberId: namer, namedIndex: iF, foundBy: 'picker' })).toEqual({ kind: 'refused', reason: 'limit_reached' });
    });
  });

  describe('the namer\'s list (AC7, AC8)', () => {
    it('labels: asked · accepted · unavailable (withdrawn from the Trust, or a claim) · not_accepted for 30 days · ⛔ removed, erased, old', async () => {
      const { tx, client } = getTx();
      const p = freshPariwar();
      const namer = await memberWithIndex(p, idx());
      const m = async (state: MemberLifecycleState = 'active') => memberWithIndex(p, idx(), state);
      const asked = await seedLink(client, { pariwarId: p, namer, named: await m() });
      const accepted = await seedLink(client, { pariwarId: p, namer, named: await m(), state: 'accepted', askedAgoDays: 3, respondedAgoDays: 2 });
      // a named person who is merely LATE with a renewal (accepted while active; seeded in grace)
      const grace = await seedLink(client, { pariwarId: p, namer, named: await m('active-in-grace'), state: 'accepted', askedAgoDays: 3, respondedAgoDays: 2 });
      // A second namer holds the two `unavailable` links (the backstop allows three live per namer).
      const namer2 = await m();
      const withdrawnFromTrust = await seedLink(client, { pariwarId: p, namer: namer2, named: await m('withdrawn'), state: 'accepted', askedAgoDays: 9, respondedAgoDays: 8 });
      const deadMember = await m();
      await seedClaim(tx, p, { deceasedMemberId: deadMember });
      const dead = await seedLink(client, { pariwarId: p, namer: namer2, named: deadMember, state: 'accepted', askedAgoDays: 9, respondedAgoDays: 8 });
      const declined = await seedLink(client, { pariwarId: p, namer, named: await m(), state: 'declined', askedAgoDays: 5, respondedAgoDays: 4, endedAgoDays: 4 });
      const oldDecline = await seedLink(client, { pariwarId: p, namer, named: await m(), state: 'declined', askedAgoDays: 40, respondedAgoDays: 31, endedAgoDays: 31 });
      // Unrecorded stale asks are still `asked` by STATE (the backstop counts them) — a third namer holds them.
      const namer3 = await m();
      const staleAsk = await seedLink(client, { pariwarId: p, namer: namer3, named: await m(), askedAgoDays: 45 }); // lapsed at day 30 ⇒ shown until day 60
      const oldStaleAsk = await seedLink(client, { pariwarId: p, namer: namer3, named: await m(), askedAgoDays: 61 });
      const withdrawnLink = await seedLink(client, { pariwarId: p, namer, named: await m(), state: 'withdrawn', askedAgoDays: 20, respondedAgoDays: 19, endedAgoDays: 1 });
      const removed = await seedLink(client, { pariwarId: p, namer, named: await m(), state: 'removed', askedAgoDays: 2, endedAgoDays: 1 });
      const erased = await seedLink(client, { pariwarId: p, namer, named: await m(), state: 'erased', askedAgoDays: 2, endedAgoDays: 1 });
      await enterAppScope(client, p);
      const list = await listMyKnownPeople(tx, { pariwarId: p, namerMemberId: namer });
      const list2 = await listMyKnownPeople(tx, { pariwarId: p, namerMemberId: namer2 });
      const list3 = await listMyKnownPeople(tx, { pariwarId: p, namerMemberId: namer3 });
      const label = new Map([...list.items, ...list2.items, ...list3.items].map((i) => [i.linkId, i.label]));
      expect(label.get(asked)).toBe('asked');
      expect(label.get(accepted)).toBe('accepted');
      expect(label.get(grace)).toBe('accepted'); // ⛔ never a late renewal
      expect(label.get(withdrawnFromTrust)).toBe('unavailable');
      expect(label.get(dead)).toBe('unavailable'); // the SAME label — ⛔ why
      expect(label.get(declined)).toBe('not_accepted');
      expect(label.get(staleAsk)).toBe('not_accepted');
      expect(label.get(withdrawnLink)).toBe('not_accepted');
      for (const gone of [oldDecline, oldStaleAsk, removed, erased]) expect(label.has(gone)).toBe(false);
      // ONLY `accepted` carries the member id the handler resolves the name from
      for (const i of [...list.items, ...list2.items]) expect(i.namedMemberId !== null).toBe(i.label === 'accepted');
      expect(list.freeSlots).toBe(0); // asked + accepted + grace
      expect(list2.freeSlots).toBe(1); // the two `unavailable` keep their slots until removed
      expect(list3.freeSlots).toBe(3); // stale asks free their slots
    });

    it('freeSlots counts asked + accepted (unavailable included) — a stale ask frees its slot', async () => {
      const { tx, client } = getTx();
      const p = freshPariwar();
      const namer = await memberWithIndex(p, idx());
      await seedLink(client, { pariwarId: p, namer, named: await memberWithIndex(p, idx()) });
      await seedLink(client, { pariwarId: p, namer, named: await memberWithIndex(p, idx()), askedAgoDays: 31 });
      await enterAppScope(client, p);
      expect((await listMyKnownPeople(tx, { pariwarId: p, namerMemberId: namer })).freeSlots).toBe(2);
    });
  });

  describe('the named member (AC6, AC8)', () => {
    it('requests naming me: open asks and accepted ones; ⛔ declined, lapsed, stale, removed, withdrawn, erased', async () => {
      const { tx, client } = getTx();
      const p = freshPariwar();
      const me = await memberWithIndex(p, idx());
      const n = async () => memberWithIndex(p, idx());
      const open = await seedLink(client, { pariwarId: p, namer: await n(), named: me });
      const accepted = await seedLink(client, { pariwarId: p, namer: await n(), named: me, state: 'accepted', askedAgoDays: 2, respondedAgoDays: 1 });
      await seedLink(client, { pariwarId: p, namer: await n(), named: me, state: 'declined', askedAgoDays: 2, respondedAgoDays: 1, endedAgoDays: 1 });
      await seedLink(client, { pariwarId: p, namer: await n(), named: me, askedAgoDays: 31 });
      await seedLink(client, { pariwarId: p, namer: await n(), named: me, state: 'removed', askedAgoDays: 2, endedAgoDays: 1 });
      await seedLink(client, { pariwarId: p, namer: await n(), named: me, state: 'withdrawn', askedAgoDays: 4, respondedAgoDays: 3, endedAgoDays: 1 });
      await enterAppScope(client, p);
      const reqs = await listRequestsNamingMe(tx, { pariwarId: p, namedMemberId: me });
      expect(new Map(reqs.map((r) => [r.linkId, r.state]))).toEqual(new Map([[open, 'asked'], [accepted, 'accepted']]));
    });

    it('answer: accept / decline; a stale or answered request ⇒ request_closed (the stale one recorded lapsed); ⛔ mine ⇒ not_found', async () => {
      const { tx, client } = getTx();
      const p = freshPariwar();
      const me = await memberWithIndex(p, idx());
      const someoneElse = await memberWithIndex(p, idx());
      const a = await seedLink(client, { pariwarId: p, namer: await memberWithIndex(p, idx()), named: me });
      const d = await seedLink(client, { pariwarId: p, namer: await memberWithIndex(p, idx()), named: me });
      const stale = await seedLink(client, { pariwarId: p, namer: await memberWithIndex(p, idx()), named: me, askedAgoDays: 30.01 });
      const notMine = await seedLink(client, { pariwarId: p, namer: await memberWithIndex(p, idx()), named: someoneElse });
      await enterAppScope(client, p);
      expect((await answerKnownPersonRequest(tx, { pariwarId: p, namedMemberId: me, linkId: a, answer: 'accept' })).kind).toBe('done');
      expect((await linkRow(client, a))?.state).toBe('accepted');
      expect((await answerKnownPersonRequest(tx, { pariwarId: p, namedMemberId: me, linkId: d, answer: 'decline' })).kind).toBe('done');
      const declined = await linkRow(client, d);
      expect(declined?.state).toBe('declined');
      expect(declined?.ended_at).not.toBeNull();
      expect(await answerKnownPersonRequest(tx, { pariwarId: p, namedMemberId: me, linkId: a, answer: 'decline' })).toEqual({ kind: 'refused', reason: 'request_closed' });
      expect(await answerKnownPersonRequest(tx, { pariwarId: p, namedMemberId: me, linkId: stale, answer: 'accept' })).toEqual({ kind: 'refused', reason: 'request_closed' });
      expect((await linkRow(client, stale))?.state).toBe('lapsed');
      expect(await answerKnownPersonRequest(tx, { pariwarId: p, namedMemberId: me, linkId: notMine, answer: 'accept' })).toEqual({ kind: 'refused', reason: 'not_found' });
      expect(await answerKnownPersonRequest(tx, { pariwarId: p, namedMemberId: me, linkId: knownPersonLinkId(randomUUID()), answer: 'accept' })).toEqual({ kind: 'refused', reason: 'not_found' });
    });

    it('a non-active named member ⇒ not_available', async () => {
      const { tx, client } = getTx();
      const p = freshPariwar();
      const me = await memberWithIndex(p, idx(), 'lapsed-unpaid');
      const a = await seedLink(client, { pariwarId: p, namer: await memberWithIndex(p, idx()), named: me });
      await enterAppScope(client, p);
      expect(await answerKnownPersonRequest(tx, { pariwarId: p, namedMemberId: me, linkId: a, answer: 'accept' })).toEqual({ kind: 'refused', reason: 'not_available' });
    });

    it('withdraw: ONLY an accepted link ⇒ withdrawn; the namer then reads not_accepted', async () => {
      const { tx, client } = getTx();
      const p = freshPariwar();
      const me = await memberWithIndex(p, idx());
      const namer = await memberWithIndex(p, idx());
      const acc = await seedLink(client, { pariwarId: p, namer, named: me, state: 'accepted', askedAgoDays: 2, respondedAgoDays: 1 });
      const asked = await seedLink(client, { pariwarId: p, namer: await memberWithIndex(p, idx()), named: me });
      await enterAppScope(client, p);
      expect(await withdrawKnownPerson(tx, { pariwarId: p, namedMemberId: me, linkId: asked })).toEqual({ kind: 'refused', reason: 'not_found' });
      expect((await withdrawKnownPerson(tx, { pariwarId: p, namedMemberId: me, linkId: acc })).kind).toBe('done');
      const list = await listMyKnownPeople(tx, { pariwarId: p, namerMemberId: namer });
      expect(list.items.find((i) => i.linkId === acc)?.label).toBe('not_accepted');
    });
  });

  describe('remove (AC7)', () => {
    it('a live link ⇒ removed (it leaves the named member\'s list); an ended one, or another namer\'s ⇒ not_found', async () => {
      const { tx, client } = getTx();
      const p = freshPariwar();
      const namer = await memberWithIndex(p, idx());
      const named = await memberWithIndex(p, idx());
      const acc = await seedLink(client, { pariwarId: p, namer, named, state: 'accepted', askedAgoDays: 2, respondedAgoDays: 1 });
      const ended = await seedLink(client, { pariwarId: p, namer, named: await memberWithIndex(p, idx()), state: 'declined', askedAgoDays: 2, respondedAgoDays: 1, endedAgoDays: 1 });
      const others = await seedLink(client, { pariwarId: p, namer: await memberWithIndex(p, idx()), named: await memberWithIndex(p, idx()) });
      await enterAppScope(client, p);
      expect((await removeKnownPerson(tx, { pariwarId: p, namerMemberId: namer, linkId: acc })).kind).toBe('done');
      expect((await linkRow(client, acc))?.state).toBe('removed');
      expect(await listRequestsNamingMe(tx, { pariwarId: p, namedMemberId: named })).toEqual([]);
      expect(await removeKnownPerson(tx, { pariwarId: p, namerMemberId: namer, linkId: ended })).toEqual({ kind: 'refused', reason: 'not_found' });
      expect(await removeKnownPerson(tx, { pariwarId: p, namerMemberId: namer, linkId: others })).toEqual({ kind: 'refused', reason: 'not_found' });
    });
  });

  describe('erasure and export (AC12)', () => {
    it('eraseKnownPeopleLinks ends every LIVE link as namer OR named (a stale ask lapsed); ended links untouched; ⛔ deleted', async () => {
      const { tx, client } = getTx();
      const p = freshPariwar();
      const gone = await memberWithIndex(p, idx(), 'withdrawn');
      const asNamer = await seedLink(client, { pariwarId: p, namer: gone, named: await memberWithIndex(p, idx()) });
      const asNamed = await seedLink(client, { pariwarId: p, namer: await memberWithIndex(p, idx()), named: gone, state: 'accepted', askedAgoDays: 2, respondedAgoDays: 1 });
      const stale = await seedLink(client, { pariwarId: p, namer: gone, named: await memberWithIndex(p, idx()), askedAgoDays: 33 });
      const declined = await seedLink(client, { pariwarId: p, namer: gone, named: await memberWithIndex(p, idx()), state: 'declined', askedAgoDays: 3, respondedAgoDays: 2, endedAgoDays: 2 });
      await enterAppScope(client, p);
      await eraseKnownPeopleLinks(tx, { pariwarId: p, memberId: gone });
      expect((await linkRow(client, asNamer))?.state).toBe('erased');
      expect((await linkRow(client, asNamed))?.state).toBe('erased');
      const lapsed = await linkRow(client, stale);
      expect(lapsed?.state).toBe('lapsed');
      expect(lapsed!.ended_at!.getTime() - lapsed!.asked_at.getTime()).toBe(30 * DAY);
      expect((await linkRow(client, declined))?.state).toBe('declined');
    });

    it('getKnownPeopleForExport: the people I named and the members who named me — every state', async () => {
      const { tx, client } = getTx();
      const p = freshPariwar();
      const me = await memberWithIndex(p, idx());
      const b = await memberWithIndex(p, idx());
      const c = await memberWithIndex(p, idx());
      await seedLink(client, { pariwarId: p, namer: me, named: b, state: 'declined', askedAgoDays: 3, respondedAgoDays: 2, endedAgoDays: 2 });
      await seedLink(client, { pariwarId: p, namer: c, named: me });
      await enterAppScope(client, p);
      const out = await getKnownPeopleForExport(tx, { pariwarId: p, memberId: me });
      expect(out.named.map((l) => [l.otherMemberId, l.state])).toEqual([[b, 'declined']]);
      expect(out.namedBy.map((l) => [l.otherMemberId, l.state])).toEqual([[c, 'asked']]);
    });
  });
});
