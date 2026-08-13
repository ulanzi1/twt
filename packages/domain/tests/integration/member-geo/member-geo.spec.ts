// Member-geo primitive — live-DB integration (Story 1.19, Task 3; AC1, AC2).
//
// The pure lift is covered DB-free in `tests/member-geo/resolve.test.ts`. What ONLY a live DB can
// prove is the half above it: that the posting READ picks the right row, against real rows, with the
// real tie-break, through a real published tree.
//
// ⭐ The D3 tie-break case is the reason this suite exists at all. Two `member_postings` rows can
// share a `created_at` (same-transaction inserts; `defaultNow()` resolution), and a
// nondeterministic audience is a nondeterministic TEST. A DB-free test cannot express the tie
// because there is no `posting_id` ordering to disagree about.
//
// Live DB only. Own-committing writers accumulate rows → assert membership/shape, not global counts
// ([[project_live_db_test_gotchas]]).

import { describe, expect, it } from 'vitest';

import { createGeoTreeVersion, loadGeoTree } from '../../../src/geo-tree/index.js';
import { memberId as toMemberId } from '../../../src/ids/index.js';
import { getMemberCurrentDistrict, resolveMemberGeoNode } from '../../../src/member-geo/index.js';
import type { GeoTreeNodeJson } from '../../../src/schema/geo_tree_versions.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedMember, seedMemberPosting } from '../_helpers.js';

// A tree WITH blocks — needed so the `block` assertion proves D5 (a member-attribute fact) rather
// than merely re-observing that this tree happens to have no blocks in it.
const BIHAR_WITH_BLOCKS: GeoTreeNodeJson[] = [
  { dimension: 'state', value: 'Bihar', parent_dimension: null, parent_value: null },
  { dimension: 'district', value: 'Patna', parent_dimension: 'state', parent_value: 'Bihar' },
  { dimension: 'district', value: 'Vaishali', parent_dimension: 'state', parent_value: 'Bihar' },
  { dimension: 'block', value: 'Danapur', parent_dimension: 'district', parent_value: 'Patna' },
];

// A REAL Pariwar shape: districts with no state above them.
const DISTRICT_ONLY: GeoTreeNodeJson[] = [
  { dimension: 'district', value: 'Patna', parent_dimension: null, parent_value: null },
];

const NOW = new Date('2026-08-13T12:00:00Z');
const EFFECTIVE = new Date('2026-08-01T00:00:00Z');

