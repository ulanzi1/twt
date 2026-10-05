// Story 6.23a — RTBF over the approval-over-warning record (Task 8; NW13; AC8; Trap 14). The late-warning reason's
// note is Tier-1 staff text about the deceased's claim: an erasure overwrites it with the sentinel, AS `twt_app`
// under the scope (so 0143's per-command UPDATE policy is exercised — `-279` A12: without it the scrub would match 0
// rows under FORCE and the note would SURVIVE). An approval row's NULL note stays NULL (the step ⇔ note CHECK); the
// keys, the reason chosen and the attribution are kept.

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { decryptTier1, encryptTier1, parseEnvelope, serializeEnvelope } from '../../../src/encryption/envelope.js';
import { createFakeKmsProvider } from '../../../src/encryption/index.js';
import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import { ANONYMIZED_SENTINEL, anonymizeMember } from '../../../src/member/anonymize.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedClaim, seedMember } from '../_helpers.js';

const kms = createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(7), hmacKeyBytes: new Uint8Array(32).fill(9) });
const kekRef = { resourceName: 'fake:rtbf-6-23a-kek' };
const FIELD = 'claim_warning_approval';

async function dec(serialized: string): Promise<string> {
  return Buffer.from(await decryptTier1(parseEnvelope(serialized), { pariwarId: PARIWAR_A, fieldClass: FIELD }, kms, kekRef)).toString('utf-8');
}
async function encr(value: string): Promise<string> {
  return serializeEnvelope(await encryptTier1(Buffer.from(value, 'utf-8'), { pariwarId: PARIWAR_A, fieldClass: FIELD }, kms, kekRef));
}

describe.skipIf(!hasDatabase)('Story 6.23a — RTBF over the approval-over-warning record (:5433)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐⭐ ⛔ no late-reason note survives an erasure; the approval row\'s NULL note stays NULL; the record is retained', async () => {
    const { client, tx } = getTx();
    const mid = await seedMember(tx, PARIWAR_A, { state: 'active' });
    const cid = await seedClaim(tx, PARIWAR_A, { deceasedMemberId: mid, currentState: 'verifier_approved' });
    const decisionId = randomUUID();
    await client.query(
      `INSERT INTO claim_verifier_decisions (decision_id, claim_case_id, pariwar_id, outcome, reason_code, actor_id, actor_display)
       VALUES ($1, $2, $3, 'approved', 'r5_d_natural_death', 'da', 'Anita')`,
      [decisionId, cid, PARIWAR_A],
    );
    await enterAppScope(client, PARIWAR_A);
    const note = await encr('ZZ-LATE-REASON-NOTE');
    const base = {
      pariwarId: PARIWAR_A,
      claimCaseId: toClaimId(cid),
      deceasedMemberId: toMemberId(mid),
      verifierDecisionId: decisionId as never,
      reasonCode: 'warnings_reviewed',
      reasonId: null,
      recordedByActor: 'da',
      recordedByDisplay: 'Anita',
    };
    await tx.insert(schema.claimWarningApprovals).values({ ...base, step: 'district_admin_approval', coveredKeys: ['k1'], noteCiphertext: null });
    await tx.insert(schema.claimWarningApprovals).values({ ...base, step: 'district_admin_late_reason', coveredKeys: ['k1', 'k2'], noteCiphertext: note });

    await anonymizeMember(tx, { kms, kekRef }, { memberId: toMemberId(mid), pariwarId: PARIWAR_A });

    const dump = JSON.stringify((await client.query('SELECT * FROM claim_warning_approvals WHERE claim_case_id = $1', [cid])).rows);
    expect(dump.includes(note), 'the original note ciphertext survived the erasure').toBe(false);
    const rows = await tx.select().from(schema.claimWarningApprovals).where(eq(schema.claimWarningApprovals.claimCaseId, toClaimId(cid)));
    expect(rows).toHaveLength(2); // ⭐ RETAINED — ⛔ nothing deleted
    const approval = rows.find((r) => r.step === 'district_admin_approval')!;
    const late = rows.find((r) => r.step === 'district_admin_late_reason')!;
    expect(approval.noteCiphertext).toBeNull();
    expect(await dec(late.noteCiphertext!)).toBe(ANONYMIZED_SENTINEL);
    expect(late.coveredKeys).toEqual(['k1', 'k2']);
    expect(late.recordedByDisplay).toBe('Anita');
  });
});
