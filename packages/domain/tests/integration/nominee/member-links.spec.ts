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
import { peerMeshNomineeLinkedMembersAsOf } from '../../../src/claim/peer-mesh-nominees.js';
import { peerMeshFilingCut } from '../../../src/claim/peer-mesh-read.js';
import { listNomineeDeclarationVersions, readDatabaseClock } from '../../../src/nominee/declaration-history.js';
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

    it('the writer-to-reader seam (code review 2026-10-24): what `applyNomineeLinkPlan` WRITES is what the exclusion READS — a live mark and a carried one count; one a re-save dropped does not', async () => {
      const { p, a, b } = await scene();
      const { tx } = getTx();
      // the cut of a filing TOMORROW — every save below is before it, so the version AND the link's real `ended_at` (the save's
      // instant, stamped by the writer) decide the read; the forged-row legs of the snapshot spec cover a link ended AT the cut
      const cut = peerMeshFilingCut(new Date(Date.now() + 2 * 86_400_000)).cut;
      const readers = async () => {
        const versions = await listNomineeDeclarationVersions(tx, p, a);
        return peerMeshNomineeLinkedMembersAsOf(versions, await listNomineeLinksOfVersions(tx, p, versions.map((v) => v.versionId as never)), cut);
      };
      expect(await readers()).toEqual([]); // nothing written yet
      const first = await save(p, a, [mark(b)]);
      if (first.kind !== 'applied') throw new Error(first.reason);
      expect(await readers()).toEqual([b]); // the live mark
      const kept = await save(p, a, [{ kind: 'keep', linkId: first.applied.asked[0]!.linkId }]);
      if (kept.kind !== 'applied') throw new Error(kept.reason);
      expect(await readers()).toEqual([b]); // carried onto the new head version: still ONE member, ⛔ twice
      // THE WRITER'S STAMP (what the forged-row legs of the snapshot spec cannot show): the old link ends AT the save's instant
      expect((await row(first.applied.asked[0]!.linkId))['ended_at']).toEqual(kept.recordedAt);
      const dropped = await save(p, a, [null]);
      if (dropped.kind !== 'applied') throw new Error(dropped.reason);
      // ⚠ this last read is decided by the VERSION PROJECTION (the dropped link sits on a superseded version — it would be
      // excluded whatever its `ended_at` said); the stamp is asserted on its own below
      expect(await readers()).toEqual([]);
      expect(await row(kept.applied.carried[0]!.linkId)).toMatchObject({ state: 'ended', end_reason: 'removed_by_declarer' });
      expect((await row(kept.applied.carried[0]!.linkId))['ended_at']).toEqual(dropped.recordedAt);
    });

    it('a retried save (or a re-pick) of the SAME member on the same rank keeps their answer and `asked_at` — ⛔ re-asked (code review 2026-10-24)', async () => {
      const { p, a, b } = await scene();
      const first = await save(p, a, [mark(b)]);
      if (first.kind !== 'applied') throw new Error(first.reason);
      const original = first.applied.asked[0]!.linkId;
      await answerNomineeLinkRequest(getTx().tx, { pariwarId: p, nomineeMemberId: b, linkId: original, answer: 'confirmed' });
      const again = await save(p, a, [mark(b)]); // the SAME body once more — a `new` mark of the member already live on rank 1
      if (again.kind !== 'applied') throw new Error(again.reason);
      expect(again.applied.asked).toEqual([]);
      expect(again.applied.carried).toHaveLength(1);
      expect(await row(original)).toMatchObject({ state: 'ended', end_reason: 'redeclared' });
      const carried = await row(again.applied.carried[0]!.linkId);
      expect(carried).toMatchObject({ state: 'live', answer: 'confirmed', carried_from_link_id: original });
      expect(carried['asked_at']).toEqual((await row(original))['asked_at']);
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
      // `2026-10-24-399` call 3 — the mark carried by the re-save is ONE row for the marked member (not `ended` + `live`)
      expect(theirs.namedBy.map((m) => [m.state, m.nameSeen, m.otherMemberId])).toEqual([['live', true, a]]);
    });

    it('the export names the declarer only to a member who can still be SHOWN the request (`-399` call 2): a nominee who has since LAPSED gets ⛔ name — and the same row reads `live`, with it, once they renew', async () => {
      await getTx().client.query('RESET ROLE'); // seeds as the owner, ⛔ under an earlier scope
      const p = toPariwarId(randomUUID());
      const a = await member(p);
      const lapsed = await member(p, 'lapsed-unpaid'); // marked while active in real life; the writer takes the id as given
      const active = await member(p);
      await enterAppScope(getTx().client, p);
      const { tx } = getTx();
      const first = await save(p, a.id, [mark(lapsed.id), mark(active.id)]);
      if (first.kind !== 'applied') throw new Error(first.reason);
      // the declarer's link to each is `live` and no claim names them — only the VIEWER differs
      expect((await getNomineeLinksForExport(tx, { pariwarId: p, memberId: lapsed.id })).namedBy.map((m) => [m.state, m.nameSeen])).toEqual([['ended', false]]);
      expect((await getNomineeLinksForExport(tx, { pariwarId: p, memberId: active.id })).namedBy.map((m) => [m.state, m.nameSeen])).toEqual([['live', true]]);
      // the link itself is still `live` (it keeps them out of the five — `-396` Q1 A); only the READER decides what the export says
      expect((await row(first.applied.asked[0]!.linkId))['state']).toBe('live');
      // RENEWAL: the same link, read by the same member, now lists — `live`, with the declarer's name
      await asOwner(p, async () => {
        await getTx().client.query(`SET LOCAL app.member_state_writer = 'on'`); // the projector's guard (0018) — a seed, ⛔ a product path
        await getTx().client.query(`UPDATE members SET state = 'active' WHERE member_id = $1`, [lapsed.id]);
        await getTx().client.query(`SET LOCAL app.member_state_writer = 'off'`);
      });
      expect((await getNomineeLinksForExport(tx, { pariwarId: p, memberId: lapsed.id })).namedBy.map((m) => [m.state, m.nameSeen])).toEqual([['live', true]]);
    });

    it('the export\'s `nameSeen` rows are EXACTLY the rows the app lists to the marked member (the SQL `listed` is a copy of `listNomineeLinkRequests`\'s predicate)', async () => {
      const { p, a, b } = await scene();
      await getTx().client.query('RESET ROLE');
      const [removed, claimNamed, chained, erased] = [await member(p), await member(p), await member(p), await member(p)];
      await enterAppScope(getTx().client, p);
      const { tx } = getTx();
      const listed = await save(p, a, [mark(b)]); // live, listed
      const r1 = await save(p, removed.id, [mark(b)]);
      const r2 = await save(p, removed.id, [null]); // removed
      const c1 = await save(p, claimNamed.id, [mark(b)]); // live, but its declarer is named by a claim (below)
      const k1 = await save(p, chained.id, [mark(b)]); // a chain of three: mark, keep, keep
      if (listed.kind !== 'applied' || r1.kind !== 'applied' || r2.kind !== 'applied' || c1.kind !== 'applied' || k1.kind !== 'applied') throw new Error('seed');
      const k2 = await save(p, chained.id, [{ kind: 'keep', linkId: k1.applied.asked[0]!.linkId }]);
      if (k2.kind !== 'applied') throw new Error(k2.reason);
      const k3 = await save(p, chained.id, [{ kind: 'keep', linkId: k2.applied.carried[0]!.linkId }]);
      if (k3.kind !== 'applied') throw new Error(k3.reason);
      const e1 = await save(p, erased.id, [mark(b)]);
      if (e1.kind !== 'applied') throw new Error(e1.reason);
      await eraseNomineeLinks(tx, { pariwarId: p, memberId: erased.id });
      await asOwner(p, () => seedClaim(getTx().tx, p, { deceasedMemberId: claimNamed.id }));

      const shown = (await listNomineeLinkRequests(tx, { pariwarId: p, nomineeMemberId: b })).items.map((i) => i.declarerMemberId as string).sort();
      const exported = (await getNomineeLinksForExport(tx, { pariwarId: p, memberId: b })).namedBy;
      expect(shown).toEqual([a as string, chained.id as string].sort()); // the sanity half: the list shows the plain live mark and the chain's head
      expect(exported.filter((m) => m.nameSeen).map((m) => m.otherMemberId as string).sort()).toEqual(shown);
      // one row per declarer (the chain collapsed to ONE), the rest read `ended`
      expect(exported).toHaveLength(5);
      expect(exported.filter((m) => !m.nameSeen).every((m) => m.state === 'ended')).toBe(true);
    });

    it('the export says no more than the app showed (`2026-10-24-399`): a removed mark, an erased declarer and a claim-named declarer read `ended` with no name; an erased nominee reads `ended`', async () => {
      const { tx } = getTx();
      // a mark the declarer REMOVED before the marked member ever opened the app
      const removed = await scene();
      const r1 = await save(removed.p, removed.a, [mark(removed.b)]);
      if (r1.kind !== 'applied') throw new Error(r1.reason);
      const r2 = await save(removed.p, removed.a, [null]);
      if (r2.kind !== 'applied') throw new Error(r2.reason);
      expect((await row(r1.applied.asked[0]!.linkId))['end_reason']).toBe('removed_by_declarer');
      expect((await getNomineeLinksForExport(tx, { pariwarId: removed.p, memberId: removed.b })).namedBy.map((m) => [m.state, m.nameSeen])).toEqual([['ended', false]]);

      // a LIVE mark whose declarer a claim names (the list hides it — V13)
      const dead = await scene();
      const d1 = await save(dead.p, dead.a, [mark(dead.b)]);
      if (d1.kind !== 'applied') throw new Error(d1.reason);
      expect((await getNomineeLinksForExport(tx, { pariwarId: dead.p, memberId: dead.b })).namedBy.map((m) => [m.state, m.nameSeen])).toEqual([['live', true]]);
      await asOwner(dead.p, () => seedClaim(getTx().tx, dead.p, { deceasedMemberId: dead.a }));
      expect((await row(d1.applied.asked[0]!.linkId))['state']).toBe('live');
      expect((await getNomineeLinksForExport(tx, { pariwarId: dead.p, memberId: dead.b })).namedBy.map((m) => [m.state, m.nameSeen])).toEqual([['ended', false]]);

      // the DECLARER erased ⇒ the marked member's export reads `ended`, no name (the answer they gave stays)
      const gone = await scene();
      const g1 = await save(gone.p, gone.a, [mark(gone.b)]);
      if (g1.kind !== 'applied') throw new Error(g1.reason);
      await answerNomineeLinkRequest(tx, { pariwarId: gone.p, nomineeMemberId: gone.b, linkId: g1.applied.asked[0]!.linkId, answer: 'confirmed' });
      await eraseNomineeLinks(tx, { pariwarId: gone.p, memberId: gone.a });
      expect((await row(g1.applied.asked[0]!.linkId))['state']).toBe('erased');
      expect((await getNomineeLinksForExport(tx, { pariwarId: gone.p, memberId: gone.b })).namedBy.map((m) => [m.state, m.answer, m.nameSeen])).toEqual([['ended', 'confirmed', false]]);

      // the NOMINEE erased ⇒ the DECLARER's `marked[]` reads `ended` (⛔ `erased`); the answer stays, and so does the declarer's own row
      const nomineeGone = await scene();
      const n1 = await save(nomineeGone.p, nomineeGone.a, [mark(nomineeGone.b)]);
      if (n1.kind !== 'applied') throw new Error(n1.reason);
      await answerNomineeLinkRequest(tx, { pariwarId: nomineeGone.p, nomineeMemberId: nomineeGone.b, linkId: n1.applied.asked[0]!.linkId, answer: 'confirmed' });
      await eraseNomineeLinks(tx, { pariwarId: nomineeGone.p, memberId: nomineeGone.b });
      expect((await row(n1.applied.asked[0]!.linkId))['state']).toBe('erased');
      expect((await getNomineeLinksForExport(tx, { pariwarId: nomineeGone.p, memberId: nomineeGone.a })).marked.map((m) => [m.rank, m.versionNo, m.state, m.answer])).toEqual([[1, 1, 'ended', 'confirmed']]);

      // a nominee a claim NAMES cannot be shown the request either (`nomineeLinkAnswererSql`) — their mark reads `ended`, ⛔ name
      const named = await scene();
      const m1 = await save(named.p, named.a, [mark(named.b)]);
      if (m1.kind !== 'applied') throw new Error(m1.reason);
      expect((await getNomineeLinksForExport(tx, { pariwarId: named.p, memberId: named.b })).namedBy.map((m) => [m.state, m.nameSeen])).toEqual([['live', true]]);
      await asOwner(named.p, () => seedClaim(getTx().tx, named.p, { deceasedMemberId: named.b }));
      expect((await getNomineeLinksForExport(tx, { pariwarId: named.p, memberId: named.b })).namedBy.map((m) => [m.state, m.nameSeen])).toEqual([['ended', false]]);
    });

    it('a mark MOVED to the other rank keeps the member\'s answer and `asked_at` — ⛔ re-asked (code review round 3)', async () => {
      const { p, a, b } = await scene();
      const first = await save(p, a, [mark(b), null]);
      if (first.kind !== 'applied') throw new Error(first.reason);
      const original = first.applied.asked[0]!.linkId;
      await answerNomineeLinkRequest(getTx().tx, { pariwarId: p, nomineeMemberId: b, linkId: original, answer: 'confirmed' });
      const moved = await save(p, a, [null, mark(b)]); // rank 1 vacated, the same member marked afresh on rank 2
      if (moved.kind !== 'applied') throw new Error(moved.reason);
      expect(moved.applied.asked).toEqual([]);
      expect(moved.applied.carried).toHaveLength(1);
      expect(await row(original)).toMatchObject({ state: 'ended', end_reason: 'redeclared' });
      const carried = await row(moved.applied.carried[0]!.linkId)
      expect(carried).toMatchObject({ state: 'live', rank: 2, answer: 'confirmed', carried_from_link_id: original })
      expect(carried['asked_at']).toEqual((await row(original))['asked_at']) // the date they were first asked travels with the answer;
    });
  });
});
