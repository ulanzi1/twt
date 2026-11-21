// Story 6.39 (AC14; DL14) — RTBF over the membership check's note. Live DB, as `twt_app` (the column grant + the
// per-command UPDATE policy — without the policy the scrub matches 0 rows under FORCE RLS, the 6.23a trap; the guard
// trigger leaves `note_ciphertext` out of its frozen list so the write is allowed — ⛔ a later REPLACE of the guard).
//
// ⭐ The release is LIVE (Story 6.22): a false claim closed as "found alive" lifts the erasure refusal
// (`isDeathReportStanding`), so the scrub RUNS for real on a check recorded before the flag — leg 2 goes through it.
// The check itself — its outcomes, the review and receipt it names, who recorded it and its supersession — is
// governance history, KEPT. A check with ⛔ note stays without one (the note is optional — only non-NULL notes are
// replaced, so the `not_confirmed` ⇔ note CHECK is never disturbed either way).

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { flagClaimForFraudInvestigation, isDeathReportStanding, recordFraudFinding } from '../../../src/claim/index.js';
import { decryptTier1, encryptTier1, parseEnvelope, serializeEnvelope } from '../../../src/encryption/envelope.js';
import { CLAIM_MEMBERSHIP_CHECK_FIELD_CLASS, createFakeKmsProvider } from '../../../src/encryption/index.js';
import {
  claimFraudInvestigationStepId as toStepId,
  claimNomineeFindingId as toFindingId,
  memberId as toMemberId,
  type PariwarId,
} from '../../../src/ids/index.js';
import { ANONYMIZED_SENTINEL, anonymizeMember } from '../../../src/member/anonymize.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedAcceptedDeathCertificate, seedMembershipCheck } from '../_helpers.js';
import { claimAt } from './_one-payment-fixtures.js';

const kms = createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(7), hmacKeyBytes: new Uint8Array(32).fill(9) });
const kekRef = { resourceName: 'fake:rtbf-6-39-kek' };
const PID = PARIWAR_A as PariwarId;

const field = { pariwarId: PID, fieldClass: CLAIM_MEMBERSHIP_CHECK_FIELD_CLASS };
async function dec(serialized: string): Promise<string> {
  return Buffer.from(await decryptTier1(parseEnvelope(serialized), field, kms, kekRef)).toString('utf-8');
}
async function encr(value: string): Promise<string> {
  return serializeEnvelope(await encryptTier1(Buffer.from(value, 'utf-8'), field, kms, kekRef));
}

type Client = ReturnType<typeof getTx>['client'];
const checksOf = async (client: Client, cid: string) =>
  (await client.query<Record<string, unknown>>('SELECT * FROM claim_membership_checks WHERE claim_case_id = $1 ORDER BY decided_at, check_id', [cid])).rows;

