// Story 3.13 (AC13; DL14) — RTBF over the identity check's staff note. Live DB, as `twt_app` (0218's column grant + the
// per-command UPDATE policy AT BIRTH — without the policy the scrub matches 0 rows under FORCE RLS, the 6.23a trap; the
// guard leaves `note_ciphertext` out of its frozen list, so ⛔ a later guard REPLACE is needed).
// The record itself — outcome, evidence / document kind, the reason (row 3-13a reads it), who recorded it, the
// supersession — is KEPT. A note-less act stays without one (a sentinel there would invent a note nobody wrote).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { decryptTier1, encryptTier1, parseEnvelope, serializeEnvelope } from '../../../src/encryption/envelope.js';
import { MEMBER_IDENTITY_VALIDATION_FIELD_CLASS, createFakeKmsProvider } from '../../../src/encryption/index.js';
import { memberId as toMemberId, type PariwarId } from '../../../src/ids/index.js';
import { ANONYMIZED_SENTINEL, anonymizeMember } from '../../../src/member/anonymize.js';
import { recordIdentityValidation } from '../../../src/member/identity-validation.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedEvent } from '../_helpers.js';

const kms = createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(7), hmacKeyBytes: new Uint8Array(32).fill(9) });
const kekRef = { resourceName: 'fake:rtbf-3-13-kek' };
const PID = PARIWAR_A as PariwarId;
const field = { pariwarId: PID, fieldClass: MEMBER_IDENTITY_VALIDATION_FIELD_CLASS };
const dec = async (s: string) => Buffer.from(await decryptTier1(parseEnvelope(s), field, kms, kekRef)).toString('utf-8');
const encr = async (v: string) => serializeEnvelope(await encryptTier1(Buffer.from(v, 'utf-8'), field, kms, kekRef));

describe.skipIf(!hasDatabase)('Story 3.13 — RTBF over the identity check\'s note (AC13)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐ the notes → sentinel (as twt_app); a note-less act is untouched; every other column is unchanged; nothing deleted', async () => {
    const { client, tx } = getTx();
    const mid = randomUUID();
    for (const [i, eventType] of ['member.signup_initiated', 'member.kyc_manual_fallback', 'member.vyawastha_shulk_paid'].entries()) {
      await seedEvent(tx, PID, { streamId: mid, eventType, payload: {}, eventVersion: i + 1 });
    }
    await tx.insert(schema.members).values({ memberId: toMemberId(mid), pariwarId: PID, state: 'lock-in', stateEventVersion: 3 });
    await tx.insert(schema.memberKycProfiles).values({
      memberId: toMemberId(mid),
      pariwarId: PID,
      nameCiphertext: 'enc:v1:name',
      dobCiphertext: 'enc:v1:dob',
      verificationStrength: 'self_declared',
      source: 'manual',
    });
    await enterAppScope(client, PID);
    const base = { pariwarId: PID, memberId: toMemberId(mid), actorId: randomUUID(), actorDisplay: 'Asha' };
    const firstNote = await encr('ZZ-NOTE phoned twice, no answer');
    const first = await recordIdentityValidation(client, {
      ...base,
      outcome: 'not_confirmed',
      notConfirmedReason: 'member_not_reached',
      evidenceKind: null,
      documentKind: null,
      noteCiphertext: firstNote,
    });
    const secondNote = await encr('ZZ-NOTE the voter card names someone else');
    const second = await recordIdentityValidation(client, {
      ...base,
      outcome: 'not_confirmed',
      notConfirmedReason: 'details_do_not_match',
      evidenceKind: 'photo_id_in_person',
      documentKind: 'voter_id',
      noteCiphertext: secondNote,
    });
    const confirmed = await recordIdentityValidation(client, {
      ...base,
      outcome: 'confirmed',
      notConfirmedReason: null,
      evidenceKind: 'photo_id_video_call',
      documentKind: 'passport',
      noteCiphertext: null,
    });
    const rows = async () =>
      (await client.query<Record<string, unknown>>('SELECT * FROM member_identity_validations WHERE member_id = $1', [mid])).rows;
    const before = await rows();
    expect(before).toHaveLength(3);

    await anonymizeMember(tx, { kms, kekRef }, { memberId: toMemberId(mid), pariwarId: PARIWAR_A });

    const after = await rows();
    expect(after).toHaveLength(3);
    const byId = (rs: Record<string, unknown>[], id: string) => rs.find((r) => r.validation_id === id)!;
    const dump = JSON.stringify(after);
    for (const ct of [firstNote, secondNote]) expect(dump.includes(ct), 'an original note ciphertext survived').toBe(false);
    expect(await dec(byId(after, first.validationId).note_ciphertext as string)).toBe(ANONYMIZED_SENTINEL);
    expect(await dec(byId(after, second.validationId).note_ciphertext as string)).toBe(ANONYMIZED_SENTINEL);
    expect(byId(after, confirmed.validationId)).toEqual(byId(before, confirmed.validationId));
    expect(byId(after, confirmed.validationId).note_ciphertext).toBeNull();
    const withoutNote = (r: Record<string, unknown>) => Object.fromEntries(Object.entries(r).filter(([c]) => c !== 'note_ciphertext'));
    for (const id of [first.validationId, second.validationId]) expect(withoutNote(byId(after, id))).toEqual(withoutNote(byId(before, id)));
    expect(byId(after, second.validationId)).toMatchObject({ outcome: 'not_confirmed', not_confirmed_reason: 'details_do_not_match', superseded_reason: 're_checked' });
  });
});
