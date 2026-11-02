// Story 6.22 — the RELEASE RULE is hand-copied in SIX SQL places, and they must AGREE (code review 2026-11-02, RA2).
//
// "Is this claim a death report that still STANDS?" — i.e. no `member_found_innocent` finding has released it — is written out
// in `claim/death-report.ts` (the leaf, ×1), `claim/peer-mesh-read.ts` (×2: `standingReportNamesSql` and the filing anchor)
// and `claim/approval-warnings.ts` (×3: the single read, the bulk read, and `getClaimWarningAnchor`). The source fence
// (`erasure-and-death-report-fence.test.ts`) counts each file's copies, so changing ONE file turns only THAT file red.
// If the Panel rules Q1 = A (a GUILTY finding releases too), a developer who flips the leaf alone would leave the other five
// treating a guilty member as standing, and every other test would stay green. This spec is what goes red instead.
//
// For each of the three outcomes — innocent, guilty, flagged-but-not-found — it asks all six copies the same question:
//   · cohort 1, a member with ONE claim: the leaf and the peer-mesh fragment answer "does a report stand?" directly;
//   · cohort 2, a member with an OLDER investigated claim X and a NEWER bare claim Y: the three approval reads and the
//     peer-mesh anchor answer "which claim anchors the first filing?" — X while X stands (it is older), Y once X is released.
// (Cohort 2 cannot use the leaf: Y is itself an un-found report, so the leaf is true whatever X's outcome.)
//
// ⚠ The expected value is written ONCE below (`stands`): innocent releases, guilty and un-found do not. Q1 = A changes that
// one line, and then every copy must move with it.

import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  flagClaimForFraudInvestigation,
  getClaimWarningAnchor,
  isDeathReportStanding,
  readClaimApprovalWarnings,
  readClaimApprovalWarningsBulk,
  recordFraudFinding,
  resolvePeerMeshFilingCut,
  standingReportNamesSql,
} from '../../../src/claim/index.js';
import {
  claimFraudInvestigationStepId as toStepId,
  claimNomineeFindingId as toFindingId,
  memberId as toMemberId,
  pariwarId as toPariwarId,
  type ClaimId,
  type PariwarId,
} from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope, seedMember } from '../_helpers.js';
import { claimAt } from './_one-payment-fixtures.js';

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];

type Outcome = 'innocent' | 'guilty' | 'unfound';
const OUTCOMES: readonly Outcome[] = ['innocent', 'guilty', 'unfound'];

/** ⭐ THE ONE LINE: does a claim with this outcome still count as a standing death report? (Q1 = A makes `guilty` false.) */
const stands = (outcome: Outcome): boolean => outcome !== 'innocent';

/** Flag the claim, then — unless it is to stay un-found — record the finding. Real writers, ⛔ seeded rows. */
async function investigate(client: Client, pid: PariwarId, cid: ClaimId, outcome: Outcome): Promise<void> {
  const base = { claimCaseId: cid, pariwarId: pid, noteCiphertext: 'enc:v1:note', actor: 'operator' as const };
  await flagClaimForFraudInvestigation(client, { ...base, stepId: toStepId(randomUUID()), actorId: randomUUID(), actorDisplay: 'Helpline Operator' });
  if (outcome === 'unfound') return;
  await recordFraudFinding(client, {
    ...base,
    outcome,
    aliveConfirmation: 'in_person',
    stepId: toStepId(randomUUID()),
    findingId: toFindingId(randomUUID()),
    actorId: randomUUID(),
    actorDisplay: 'District Admin',
  });
}

async function createdAt(tx: Tx, cid: string): Promise<Date> {
  const { rows } = await tx.execute<{ created_at: string | Date }>(sql`SELECT created_at FROM claims WHERE claim_case_id = ${cid}`);
  return new Date(rows[0]!.created_at);
}

