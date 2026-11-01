// The account-frozen overlay's THREE readers agree (Story 6.22, AC7; DL13 — the sticky freeze; N7; TR15). Live DB.
//
// `member/overlay.ts`'s header: the three readers *"MUST STAY OBSERVATIONALLY EQUIVALENT"* — `getMemberAccountOverlay`
// (the per-member evaluator), the PUBLIC Member Directory's `NOT_DECEASED` (`listPublicDirectoryMembers`) and
// `listAccountFrozenMemberIds` (the cycle-open text). Until this spec ⛔ test ran all three over the same members. The
// 11a.3 incident (reported-dead members published as "Active") is the cost of one reader drifting.
//
// ⭐ Named for the Panel's Q1: the GUILTY rows read frozen (built B). If Q1 is ruled A, the sticky constant goes and those
// rows flip — visibly — in all three readers at once.
//
// Seeding: each member `active` WITH a `member_kyc_profiles` row (the directory INNER-JOINs it), no suspension; the claims
// through the projector; the innocent-closed member is the POSITIVE CONTROL (present in the directory — else "absent"
// passes vacuously); `listAccountFrozenMemberIds` runs with `app.pariwar_id` set (it reads the GUC without `missing_ok`).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  flagClaimForFraudInvestigation,
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
import { listPublicDirectoryMembers } from '../../../src/member/directory-read.js';
import { getMemberAccountOverlay, listAccountFrozenMemberIds } from '../../../src/member/overlay.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { driveClaimTo, enterAppScope, seedMember } from '../_helpers.js';
import { claimAt, emitClaim } from '../claim/_one-payment-fixtures.js';

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];

const OPERATOR = 'a6a6a6a6-0000-4000-8000-0000000000aa';
const DA = 'd6d6d6d6-0000-4000-8000-0000000000bb';

async function seedVisibleMember(tx: Tx, pid: PariwarId): Promise<string> {
  const mid = await seedMember(tx, pid, { state: 'active' });
  await tx.insert(schema.memberKycProfiles).values({
    memberId: toMemberId(mid),
    pariwarId: pid,
    nameCiphertext: `enc:v1:kyc-name-${mid}`,
    dobCiphertext: 'enc:v1:dob',
    photoCiphertext: 'enc:v1:photo',
    aadhaarMaskedId: 'XXXX1234',
    verificationStrength: 'aadhaar_kyc',
    source: 'digilocker',
  });
  return mid;
}

async function investigate(client: Client, pid: PariwarId, cid: ClaimId, outcome: FraudFindingOutcome): Promise<void> {
  const base = { claimCaseId: cid, pariwarId: pid, noteCiphertext: 'enc:v1:note', actor: 'operator' as const };
  await flagClaimForFraudInvestigation(client, { ...base, stepId: toStepId(randomUUID()), actorId: OPERATOR, actorDisplay: 'Helpline Operator' });
  await recordFraudFinding(client, {
    ...base,
    outcome,
    aliveConfirmation: 'in_person',
    stepId: toStepId(randomUUID()),
    findingId: toFindingId(randomUUID()),
    actorId: DA,
    actorDisplay: 'District Admin',
  });
}

describe.skipIf(!hasDatabase)('Story 6.22 — the overlay\'s three readers agree, sticky freeze included (PQ1 — built B)', { timeout: 60000 }, () => {
  setupLiveDb();

  it('⭐ innocent-closed / guilty-closed / guilty after denied_no_appeal / guilty on an already-closed claim / open / approved+innocent / approved+guilty', async () => {
    const { client, tx } = getTx();
    const pid = toPariwarId(randomUUID());
    await client.query('RESET ROLE');
    const names = [
      'innocentClosed',
      'guiltyClosed',
      'guiltyAfterDeniedNoAppeal',
      'guiltyAlreadyClosed',
      'openFlagged',
      'approvedInnocent',
      'approvedGuilty',
    ] as const;
    const m = {} as Record<(typeof names)[number], string>;
    for (const n of names) m[n] = await seedVisibleMember(tx, pid);
    await enterAppScope(client, pid);

    const open = async (mid: string): Promise<ClaimId> => {
      const cid = randomUUID() as ClaimId;
      await driveClaimTo(client, pid, cid, mid, 'verifier_review');
      return cid;
    };
    await investigate(client, pid, await open(m.innocentClosed), 'innocent');
    await investigate(client, pid, await open(m.guiltyClosed), 'guilty');
    const denied = await claimAt(client, pid, m.guiltyAfterDeniedNoAppeal, 'denied', { bare: true });
    await emitClaim(client, pid, denied, m.guiltyAfterDeniedNoAppeal, 'denied', 'denied', 'claim.denied_no_appeal', {
      deceased_member_id: m.guiltyAfterDeniedNoAppeal,
    });
    await investigate(client, pid, denied, 'guilty');
    await investigate(client, pid, await claimAt(client, pid, m.guiltyAlreadyClosed, 'closed', { bare: true }), 'guilty');
    await flagClaimForFraudInvestigation(client, {
      claimCaseId: await open(m.openFlagged),
      pariwarId: pid,
      stepId: toStepId(randomUUID()),
      noteCiphertext: 'enc:v1:note',
      actorId: OPERATOR,
      actorDisplay: 'Helpline Operator',
      actor: 'operator',
    });
    await investigate(client, pid, await claimAt(client, pid, m.approvedInnocent, 'approved', { bare: true }), 'innocent');
    await investigate(client, pid, await claimAt(client, pid, m.approvedGuilty, 'approved', { bare: true }), 'guilty');

    const now = new Date();
    const directory = new Set((await listPublicDirectoryMembers(tx, pid, { now })).map((e) => String(e.memberId).toLowerCase()));
    const frozenList = await listAccountFrozenMemberIds(tx, Object.values(m), now);
    const verdicts: Record<string, { evaluator: boolean; directoryHides: boolean; frozenList: boolean }> = {};
    for (const n of names) {
      const mid = m[n].toLowerCase();
      verdicts[n] = {
        evaluator: (await getMemberAccountOverlay(tx, toMemberId(mid), now)).accountFrozen,
        directoryHides: !directory.has(mid),
        frozenList: frozenList.has(mid),
      };
    }
    const all = (frozen: boolean) => ({ evaluator: frozen, directoryHides: frozen, frozenList: frozen });
    expect(verdicts).toEqual({
      innocentClosed: all(false), // the POSITIVE CONTROL — present in the directory
      guiltyClosed: all(true), // PQ1 — a ruling of A flips the guilty rows
      guiltyAfterDeniedNoAppeal: all(true),
      guiltyAlreadyClosed: all(true),
      openFlagged: all(true),
      approvedInnocent: all(true), // the approved claim's stream is unresolved (row 6-22c)
      approvedGuilty: all(true),
    });
  });
});
