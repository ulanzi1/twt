// Story 6.22 — the new READS and WRITERS' own Pariwar scoping, with RLS OUT OF THE WAY (RA4), the work-list reader's keyset
// loop (RA8), and both lists' DL5 limit clamp at the cap (R2-13 (d)). Live DB.
//
// ⚠ RLS MASKS THE TENANT PREDICATE (TR4). A cross-Pariwar test run as `twt_app` passes whether or not the SQL carries its own
// `pariwar_id` filter, because the policy hides the other tenant's rows first. So the legs below run as the SUPERUSER — before
// `enterAppScope`, RLS bypassed — with the data in PARIWAR_B and the question asked for PARIWAR_A: if a reader dropped its
// explicit `pariwar_id` predicate it would see B's rows here and the test would go red. Every leg has its CONTROL: the same
// call for PARIWAR_B returns the data, so "nothing" is not just an empty fixture.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  FRAUD_FLAG_CLAIMS_DEFAULT_LIMIT,
  FRAUD_FLAG_CLAIMS_MAX_LIMIT,
  FraudInvestigationRefusedError,
  OPEN_FRAUD_INVESTIGATIONS_DEFAULT_LIMIT,
  OPEN_FRAUD_INVESTIGATIONS_MAX_LIMIT,
  flagClaimForFraudInvestigation,
  isDeathReportStanding,
  listClaimsNamingMemberForFraudFlag,
  listFraudInvestigationSteps,
  listOpenFraudInvestigations,
  listStandingDeathReports,
  readClosedMemberAliveBulk,
  recordFraudFinding,
} from '../../../src/claim/index.js';
import {
  claimFraudInvestigationStepId as toStepId,
  claimId as toClaimId,
  claimNomineeFindingId as toFindingId,
  memberId as toMemberId,
  type PariwarId,
} from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedClaim, seedMember, seedMemberPosting } from '../_helpers.js';

const A = PARIWAR_A as PariwarId;
const B = PARIWAR_B as PariwarId;
type Tx = ReturnType<typeof getTx>['tx'];

function stepRow(pariwarId: string, claimCaseId: string, memberId: string, over: Partial<schema.ClaimFraudInvestigationStepInsert> = {}): schema.ClaimFraudInvestigationStepInsert {
  return {
    stepId: randomUUID() as never,
    claimCaseId: claimCaseId as never,
    pariwarId: pariwarId as never,
    deceasedMemberId: memberId as never,
    step: 'flagged',
    findingId: null,
    aliveConfirmation: null,
    noteCiphertext: 'enc:v1:note',
    actorId: randomUUID(),
    actorDisplay: 'Test Operator',
    ...over,
  };
}

/** A claim of a fresh member in `pariwarId`, optionally FLAGGED (at `flaggedAt`) and optionally FOUND innocent. */
async function seedInvestigated(
  tx: Tx,
  pariwarId: string,
  opts: { state?: schema.ClaimLifecycleState; flaggedAt?: Date; found?: boolean; district?: string | null } = {},
): Promise<{ cid: string; mid: string }> {
  const mid = await seedMember(tx, pariwarId, { state: 'active' });
  if (opts.district) await seedMemberPosting(tx, pariwarId, mid, opts.district);
  const cid = await seedClaim(tx, pariwarId, { deceasedMemberId: mid, currentState: opts.state ?? 'verifier_review' });
  if (opts.flaggedAt) await tx.insert(schema.claimFraudInvestigationSteps).values(stepRow(pariwarId, cid, mid, { actedAt: opts.flaggedAt }));
  if (opts.found) {
    const [f] = await tx
      .insert(schema.claimNomineeFindings)
      .values({ findingId: randomUUID() as never, claimCaseId: cid as never, pariwarId: pariwarId as never, kind: 'member_found_innocent', rank: null, recordedByActorId: randomUUID(), recordedByDisplay: 'Test District Admin' })
      .returning();
    await tx.insert(schema.claimFraudInvestigationSteps).values(stepRow(pariwarId, cid, mid, { step: 'found_innocent', findingId: f!.findingId, aliveConfirmation: 'in_person' }));
  }
  return { cid, mid };
}

