// Story 6.36c (Task 3.2, 3.4; AC5; RV1, RV4, RV8) — the home prompts, ONE read, live DB, per-test ROLLBACK, as `twt_app`
// in scope (the seeds as the superuser, postings RAW with explicit `created_at` — one transaction's `now()` ties).
// Each flag has a leg seeded so ONLY that clause can fire, and a leg for each of its exclusions:
//   · noWorkplace (⛔ posting / a district-only one / an unconfirmed "isn't listed" — ⛔ a retirement, ⛔ a workplace, ⛔ in a
//     Pariwar with ⛔ list — RV8); hasWorkplace (listed or delisted); suggestedWorkplace;
//   · transferReview (W1 → W2 within 30 days — ⛔ the same W, ⛔ older, ⛔ a retirement, ⛔ a first confirmed "isn't listed");
//   · replaceNeeded (an ACCEPTED link to a withdrawn or claim-named person — ⛔ a late renewal, ⛔ an `asked` link);
//   · campaign (LIVE + a free slot + ⛔ ask since its start — RV4);
//   · RV1: a claim-named `active` member ⇒ the people flags false, the workplace flags as anyone's; `active-in-grace` ⇒ the
//     workplace flags only; `withdrawn` ⇒ all false;
//   · ⛔ a flag depends on OTHER members at the workplace (SW16 (2)).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { MemberId } from '../../../src/ids/index.js';
import { readKnownPeoplePrompts, type KnownPeoplePrompts } from '../../../src/member/known-people-prompts.js';
import type { MemberLifecycleState } from '../../../src/schema/members.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope, seedClaim, seedMember } from '../_helpers.js';
import { seedWorkplaceList, type SeededList } from './_workplace-fixtures.js';

type Client = ReturnType<typeof getTx>['client'];
const ACTOR = '0a0a0a0a-0000-4000-8000-000000000003';
const DAY = 24 * 60 * 60 * 1000;

const LIST = {
  districts: ['Patna', 'Gaya'],
  workplaces: [
    { name: 'W1', district: 'Patna' },
    { name: 'W2', district: 'Patna' },
    { name: 'GONE', district: 'Patna', status: 'delisted' as const },
  ],
};

const NONE: KnownPeoplePrompts = {
  noWorkplace: false,
  hasWorkplace: false,
  suggestedWorkplace: null,
  transferReview: false,
  replaceNeeded: false,
  canNamePeople: false,
  campaign: null,
};

async function member(pariwarId: string, state: MemberLifecycleState = 'active'): Promise<MemberId> {
  return toMemberId(await seedMember(getTx().tx, pariwarId, { state }));
}

async function posting(client: Client, pariwarId: string, memberId: string, o: { workplaceId?: string | null; requestId?: string | null; agoDays: number; isRetirement?: boolean }): Promise<void> {
  await client.query(
    `INSERT INTO member_postings (pariwar_id, member_id, district, workplace_id, workplace_request_id, is_retirement, created_at)
     VALUES ($1, $2, 'Patna', $3, $4, $5, now() - make_interval(secs => $6::double precision * 86400))`,
    [pariwarId, memberId, o.workplaceId ?? null, o.requestId ?? null, o.isRetirement ?? false, o.agoDays],
  );
}

async function request(client: Client, pariwarId: string, memberId: string, state: 'pending' | 'suggested' | 'confirmed', workplaceId?: string): Promise<string> {
  const id = randomUUID();
  await client.query(`INSERT INTO workplace_requests (request_id, pariwar_id, member_id, district, typed_name, started_on) VALUES ($1, $2, $3, 'Patna', 'Some School', '2020-01-01')`, [
    id,
    pariwarId,
    memberId,
  ]);
  if (state !== 'pending') {
    await client.query(`UPDATE workplace_requests SET state = 'suggested', suggested_workplace_id = $2, suggested_by_actor_id = $3, suggested_at = now() WHERE request_id = $1`, [id, workplaceId, ACTOR]);
  }
  if (state === 'confirmed') await client.query(`UPDATE workplace_requests SET state = 'confirmed', resolved_at = now() WHERE request_id = $1`, [id]);
  return id;
}

async function link(client: Client, pariwarId: string, namer: string, named: string, state: 'asked' | 'accepted', askedAgoDays = 1): Promise<void> {
  const asked = new Date(Date.now() - askedAgoDays * DAY);
  await client.query(
    `INSERT INTO member_known_people (pariwar_id, namer_member_id, named_member_id, found_by, state, asked_at, responded_at) VALUES ($1, $2, $3, 'contacts', $4, $5, $6)`,
    [pariwarId, namer, named, state, asked, state === 'accepted' ? new Date(asked.getTime() + 60_000) : null],
  );
}