describe.skipIf(!hasDatabase)('member-geo primitive (AC1, AC2)', () => {
  setupLiveDb();

  // ⛔ FAIL-CLOSED, the load-bearing case. A member with no posting is in NO geo audience.
  it('a member with NO posting row resolves to NO geo at all', async () => {
    const { client, tx } = getTx();
    const memberIdStr = await seedMember(tx, PARIWAR_A, { state: 'active' });
    await enterAppScope(client, PARIWAR_A);
    await createGeoTreeVersion(tx, {
      pariwarId: PARIWAR_A,
      nodes: BIHAR_WITH_BLOCKS,
      effectiveAt: EFFECTIVE,
    });
    const tree = await loadGeoTree(tx, PARIWAR_A, NOW);

    const geo = await resolveMemberGeoNode(tx, PARIWAR_A, toMemberId(memberIdStr), tree, NOW);
    expect(geo.district).toEqual({ available: false, reason: 'no-posting-row' });
    expect(geo.state).toEqual({ available: false, reason: 'no-posting-row' });
    // The tenancy key survives — it is not a tree answer.
    expect(geo.pariwar).toEqual({ available: true, value: PARIWAR_A });
  });

  // AC2: a Pariwar with NO tree resolves DISTRICT-ONLY, so its `state` audience denies exactly as
  // it does today. `loadGeoTree` → null is the whole mechanism.
  it('a Pariwar with NO published tree → district present, state `no-tree-published`', async () => {
    const { client, tx } = getTx();
    const memberIdStr = await seedMember(tx, PARIWAR_A, { state: 'active' });
    await seedMemberPosting(tx, PARIWAR_A, memberIdStr, 'Patna');
    await enterAppScope(client, PARIWAR_A);

    const tree = await loadGeoTree(tx, PARIWAR_A, NOW);
    expect(tree).toBeNull(); // ⭐ there is NO code default geography (ADR-0038)

    const geo = await resolveMemberGeoNode(tx, PARIWAR_A, toMemberId(memberIdStr), tree, NOW);
    expect(geo.district).toEqual({ available: true, value: 'Patna' });
    expect(geo.state).toEqual({ available: false, reason: 'no-tree-published' });
  });

  it('lifts a real posting district to its state through a real published tree', async () => {
    const { client, tx } = getTx();
    const memberIdStr = await seedMember(tx, PARIWAR_A, { state: 'active' });
    await seedMemberPosting(tx, PARIWAR_A, memberIdStr, 'Patna');
    await enterAppScope(client, PARIWAR_A);
    await createGeoTreeVersion(tx, {
      pariwarId: PARIWAR_A,
      nodes: BIHAR_WITH_BLOCKS,
      effectiveAt: EFFECTIVE,
    });
    const tree = await loadGeoTree(tx, PARIWAR_A, NOW);

    const geo = await resolveMemberGeoNode(tx, PARIWAR_A, toMemberId(memberIdStr), tree, NOW);
    expect(geo.district).toEqual({ available: true, value: 'Patna' });
    expect(geo.state).toEqual({ available: true, value: 'Bihar' });
  });

  it('a district that is NOT a node in the published tree → `node-not-in-tree`', async () => {
    const { client, tx } = getTx();
    const memberIdStr = await seedMember(tx, PARIWAR_A, { state: 'active' });
    await seedMemberPosting(tx, PARIWAR_A, memberIdStr, 'Gaya');
    await enterAppScope(client, PARIWAR_A);
    await createGeoTreeVersion(tx, {
      pariwarId: PARIWAR_A,
      nodes: BIHAR_WITH_BLOCKS,
      effectiveAt: EFFECTIVE,
    });
    const tree = await loadGeoTree(tx, PARIWAR_A, NOW);

    const geo = await resolveMemberGeoNode(tx, PARIWAR_A, toMemberId(memberIdStr), tree, NOW);
    expect(geo.district).toEqual({ available: true, value: 'Gaya' });
    expect(geo.state).toEqual({ available: false, reason: 'node-not-in-tree' });
  });

  it('a DISTRICT-ONLY tree → the district is a node but has no state above it', async () => {
    const { client, tx } = getTx();
    const memberIdStr = await seedMember(tx, PARIWAR_A, { state: 'active' });
    await seedMemberPosting(tx, PARIWAR_A, memberIdStr, 'Patna');
    await enterAppScope(client, PARIWAR_A);
    await createGeoTreeVersion(tx, {
      pariwarId: PARIWAR_A,
      nodes: DISTRICT_ONLY,
      effectiveAt: EFFECTIVE,
    });
    const tree = await loadGeoTree(tx, PARIWAR_A, NOW);

    const geo = await resolveMemberGeoNode(tx, PARIWAR_A, toMemberId(memberIdStr), tree, NOW);
    expect(geo.district).toEqual({ available: true, value: 'Patna' });
    expect(geo.state).toEqual({ available: false, reason: 'no-ancestor-at-dimension' });
  });

  // ⭐ D5, PROVEN rather than assumed: the tree HAS `Danapur` as a block under this member's own
  // district, and `block` is STILL absent — because a posting supplies a district and ancestry
  // walks UP. Only a new member ATTRIBUTE could populate it.
  it('`block` is absent with `no-member-attribute` EVEN under a tree that HAS blocks', async () => {
    const { client, tx } = getTx();
    const memberIdStr = await seedMember(tx, PARIWAR_A, { state: 'active' });
    await seedMemberPosting(tx, PARIWAR_A, memberIdStr, 'Patna');
    await enterAppScope(client, PARIWAR_A);
    await createGeoTreeVersion(tx, {
      pariwarId: PARIWAR_A,
      nodes: BIHAR_WITH_BLOCKS,
      effectiveAt: EFFECTIVE,
    });
    const tree = await loadGeoTree(tx, PARIWAR_A, NOW);

    const geo = await resolveMemberGeoNode(tx, PARIWAR_A, toMemberId(memberIdStr), tree, NOW);
    expect(geo.state).toEqual({ available: true, value: 'Bihar' }); // the tree IS complete here
    expect(geo.block).toEqual({ available: false, reason: 'no-member-attribute' });
  });

  it('the NEWEST posting wins when `created_at` differs', async () => {
    const { client, tx } = getTx();
    const memberIdStr = await seedMember(tx, PARIWAR_A, { state: 'active' });
    await seedMemberPosting(tx, PARIWAR_A, memberIdStr, 'Vaishali', {
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    await seedMemberPosting(tx, PARIWAR_A, memberIdStr, 'Patna', {
      createdAt: new Date('2026-06-01T00:00:00Z'),
    });
    await enterAppScope(client, PARIWAR_A);

    expect(await getMemberCurrentDistrict(tx, PARIWAR_A, toMemberId(memberIdStr), NOW)).toBe('Patna');
  });

  // ⭐ THE D3 CASE. Two rows, IDENTICAL `created_at` — only `posting_id DESC` can decide, and the
  // answer must be the same every run. `getMemberPostingLatest` (`member/posting.ts:117-129`) orders
  // by `created_at` alone and would be nondeterministic here; that divergence is deliberate and
  // commented at both sites.
  it('two postings sharing `created_at` → the `posting_id` tie-break decides, deterministically', async () => {
    const { client, tx } = getTx();
    const memberIdStr = await seedMember(tx, PARIWAR_A, { state: 'active' });
    const tie = new Date('2026-05-05T00:00:00Z');
    // Hand-picked ids so the expected winner is unambiguous: 'ffff…' > '0000…' in uuid byte order.
    await seedMemberPosting(tx, PARIWAR_A, memberIdStr, 'Vaishali', {
      createdAt: tie,
      postingId: '00000000-0000-4000-8000-000000000001',
    });
    await seedMemberPosting(tx, PARIWAR_A, memberIdStr, 'Patna', {
      createdAt: tie,
      postingId: 'ffffffff-0000-4000-8000-00000000000f',
    });
    await enterAppScope(client, PARIWAR_A);

    // Asserted REPEATEDLY: a nondeterministic implementation could pass a single call by luck.
    for (let i = 0; i < 5; i += 1) {
      expect(await getMemberCurrentDistrict(tx, PARIWAR_A, toMemberId(memberIdStr), NOW)).toBe('Patna');
    }
  });

  // The `at` bound makes the read AS-OF correct: a posting created after the query instant is not
  // yet the member's current one. Guards the DATE-BOMB class ([[project_known_livedb_test_failures]] #12).
  it('a posting created AFTER the query instant does not count', async () => {
    const { client, tx } = getTx();
    const memberIdStr = await seedMember(tx, PARIWAR_A, { state: 'active' });
    await seedMemberPosting(tx, PARIWAR_A, memberIdStr, 'Vaishali', {
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    await seedMemberPosting(tx, PARIWAR_A, memberIdStr, 'Patna', {
      createdAt: new Date('2026-12-01T00:00:00Z'), // after NOW
    });
    await enterAppScope(client, PARIWAR_A);

    expect(await getMemberCurrentDistrict(tx, PARIWAR_A, toMemberId(memberIdStr), NOW)).toBe('Vaishali');
  });

  // ⛔ NO NORMALIZATION, against real stored text. A resolver that case-folded while the tree did
  // not would produce a same-request contradiction (`geo-tree/resolver.ts:20-31`).
  it('a district differing only by CASE does NOT match the tree node', async () => {
    const { client, tx } = getTx();
    const memberIdStr = await seedMember(tx, PARIWAR_A, { state: 'active' });
    await seedMemberPosting(tx, PARIWAR_A, memberIdStr, 'patna'); // lowercase
    await enterAppScope(client, PARIWAR_A);
    await createGeoTreeVersion(tx, {
      pariwarId: PARIWAR_A,
      nodes: BIHAR_WITH_BLOCKS, // declares 'Patna'
      effectiveAt: EFFECTIVE,
    });
    const tree = await loadGeoTree(tx, PARIWAR_A, NOW);

    const geo = await resolveMemberGeoNode(tx, PARIWAR_A, toMemberId(memberIdStr), tree, NOW);
    expect(geo.district).toEqual({ available: true, value: 'patna' });
    expect(geo.state).toEqual({ available: false, reason: 'node-not-in-tree' });
  });

  // A member id that exists in NO tenant at all: the read is keyed on (pariwar_id, member_id).
  it('an unknown member id resolves to no posting', async () => {
    const { client, tx } = getTx();
    const foreignMemberIdStr = await seedMember(tx, PARIWAR_A, { state: 'active' });
    await seedMemberPosting(tx, PARIWAR_A, foreignMemberIdStr, 'Patna');
    await enterAppScope(client, PARIWAR_A);

    const strangerId = toMemberId('99999999-9999-4999-8999-999999999999');
    expect(await getMemberCurrentDistrict(tx, PARIWAR_A, strangerId, NOW)).toBeNull();
  });

  // ⭐ THE GENUINE CROSS-TENANT CASE — a REAL member of PARIWAR_B, with a posting in the SAME
  // district, is invisible from a PARIWAR_A-scoped session. Unlike the unknown-id case above, this
  // proves RLS (not merely a lucky id mismatch) is what gates the read: the query is issued with
  // PARIWAR_B's OWN member id, and the row genuinely exists — it's the session scope that denies it.
  it('is tenant-scoped: a REAL member of another Pariwar, same district, is invisible', async () => {
    const { client, tx } = getTx();
    const memberBIdStr = await seedMember(tx, PARIWAR_B, { state: 'active' });
    await seedMemberPosting(tx, PARIWAR_B, memberBIdStr, 'Patna');
    await enterAppScope(client, PARIWAR_A);

    // Queried under PARIWAR_B's own member id, from a PARIWAR_A-scoped session — RLS denies it
    // regardless of which `pariwarId` argument the caller passes.
    expect(await getMemberCurrentDistrict(tx, PARIWAR_A, toMemberId(memberBIdStr), NOW)).toBeNull();
    expect(await getMemberCurrentDistrict(tx, PARIWAR_B, toMemberId(memberBIdStr), NOW)).toBeNull();
  });
});
