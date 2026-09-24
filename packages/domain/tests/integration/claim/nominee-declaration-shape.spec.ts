// The nominee declaration READ MODEL — its SHAPE against adversarial decoys, live DB (:5433).
// Story 6.20 (AC3, AC5, AC11 — "a `*-shape.spec.ts` for the timeline read model"; D17; the AI-6-3 class,
// exemplar `verifier-console-shape.spec.ts`).
//
// Each read the timeline / effective declaration is assembled from is asked about ONE claim while DECOYS
// sit beside it that a wrong join would pick up:
//   · a SECOND claim for the SAME death, with its OWN (different) determination (D17 — per claim);
//   · a SUPERSEDED determination on the claim itself (only the live one counts);
//   · another PARIWAR's member with a declaration and a claim (tenant boundary);
//   · a later post-death version in the current rows (site E must read the EFFECTIVE declaration, ⛔ not the
//     projection).
// ⭐ Every assertion names the claim's OWN ids — ⛔ never a count over a shared table.

import { randomUUID } from 'node:crypto';

import { and, eq, isNull, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  getEffectiveNomineeDeclaration,
  getLiveNomineeDetermination,
  listEarlierClaimNomineeDeterminations,
  readNomineeNameCheckSnapshot,
} from '../../../src/claim/index.js';
import { claimId as toClaimId, memberId as toMemberId, type ClaimId, type MemberId } from '../../../src/ids/index.js';
import { listNomineeDeclarationVersions } from '../../../src/nominee/declaration-history.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  driveClaimTo,
  enterAppScope,
  seedNomineeDeclaration,
  seedNomineeDetermination,
  seedNomineeNameCheck,
} from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];

const PRE_DEATH = new Date('2026-01-10T06:00:00.000Z');
const POST_DEATH = new Date('2026-06-01T06:00:00.000Z');
const CERT = '2026-05-01';

async function member(tx: Tx, pariwarId: typeof PARIWAR_A): Promise<MemberId> {
  const mid = toMemberId(randomUUID());
  await tx.insert(schema.members).values({ memberId: mid, pariwarId, state: 'active', stateEventVersion: 1 });
  return mid;
}

/** Mark every version against CERT the way an honest District Admin would. */
async function honestDetermination(client: Client, tx: Tx, cid: ClaimId, mid: MemberId, over: { allStand?: boolean } = {}) {
  const versions = await listNomineeDeclarationVersions(tx, PARIWAR_A, mid);
  return seedNomineeDetermination(client, PARIWAR_A, cid, {
    certificateDate: over.allStand ? '2099-01-01' : CERT,
    marks: versions.map((v) => ({
      versionId: v.versionId,
      mark: over.allStand || v.effectiveAt.getTime() < POST_DEATH.getTime() ? ('stands' as const) : ('discarded' as const),
    })),
  });
}

