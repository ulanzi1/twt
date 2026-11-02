// Story 6.22 — peer-mesh FOLLOWS the release, and only peer-mesh (AC11; DL11; `2026-10-10-311` PM1's pointer). Live DB.
//
//   · the positive control FIRST: the same kind of member with ⛔ claim is eligible as one of the five;
//   · a member whose claim was released by an INNOCENCE finding is eligible again (`peerMeshEligibleMemberSql`) and is ⛔
//     labelled `peer_reported_deceased` (`readPeerMeshRequestEligibility`);
//   · a member found GUILTY, or with a flagged un-found claim, stays excluded;
//   · "People who know me" (`knownPeopleCallerSql`) still treats the released member as reported — the NAMED residual;
//   · RA13: the SHARED fragment behind every other consumer of that residual (`namedByClaimSql` — the unavailable prompts,
//     `listRequestsNamingMe`, `answerKnownPersonRequest`, `nominee/member-links.ts` × 5) is pinned too, and so is the fact that
//     none of them was re-pointed to the release-following peer-mesh fragment.
// Members are seeded `active` WITH a `member_identities` row (the selection requires one).

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  flagClaimForFraudInvestigation,
  peerMeshEligibleMemberSql,
  readPeerMeshRequestEligibility,
  recordFraudFinding,
  type FraudFindingOutcome,
} from '../../../src/claim/index.js';
import {
  claimFraudInvestigationStepId as toStepId,
  claimNomineeFindingId as toFindingId,
  memberId as toMemberId,
  pariwarId as toPariwarId,
  type ClaimId,
  type PariwarId,
} from '../../../src/ids/index.js';
import { knownPeopleCallerSql, namedByClaimSql } from '../../../src/member/known-people.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope, seedMember } from '../_helpers.js';
import { claimAt } from './_one-payment-fixtures.js';

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];

const NO_NOMINEES = { mobileIndexes: [], memberIds: [] } as const;

async function seedAskable(client: Client, tx: Tx, pid: PariwarId): Promise<string> {
  const mid = await seedMember(tx, pid, { state: 'active' });
  await client.query(`INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index) VALUES ($1, $2, 'enc:v1:x', $3)`, [
    mid, pid, `bi-${mid}`,
  ]);
  return mid;
}

async function investigate(client: Client, pid: PariwarId, cid: ClaimId, outcome: FraudFindingOutcome | null): Promise<void> {
  const base = { claimCaseId: cid, pariwarId: pid, noteCiphertext: 'enc:v1:note', actor: 'operator' as const };
  await flagClaimForFraudInvestigation(client, { ...base, stepId: toStepId(randomUUID()), actorId: randomUUID(), actorDisplay: 'Helpline Operator' });
  if (outcome === null) return;
  await recordFraudFinding(client, {
    ...base, outcome, aliveConfirmation: 'in_person', stepId: toStepId(randomUUID()),
    findingId: toFindingId(randomUUID()), actorId: randomUUID(), actorDisplay: 'District Admin',
  });
}

async function verdicts(tx: Tx, pid: PariwarId, mid: string) {
  const deceased = toMemberId(randomUUID()); // ANOTHER member's death — the one the five are asked about
  const { rows } = await tx.execute<{ askable: boolean; caller: boolean }>(sql`
    SELECT ${peerMeshEligibleMemberSql(sql`m`, { deceasedMemberId: deceased, nomineeMatch: NO_NOMINEES })} AS askable,
           ${knownPeopleCallerSql(sql`m`)} AS caller
      FROM members m
     WHERE m.pariwar_id = ${pid} AND m.member_id = ${mid}
  `);
  const label = await readPeerMeshRequestEligibility(tx, { pariwarId: pid, memberId: toMemberId(mid), deceasedMemberId: deceased, nomineeMatch: NO_NOMINEES });
  return { askable: rows[0]!.askable, knownPeopleCaller: rows[0]!.caller, label: label.eligible ? 'eligible' : label.reason };
}

