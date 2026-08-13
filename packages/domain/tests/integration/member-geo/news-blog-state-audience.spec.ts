// News-blog `state` dispatch audience — live-DB integration (Story 1.19, Task 6; AC3, AC7).
//
// The POSITIVE path for the arm `news-blog.spec.ts` only pins as empty-for-a-concrete-reason. What
// only a live DB can prove here is the thing that actually matters to a member: that a post targeted
// at a state reaches the members who are IN it, and NOBODY else.
//
// ⭐ THE CORRELATION TEST IS THE POINT. Two members in DIFFERENT districts under ONE tree is the
// minimum shape that distinguishes a working correlated subquery from the tautology bug: if the
// correlation collapses, the subquery returns one member's district for EVERY member, and either
// both members match or neither does — never exactly one ([[project_epic6_drizzle_correlated_
// subquery_bug]], a live ~30-40%-of-runs wrong-district bug that DB-free tests could not see).
//
// Live DB only. Own-committing writers accumulate rows → assert membership, not counts
// ([[project_live_db_test_gotchas]]).

import type pg from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { createGeoTreeVersion, loadGeoTree } from '../../../src/geo-tree/index.js';
import { resolveAudienceMemberIds } from '../../../src/news-blog/index.js';
import type { GeoTreeNodeJson } from '../../../src/schema/geo_tree_versions.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedMember, seedMemberPosting } from '../_helpers.js';

const NOW = new Date('2026-08-13T12:00:00Z');
const EFFECTIVE = new Date('2026-01-01T00:00:00Z');
// ⚠ EVERY posting seed pins `created_at` EXPLICITLY, and that is not tidiness. `seedMemberPosting`
// defaults it to the REAL wall clock (`postingSeedClockMs = Date.now()`, `_helpers.ts:515`), while
// the reads here are bounded by the PINNED instant `NOW`. Leave the default in and the suite passes
// or fails depending on what time of day it runs — the DATE-BOMB class, which fails on a DATE rather
// than a diff and which a baseline comparison can never see
// ([[project_known_livedb_test_failures]] #12).
const POSTED = new Date('2026-03-01T00:00:00Z');

// Bihar ⊃ {Patna, Vaishali}; UP ⊃ {Lucknow}. Two states so "reaches the right ones" is a real
// discrimination and not just "reaches everyone in the only state there is".
const TWO_STATE_TREE: GeoTreeNodeJson[] = [
  { dimension: 'state', value: 'Bihar', parent_dimension: null, parent_value: null },
  { dimension: 'state', value: 'UP', parent_dimension: null, parent_value: null },
  { dimension: 'district', value: 'Patna', parent_dimension: 'state', parent_value: 'Bihar' },
  { dimension: 'district', value: 'Vaishali', parent_dimension: 'state', parent_value: 'Bihar' },
  { dimension: 'district', value: 'Lucknow', parent_dimension: 'state', parent_value: 'UP' },
];

