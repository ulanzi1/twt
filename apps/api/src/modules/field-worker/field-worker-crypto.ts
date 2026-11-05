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
// Story 13.1a adds the DECRYPT (`decryptFieldWorkerField`) for its audited reads (AD9) — called only AFTER the caller has
// written its actor-naming audit line (AD7) and released the hook's transaction (a KMS round trip must not hold a pooled
// connection — the `moderation-crypto.ts` placement note). It classifies its OWN failures (decision `-447` item 4).
// ⛔ Error classes here (13.1's handler unit test mocks this module with ONE export — TR10): they live in `errors.ts`.

import { encryption } from '@twt/domain';

import { FIELD_WORKER_FIELD_CLASS, FIELD_WORKER_MOBILE_FIELD_CLASS, type EncryptionDeps } from '../../context.js';
import { FieldWorkerDecryptUnavailableError, FieldWorkerIdentityUnreadableError } from './errors.js';

/** gRPC `INVALID_ARGUMENT` — the same status `kyc/name-render.ts` reads as "the key service rejected THIS envelope". */
const GRPC_INVALID_ARGUMENT = 3;

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

/**
 * Story 13.1a (AD9; decision `-447` item 4) — decrypt ONE stored field-worker value (a name or a mobile) to UTF-8 text, with the
 * failure classified by WHERE it happened (⛔ by message text):
 *   · `parseEnvelope` fails (local, synchronous) — the stored value is not an envelope ⇒ `FieldWorkerIdentityUnreadableError('envelope')`;
 *   · the KMS `decryptDek` rejects THIS envelope — gRPC `code: 3` (INVALID_ARGUMENT: a corrupt wrapped key, or one sealed under
 *     another Pariwar, field class or KEK) ⇒ `FieldWorkerIdentityUnreadableError('authentication')` (retry never helps; the
 *     same split `kyc/name-render.ts` makes — review round 2, CR7);
 *   · the KMS `decryptDek` fails any other way — the key service, or the way to it ⇒ `FieldWorkerDecryptUnavailableError`
 *     (retry helps);
 *   · the key UNWRAPPED but local AES-GCM authentication fails — tampered or corrupt ciphertext ⇒
 *     `FieldWorkerIdentityUnreadableError('authentication')` (retry never helps — review R8: the moderation helper's split
 *     would have called this a KMS outage).
 * Whether `decryptDek` resolved is observed through a wrapper on the provider (a Proxy: the provider may be a class whose
 * methods use `this`). The shared primitive is not changed. ⛔ The plaintext in any log or error.
 */
export async function decryptFieldWorkerField(serialized: string, pariwarId: string, enc: EncryptionDeps): Promise<string> {
  let envelope: ReturnType<typeof encryption.parseEnvelope>;
  try {
    envelope = encryption.parseEnvelope(serialized);
  } catch {
    throw new FieldWorkerIdentityUnreadableError('envelope');
  }
  // `decryptTier1` refuses an unknown AAD shape BEFORE the KMS call — a stored-value fault, ⛔ a key-service one.
  if (envelope.aadShape !== 'v1') throw new FieldWorkerIdentityUnreadableError('envelope');
  let unwrapped = false;
  const target = enc.kms;
  const kms = new Proxy(target, {
    get(t, prop) {
      const value: unknown = Reflect.get(t, prop, t);
      if (prop === 'decryptDek' && typeof value === 'function') {
        return async (...args: unknown[]) => {
          const dek: unknown = await (value as (...a: unknown[]) => Promise<unknown>).apply(t, args);
          unwrapped = true;
          return dek;
        };
      }
      return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(t) : value;
    },
  });
  try {
    const bytes = await encryption.decryptTier1(envelope, { pariwarId, fieldClass: FIELD_WORKER_FIELD_CLASS }, kms, enc.kekRef);
    return Buffer.from(bytes).toString('utf-8');
  } catch (err) {
    if (unwrapped) throw new FieldWorkerIdentityUnreadableError('authentication');
    // gRPC INVALID_ARGUMENT — Cloud KMS's answer for a malformed ciphertext or an AAD mismatch (the fake provider throws it too).
    if (typeof err === 'object' && err !== null && (err as { code?: unknown }).code === GRPC_INVALID_ARGUMENT) {
      throw new FieldWorkerIdentityUnreadableError('authentication');
    }
    throw new FieldWorkerDecryptUnavailableError();
  }
}
