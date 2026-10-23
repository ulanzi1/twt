// Story 6.36e (Task 2.1; AC3; `2026-10-24-397` NE2, NE5) — `planNomineeLinks`, the PURE keep / end / insert plan of a declare:
// a NEW mark, a KEEP on the same rank and on the OTHER rank (a swap ⇒ ⛔ 409), the end reasons (`redeclared` — vacated, given
// another mark, carried, ⛔ on the head; `removed_by_declarer` — re-saved without a mark), and the three refusals (`not_found`
// — ONE answer for every unresolved mark; `stale`; `duplicate` — one member on both ranks, whatever the kinds).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { memberId as toMemberId, nomineeLinkId, nomineeVersionId, type MemberId } from '../../src/ids/index.js';
import { type LiveNomineeLink, planNomineeLinks } from '../../src/nominee/member-links.js';

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
