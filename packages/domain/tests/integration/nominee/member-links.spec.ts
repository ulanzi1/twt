// Story 6.36e (Task 2.1; AC3, AC4, AC8 — the domain half; `2026-10-24-397` NE2, NE5, NE6, NE10) — the nominee MEMBER LINK's
// domain, live DB, per-test ROLLBACK, the writes run as `twt_app` in the declarer's scope:
//   · the charge (the caller gate + `nominee_link_resolve`, 4 a day) and the resolution (6.36b's eligibility — ONE answer);
//   · the declare's writes in the handler's order (lock live links → plan → append versions → apply): a NEW mark, a KEEP that
//     carries the answer and `asked_at` exactly, a re-save without the mark (an ANSWERED link ends — V1), a 2 → 1 save;
//   · the declarer's marks (head versions only), the marked member's requests (order, cursor) and the answer (once; closed on
//     an ended link or a dead declarer; ⛔ another's);
//   · the erasure arm (both directions, live only) and the export (`marked` joinable by version, `namedBy`).
// The answer racing a carry (two connections) is `member-links-concurrency.spec.ts`.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { memberId as toMemberId, pariwarId as toPariwarId, type MemberId, type NomineeLinkId, type PariwarId } from '../../../src/ids/index.js';
import { readDatabaseClock } from '../../../src/nominee/declaration-history.js';
import {
  NOMINEE_LINK_RESOLVES_PER_DAY,
  NomineeLinkCursorInvalidError,
  answerNomineeLinkRequest,
  applyNomineeLinkPlan,
  chargeNomineeLinkResolve,
  eraseNomineeLinks,
  getNomineeLinksForExport,
  listNomineeLinkRequests,
  listNomineeLinksForDeclarer,
  listNomineeLinksOfVersions,
  lockLiveNomineeLinks,
  planNomineeLinks,
  resolveNomineeLinkTargets,
  type SubmittedNomineeLink,
} from '../../../src/nominee/member-links.js';
import type { MemberLifecycleState } from '../../../src/schema/members.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope, seedClaim, seedMember, seedNomineeDeclaration } from '../_helpers.js';

/** A member with a login identity row (index `idx-…`) — seeded as the table owner. */
async function member(p: string, state: MemberLifecycleState = 'active'): Promise<{ id: MemberId; index: string }> {
  const { tx, client } = getTx();
  const id = await seedMember(tx, p, { state });
  const index = `idx-${randomUUID()}`;
  await client.query(`INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index) VALUES ($1, $2, 'enc:v1:x', $3)`, [id, p, index]);
  return { id: toMemberId(id), index };
}

/** Back to the table owner (a seed the app role may not write), then re-enter the scope. */
async function asOwner<T>(p: string, fn: () => Promise<T>): Promise<T> {
  const { client } = getTx();
  await client.query('RESET ROLE');
  try {
    return await fn();
  } finally {
    await enterAppScope(client, p);
  }
}

/** ONE declare's link writes, in the handler's order: lock → plan → (versions appended) → apply. */
async function save(p: PariwarId, declarer: MemberId, marks: readonly (SubmittedNomineeLink | null)[]) {
  const { tx } = getTx();
  const live = await lockLiveNomineeLinks(tx, { pariwarId: p, declarerMemberId: declarer });
  const plan = planNomineeLinks(live, marks.map((link, i) => ({ rank: (i + 1) as 1 | 2, link })));
  if (plan.kind === 'refused') return plan;
  const recordedAt = await readDatabaseClock(tx);
  const versions = await seedNomineeDeclaration(tx, p, declarer, { nominees: marks.map(() => ({})), ensureMember: false, declaredAt: recordedAt });
  const applied = await applyNomineeLinkPlan(tx, { pariwarId: p, declarerMemberId: declarer, plan, versions, recordedAt });
  return { kind: 'applied' as const, applied, versions, recordedAt };
}

const mark = (m: MemberId): SubmittedNomineeLink => ({ kind: 'new', nomineeMemberId: m, foundBy: 'contacts' });

async function row(linkId: string) {
  const r = await getTx().client.query(`SELECT * FROM member_nominee_links WHERE link_id = $1`, [linkId]);
  return r.rows[0] as Record<string, unknown>;
}

