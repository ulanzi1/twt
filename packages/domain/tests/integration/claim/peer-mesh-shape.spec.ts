// AI-6-3 live-DB SHAPE TEST class — correlated-subquery regression (the Story 6.6 bug class).
//
// WHY this spec exists: DB-free unit tests structurally cannot catch data-SHAPE defects. Story 6.6
// shipped a live wrong-district bug with green unit tests — interpolating the outer `members.memberId`
// / `members.pariwarId` Drizzle Column objects into the latest-posting subquery renders them as BARE
// unqualified `"member_id"` / `"pariwar_id"`, which Postgres resolves to the INNER `member_postings p`
// columns (nearest scope wins), collapsing the correlation into an always-true tautology. The subquery
// then silently returns the TENANT-WIDE newest posting for EVERY member instead of each member's own
// (see the bug-class comment in packages/domain/src/claim/peer-mesh-read.ts).
//
// This spec seeds ADVERSARIAL DECOY data — a member (M2) who holds the tenant-wide newest posting in a
// district no other member has — so the known-bad shape returns detectably wrong rows: under the
// tautology, EVERY candidate (and the deceased) comes back with M2's district. A seed the bug passes
// proves nothing; this one fails it deterministically (proven by induced defect — see the AI-6-3 Dev
// Agent Record's revert-sanity evidence). Assertions are exact-membership + exact-order (candidates by
// member_id asc; the posting pick by created_at DESC, posting_id DESC) — never counts. A non-active
// ('withdrawn') member decoy additionally pins the roster's `state = 'active'` predicate.
//
// THE PATTERN (join it): any future compound read model — Epic 7's pool read models first — joins this
// test class by adding a sibling `*-shape.spec.ts` beside its read code, with the same adversarial
// decoy seeding + exact-membership assertions and a WHY header like this one.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  getPeerMeshCandidateSnapshot,
  getPeerMeshDeceasedAttributes,
} from '../../../src/claim/index.js';
import { memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope, seedMember, seedMemberPosting } from '../_helpers.js';

// A random-PER-RUN hex prefix with ORDERED tails: the bytewise (Postgres uuid) order within a run is
// KNOWN (same prefix, ascending tails) — so the `member_id` asc ordering of the candidate snapshot is
// asserted as an exact array order, not sort-then-compare — while cross-run/concurrent collisions on
// the shared `:5433` DB are impossible (no fixed uuids).
const RUN = randomUUID().slice(0, 8);
const M1 = `${RUN}-0000-4000-8000-0000000000a1`; // two posting generations + a created_at tie
const M2 = `${RUN}-0000-4000-8000-0000000000a2`; // holds the TENANT-WIDE newest posting (the decoy)
const M3 = `${RUN}-0000-4000-8000-0000000000a3`; // no posting at all → district must be null
const M4 = `${RUN}-0000-4000-8000-0000000000a4`; // state 'withdrawn' → must be ABSENT from the roster
const DECEASED = `${RUN}-0000-4000-8000-0000000000dd`;

// posting_id pair for the created_at TIE on M1's newest generation — the read's tiebreak is
// `posting_id DESC`, so the HIGH tail's district must win. Same run prefix, bytewise HIGH > LOW.
const TIE_LOW = `${RUN}-0000-4000-8000-0000000000f0`;
const TIE_HIGH = `${RUN}-0000-4000-8000-ffffffffffff`;

// Districts: each expected value is UNIQUE to its member, so a correlation collapse (which yields the
// tenant-wide-latest district for everyone) can never accidentally match an expectation.
const M1_OLD_DISTRICT = 'Vaishali';
const M1_TIE_DECOY_DISTRICT = 'Saran'; // same created_at as the winner, LOWER posting_id → must lose
const M1_EXPECTED_DISTRICT = 'Gaya';
const M2_EXPECTED_DISTRICT = 'Muzaffarpur'; // also the tenant-wide newest posting (the tautology bait)
const M4_DISTRICT = 'Bhagalpur'; // unique — if the non-active member ever leaks in, it is unmistakable
const DECEASED_OLD_DISTRICT = 'Nashik';
const DECEASED_EXPECTED_DISTRICT = 'Patna';