async function campaign(client: Client, pariwarId: string, startOffsetDays: number, endOffsetDays: number): Promise<string> {
  const id = randomUUID();
  await client.query(
    `INSERT INTO known_people_campaigns (campaign_id, pariwar_id, started_by_actor_id, starts_on, ends_on)
     VALUES ($1, $2, $3, (clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::date + $4::int, (clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::date + $5::int)`,
    [id, pariwarId, ACTOR, startOffsetDays, endOffsetDays],
  );
  return id;
}

async function prompts(list: SeededList | string, m: MemberId): Promise<KnownPeoplePrompts> {
  const { client, tx } = getTx();
  const p = typeof list === 'string' ? list : list.pariwarId;
  await enterAppScope(client, p);
  const out = await readKnownPeoplePrompts(tx, toPariwarId(p), m);
  await client.query('RESET ROLE');
  return out;
}

describe.skipIf(!hasDatabase)('Story 6.36c — the home prompts (live DB)', { timeout: 20000 }, () => {
  setupLiveDb();

  describe('the workplace flags', () => {
    it('noWorkplace: ⛔ posting, a district-only one, an unconfirmed "isn’t listed" — ⛔ a retirement, ⛔ a workplace', async () => {
      const { client } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      const none = await member(list.pariwarId);
      expect(await prompts(list, none)).toEqual({ ...NONE, noWorkplace: true, canNamePeople: true });

      const districtOnly = await member(list.pariwarId);
      await posting(client, list.pariwarId, districtOnly, { agoDays: 400 });
      expect((await prompts(list, districtOnly)).noWorkplace).toBe(true);

      const unlisted = await member(list.pariwarId);
      const r = await request(client, list.pariwarId, unlisted, 'pending');
      await posting(client, list.pariwarId, unlisted, { requestId: r, agoDays: 2 });
      expect(await prompts(list, unlisted)).toEqual({ ...NONE, noWorkplace: true, canNamePeople: true });

      const retired = await member(list.pariwarId);
      await posting(client, list.pariwarId, retired, { workplaceId: list.ids['W1']!, agoDays: 900 });
      await posting(client, list.pariwarId, retired, { isRetirement: true, agoDays: 2 });
      expect(await prompts(list, retired)).toEqual({ ...NONE, canNamePeople: true });

      const working = await member(list.pariwarId);
      await posting(client, list.pariwarId, working, { workplaceId: list.ids['W1']!, agoDays: 400 });
      expect(await prompts(list, working)).toEqual({ ...NONE, hasWorkplace: true, canNamePeople: true });
    });

    it('RV8: ⛔ noWorkplace in a Pariwar with ⛔ imported list', async () => {
      const p = randomUUID();
      const m = await member(p);
      expect(await prompts(p, m)).toEqual({ ...NONE, canNamePeople: true });
    });

    it('hasWorkplace: a workplace since DELISTED still counts', async () => {
      const { client } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      const m = await member(list.pariwarId);
      await posting(client, list.pariwarId, m, { workplaceId: list.ids['GONE']!, agoDays: 400 });
      expect((await prompts(list, m)).hasWorkplace).toBe(true);
    });

    it('suggestedWorkplace: the member’s `suggested` request with the workplace — ⛔ a pending one', async () => {
      const { client } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      const m = await member(list.pariwarId);
      const pending = await request(client, list.pariwarId, m, 'pending');
      await posting(client, list.pariwarId, m, { requestId: pending, agoDays: 3 });
      expect((await prompts(list, m)).suggestedWorkplace).toBeNull();
      await client.query(`UPDATE workplace_requests SET state = 'suggested', suggested_workplace_id = $2, suggested_by_actor_id = $3, suggested_at = now() WHERE request_id = $1`, [
        pending,
        list.ids['W2'],
        ACTOR,
      ]);
      expect((await prompts(list, m)).suggestedWorkplace).toEqual({ requestId: pending, workplaceId: list.ids['W2'], name: 'W2', district: 'Patna' });
    });
  });

  describe('transferReview', () => {
    it('W1 → W2 recorded within 30 days ⇒ true', async () => {
      const { client } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      const m = await member(list.pariwarId);
      await posting(client, list.pariwarId, m, { workplaceId: list.ids['W1']!, agoDays: 400 });
      await posting(client, list.pariwarId, m, { agoDays: 200 }); // a district-only posting between is skipped
      await posting(client, list.pariwarId, m, { workplaceId: list.ids['W2']!, agoDays: 5 });
      expect(await prompts(list, m)).toEqual({ ...NONE, hasWorkplace: true, canNamePeople: true, transferReview: true });
    });

    it('⛔ the same workplace again; ⛔ older than 30 days; ⛔ a first workplace; ⛔ after a retirement', async () => {
      const { client } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      const same = await member(list.pariwarId);
      await posting(client, list.pariwarId, same, { workplaceId: list.ids['W1']!, agoDays: 400 });
      await posting(client, list.pariwarId, same, { workplaceId: list.ids['W1']!, agoDays: 5 });
      expect((await prompts(list, same)).transferReview).toBe(false);

      const old = await member(list.pariwarId);
      await posting(client, list.pariwarId, old, { workplaceId: list.ids['W1']!, agoDays: 400 });
      await posting(client, list.pariwarId, old, { workplaceId: list.ids['W2']!, agoDays: 31 });
      expect((await prompts(list, old)).transferReview).toBe(false);

      const first = await member(list.pariwarId);
      await posting(client, list.pariwarId, first, { workplaceId: list.ids['W2']!, agoDays: 1 });
      expect((await prompts(list, first)).transferReview).toBe(false);

      const retired = await member(list.pariwarId);
      await posting(client, list.pariwarId, retired, { workplaceId: list.ids['W1']!, agoDays: 400 });
      await posting(client, list.pariwarId, retired, { workplaceId: list.ids['W2']!, agoDays: 10 });
      await posting(client, list.pariwarId, retired, { isRetirement: true, agoDays: 1 });
      expect((await prompts(list, retired)).transferReview).toBe(false);
    });

    it('⛔ for a first confirmed "isn’t listed" — the member has ⛔ moved', async () => {
      const { client } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      const m = await member(list.pariwarId);
      const r = await request(client, list.pariwarId, m, 'confirmed', list.ids['W1']);
      await posting(client, list.pariwarId, m, { requestId: r, agoDays: 10 });
      await posting(client, list.pariwarId, m, { workplaceId: list.ids['W1']!, agoDays: 1 }); // the confirming posting (⛔ request id)
      expect(await prompts(list, m)).toEqual({ ...NONE, hasWorkplace: true, canNamePeople: true });
    });
  });

  describe('replaceNeeded', () => {
    it('an ACCEPTED link to a withdrawn person, or to one a claim names ⇒ true — ONE boolean', async () => {
      const { client, tx } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      for (const kind of ['withdrawn', 'claim'] as const) {
        const m = await member(list.pariwarId);
        const named = await member(list.pariwarId, kind === 'withdrawn' ? 'withdrawn' : 'active');
        await link(client, list.pariwarId, m, named, 'accepted');
        if (kind === 'claim') await seedClaim(tx, list.pariwarId, { deceasedMemberId: named });
        expect(await prompts(list, m), kind).toEqual({ ...NONE, noWorkplace: true, canNamePeople: true, replaceNeeded: true });
      }
    });

    it('⛔ a late renewal; ⛔ an `asked` link to a withdrawn person', async () => {
      const { client } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      const m = await member(list.pariwarId);
      await link(client, list.pariwarId, m, await member(list.pariwarId, 'active-in-grace'), 'accepted');
      await link(client, list.pariwarId, m, await member(list.pariwarId, 'lapsed-unpaid'), 'accepted');
      await link(client, list.pariwarId, m, await member(list.pariwarId, 'withdrawn'), 'asked');
      expect((await prompts(list, m)).replaceNeeded).toBe(false);
    });
  });

  describe('campaign (RV4)', () => {
    it('LIVE + a free slot + ⛔ ask since its start ⇒ the campaign id', async () => {
      const { client } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      const c = await campaign(client, list.pariwarId, -2, 5);
      const m = await member(list.pariwarId);
      await link(client, list.pariwarId, m, await member(list.pariwarId), 'accepted', 10); // asked BEFORE the start — still shows
      expect(await prompts(list, m)).toEqual({ ...NONE, noWorkplace: true, canNamePeople: true, campaign: { campaignId: c } });
    });

    it('⛔ after an ask since the start; ⛔ with ⛔ free slot (3 accepted, or 1 accepted + 2 asked); ⛔ scheduled; ⛔ ended', async () => {
      const { client } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      await campaign(client, list.pariwarId, -2, 5);
      const asked = await member(list.pariwarId);
      await link(client, list.pariwarId, asked, await member(list.pariwarId), 'asked', 1);
      expect((await prompts(list, asked)).campaign).toBeNull();

      const full = await member(list.pariwarId);
      for (let i = 0; i < 3; i += 1) await link(client, list.pariwarId, full, await member(list.pariwarId), 'accepted', 10);
      expect((await prompts(list, full)).campaign).toBeNull();

      const deciding = await member(list.pariwarId);
      await link(client, list.pariwarId, deciding, await member(list.pariwarId), 'accepted', 10);
      for (let i = 0; i < 2; i += 1) await link(client, list.pariwarId, deciding, await member(list.pariwarId), 'asked', 10);
      expect((await prompts(list, deciding)).campaign).toBeNull();

      // A stale ask (beyond the 30-day window) frees its slot.
      const stale = await member(list.pariwarId);
      for (let i = 0; i < 3; i += 1) await link(client, list.pariwarId, stale, await member(list.pariwarId), 'asked', 31);
      expect((await prompts(list, stale)).campaign).not.toBeNull();

      const other = await seedWorkplaceList(client, LIST);
      await campaign(client, other.pariwarId, 1, 5);
      const ended = randomUUID();
      await client.query(
        `INSERT INTO known_people_campaigns (campaign_id, pariwar_id, started_by_actor_id, starts_on, ends_on, ended_at, ended_by_actor_id)
         VALUES ($1, $2, $3, (clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::date - 1, (clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::date + 3, now(), $3)`,
        [ended, other.pariwarId, ACTOR],
      );
      expect((await prompts(other, await member(other.pariwarId))).campaign).toBeNull();
    });
  });

  describe('RV1 — who sees which card', () => {
    it('a claim-named `active` member: the people flags false, the workplace flags as anyone’s', async () => {
      const { client, tx } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      await campaign(client, list.pariwarId, 0, 5);
      const m = await member(list.pariwarId);
      await posting(client, list.pariwarId, m, { workplaceId: list.ids['W1']!, agoDays: 400 });
      await posting(client, list.pariwarId, m, { workplaceId: list.ids['W2']!, agoDays: 1 });
      await link(client, list.pariwarId, m, await member(list.pariwarId, 'withdrawn'), 'accepted');
      await seedClaim(tx, list.pariwarId, { deceasedMemberId: m });
      expect(await prompts(list, m)).toEqual({ ...NONE, hasWorkplace: true });
    });

    it('`active-in-grace`: the workplace flags only; `withdrawn` / `anonymized`: all false', async () => {
      const { client } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      await campaign(client, list.pariwarId, 0, 5);
      const grace = await member(list.pariwarId, 'active-in-grace');
      expect(await prompts(list, grace)).toEqual({ ...NONE, noWorkplace: true });
      for (const state of ['withdrawn', 'anonymized'] as const) {
        const m = await member(list.pariwarId, state);
        const r = await request(client, list.pariwarId, m, 'suggested', list.ids['W1']);
        await posting(client, list.pariwarId, m, { requestId: r, agoDays: 1 });
        expect(await prompts(list, m), state).toEqual(NONE);
      }
    });

    it('a member of ANOTHER Pariwar (or none) ⇒ all false', async () => {
      const { client } = getTx();
      const list = await seedWorkplaceList(client, LIST);
      const other = await seedWorkplaceList(client, LIST);
      const m = await member(other.pariwarId);
      expect(await prompts(list, m)).toEqual(NONE);
      expect(await prompts(list, toMemberId(randomUUID()))).toEqual(NONE);
    });
  });

  it('⛔ a flag depends on whether OTHER members are at the workplace (SW16 (2))', async () => {
    const { client } = getTx();
    const list = await seedWorkplaceList(client, LIST);
    const lone = await member(list.pariwarId);
    await posting(client, list.pariwarId, lone, { workplaceId: list.ids['W1']!, agoDays: 100 });
    const withColleagues = await member(list.pariwarId);
    await posting(client, list.pariwarId, withColleagues, { workplaceId: list.ids['W2']!, agoDays: 100 });
    for (let i = 0; i < 4; i += 1) {
      const c = await member(list.pariwarId);
      await posting(client, list.pariwarId, c, { workplaceId: list.ids['W2']!, agoDays: 50 });
    }
    expect(await prompts(list, lone)).toEqual(await prompts(list, withColleagues));
  });
});