describe.skipIf(!hasDatabase)('Story 6.22 — the new reads and writers carry their OWN Pariwar predicate (RA4)', { timeout: 30000 }, () => {
  setupLiveDb();

  it('⭐ the readers: data in PARIWAR_B is invisible to a question for PARIWAR_A — with RLS bypassed — and visible to B', async () => {
    const { tx } = getTx(); // the superuser: ⛔ `enterAppScope` yet
    const closed = await seedInvestigated(tx, B, { state: 'closed', flaggedAt: new Date('2026-01-01T00:00:00Z'), found: true });
    const open = await seedInvestigated(tx, B, { flaggedAt: new Date('2026-01-02T00:00:00Z'), district: 'D-B' });
    const standing = await seedInvestigated(tx, B); // an un-flagged claim — a standing death report in B

    // ── B: the controls ─────────────────────────────────────────────────────────────────────────────────────────────
    expect(await readClosedMemberAliveBulk(tx, B, [closed.cid])).toEqual(new Set([closed.cid]));
    expect((await listOpenFraudInvestigations(tx, B, { isVisible: () => true })).map((r) => r.claimCaseId)).toEqual([open.cid]);
    expect((await listClaimsNamingMemberForFraudFlag(tx, B, toMemberId(closed.mid))).map((c) => c.claimCaseId)).toEqual([closed.cid]);
    expect(await listFraudInvestigationSteps(tx, B, toClaimId(closed.cid))).toHaveLength(2);
    expect(await isDeathReportStanding(tx, B, toMemberId(standing.mid))).toBe(true);
    expect((await listStandingDeathReports(tx, B, toMemberId(standing.mid))).map((r) => r.claimCaseId)).toEqual([standing.cid]);

    // ── A: the SAME questions about B's rows ⇒ nothing ──────────────────────────────────────────────────────────────
    expect(await readClosedMemberAliveBulk(tx, A, [closed.cid])).toEqual(new Set());
    expect(await listOpenFraudInvestigations(tx, A, { isVisible: () => true })).toEqual([]);
    expect(await listClaimsNamingMemberForFraudFlag(tx, A, toMemberId(closed.mid))).toEqual([]);
    expect(await listFraudInvestigationSteps(tx, A, toClaimId(closed.cid))).toEqual([]);
    expect(await isDeathReportStanding(tx, A, toMemberId(standing.mid))).toBe(false);
    expect(await listStandingDeathReports(tx, A, toMemberId(standing.mid))).toEqual([]);
  });

  // The two writers are SEPARATE tests: they share `lockClaimRow`, and in one test the first failing assertion would mask the
  // second. (The finding writer also checks the Pariwar in its first read — redundant with the lock's, so removing only that one
  // changes nothing observable; the lock's own predicate is what each test pins.)
  const reason = (p: Promise<unknown>) =>
    p.then(
      () => 'accepted',
      (e: unknown) => (e instanceof FraudInvestigationRefusedError ? e.reason : `not a refusal: ${String(e)}`),
    );
  const noteAndActor = { noteCiphertext: 'enc:v1:note', actor: 'operator' as const };

  it('⭐ the FLAG writer: a claim of PARIWAR_B asked for as PARIWAR_A is `claim_not_found` — with RLS bypassed — and the flag really works for B', async () => {
    const { tx, client } = getTx();
    const unflagged = await seedInvestigated(tx, B);
    const flag = (pariwarId: PariwarId) =>
      reason(flagClaimForFraudInvestigation(client, { ...noteAndActor, claimCaseId: toClaimId(unflagged.cid), pariwarId, stepId: toStepId(randomUUID()), actorId: randomUUID(), actorDisplay: 'Helpline Operator' }));
    // ⛔ superuser, scope not entered: only the writer's own `pariwar_id` predicate stands between A and B's claim.
    expect(await flag(A)).toBe('claim_not_found');
    // The CONTROL: the same claim, asked for as its own Pariwar (in scope) — the flag is accepted.
    await enterAppScope(client, B);
    expect(await flag(B)).toBe('accepted');
  });

  it('⭐ the FINDING writer: a flagged claim of PARIWAR_B asked for as PARIWAR_A is `claim_not_found` — with RLS bypassed — and the finding really works for B', async () => {
    const { tx, client } = getTx();
    const flagged = await seedInvestigated(tx, B, { flaggedAt: new Date('2026-01-01T00:00:00Z') });
    const find = (pariwarId: PariwarId) =>
      reason(
        recordFraudFinding(client, {
          ...noteAndActor, claimCaseId: toClaimId(flagged.cid), pariwarId, outcome: 'innocent', aliveConfirmation: 'in_person', stepId: toStepId(randomUUID()),
          findingId: toFindingId(randomUUID()), actorId: randomUUID(), actorDisplay: 'District Admin',
        }),
      );
    expect(await find(A)).toBe('claim_not_found');
    // The CONTROL: the same flagged claim as its own Pariwar — the finding is accepted (a distinct finder from the fixture's flagger).
    await enterAppScope(client, B);
    expect(await find(B)).toBe('accepted');
  });
});