describe.skipIf(!hasDatabase)('Story 6.22 — peer-mesh follows the release, and only peer-mesh (AC11)', { timeout: 30000 }, () => {
  setupLiveDb();

  it('⭐ the control, then: released ⇒ askable again (⛔ `peer_reported_deceased`); guilty / un-found ⇒ excluded; "People who know me" unchanged (residual)', async () => {
    const { client, tx } = getTx();
    const pid = toPariwarId(randomUUID());
    await client.query('RESET ROLE');
    const control = await seedAskable(client, tx, pid);
    const released = await seedAskable(client, tx, pid);
    const guilty = await seedAskable(client, tx, pid);
    const unfound = await seedAskable(client, tx, pid);
    await enterAppScope(client, pid);

    // The POSITIVE CONTROL first — else every "excluded" below could pass vacuously.
    expect(await verdicts(tx, pid, control)).toEqual({ askable: true, knownPeopleCaller: true, label: 'eligible' });

    await investigate(client, pid, await claimAt(client, pid, released, 'verifier_review', { bare: true }), 'innocent');
    await investigate(client, pid, await claimAt(client, pid, guilty, 'verifier_review', { bare: true }), 'guilty');
    await investigate(client, pid, await claimAt(client, pid, unfound, 'verifier_review', { bare: true }), null);

    expect(await verdicts(tx, pid, released)).toEqual({ askable: true, knownPeopleCaller: false, label: 'eligible' }); // residual: caller false
    expect(await verdicts(tx, pid, guilty)).toEqual({ askable: false, knownPeopleCaller: false, label: 'peer_reported_deceased' });
    expect(await verdicts(tx, pid, unfound)).toEqual({ askable: false, knownPeopleCaller: false, label: 'peer_reported_deceased' });
  });

  it('RA13 — the any-claim rule behind "People who know me", `listRequestsNamingMe` and nominee links (`namedByClaimSql`) is UNCHANGED: a released member is still "named"', async () => {
    const { client, tx } = getTx();
    const pid = toPariwarId(randomUUID());
    await client.query('RESET ROLE');
    const control = await seedAskable(client, tx, pid);
    const released = await seedAskable(client, tx, pid);
    const guilty = await seedAskable(client, tx, pid);
    const unfound = await seedAskable(client, tx, pid);
    await enterAppScope(client, pid);
    const named = async (mid: string): Promise<boolean> => {
      const { rows } = await tx.execute<{ named: boolean }>(sql`SELECT ${namedByClaimSql(sql`${pid}::uuid`, sql`${mid}::uuid`)} AS named`);
      return rows[0]!.named;
    };
    expect(await named(control)).toBe(false); // the CONTROL: ⛔ claim ⇒ not named — else "named" below proves nothing
    await investigate(client, pid, await claimAt(client, pid, released, 'verifier_review', { bare: true }), 'innocent');
    await investigate(client, pid, await claimAt(client, pid, guilty, 'verifier_review', { bare: true }), 'guilty');
    await investigate(client, pid, await claimAt(client, pid, unfound, 'verifier_review', { bare: true }), null);
    // The residual (DL11, `-438` item 11): ANY claim names the member, a release ⛔ lifting it — only peer-mesh follows the release.
    expect(await named(released)).toBe(true);
    expect(await named(guilty)).toBe(true);
    expect(await named(unfound)).toBe(true);
  });

  it('RA13 — none of the residual consumers was re-pointed to the release-following peer-mesh fragment (`standingReportNamesSql`)', () => {
    const read = (rel: string) => readFileSync(fileURLToPath(new URL(`../../../src/${rel}`, import.meta.url)), 'utf8');
    for (const rel of ['member/known-people.ts', 'nominee/member-links.ts']) {
      const src = read(rel);
      // Doc comments may NAME the fragment; code may not call it. A call is `standingReportNamesSql(`; an import names it in `{ }`.
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(code, `${rel} must not use standingReportNamesSql`).not.toMatch(/standingReportNamesSql/);
      expect(code, `${rel} keeps the any-claim rule`).toMatch(/namedByClaimSql/);
    }
  });
});
