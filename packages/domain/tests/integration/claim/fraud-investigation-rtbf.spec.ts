// Story 6.22 (AC14; DL15) — RTBF over the fraud investigation's steps. Live DB, as `twt_app` (the column grant + the
// per-command UPDATE policy — without the policy the scrub matches 0 rows under FORCE RLS).
//
// An INNOCENCE-released member (a guilty one stays erasure-locked) is erased: every step's note becomes the sentinel; the
// steps themselves, the proof of life, the attribution and the finding link are governance history, KEPT.

import { describe, expect, it } from 'vitest';

import { randomUUID } from 'node:crypto';

import { flagClaimForFraudInvestigation, recordFraudFinding } from '../../../src/claim/index.js';
import { decryptTier1, encryptTier1, parseEnvelope, serializeEnvelope } from '../../../src/encryption/envelope.js';
import { CLAIM_FRAUD_INVESTIGATION_FIELD_CLASS, createFakeKmsProvider } from '../../../src/encryption/index.js';
import {
  claimFraudInvestigationStepId as toStepId,
  claimNomineeFindingId as toFindingId,
  memberId as toMemberId,
  type PariwarId,
} from '../../../src/ids/index.js';
import { ANONYMIZED_SENTINEL, anonymizeMember } from '../../../src/member/anonymize.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';
import { claimAt } from './_one-payment-fixtures.js';

const kms = createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(7), hmacKeyBytes: new Uint8Array(32).fill(9) });
const kekRef = { resourceName: 'fake:rtbf-6-22-kek' };
const PID = PARIWAR_A as PariwarId;

const field = { pariwarId: PID, fieldClass: CLAIM_FRAUD_INVESTIGATION_FIELD_CLASS };
async function dec(serialized: string): Promise<string> {
  return Buffer.from(await decryptTier1(parseEnvelope(serialized), field, kms, kekRef)).toString('utf-8');
}
async function encr(value: string): Promise<string> {
  return serializeEnvelope(await encryptTier1(Buffer.from(value, 'utf-8'), field, kms, kekRef));
}

describe.skipIf(!hasDatabase)('Story 6.22 — RTBF over the fraud investigation steps (AC14)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐ ⛔ step note survives an erasure (as twt_app, rows matched > 0); the steps and their governance columns are KEPT', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PID);
    const mid = randomUUID();
    const cid = await claimAt(client, PID, mid, 'verifier_review', { bare: true });
    const flagNote = await encr('ZZ-FLAG-NOTE');
    const findNote = await encr('ZZ-FINDING-NOTE');
    const base = { claimCaseId: cid, pariwarId: PID, actor: 'operator' as const };
    await flagClaimForFraudInvestigation(client, { ...base, stepId: toStepId(randomUUID()), noteCiphertext: flagNote, actorId: randomUUID(), actorDisplay: 'Hema' });
    await recordFraudFinding(client, {
      ...base, outcome: 'innocent', aliveConfirmation: 'in_person', stepId: toStepId(randomUUID()),
      findingId: toFindingId(randomUUID()), noteCiphertext: findNote, actorId: randomUUID(), actorDisplay: 'Anita',
    });

    await anonymizeMember(tx, { kms, kekRef }, { memberId: toMemberId(mid), pariwarId: PARIWAR_A });

    const { rows } = await client.query<{ step: string; note_ciphertext: string; alive_confirmation: string | null; actor_display: string; finding_id: string | null }>(
      'SELECT step, note_ciphertext, alive_confirmation, actor_display, finding_id::text FROM claim_fraud_investigation_steps WHERE claim_case_id = $1 ORDER BY step',
      [cid],
    );
    expect(rows.map((r) => r.step)).toEqual(['flagged', 'found_innocent']); // RETAINED — ⛔ nothing deleted
    for (const r of rows) {
      expect(r.note_ciphertext).not.toBe(flagNote);
      expect(r.note_ciphertext).not.toBe(findNote);
      expect(await dec(r.note_ciphertext)).toBe(ANONYMIZED_SENTINEL);
    }
    const found = rows.find((r) => r.step === 'found_innocent')!;
    expect(found).toMatchObject({ alive_confirmation: 'in_person', actor_display: 'Anita' });
    expect(found.finding_id).not.toBeNull();
  });
});