describe.skipIf(!hasDatabase)('news-blog `state` dispatch audience (AC3, AC7)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('selects EXACTLY the members whose district sits beneath the target state', async () => {
    const { client, tx } = getTx();
    const inPatna = await seedMember(tx, PARIWAR_A, { state: 'active' });
    const inVaishali = await seedMember(tx, PARIWAR_A, { state: 'active' });
    const inLucknow = await seedMember(tx, PARIWAR_A, { state: 'active' });
    await seedMemberPosting(tx, PARIWAR_A, inPatna, 'Patna', { createdAt: POSTED });
    await seedMemberPosting(tx, PARIWAR_A, inVaishali, 'Vaishali', { createdAt: POSTED });
    await seedMemberPosting(tx, PARIWAR_A, inLucknow, 'Lucknow', { createdAt: POSTED });

    await enterAppScope(client, PARIWAR_A);
    await createGeoTreeVersion(tx, { pariwarId: PARIWAR_A, nodes: TWO_STATE_TREE, effectiveAt: EFFECTIVE });
    const tree = await loadGeoTree(tx, PARIWAR_A, NOW);

    const bihar = await resolveAudienceMemberIds(tx, PARIWAR_A, 'state', 'Bihar', undefined, { tree, now: NOW });
    // ⭐ Two DIFFERENT districts both roll up to Bihar — this is the ancestry actually being walked.
    expect(bihar).toContain(inPatna);
    expect(bihar).toContain(inVaishali);
    // ⭐ And the correlation is REAL: the UP member is excluded. A collapsed correlation could not
    // produce this split.
    expect(bihar).not.toContain(inLucknow);

    const up = await resolveAudienceMemberIds(tx, PARIWAR_A, 'state', 'UP', undefined, { tree, now: NOW });
    expect(up).toContain(inLucknow);
    expect(up).not.toContain(inPatna);
    expect(up).not.toContain(inVaishali);
  });

  // ⛔ FAIL-CLOSED. `NULL IN (...)` is NULL, never TRUE — but that is asserted, not inferred.
  it('a member with NO posting row is in NO state audience — never in all', async () => {
    const { client, tx } = getTx();
    const inPatna = await seedMember(tx, PARIWAR_A, { state: 'active' });
    const nowhere = await seedMember(tx, PARIWAR_A, { state: 'active' });
    await seedMemberPosting(tx, PARIWAR_A, inPatna, 'Patna', { createdAt: POSTED });
    // `nowhere` deliberately gets NO posting row.

    await enterAppScope(client, PARIWAR_A);
    await createGeoTreeVersion(tx, { pariwarId: PARIWAR_A, nodes: TWO_STATE_TREE, effectiveAt: EFFECTIVE });
    const tree = await loadGeoTree(tx, PARIWAR_A, NOW);

    const bihar = await resolveAudienceMemberIds(tx, PARIWAR_A, 'state', 'Bihar', undefined, { tree, now: NOW });
    expect(bihar).toContain(inPatna);
    expect(bihar).not.toContain(nowhere);
  });

  it('honours the NEWEST posting — a member who transferred OUT drops out of the audience', async () => {
    const { client, tx } = getTx();
    const transferred = await seedMember(tx, PARIWAR_A, { state: 'active' });
    await seedMemberPosting(tx, PARIWAR_A, transferred, 'Patna', {
      createdAt: new Date('2026-02-01T00:00:00Z'),
    });
    await seedMemberPosting(tx, PARIWAR_A, transferred, 'Lucknow', {
      createdAt: new Date('2026-05-01T00:00:00Z'), // moved to UP
    });

    await enterAppScope(client, PARIWAR_A);
    await createGeoTreeVersion(tx, { pariwarId: PARIWAR_A, nodes: TWO_STATE_TREE, effectiveAt: EFFECTIVE });
    const tree = await loadGeoTree(tx, PARIWAR_A, NOW);

    expect(await resolveAudienceMemberIds(tx, PARIWAR_A, 'state', 'Bihar', undefined, { tree, now: NOW })).not.toContain(
      transferred,
    );
    expect(await resolveAudienceMemberIds(tx, PARIWAR_A, 'state', 'UP', undefined, { tree, now: NOW })).toContain(
      transferred,
    );
  });

  // The `members-all` arm's reachability rule must survive into the geo arm: a grace member is
  // still a member and still gets announcements. A raw `state = 'active'` scan would drop them.
  it('includes active-in-grace members and excludes unreachable lifecycle states', async () => {
    const { client, tx } = getTx();
    const active = await seedMember(tx, PARIWAR_A, { state: 'active' });
    const grace = await seedMember(tx, PARIWAR_A, { state: 'active-in-grace' });
    const pending = await seedMember(tx, PARIWAR_A, { state: 'pending-kyc' });
    const lapsed = await seedMember(tx, PARIWAR_A, { state: 'lapsed-unpaid' });
    for (const m of [active, grace, pending, lapsed]) {
      await seedMemberPosting(tx, PARIWAR_A, m, 'Patna', { createdAt: POSTED });
    }

    await enterAppScope(client, PARIWAR_A);
    await createGeoTreeVersion(tx, { pariwarId: PARIWAR_A, nodes: TWO_STATE_TREE, effectiveAt: EFFECTIVE });
    const tree = await loadGeoTree(tx, PARIWAR_A, NOW);

    const bihar = await resolveAudienceMemberIds(tx, PARIWAR_A, 'state', 'Bihar', undefined, { tree, now: NOW });
    expect(bihar).toContain(active);
    expect(bihar).toContain(grace);
    expect(bihar).not.toContain(pending);
    expect(bihar).not.toContain(lapsed);
  });

  // ⛔ NO NORMALIZATION, end-to-end against real stored text.
  it('a district differing only by CASE is not beneath the state', async () => {
    const { client, tx } = getTx();
    const lower = await seedMember(tx, PARIWAR_A, { state: 'active' });
    await seedMemberPosting(tx, PARIWAR_A, lower, 'patna', { createdAt: POSTED }); // tree declares 'Patna'

    await enterAppScope(client, PARIWAR_A);
    await createGeoTreeVersion(tx, { pariwarId: PARIWAR_A, nodes: TWO_STATE_TREE, effectiveAt: EFFECTIVE });
    const tree = await loadGeoTree(tx, PARIWAR_A, NOW);

    expect(await resolveAudienceMemberIds(tx, PARIWAR_A, 'state', 'Bihar', undefined, { tree, now: NOW })).not.toContain(
      lower,
    );
  });

  // ⛔ THE ONE FAILURE WORSE THAN SENDING NOTHING: a targeting mistake becoming a Pariwar-wide
  // broadcast. An unknown state must dispatch to NOBODY, never fall back to `members-all`.
  it('an UNKNOWN state resolves to the EMPTY set — never a members-all fallback', async () => {
    const { client, tx } = getTx();
    const inPatna = await seedMember(tx, PARIWAR_A, { state: 'active' });
    await seedMemberPosting(tx, PARIWAR_A, inPatna, 'Patna', { createdAt: POSTED });

    await enterAppScope(client, PARIWAR_A);
    await createGeoTreeVersion(tx, { pariwarId: PARIWAR_A, nodes: TWO_STATE_TREE, effectiveAt: EFFECTIVE });
    const tree = await loadGeoTree(tx, PARIWAR_A, NOW);

    expect(await resolveAudienceMemberIds(tx, PARIWAR_A, 'state', 'Kerala', undefined, { tree, now: NOW })).toEqual([]);
    // …and with NO tree at all, likewise.
    expect(await resolveAudienceMemberIds(tx, PARIWAR_A, 'state', 'Bihar', undefined, { tree: null, now: NOW })).toEqual([]);
  });

  // ⭐ AC7 — THE N+1 PROOF, measured deterministically rather than by timing. The fan-out must be
  // ONE query no matter how many members are in the Pariwar; at 4L members an N+1 is not "slow",
  // it is an outage.
  it('issues exactly ONE query regardless of member count (no N+1)', async () => {
    const { client, tx } = getTx();

    const seedCohort = async (n: number, district: string): Promise<void> => {
      for (let i = 0; i < n; i += 1) {
        const m = await seedMember(tx, PARIWAR_A, { state: 'active' });
        await seedMemberPosting(tx, PARIWAR_A, m, district, { createdAt: POSTED });
      }
    };
    await seedCohort(2, 'Patna');

    await enterAppScope(client, PARIWAR_A);
    await createGeoTreeVersion(tx, { pariwarId: PARIWAR_A, nodes: TWO_STATE_TREE, effectiveAt: EFFECTIVE });
    const tree = await loadGeoTree(tx, PARIWAR_A, NOW);

    // Count statements issued on the underlying pg client during the call itself.
    const countQueriesDuring = async (fn: () => Promise<unknown>): Promise<number> => {
      const spy = vi.spyOn(client as unknown as { query: pg.PoolClient['query'] }, 'query');
      try {
        await fn();
        return spy.mock.calls.length;
      } finally {
        spy.mockRestore();
      }
    };

    const withTwo = await countQueriesDuring(() =>
      resolveAudienceMemberIds(tx, PARIWAR_A, 'state', 'Bihar', undefined, { tree, now: NOW }),
    );

    // Ten more members, in BOTH districts beneath the state, so the audience genuinely grows.
    await seedCohort(5, 'Patna');
    await seedCohort(5, 'Vaishali');

    const withTwelve = await countQueriesDuring(() =>
      resolveAudienceMemberIds(tx, PARIWAR_A, 'state', 'Bihar', undefined, { tree, now: NOW }),
    );

    // ⭐ ONE query, and — the assertion that actually rules out an N+1 — the count does NOT grow
    // with the population. Both halves matter: a fixed count of 3 would also be non-N+1, and a
    // count of 1 measured only at n=2 would not prove anything about n=4L.
    expect(withTwo).toBe(1);
    expect(withTwelve).toBe(1);
    expect(withTwelve).toBe(withTwo);

    // Sanity: the audience really did grow, so the constant query count is not constant because
    // the read returned nothing.
    const audience = await resolveAudienceMemberIds(tx, PARIWAR_A, 'state', 'Bihar', undefined, { tree, now: NOW });
    expect(audience.length).toBeGreaterThanOrEqual(12);
  });
});