describe.skipIf(!hasDatabase)('Story 6.22 — the District Admin work-list: keyset batches, filter BEFORE the page limit (RA8)', { timeout: 30000 }, () => {
  setupLiveDb();

  it('⭐ visible rows behind MORE than one scan batch of invisible ones are not crowded out; the limit counts VISIBLE rows; oldest flag first', async () => {
    const { tx } = getTx();
    const base = Date.parse('2026-02-01T00:00:00Z');
    const at = (i: number) => new Date(base + i * 60_000);
    // The OLDEST flags are the invisible ones — one full scan batch plus a few — so the visible rows are only reached by the
    // SECOND batch. A reader that cut the page before filtering, or stopped after one batch, returns nothing here.
    const invisible = OPEN_FRAUD_INVESTIGATIONS_DEFAULT_LIMIT + 5;
    for (let i = 0; i < invisible; i += 1) await seedInvestigated(tx, A, { flaggedAt: at(i), district: 'D-OTHER' });
    const mine = [];
    for (let i = 0; i < 3; i += 1) mine.push((await seedInvestigated(tx, A, { flaggedAt: at(invisible + i), district: 'D-MINE' })).cid);
    const noPosting = await seedInvestigated(tx, A, { flaggedAt: at(invisible + 3) }); // a member with no posting ⇒ district `null`
    await enterAppScope(getTx().client, A);

    const visible = (row: { district: string | null }) => row.district === 'D-MINE';
    // limit 2 of 3 visible rows, oldest flag first.
    expect((await listOpenFraudInvestigations(tx, A, { limit: 2, isVisible: visible })).map((r) => r.claimCaseId)).toEqual(mine.slice(0, 2));
    expect((await listOpenFraudInvestigations(tx, A, { limit: 10, isVisible: visible })).map((r) => r.claimCaseId)).toEqual(mine);
    // The CONTROL: with no scope narrowing the OLDEST (invisible) rows come first — so the data above really is behind them.
    const everything = await listOpenFraudInvestigations(tx, A, { limit: 200, isVisible: () => true });
    expect(everything).toHaveLength(invisible + 3 + 1);
    expect(everything.slice(-4).map((r) => r.claimCaseId)).toEqual([...mine, noPosting.cid]);
    expect(everything.at(-1)!.district).toBeNull();
    // A row whose district cannot be resolved reaches the predicate as `null` and is dropped by it.
    expect((await listOpenFraudInvestigations(tx, A, { limit: 200, isVisible: (r) => r.district !== null })).map((r) => r.claimCaseId)).not.toContain(noPosting.cid);
  });

  it('`isVisible` is REQUIRED — a call without a scope predicate does not compile (RA8)', () => {
    const { tx } = getTx();
    // @ts-expect-error the scope predicate is required: this reader spans every district of the Pariwar
    void (() => listOpenFraudInvestigations(tx, A, {}));
    expect(true).toBe(true);
  });
});

