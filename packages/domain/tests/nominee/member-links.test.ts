// Story 6.36e (Task 2.1; AC3; `2026-10-24-397` NE2, NE5) — `planNomineeLinks`, the PURE keep / end / insert plan of a declare:
// a NEW mark, a KEEP on the same rank and on the OTHER rank (a swap ⇒ ⛔ 409), the end reasons (`redeclared` — vacated, given
// another mark, carried, ⛔ on the head; `removed_by_declarer` — re-saved without a mark), and the three refusals (`not_found`
// — ONE answer for every unresolved mark; `stale`; `duplicate` — one member on both ranks, whatever the kinds); and
// `shapeNomineeLinkExport`, the PURE export rule (`2026-10-24-399`: an erasure reads `ended`; a declarer's name only on a row the
// app lists; a carry chain is one row).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { memberId as toMemberId, nomineeLinkId, nomineeVersionId, type MemberId } from '../../src/ids/index.js';
import { type LiveNomineeLink, type RawNomineeLinkExportRow, planNomineeLinks, shapeNomineeLinkExport } from '../../src/nominee/member-links.js';

const who = (): MemberId => toMemberId(randomUUID());

function live(rank: 1 | 2, o: { nominee?: MemberId; onHead?: boolean } = {}): LiveNomineeLink {
  return { linkId: nomineeLinkId(randomUUID()), versionId: nomineeVersionId(randomUUID()), rank, nomineeMemberId: o.nominee ?? who(), onHead: o.onHead ?? true };
}