describe.skipIf(!hasDatabase)('Story 6.22 — every copy of the release rule agrees (RA2)', { timeout: 30000 }, () => {
  setupLiveDb();

  it.each(OUTCOMES)('%s: the leaf and the peer-mesh fragment agree on whether ONE claim stands', async (outcome) => {
    const { client, tx } = getTx();
    const pid = toPariwarId(randomUUID());
    await client.query('RESET ROLE');
    const mid = await seedMember(tx, pid, { state: 'active' });
    await enterAppScope(client, pid);
    const cid = await claimAt(client, pid, mid, 'verifier_review', { bare: true });

    // The CONTROL first: before any investigation the claim stands in both — else "released" below proves nothing.
    const fragment = async (): Promise<boolean> => {
      const { rows } = await tx.execute<{ standing: boolean }>(sql`SELECT ${standingReportNamesSql(sql`${pid}::uuid`, sql`${mid}::uuid`)} AS standing`);
      return rows[0]!.standing;
    };
    expect(await isDeathReportStanding(tx, pid, toMemberId(mid))).toBe(true);
    expect(await fragment()).toBe(true);

    await investigate(client, pid, cid, outcome);

    expect(await isDeathReportStanding(tx, pid, toMemberId(mid)), 'the leaf').toBe(stands(outcome));
    expect(await fragment(), 'peer-mesh `standingReportNamesSql`').toBe(stands(outcome));
  });

  it.each(OUTCOMES)('%s: the three approval reads and the peer-mesh anchor agree on whether the OLDER claim anchors the filing', async (outcome) => {
    const { client, tx } = getTx();
    const pid = toPariwarId(randomUUID());
    await client.query('RESET ROLE');
    const mid = await seedMember(tx, pid, { state: 'active' });
    await enterAppScope(client, pid);
    const x = await claimAt(client, pid, mid, 'verifier_review', { bare: true }); // the investigated claim — made the OLDER one below
    const y = await claimAt(client, pid, mid, 'verifier_review', { bare: true }); // the newer claim, never investigated: it always stands
    await client.query('RESET ROLE');
    await client.query(`UPDATE claims SET created_at = created_at - interval '1 day' WHERE claim_case_id = $1`, [x]);
    await enterAppScope(client, pid);
    const xAt = await createdAt(tx, x);
    const yAt = await createdAt(tx, y);
    expect(xAt.getTime(), 'the fixture: X is older than Y').toBeLessThan(yAt.getTime());

    // The CONTROL: with X still un-investigated it stands, so it — the older claim — anchors every read.
    const anchors = async () => {
      const single = await readClaimApprovalWarnings(tx, pid, y);
      const bulk = (await readClaimApprovalWarningsBulk(tx, pid, [y])).get(y.toLowerCase());
      const peer = await resolvePeerMeshFilingCut(tx, { pariwarId: pid, deceasedMemberId: toMemberId(mid), claimCaseId: y, claimCreatedAt: yAt });
      return {
        approvalSingle: single.anchorFiledAt.getTime(),
        approvalBulk: bulk?.anchorFiledAt.getTime(),
        approvalAnchorOnly: (await getClaimWarningAnchor(tx, pid, y)).getTime(),
        peerMeshAnchorClaim: String(peer.anchorClaimCaseId).toLowerCase(),
      };
    };
    expect(await anchors()).toEqual({
      approvalSingle: xAt.getTime(),
      approvalBulk: xAt.getTime(),
      approvalAnchorOnly: xAt.getTime(),
      peerMeshAnchorClaim: x.toLowerCase(),
    });

    await investigate(client, pid, x, outcome);

    // X stands ⇒ it is still the older anchor; X released ⇒ the anchor is the first claim that still stands, which is Y.
    const anchorAt = stands(outcome) ? xAt.getTime() : yAt.getTime();
    expect(await anchors()).toEqual({
      approvalSingle: anchorAt,
      approvalBulk: anchorAt,
      approvalAnchorOnly: anchorAt,
      peerMeshAnchorClaim: (stands(outcome) ? x : y).toLowerCase(),
    });
  });
});