// R2-13 (d) — DL5's clamp was untested: each reader is seeded PAST its cap (cap + 1 rows), so an unclamped `limit` would
// return them all. The constants are pinned too.
describe.skipIf(!hasDatabase)('Story 6.22 — the two fraud lists clamp their `limit` at the cap (DL5; R2-13 (d))', { timeout: 30000 }, () => {
  setupLiveDb();

  it('`listClaimsNamingMemberForFraudFlag`: default 20, a huge limit clamped to 50, ⛔ below 1', async () => {
    const { tx } = getTx();
    expect([FRAUD_FLAG_CLAIMS_DEFAULT_LIMIT, FRAUD_FLAG_CLAIMS_MAX_LIMIT]).toEqual([20, 50]);
    const mid = randomUUID();
    for (let i = 0; i < FRAUD_FLAG_CLAIMS_MAX_LIMIT + 1; i += 1) await seedClaim(tx, A, { deceasedMemberId: mid, currentState: 'verifier_review' });
    await enterAppScope(getTx().client, A);

    const list = (limit?: number) => listClaimsNamingMemberForFraudFlag(tx, A, toMemberId(mid), limit === undefined ? {} : { limit });
    const capped = await list(10_000);
    expect(capped).toHaveLength(FRAUD_FLAG_CLAIMS_MAX_LIMIT);
    expect(await list()).toEqual(capped.slice(0, FRAUD_FLAG_CLAIMS_DEFAULT_LIMIT));
    expect(await list(0)).toHaveLength(1);
    expect(await list(-1)).toHaveLength(1);
    // The CONTROL: the member really has cap + 1 claims — the 50 above is the clamp, ⛔ the fixture.
    const { rows } = await getTx().client.query<{ n: number }>('SELECT count(*)::int AS n FROM claims WHERE deceased_member_id = $1', [mid]);
    expect(rows[0]!.n).toBe(FRAUD_FLAG_CLAIMS_MAX_LIMIT + 1);
  });

  it('`listOpenFraudInvestigations`: default 50, a huge limit clamped to 200, ⛔ below 1', async () => {
    const { tx } = getTx();
    expect([OPEN_FRAUD_INVESTIGATIONS_DEFAULT_LIMIT, OPEN_FRAUD_INVESTIGATIONS_MAX_LIMIT]).toEqual([50, 200]);
    const base = Date.parse('2026-03-01T00:00:00Z');
    const total = OPEN_FRAUD_INVESTIGATIONS_MAX_LIMIT + 1;
    const flagged: string[] = [];
    for (let i = 0; i < total; i += 1) {
      const mid = randomUUID();
      const cid = await seedClaim(tx, A, { deceasedMemberId: mid, currentState: 'verifier_review' });
      await tx.insert(schema.claimFraudInvestigationSteps).values(stepRow(A, cid, mid, { actedAt: new Date(base + i * 60_000) }));
      flagged.push(cid);
    }
    await enterAppScope(getTx().client, A);

    const list = (limit?: number) =>
      listOpenFraudInvestigations(tx, A, { ...(limit === undefined ? {} : { limit }), isVisible: () => true }).then((r) => r.map((x) => x.claimCaseId));
    // Oldest flag first — so a page of N is the first N seeded (the clamp cuts the NEWEST off).
    expect(await list(10_000)).toEqual(flagged.slice(0, OPEN_FRAUD_INVESTIGATIONS_MAX_LIMIT));
    expect(await list()).toEqual(flagged.slice(0, OPEN_FRAUD_INVESTIGATIONS_DEFAULT_LIMIT));
    expect(await list(0)).toEqual(flagged.slice(0, 1));
    // The CONTROL: cap + 1 open investigations really exist — the 200 above is the clamp, ⛔ the fixture.
    const { rows } = await getTx().client.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM claim_fraud_investigation_steps WHERE pariwar_id = $1 AND step = 'flagged'",
      [A],
    );
    expect(rows[0]!.n).toBe(total);
  });
});