describe('Story 6.36e — planNomineeLinks (NE2)', () => {
  it('a NEW mark on a rank with ⛔ live link ⇒ one insert, ⛔ end', () => {
    const b = who();
    expect(planNomineeLinks([], [{ rank: 1, link: { kind: 'new', nomineeMemberId: b, foundBy: 'contacts' } }, { rank: 2, link: null }])).toEqual({
      kind: 'plan',
      inserts: [{ rank: 1, nomineeMemberId: b, carriedFrom: null, foundBy: 'contacts' }],
      ends: [],
    });
  });

  it('a KEEP on the same rank carries it (the old row ends `redeclared` — ⛔ re-asked)', () => {
    const l = live(1);
    const plan = planNomineeLinks([l], [{ rank: 1, link: { kind: 'keep', linkId: l.linkId } }]);
    expect(plan).toEqual({
      kind: 'plan',
      inserts: [{ rank: 1, nomineeMemberId: l.nomineeMemberId, carriedFrom: l, foundBy: null }],
      ends: [{ linkId: l.linkId, rank: 1, reason: 'redeclared' }],
    });
  });

  it('a KEEP named in upper case still matches (the brand is lower-case)', () => {
    const l = live(1);
    expect(planNomineeLinks([l], [{ rank: 1, link: { kind: 'keep', linkId: l.linkId.toUpperCase() } }]).kind).toBe('plan');
  });

  it('ranks SWAPPED — each keep carried to the rank it is submitted on, ⛔ 409', () => {
    const one = live(1);
    const two = live(2);
    const plan = planNomineeLinks([one, two], [
      { rank: 1, link: { kind: 'keep', linkId: two.linkId } },
      { rank: 2, link: { kind: 'keep', linkId: one.linkId } },
    ]);
    expect(plan).toMatchObject({
      kind: 'plan',
      inserts: [
        { rank: 1, nomineeMemberId: two.nomineeMemberId, carriedFrom: two },
        { rank: 2, nomineeMemberId: one.nomineeMemberId, carriedFrom: one },
      ],
      ends: [
        { linkId: one.linkId, reason: 'redeclared' },
        { linkId: two.linkId, reason: 'redeclared' },
      ],
    });
  });

  it('the end reasons: given a NEW mark ⇒ `redeclared`; re-saved WITHOUT ⇒ `removed_by_declarer`; vacated ⇒ `redeclared`', () => {
    const one = live(1);
    const two = live(2);
    expect(planNomineeLinks([one], [{ rank: 1, link: { kind: 'new', nomineeMemberId: who(), foundBy: 'typed' } }])).toMatchObject({
      ends: [{ linkId: one.linkId, reason: 'redeclared' }],
    });
    expect(planNomineeLinks([one], [{ rank: 1, link: null }])).toMatchObject({ ends: [{ linkId: one.linkId, reason: 'removed_by_declarer' }] });
    // a 2 → 1 save: rank 2 is vacated
    expect(planNomineeLinks([two], [{ rank: 1, link: null }])).toMatchObject({ ends: [{ linkId: two.linkId, rank: 2, reason: 'redeclared' }] });
  });

  it('a live link ⛔ on its rank\'s head (a correction since) ends `redeclared` even when the rank is re-saved WITHOUT a mark', () => {
    const stale = live(1, { onHead: false });
    expect(planNomineeLinks([stale], [{ rank: 1, link: null }])).toMatchObject({ ends: [{ linkId: stale.linkId, reason: 'redeclared' }] });
  });

  it('every live link not carried ends — ⛔ one left live', () => {
    const one = live(1);
    const two = live(2);
    const plan = planNomineeLinks([one, two], [{ rank: 1, link: { kind: 'keep', linkId: one.linkId } }, { rank: 2, link: null }]);
    expect(plan).toMatchObject({ ends: [{ linkId: one.linkId, reason: 'redeclared' }, { linkId: two.linkId, reason: 'removed_by_declarer' }] });
  });

  it('refusals: an unresolved NEW mark ⇒ `not_found`; a keep of ⛔ live link ⇒ `stale`', () => {
    expect(planNomineeLinks([], [{ rank: 1, link: { kind: 'new', nomineeMemberId: null, foundBy: 'contacts' } }])).toEqual({ kind: 'refused', reason: 'not_found' });
    expect(planNomineeLinks([live(1)], [{ rank: 1, link: { kind: 'keep', linkId: randomUUID() } }])).toEqual({ kind: 'refused', reason: 'stale' });
  });

  it('`duplicate` — one member on both ranks after resolution, whatever the kinds', () => {
    const b = who();
    const l = live(1, { nominee: b });
    const newB = { kind: 'new' as const, nomineeMemberId: b, foundBy: 'contacts' as const };
    expect(planNomineeLinks([], [{ rank: 1, link: newB }, { rank: 2, link: newB }])).toEqual({ kind: 'refused', reason: 'duplicate' });
    expect(planNomineeLinks([l], [{ rank: 1, link: { kind: 'keep', linkId: l.linkId } }, { rank: 2, link: newB }])).toEqual({ kind: 'refused', reason: 'duplicate' });
    expect(planNomineeLinks([l], [{ rank: 1, link: { kind: 'keep', linkId: l.linkId } }, { rank: 2, link: { kind: 'keep', linkId: l.linkId } }])).toEqual({
      kind: 'refused',
      reason: 'duplicate',
    });
  });
});

describe('Story 6.36e code review — a `new` mark of a member already live (on ANY rank) is a carry', () => {
  it('a re-pick of the SAME member on the SAME rank carries the live link (the answer and `asked_at` stay) — ⛔ re-asked', () => {
    const b = who();
    const l = live(1, { nominee: b });
    expect(planNomineeLinks([l], [{ rank: 1, link: { kind: 'new', nomineeMemberId: b, foundBy: 'contacts' } }])).toEqual({
      kind: 'plan',
      inserts: [{ rank: 1, nomineeMemberId: b, carriedFrom: l, foundBy: null }],
      ends: [{ linkId: l.linkId, rank: 1, reason: 'redeclared' }],
    });
  });

  it('the SAME member on the OTHER rank while a keep still holds their link is a `duplicate`; a DIFFERENT member on the same rank is still a new mark', () => {
    const b = who();
    const l = live(1, { nominee: b });
    const newB = { kind: 'new' as const, nomineeMemberId: b, foundBy: 'contacts' as const };
    expect(planNomineeLinks([l], [{ rank: 1, link: { kind: 'keep', linkId: l.linkId } }, { rank: 2, link: newB }])).toEqual({ kind: 'refused', reason: 'duplicate' });
    const c = who();
    expect(planNomineeLinks([l], [{ rank: 1, link: { kind: 'new', nomineeMemberId: c, foundBy: 'picker' } }])).toMatchObject({
      inserts: [{ rank: 1, nomineeMemberId: c, carriedFrom: null, foundBy: 'picker' }],
      ends: [{ linkId: l.linkId, reason: 'redeclared' }],
    });
  });
});