/** A Pariwar with a declarer and a marked member, in the declarer's scope. */
async function scene() {
  await getTx().client.query('RESET ROLE'); // a second scene in one test seeds as the owner, ⛔ under the first one's scope
  const p = toPariwarId(randomUUID());
  const a = await member(p);
  const b = await member(p);
  await enterAppScope(getTx().client, p);
  return { p, a: a.id, b: b.id, bIndex: b.index };
}

describe.skipIf(!hasDatabase)('Story 6.36e — the nominee member link, the domain (live)', { timeout: 30000 }, () => {
  setupLiveDb();

  describe('the charge and the resolution (NE5)', () => {
    it('four marks a day, all-or-nothing; the fifth refused `daily_limit`', async () => {
      const { p, a } = await scene();
      const { tx } = getTx();
      for (let i = 0; i < NOMINEE_LINK_RESOLVES_PER_DAY; i += 1) {
        expect(await chargeNomineeLinkResolve(tx, { pariwarId: p, memberId: a, marks: 1 })).toEqual({ ok: true });
      }
      expect(await chargeNomineeLinkResolve(tx, { pariwarId: p, memberId: a, marks: 1 })).toEqual({ ok: false, reason: 'daily_limit' });
      const { p: q, a: c } = await scene();
      expect(await chargeNomineeLinkResolve(tx, { pariwarId: q, memberId: c, marks: 3 })).toEqual({ ok: true });
      expect(await chargeNomineeLinkResolve(tx, { pariwarId: q, memberId: c, marks: 2 })).toEqual({ ok: false, reason: 'daily_limit' });
      expect(await chargeNomineeLinkResolve(tx, { pariwarId: q, memberId: c, marks: 1 })).toEqual({ ok: true });
    });

    it('the caller gate: `active` only, ⛔ named by a claim — else `not_available` and ⛔ counter row', async () => {
      const p = toPariwarId(randomUUID());
      const grace = await member(p, 'active-in-grace');
      const dead = await member(p);
      await seedClaim(getTx().tx, p, { deceasedMemberId: dead.id });
      await enterAppScope(getTx().client, p);
      const { tx, client } = getTx();
      for (const m of [grace.id, dead.id]) {
        expect(await chargeNomineeLinkResolve(tx, { pariwarId: p, memberId: m, marks: 1 })).toEqual({ ok: false, reason: 'not_available' });
      }
      expect((await client.query(`SELECT 1 FROM member_daily_counters WHERE pariwar_id = $1`, [p])).rows).toHaveLength(0);
    });

    it('the resolution — ONLY an active / active-in-grace member of the Pariwar, ⛔ the declarer, ⛔ reported dead; every other index ABSENT', async () => {
      const p = toPariwarId(randomUUID());
      const declarer = await member(p);
      const ok = await member(p);
      const grace = await member(p, 'active-in-grace');
      const withdrawn = await member(p, 'withdrawn');
      const erased = await member(p, 'anonymized');
      const lapsed = await member(p, 'lapsed-unpaid');
      const dead = await member(p);
      await seedClaim(getTx().tx, p, { deceasedMemberId: dead.id });
      const elsewhere = await member(toPariwarId(randomUUID()));
      await enterAppScope(getTx().client, p);
      const got = await resolveNomineeLinkTargets(getTx().tx, {
        pariwarId: p,
        declarerMemberId: declarer.id,
        indexes: [ok, grace, declarer, withdrawn, erased, lapsed, dead, elsewhere].map((m) => m.index).concat(`idx-${randomUUID()}`),
      });
      expect(Object.fromEntries(got)).toEqual({ [ok.index]: ok.id, [grace.index]: grace.id });
      expect((await resolveNomineeLinkTargets(getTx().tx, { pariwarId: p, declarerMemberId: declarer.id, indexes: [] })).size).toBe(0);
    });
  });

  describe('the declare\'s writes (NE2)', () => {
    it('a NEW mark: one live row on the rank\'s new version, `asked_at` = the save\'s instant, ⛔ answer', async () => {
      const { p, a, b } = await scene();
      const r = await save(p, a, [mark(b)]);
      if (r.kind !== 'applied') throw new Error(r.reason);
      expect(r.applied.asked).toHaveLength(1);
      expect(r.applied.carried).toEqual([]);
      expect(r.applied.ended).toEqual([]);
      const l = await row(r.applied.asked[0]!.linkId);
      expect(l).toMatchObject({ state: 'live', answer: null, rank: 1, nominee_member_id: b, declarer_member_id: a, found_by: 'contacts', version_id: r.versions[0]!.versionId });
      expect((l['asked_at'] as Date).getTime()).toBe(r.recordedAt.getTime());
    });

    it('a KEEP carries the answer, `responded_at` and `asked_at` EXACTLY (µs) — ⛔ re-asked; the old row ends `redeclared`', async () => {
      const { p, a, b } = await scene();
      const first = await save(p, a, [mark(b)]);
      if (first.kind !== 'applied') throw new Error(first.reason);
      const old = first.applied.asked[0]!.linkId;
      await asOwner(p, async () => {
        await getTx().client.query(`UPDATE member_nominee_links SET answer = 'confirmed', responded_at = clock_timestamp() WHERE link_id = $1`, [old]);
      });
      const second = await save(p, a, [{ kind: 'keep', linkId: old }]);
      if (second.kind !== 'applied') throw new Error(second.reason);
      const carried = second.applied.carried[0]!.linkId;
      expect(second.applied.ended).toEqual([{ linkId: old, rank: 1 }]);
      const same = await getTx().client.query<{ same: boolean }>(
        `SELECT n.asked_at = o.asked_at AND n.responded_at = o.responded_at AND n.answer = o.answer AND n.found_by = o.found_by
                AND n.nominee_member_id = o.nominee_member_id AND n.carried_from_link_id = o.link_id AS same
           FROM member_nominee_links n JOIN member_nominee_links o ON o.link_id = $2 WHERE n.link_id = $1`,
        [carried, old],
      );
      expect(same.rows[0]!.same).toBe(true);
      expect(await row(old)).toMatchObject({ state: 'ended', end_reason: 'redeclared', answer: 'confirmed' });
      expect(await listNomineeLinksForDeclarer(getTx().tx, { pariwarId: p, declarerMemberId: a })).toEqual([
        { rank: 1, linkId: carried, label: 'confirmed', nomineeMemberId: b },
      ]);
    });

    it('⭐ V1 — an ANSWERED link re-saved WITHOUT the mark ends `removed_by_declarer` (⛔ 500), its answer kept', async () => {
      for (const answer of ['confirmed', 'not_me']) {
        const { p, a, b } = await scene();
        const first = await save(p, a, [mark(b)]);
        if (first.kind !== 'applied') throw new Error(first.reason);
        const id = first.applied.asked[0]!.linkId;
        expect(await answerNomineeLinkRequest(getTx().tx, { pariwarId: p, nomineeMemberId: b, linkId: id, answer: answer as 'confirmed' })).toMatchObject({ kind: 'done' });
        const second = await save(p, a, [null]);
        expect(second.kind, answer).toBe('applied');
        expect(await row(id)).toMatchObject({ state: 'ended', end_reason: 'removed_by_declarer', answer });
      }
    });

    it('a 2 → 1 save ends the vacated rank\'s link `redeclared`; a NEW mark on a marked rank ends the old one `redeclared`', async () => {
      const { p, a, b } = await scene();
      const c = (await asOwner(p, () => member(p))).id;
      const first = await save(p, a, [mark(b), mark(c)]);
      if (first.kind !== 'applied') throw new Error(first.reason);
      const [r1, r2] = first.applied.asked;
      const d = (await asOwner(p, () => member(p))).id;
      const second = await save(p, a, [mark(d)]);
      if (second.kind !== 'applied') throw new Error(second.reason);
      expect(await row(r1!.linkId)).toMatchObject({ state: 'ended', end_reason: 'redeclared' });
      expect(await row(r2!.linkId)).toMatchObject({ state: 'ended', end_reason: 'redeclared' });
      expect((await lockLiveNomineeLinks(getTx().tx, { pariwarId: p, declarerMemberId: a })).map((l) => l.nomineeMemberId)).toEqual([d]);
    });

    it('a stale keep ⇒ `stale`, ⛔ written; the exclusion read sees ENDED rows too', async () => {
      const { p, a, b } = await scene();
      const first = await save(p, a, [mark(b)]);
      if (first.kind !== 'applied') throw new Error(first.reason);
      const old = first.applied.asked[0]!.linkId;
      await save(p, a, [null]);
      expect(await save(p, a, [{ kind: 'keep', linkId: old }])).toEqual({ kind: 'refused', reason: 'stale' });
      expect(await listNomineeLinksOfVersions(getTx().tx, p, [first.versions[0]!.versionId])).toMatchObject([{ nomineeMemberId: b, endedAt: expect.any(Date) }]);
    });
  });

  describe('the marked member\'s side (NE6)', () => {
    async function marked() {
      const s = await scene();
      const r = await save(s.p, s.a, [mark(s.b)]);
      if (r.kind !== 'applied') throw new Error(r.reason);
      return { ...s, linkId: r.applied.asked[0]!.linkId as NomineeLinkId };
    }

    it('the answer is taken ONCE; a second ⇒ `request_closed`; ⛔ the member\'s ⇒ `not_found`', async () => {
      const s = await marked();
      const { tx } = getTx();
      expect(await answerNomineeLinkRequest(tx, { pariwarId: s.p, nomineeMemberId: s.b, linkId: s.linkId, answer: 'not_me' })).toEqual({
        kind: 'done', linkId: s.linkId, rank: 1, answer: 'not_me',
      });
      expect(await answerNomineeLinkRequest(tx, { pariwarId: s.p, nomineeMemberId: s.b, linkId: s.linkId, answer: 'confirmed' })).toEqual({
        kind: 'refused', reason: 'request_closed',
      });
      expect(await answerNomineeLinkRequest(tx, { pariwarId: s.p, nomineeMemberId: s.a, linkId: s.linkId, answer: 'confirmed' })).toEqual({
        kind: 'refused', reason: 'not_found',
      });
      expect(await listNomineeLinksForDeclarer(tx, { pariwarId: s.p, declarerMemberId: s.a })).toMatchObject([{ label: 'not_me' }]);
    });

    it('an ENDED link ⇒ `request_closed`; a withdrawn answerer ⇒ `not_available`', async () => {
      const s = await marked();
      await save(s.p, s.a, [null]);
      expect(await answerNomineeLinkRequest(getTx().tx, { pariwarId: s.p, nomineeMemberId: s.b, linkId: s.linkId, answer: 'confirmed' })).toEqual({
        kind: 'refused', reason: 'request_closed',
      });
      const t = await marked();
      await asOwner(t.p, async () => {
        await getTx().client.query(`SET LOCAL app.member_state_writer = 'on'`);
        await getTx().client.query(`UPDATE members SET state = 'withdrawn' WHERE member_id = $1`, [t.b]);
        await getTx().client.query(`SET LOCAL app.member_state_writer = 'off'`);
      });
      expect(await answerNomineeLinkRequest(getTx().tx, { pariwarId: t.p, nomineeMemberId: t.b, linkId: t.linkId, answer: 'confirmed' })).toEqual({
        kind: 'refused', reason: 'not_available',
      });
    });

    it('V13 — once the DECLARER is named by a claim as the deceased, the request leaves the list and its answer ⇒ `request_closed`', async () => {
      const s = await marked();
      const { tx } = getTx();
      expect((await listNomineeLinkRequests(tx, { pariwarId: s.p, nomineeMemberId: s.b })).items).toHaveLength(1);
      await asOwner(s.p, () => seedClaim(getTx().tx, s.p, { deceasedMemberId: s.a }));
      expect((await listNomineeLinkRequests(tx, { pariwarId: s.p, nomineeMemberId: s.b })).items).toEqual([]);
      expect(await answerNomineeLinkRequest(tx, { pariwarId: s.p, nomineeMemberId: s.b, linkId: s.linkId, answer: 'confirmed' })).toEqual({
        kind: 'refused', reason: 'request_closed',
      });
    });

    it('the requests: unanswered first, then answered, newest first — every one reachable by its cursor; a forged cursor throws', async () => {
      const p = toPariwarId(randomUUID());
      const b = await member(p);
      const declarers = [await member(p), await member(p), await member(p)];
      await enterAppScope(getTx().client, p);
      const linkIds: NomineeLinkId[] = [];
      for (const d of declarers) {
        const r = await save(p, d.id, [mark(b.id)]);
        if (r.kind !== 'applied') throw new Error(r.reason);
        linkIds.push(r.applied.asked[0]!.linkId);
      }
      const { tx } = getTx();
      // the NEWEST is answered ⇒ it sorts after the two open ones
      await answerNomineeLinkRequest(tx, { pariwarId: p, nomineeMemberId: b.id, linkId: linkIds[2]!, answer: 'confirmed' });
      const seen: string[] = [];
      let cursor: string | undefined;
      for (let i = 0; i < 4; i += 1) {
        const page = await listNomineeLinkRequests(tx, { pariwarId: p, nomineeMemberId: b.id, limit: 1, cursor });
        seen.push(...page.items.map((x) => x.linkId));
        if (page.nextCursor === null) break;
        cursor = page.nextCursor;
      }
      expect(seen).toEqual([linkIds[1], linkIds[0], linkIds[2]]);
      await expect(listNomineeLinkRequests(tx, { pariwarId: p, nomineeMemberId: b.id, cursor: 'not-a-cursor' })).rejects.toBeInstanceOf(NomineeLinkCursorInvalidError);
    });
  });

  describe('erasure and export (NE10)', () => {
    it('`eraseNomineeLinks` erases LIVE links in BOTH directions; an ended link keeps its end; an answered one erases', async () => {
      const { p, a, b } = await scene();
      const c = (await asOwner(p, () => member(p))).id;
      const first = await save(p, a, [mark(b)]);
      if (first.kind !== 'applied') throw new Error(first.reason);
      const ended = first.applied.asked[0]!.linkId;
      const second = await save(p, a, [mark(c)]);
      if (second.kind !== 'applied') throw new Error(second.reason);
      const live = second.applied.asked[0]!.linkId;
      await answerNomineeLinkRequest(getTx().tx, { pariwarId: p, nomineeMemberId: c, linkId: live, answer: 'confirmed' });
      // c (the NOMINEE) is erased ⇒ the live link naming them erases
      await eraseNomineeLinks(getTx().tx, { pariwarId: p, memberId: c });
      expect(await row(live)).toMatchObject({ state: 'erased', end_reason: 'erased', answer: 'confirmed' });
      expect(await row(ended)).toMatchObject({ state: 'ended', end_reason: 'redeclared' });
      // the DECLARER side
      const t = await scene();
      const r = await save(t.p, t.a, [mark(t.b)]);
      if (r.kind !== 'applied') throw new Error(r.reason);
      await eraseNomineeLinks(getTx().tx, { pariwarId: t.p, memberId: t.a });
      expect(await row(r.applied.asked[0]!.linkId)).toMatchObject({ state: 'erased' });
    });

    it('the export: `marked` (every row, joinable by `(rank, versionNo)`) for the declarer, `namedBy` for the marked member', async () => {
      const { p, a, b } = await scene();
      const first = await save(p, a, [mark(b)]);
      if (first.kind !== 'applied') throw new Error(first.reason);
      const second = await save(p, a, [{ kind: 'keep', linkId: first.applied.asked[0]!.linkId }]);
      if (second.kind !== 'applied') throw new Error(second.reason);
      const { tx } = getTx();
      const mine = await getNomineeLinksForExport(tx, { pariwarId: p, memberId: a });
      expect(mine.namedBy).toEqual([]);
      expect(mine.marked.map((m) => [m.rank, m.versionNo, m.state, m.answer, m.otherMemberId])).toEqual([
        [1, 1, 'ended', null, b],
        [1, 2, 'live', null, b],
      ]);
      const theirs = await getNomineeLinksForExport(tx, { pariwarId: p, memberId: b });
      expect(theirs.marked).toEqual([]);
      expect(theirs.namedBy.map((m) => [m.state, m.otherMemberId])).toEqual([
        ['ended', a],
        ['live', a],
      ]);
    });
  });
});