describe.skipIf(!hasDatabase)('Story 6.20 — the nominee declaration read model against decoys (:5433)', { timeout: 20000 }, () => {
  setupLiveDb();

  async function world() {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = await member(tx, PARIWAR_A);
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, { declaredAt: PRE_DEATH, ensureMember: false }); // v1
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, { declaredAt: POST_DEATH, ensureMember: false }); // v2 (post-death)

    // The claim under test (A) and a DECOY claim for the SAME death (B).
    const a = toClaimId(randomUUID());
    const b = toClaimId(randomUUID());
    await driveClaimTo(client, PARIWAR_A, a, mid, 'verification_in_progress');
    await driveClaimTo(client, PARIWAR_A, b, mid, 'verification_in_progress');

    // A: a FIRST determination (everything stands), then REDETERMINED honestly — the first is a superseded
    // decoy on A itself. B: its OWN determination, everything standing (so it DIFFERS from A's live one).
    await honestDetermination(client, tx, a, mid, { allStand: true });
    await honestDetermination(client, tx, a, mid);
    await honestDetermination(client, tx, b, mid, { allStand: true });

    // Another Pariwar: a member + a declaration that a missing tenant predicate would surface. (⛔ No claim —
    // the old comment said one was created; none is.)
    await enterAppScope(client, PARIWAR_B);
    const otherMid = toMemberId(randomUUID());
    await tx.insert(schema.members).values({ memberId: otherMid, pariwarId: PARIWAR_B, state: 'active', stateEventVersion: 1 });
    await seedNomineeDeclaration(tx, PARIWAR_B, otherMid, { declaredAt: PRE_DEATH, ensureMember: false });
    await enterAppScope(client, PARIWAR_A);
    return { client, tx, mid, a, b, otherMid };
  }

  it('⭐ the LIVE determination of A is A\'s redetermination — ⛔ not its superseded one, ⛔ not claim B\'s', async () => {
    const { tx, a, b } = await world();
    const liveA = await getLiveNomineeDetermination(tx, PARIWAR_A, a);
    const all = await tx.select().from(schema.nomineeDeterminations).where(eq(schema.nomineeDeterminations.claimCaseId, a));
    const superseded = all.find((d) => d.supersededAt !== null)!;
    const [liveB] = await tx
      .select()
      .from(schema.nomineeDeterminations)
      .where(and(eq(schema.nomineeDeterminations.claimCaseId, b), isNull(schema.nomineeDeterminations.supersededAt)));
    expect(liveA!.row.claimCaseId).toBe(a);
    expect(liveA!.row.determinationId).not.toBe(superseded.determinationId);
    expect(liveA!.row.determinationId).not.toBe(liveB!.determinationId);
    // A's live marks discard the post-death version; B's (the decoy) keep it — the reads must not mix them.
    expect(liveA!.items.filter((i) => i.mark === 'discarded')).toHaveLength(1);
  });

  it('⭐ A\'s EFFECTIVE declaration is v1 (its own determination), while B\'s is v2 — per claim, never crossed (D17)', async () => {
    const { tx, a, b } = await world();
    const ea = await getEffectiveNomineeDeclaration(tx, PARIWAR_A, a);
    const eb = await getEffectiveNomineeDeclaration(tx, PARIWAR_A, b);
    expect(ea.entries.map((e) => e.versionNo)).toEqual([1]);
    expect(eb.entries.map((e) => e.versionNo)).toEqual([2]);
    expect(ea.determinationId).not.toBe(eb.determinationId);
    expect(ea.token).not.toBe(eb.token);
  });

  it('⭐ the version history is the deceased\'s OWN — ⛔ never another Pariwar\'s member', async () => {
    const { tx, mid, otherMid } = await world();
    const versions = await listNomineeDeclarationVersions(tx, PARIWAR_A, mid);
    expect(new Set(versions.map((v) => v.memberId))).toEqual(new Set([mid]));
    // The other Pariwar's member is invisible even when asked for by id …
    expect(await listNomineeDeclarationVersions(tx, PARIWAR_A, otherMid)).toEqual([]);
  });

  it('⭐ POSITIVE CONTROL for the tenant decoy — the other Pariwar\'s version EXISTS, read in ITS scope (so the empty read above is the boundary, ⛔ not a missing row)', async () => {
    const { client, tx, otherMid } = await world();
    await enterAppScope(client, PARIWAR_B);
    expect((await listNomineeDeclarationVersions(tx, PARIWAR_B, otherMid)).map((v) => v.memberId)).toEqual([otherMid]);
    await enterAppScope(client, PARIWAR_A);
  });

  it('⭐ D17 — the EARLIER determinations shown on A are OTHER claims\' LIVE ones: ⛔ never A\'s own, ⛔ never a superseded one', async () => {
    const { tx, a, b } = await world();
    const earlierOnA = await listEarlierClaimNomineeDeterminations(tx, PARIWAR_A, a);
    const earlierOnB = await listEarlierClaimNomineeDeterminations(tx, PARIWAR_A, b);
    // A and B share a `created_at` (one test transaction) — the premise, ASSERTED (code review 2026-09-24b) —
    // so each sees the other, and ONLY the other.
    const tie = await tx.execute<{ n: number }>(sql`SELECT count(DISTINCT created_at)::int AS n FROM claims WHERE claim_case_id IN (${a}, ${b})`);
    expect(tie.rows[0]!.n).toBe(1);
    expect(earlierOnA.map((e) => e.claimCaseId)).toEqual([b]);
    expect(earlierOnB.map((e) => e.claimCaseId)).toEqual([a]);
    const liveA = await getLiveNomineeDetermination(tx, PARIWAR_A, a);
    expect(earlierOnB[0]!.determinationId).toBe(liveA!.row.determinationId); // the LIVE one, not the superseded
    expect(earlierOnB[0]!.items.map((i) => i.mark).sort()).toEqual(['discarded', 'stands']);
  });

  it('⭐⭐ D17 — a STRICTLY LATER claim is ⛔ never "earlier": A does not list C, while C lists A and B (the `<=` predicate, pinned)', async () => {
    const { client, tx, mid, a, b } = await world();
    const c = toClaimId(randomUUID());
    await driveClaimTo(client, PARIWAR_A, c, mid, 'verification_in_progress');
    await honestDetermination(client, tx, c, mid);
    // C was filed LATER. ⚠ `now()` is the transaction's start, so the harness stamps every claim alike; move
    // C forward as the table owner (the production fact: a refile is a later request).
    await client.query('RESET ROLE');
    await client.query(`UPDATE claims SET created_at = created_at + interval '1 day' WHERE claim_case_id = $1`, [c]);
    await enterAppScope(client, PARIWAR_A);
    expect((await listEarlierClaimNomineeDeterminations(tx, PARIWAR_A, a)).map((e) => e.claimCaseId)).toEqual([b]);
    expect((await listEarlierClaimNomineeDeterminations(tx, PARIWAR_A, c)).map((e) => e.claimCaseId).sort()).toEqual([a, b].sort());
  });

  it('⭐⭐ AC5 site E — the name-check snapshot reads the EFFECTIVE declaration: a change to the CURRENT rows alone does ⛔ not move it', async () => {
    const { client, tx, mid, a } = await world();
    await seedNomineeNameCheck(client, PARIWAR_A, a);
    const before = await readNomineeNameCheckSnapshot(tx, PARIWAR_A, a, mid);
    const effective = await getEffectiveNomineeDeclaration(tx, PARIWAR_A, a);
    expect(before.current).toBe(true);
    expect(before.liveDeclarationToken).toBe(effective.token);

    // A further post-death version lands in the CURRENT rows (the projection now names someone else) —
    // the as-at-death declaration is unchanged, so the check the District Admin recorded still applies.
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, { declaredAt: new Date('2026-07-01T06:00:00.000Z'), ensureMember: false });
    const after = await readNomineeNameCheckSnapshot(tx, PARIWAR_A, a, mid);
    expect(after.liveDeclarationToken).toBe(before.liveDeclarationToken);
    expect(after.current).toBe(true);
  });
});