describe('Story 6.36e fix-diff review, round 3 — a member live on one rank and marked again on the OTHER is carried, ⛔ re-asked', () => {
  const newMark = (m: MemberId) => ({ kind: 'new' as const, nomineeMemberId: m, foundBy: 'contacts' as const });

  it('the mark MOVES rank (rank 1 vacated, the member marked afresh on rank 2): their answer and `asked_at` carry, the old link ends `redeclared`', () => {
    const b = who();
    const l = live(1, { nominee: b });
    expect(planNomineeLinks([l], [{ rank: 1, link: null }, { rank: 2, link: newMark(b) }])).toEqual({
      kind: 'plan',
      inserts: [{ rank: 2, nomineeMemberId: b, carriedFrom: l, foundBy: null }],
      ends: [{ linkId: l.linkId, rank: 1, reason: 'redeclared' }],
    });
  });

  it('rank 1 given ANOTHER member and the live member marked afresh on rank 2: one new mark, one carry, one end', () => {
    const b = who();
    const c = who();
    const l = live(1, { nominee: b });
    const plan = planNomineeLinks([l], [{ rank: 1, link: newMark(c) }, { rank: 2, link: newMark(b) }]);
    expect(plan).toEqual({
      kind: 'plan',
      inserts: [
        { rank: 1, nomineeMemberId: c, carriedFrom: null, foundBy: 'contacts' },
        { rank: 2, nomineeMemberId: b, carriedFrom: l, foundBy: null },
      ],
      ends: [{ linkId: l.linkId, rank: 1, reason: 'redeclared' }],
    });
  });

  it('two NEW marks of one live member (both ranks) are still a `duplicate` — they would carry ONE link twice', () => {
    const b = who();
    const l = live(1, { nominee: b });
    expect(planNomineeLinks([l], [{ rank: 1, link: newMark(b) }, { rank: 2, link: newMark(b) }])).toEqual({ kind: 'refused', reason: 'duplicate' });
  });
});

