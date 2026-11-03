// The field worker's Tier-1 encryption and mobile blind index — Story 13.1 (Task 1; QE4, G6).
//
// Encryption is an APP-LAYER concern (G6, deferred-work T10): the registration route seals the worker's name and mobile
// HERE, BEFORE the domain writer, and the domain command receives three opaque strings. A hybrid of the two twins:
//   · the Tier-1 envelope — `claims/claim-contact-crypto.ts` (keyed on the worker's REAL `pariwarId`, class
//     `field_worker`, matching `piiColumn(1, 'field_worker')`);
//   · the keyed hash — `@twt/domain` `claim/correction-crypto.ts` (`correctionNumberHash`): `blindIndex` of the NORMALISED
//     E.164 number under the NEW class `field_worker_mobile`, bound to the REAL `pariwarId` — ⛔ never `mobileBlindIndex`,
//     which is the MEMBER login key (`member_mobile` under `MEMBER_IDENTITY_NAMESPACE`): reusing it would make a worker row
//     joinable to a member's login hash.
// Normalisation (`normalizeMobile`) and the name rules are the handler's content checks and run BEFORE this module; it
// takes the already-normalised values. Each call fires one KMS audit line (TR5: three per registration, asynchronous).
//
// ⛔ NEVER log a plaintext or a decrypted value; ⛔ never put one in an event payload, an audit line or an error body (I8).
// No function here decrypts: decrypt-on-read is Story 13.3's / 13.4's decision (AC10).

import { encryption } from '@twt/domain';

import { FIELD_WORKER_FIELD_CLASS, FIELD_WORKER_MOBILE_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

/** The three stored strings of a worker's identity — what `registerFieldWorker` writes. */
export interface SealedFieldWorkerIdentity {
  readonly nameCiphertext: string;
  readonly mobileCiphertext: string;
  readonly mobileBlindIndex: string;
}

/** Tier-1 envelope ciphertext (serialized `enc:v1:…`) of a field-worker field. */
export async function encryptFieldWorkerField(value: string, pariwarId: string, enc: EncryptionDeps): Promise<string> {
  const ct = await encryption.encryptTier1(
    Buffer.from(value, 'utf-8'),
    { pariwarId, fieldClass: FIELD_WORKER_FIELD_CLASS },
    enc.kms,
    enc.kekRef,
  );
  return encryption.serializeEnvelope(ct);
}

/** The keyed hash of a NORMALISED E.164 mobile (`normalizeMobile`'s output), bound to the worker's REAL Pariwar. */
export function fieldWorkerMobileIndex(e164: string, pariwarId: string, enc: EncryptionDeps): Promise<string> {
  return encryption.blindIndex(FIELD_WORKER_MOBILE_FIELD_CLASS, e164, { pariwarId }, enc.kms, enc.hmacKeyRef);
}

/**
 * Seal a worker's ALREADY-VALIDATED name (NFC, trimmed) and E.164 mobile: two Tier-1 encrypts and one keyed hash. A KMS
 * failure propagates unmapped (the route answers 500 and nothing is written — the Errors table's last row).
 */
export async function sealFieldWorkerIdentity(
  identity: { readonly name: string; readonly mobileE164: string },
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<SealedFieldWorkerIdentity> {
  const nameCiphertext = await encryptFieldWorkerField(identity.name, pariwarId, enc);
  const mobileCiphertext = await encryptFieldWorkerField(identity.mobileE164, pariwarId, enc);
  const mobileBlindIndex = await fieldWorkerMobileIndex(identity.mobileE164, pariwarId, enc);
  return { nameCiphertext, mobileCiphertext, mobileBlindIndex };
}