describe.skipIf(!hasDatabase)('Story 6.39 — RTBF over the membership check\'s note (AC14)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐ the note → sentinel (as twt_app — the UPDATE policy lets the row MATCH); a note-less check is untouched; every other column is unchanged', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PID);
    const mid = randomUUID();
    const cid = await claimAt(client, PID, mid, 'verifier_review', { bare: true });
    const reviewId = await seedAcceptedDeathCertificate(client, { pariwarId: PID, claimCaseId: cid });
    const base = { pariwarId: PID, claimCaseId: cid, deceasedMemberId: mid, reviewId };
    // A note-less `confirmed` check, then (superseding it) a `not_confirmed` one WITH a note, then a `confirmed` one
    // with an OPTIONAL note — two rows with a note (one superseded, one live), one without.
    const noteless = await seedMembershipCheck(tx, { ...base, identityOutcome: 'confirmed' });
    const waitingNote = await encr('ZZ-NOTE the certificate names another person');
    const waiting = await seedMembershipCheck(tx, { ...base, identityOutcome: 'not_confirmed', identityReason: 'name_differs', noteCiphertext: waitingNote });
    const confirmedNote = await encr('ZZ-NOTE a married name, shown on the hospital record');
    const confirmed = await seedMembershipCheck(tx, { ...base, feeOutcome: 'same_day', identityOutcome: 'confirmed', noteCiphertext: confirmedNote });
    const before = await checksOf(client, cid);
    expect(before).toHaveLength(3);

    await anonymizeMember(tx, { kms, kekRef }, { memberId: toMemberId(mid), pariwarId: PARIWAR_A });

    const after = await checksOf(client, cid);
    expect(after).toHaveLength(3); // RETAINED — ⛔ nothing deleted
    const dump = JSON.stringify(after);
    for (const ct of [waitingNote, confirmedNote]) expect(dump.includes(ct), 'an original note ciphertext survived the erasure').toBe(false);
    const byId = (rows: Record<string, unknown>[], id: string) => rows.find((r) => r.check_id === id)!;
    // The two notes are the sentinel — a real envelope under the check's OWN field class (decryptable as such).
    expect(await dec(byId(after, waiting).note_ciphertext as string)).toBe(ANONYMIZED_SENTINEL);
    expect(await dec(byId(after, confirmed).note_ciphertext as string)).toBe(ANONYMIZED_SENTINEL);
    // ⭐ The note-less check is UNTOUCHED — still ⛔ note (a sentinel there would invent a note nobody wrote).
    expect(byId(after, noteless)).toEqual(byId(before, noteless));
    expect(byId(after, noteless).note_ciphertext).toBeNull();
    // ⭐ EVERY other column of the scrubbed rows is unchanged: the outcomes, the reason, the review and receipt named,
    // who recorded it and when, and the supersession stamp.
    const withoutNote = (row: Record<string, unknown>) => Object.fromEntries(Object.entries(row).filter(([column]) => column !== 'note_ciphertext'));
    for (const id of [waiting, confirmed]) {
      expect(withoutNote(byId(after, id))).toEqual(withoutNote(byId(before, id)));
    }
    expect(byId(after, waiting)).toMatchObject({ identity_outcome: 'not_confirmed', identity_reason: 'name_differs', superseded_reason: 're_checked' });
    expect(byId(after, confirmed)).toMatchObject({ fee_outcome: 'same_day', identity_outcome: 'confirmed', superseded_at: null });
  });

  it('⭐ through the REAL release (Story 6.22): a check with a note, the claim flagged and found INNOCENT ⇒ the death report no longer stands, and the erasure scrubs the note', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PID);
    const mid = randomUUID();
    const cid = await claimAt(client, PID, mid, 'verifier_review', { bare: true });
    const reviewId = await seedAcceptedDeathCertificate(client, { pariwarId: PID, claimCaseId: cid });
    const note = await encr('ZZ-NOTE the age on the certificate does not agree with the record');
    const checkId = await seedMembershipCheck(tx, {
      pariwarId: PID, claimCaseId: cid, deceasedMemberId: mid, reviewId,
      identityOutcome: 'not_confirmed', identityReason: 'age_or_birth_date_differs', noteCiphertext: note,
    });
    // While the death report stands, the member cannot be erased at all (6.38) — the control for what follows.
    expect(await isDeathReportStanding(tx, PID, toMemberId(mid))).toBe(true);

    const stepBase = { claimCaseId: cid, pariwarId: PID, actor: 'operator' as const };
    await flagClaimForFraudInvestigation(client, { ...stepBase, stepId: toStepId(randomUUID()), noteCiphertext: 'enc:v1:flag', actorId: randomUUID(), actorDisplay: 'Hema' });
    await recordFraudFinding(client, {
      ...stepBase, outcome: 'innocent', aliveConfirmation: 'in_person', stepId: toStepId(randomUUID()),
      findingId: toFindingId(randomUUID()), noteCiphertext: 'enc:v1:finding', actorId: randomUUID(), actorDisplay: 'Anita',
    });
    // The release: the false claim is closed, the member was found alive — the erasure refusal is lifted.
    expect(await isDeathReportStanding(tx, PID, toMemberId(mid))).toBe(false);

    await anonymizeMember(tx, { kms, kekRef }, { memberId: toMemberId(mid), pariwarId: PARIWAR_A });

    const [row] = await tx.select().from(schema.claimMembershipChecks).where(eq(schema.claimMembershipChecks.checkId, checkId as never));
    expect(row!.noteCiphertext).not.toBe(note);
    expect(await dec(row!.noteCiphertext!)).toBe(ANONYMIZED_SENTINEL);
    // The record of the check is KEPT.
    expect(row).toMatchObject({ identityOutcome: 'not_confirmed', identityReason: 'age_or_birth_date_differs', feeOutcome: 'before_death' });
  });
});