describe('Story 6.36e code review — shapeNomineeLinkExport (`2026-10-24-399`, extending `-333` call 3(a) and `-334` call 1)', () => {
  const at = new Date('2026-10-20T10:00:00Z');
  const raw = (o: Partial<RawNomineeLinkExportRow> & Pick<RawNomineeLinkExportRow, 'linkId'>): RawNomineeLinkExportRow => ({
    carriedFromLinkId: null,
    rank: 1,
    versionNo: 1,
    state: 'live',
    answer: null,
    askedAt: at,
    asDeclarer: false,
    otherMemberId: who(),
    listed: true,
    ...o,
  });

  it('an ERASED link reads `ended` on BOTH lists — ⛔ `erased` is never a state the export says', () => {
    const out = shapeNomineeLinkExport([
      raw({ linkId: 'm1', asDeclarer: true, state: 'erased', answer: 'confirmed' }),
      raw({ linkId: 'n1', state: 'erased', listed: false, answer: 'confirmed' }),
    ]);
    expect(out.marked.map((m) => m.state)).toEqual(['ended']);
    expect(out.namedBy.map((m) => m.state)).toEqual(['ended']);
  });

  it('`namedBy`: the declarer\'s name is SEEN only on a LISTED row; an ended, an erased and a claim-hidden live row read `ended`, ⛔ name — and keep the member\'s own facts', () => {
    const out = shapeNomineeLinkExport([
      raw({ linkId: 'listed', state: 'live', listed: true }),
      raw({ linkId: 'removed', state: 'ended', listed: false, answer: 'not_me' }),
      raw({ linkId: 'erased', state: 'erased', listed: false }),
      raw({ linkId: 'hidden', state: 'live', listed: false, answer: 'confirmed' }),
    ]);
    expect(out.namedBy.map((m) => [m.state, m.nameSeen, m.answer])).toEqual([
      ['live', true, null],
      ['ended', false, 'not_me'],
      ['ended', false, null],
      ['ended', false, 'confirmed'],
    ]);
    expect(out.namedBy.map((m) => m.askedAt)).toEqual([at, at, at, at]);
  });

  it('`namedBy`: `state` and `listed` are READ INDEPENDENTLY — an ended / erased row reads `ended` even when `listed` says true; a live row not listed (a lapsed reader) reads `ended`, ⛔ name', () => {
    const out = shapeNomineeLinkExport([
      raw({ linkId: 'e', state: 'ended', listed: true, answer: 'not_me' }),
      raw({ linkId: 'z', state: 'erased', listed: true }),
      raw({ linkId: 'lapsed', state: 'live', listed: false, answer: 'confirmed' }),
      raw({ linkId: 'seen', state: 'live', listed: true, answer: 'confirmed' }),
    ]);
    expect(out.namedBy.map((m) => [m.state, m.nameSeen, m.answer])).toEqual([
      ['ended', false, 'not_me'],
      ['ended', false, null],
      ['ended', false, 'confirmed'],
      ['live', true, 'confirmed'],
    ]);
  });

  it('a mark CARRIED through re-saves is ONE `namedBy` row — the chain\'s head — so the declarer\'s re-save count is ⛔ countable', () => {
    const same = who();
    const out = shapeNomineeLinkExport([
      raw({ linkId: 'c1', state: 'ended', listed: false, otherMemberId: same }),
      raw({ linkId: 'c2', carriedFromLinkId: 'c1', state: 'ended', listed: false, otherMemberId: same }),
      raw({ linkId: 'c3', carriedFromLinkId: 'c2', state: 'live', listed: true, otherMemberId: same }),
    ]);
    expect(out.namedBy).toHaveLength(1);
    expect(out.namedBy[0]).toMatchObject({ state: 'live', nameSeen: true, otherMemberId: same });
    // a chain whose head ended reads `ended` once
    const ended = shapeNomineeLinkExport([
      raw({ linkId: 'd1', state: 'ended', listed: false }),
      raw({ linkId: 'd2', carriedFromLinkId: 'd1', state: 'ended', listed: false }),
    ]);
    expect(ended.namedBy.map((m) => [m.state, m.nameSeen])).toEqual([['ended', false]]);
  });

  it('`marked` (the declarer\'s OWN marks): one row per version — ⛔ collapsed; the marked member\'s name only once they CONFIRMED', () => {
    const b = who();
    const out = shapeNomineeLinkExport([
      raw({ linkId: 'a1', asDeclarer: true, versionNo: 1, state: 'ended', answer: 'confirmed', otherMemberId: b }),
      raw({ linkId: 'a2', asDeclarer: true, carriedFromLinkId: 'a1', versionNo: 2, state: 'live', answer: 'confirmed', otherMemberId: b }),
      raw({ linkId: 'a3', asDeclarer: true, rank: 2, versionNo: 1, state: 'live', answer: 'not_me' }),
      raw({ linkId: 'a4', asDeclarer: true, rank: 2, versionNo: 2, state: 'live', answer: null }),
    ]);
    expect(out.marked.map((m) => [m.rank, m.versionNo, m.state, m.nameSeen])).toEqual([
      [1, 1, 'ended', true],
      [1, 2, 'live', true],
      [2, 1, 'live', false],
      [2, 2, 'live', false],
    ]);
  });

  it('a member on BOTH sides of different links gets each in its own list', () => {
    const out = shapeNomineeLinkExport([raw({ linkId: 'x', asDeclarer: true }), raw({ linkId: 'y', asDeclarer: false })]);
    expect([out.marked.length, out.namedBy.length]).toEqual([1, 1]);
  });
});