describe.skipIf(!hasDatabase)('peer-mesh read shapes (AI-6-3 correlated-subquery class)', () => {
  setupLiveDb();

  /**
   * Adversarial seed (spec matrix rows 1–2), in a FRESH pariwar so exact-membership assertions can
   * never observe committed rows from other suites:
   *   · M1: posting Vaishali (2020) + a 2022 created_at TIE — Saran @ TIE_LOW vs Gaya @ TIE_HIGH.
   *     Expected: Gaya (created_at DESC, then posting_id DESC).
   *   · M2: ONE posting Muzaffarpur @ NOW — the TENANT-WIDE newest posting (dynamically newest vs the
   *     2020–2023 seeds; no far-future date that a future effective-dating predicate could exclude).
   *     Under the known-bad tautology shape, EVERY member's "latest posting" resolves to this row.
   *   · M3: NO posting → district null (the degrade path; the bad shape returns Muzaffarpur instead).
   *   · M4: state 'withdrawn' (non-active) + a unique-district posting → must NOT appear at all
   *     (pins the roster's `state = 'active'` predicate — dropping it would add a Bhagalpur 4th row).
   *   · DECEASED: Nashik (2020) + Patna (2021). Expected own-latest: Patna; bad shape: Muzaffarpur.
   */
  async function seedShapeMatrix() {
    const { client, tx } = getTx();
    const pariwar = toPariwarId(randomUUID());

    for (const memberId of [M1, M2, M3, DECEASED]) {
      await seedMember(tx, pariwar, { memberId, state: 'active' });
    }
    await seedMember(tx, pariwar, { memberId: M4, state: 'withdrawn' });
    await seedMemberPosting(tx, pariwar, M1, M1_OLD_DISTRICT, {
      createdAt: new Date('2020-06-01T00:00:00Z'),
    });
    await seedMemberPosting(tx, pariwar, M1, M1_TIE_DECOY_DISTRICT, {
      postingId: TIE_LOW,
      createdAt: new Date('2022-01-01T00:00:00Z'),
    });
    await seedMemberPosting(tx, pariwar, M1, M1_EXPECTED_DISTRICT, {
      postingId: TIE_HIGH,
      createdAt: new Date('2022-01-01T00:00:00Z'),
    });
    await seedMemberPosting(tx, pariwar, M2, M2_EXPECTED_DISTRICT, {
      createdAt: new Date(), // tenant-wide newest, dynamically
    });
    await seedMemberPosting(tx, pariwar, M4, M4_DISTRICT, {
      createdAt: new Date('2023-01-01T00:00:00Z'),
    });
    await seedMemberPosting(tx, pariwar, DECEASED, DECEASED_OLD_DISTRICT, {
      createdAt: new Date('2020-01-01T00:00:00Z'),
    });
    await seedMemberPosting(tx, pariwar, DECEASED, DECEASED_EXPECTED_DISTRICT, {
      createdAt: new Date('2021-01-01T00:00:00Z'),
    });

    // Shed superuser + scope to the pariwar — the reads run exactly as production does (RLS applied).
    await enterAppScope(client, pariwar);
    return { tx, pariwar };
  }

  it('candidate snapshot: each member gets their OWN latest posting district, exact rows in member_id asc order (matrix row 1)', async () => {
    const { tx, pariwar } = await seedShapeMatrix();

    const rows = await getPeerMeshCandidateSnapshot(tx, {
      pariwarId: pariwar,
      deceasedMemberId: toMemberId(DECEASED),
    });

    // EXACT membership + EXACT order (member_id asc) + per-member correct district. Under the
    // known-bad tautology shape every district below would be 'Muzaffarpur' (M2's tenant-wide-newest
    // posting) — M1 ≠ Gaya, M3 ≠ null — so this assertion detects the collapse deterministically.
    // The whole-array equality also pins three more shapes at once:
    //   · M1's tie: their newest created_at generation is a TIE (Saran @ TIE_LOW vs Gaya @ TIE_HIGH);
    //     the read's documented pick order is created_at DESC, posting_id DESC — Gaya must win, every
    //     run (a created_at-only pick would be nondeterministic; a posting_id ASC tiebreak → Saran).
    //   · M4 ('withdrawn', unique district Bhagalpur) is ABSENT — the `state = 'active'` predicate holds.
    //   · The deceased is excluded — no extra row.
    expect(rows).toEqual([
      { memberId: M1, district: M1_EXPECTED_DISTRICT, createdAt: expect.any(Date) },
      { memberId: M2, district: M2_EXPECTED_DISTRICT, createdAt: expect.any(Date) },
      { memberId: M3, district: null, createdAt: expect.any(Date) },
    ]);
  });

  it('deceased attributes: the deceased gets their OWN latest posting, not the tenant-wide newest (matrix row 2)', async () => {
    const { tx, pariwar } = await seedShapeMatrix();

    const deceased = await getPeerMeshDeceasedAttributes(tx, pariwar, toMemberId(DECEASED));

    // Own latest = Patna (2021). The tautology shape would return Muzaffarpur (M2's just-now posting —
    // the tenant-wide newest), because the collapsed WHERE no longer binds the subquery to the
    // deceased's own member_id.
    expect(deceased).toEqual({ district: DECEASED_EXPECTED_DISTRICT, createdAt: expect.any(Date) });
  });

  it('excludeActorId still yields exact per-member rows (the exclusion narrows membership, never the correlation)', async () => {
    const { tx, pariwar } = await seedShapeMatrix();

    const rows = await getPeerMeshCandidateSnapshot(tx, {
      pariwarId: pariwar,
      deceasedMemberId: toMemberId(DECEASED),
      excludeActorId: toMemberId(M1),
    });

    expect(rows).toEqual([
      { memberId: M2, district: M2_EXPECTED_DISTRICT, createdAt: expect.any(Date) },
      { memberId: M3, district: null, createdAt: expect.any(Date) },
    ]);
  });
}, { timeout: 20000 });
