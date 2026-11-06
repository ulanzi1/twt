// The field worker's Tier-1 DECRYPT — moved here VERBATIM by Story 13.1b (AD6) from `apps/api/src/modules/field-worker/field-worker-crypto.ts`.
// The code SMS sweep runs in `apps/jobs`, which cannot import `apps/api` (the reverse dependency edge is a turbo cycle — see
// `encryption/field-classes.ts`), and a by-value copy of a Tier-1 decrypt context is a silent-drift hazard on real PII (Story 8.8's
// precedent, `encryption/member-fields.ts`). The API module RE-EXPORTS it, so no call site moved; what is here is 13.1a's behaviour
// byte for byte. `encrypt`, `seal` and `index` stay in the API: only the routes write a worker's identity.
//
// Called only AFTER the caller has written its audit line and released any transaction (a KMS round trip must not hold a pooled
// connection — the `moderation-crypto.ts` placement note). It classifies its OWN failures (decision `-447` item 4). ⛔ NEVER log a
// plaintext or a decrypted value; ⛔ never put one in an event payload, an audit line or an error body (I8).

import { FIELD_WORKER_FIELD_CLASS } from '../encryption/field-classes.js';
import * as encryption from '../encryption/index.js';
import type { KmsKeyRef, KmsProvider } from '../encryption/kms-provider.js';
import { FieldWorkerDecryptUnavailableError, FieldWorkerIdentityUnreadableError } from './errors.js';

/**
 * gRPC `INVALID_ARGUMENT` — the same status `kyc/name-render.ts` reads as "the key service rejected THIS envelope". ⚠ UN-ATTESTED
 * against the live service (`-449`; `name-render.ts` records the same premise): if Cloud KMS answers otherwise, a corrupt row stays a
 * 503, which fails closed.
 */
const GRPC_INVALID_ARGUMENT = 3;

/** What the decrypt needs — structural, so the API's `EncryptionDeps` and the jobs' deps both satisfy it. */
export interface FieldWorkerDecryptDeps {
  readonly kms: KmsProvider;
  readonly kekRef: KmsKeyRef;
}

/**
 * Story 13.1a (AD9; decisions `-447` item 4, `-449`) — decrypt ONE stored field-worker value (a name or a mobile) to UTF-8 text, with the
 * failure classified by WHERE it happened (⛔ by message text):
 *   · `parseEnvelope` fails (local, synchronous) — the stored value is not an envelope ⇒ `FieldWorkerIdentityUnreadableError('envelope')`;
 *   · the KMS `decryptDek` rejects THIS envelope — gRPC `code: 3` (INVALID_ARGUMENT: a corrupt wrapped key, or one sealed under
 *     another Pariwar, field class or KEK) ⇒ `FieldWorkerIdentityUnreadableError('key_rejected')` (retry never helps; the
 *     same split `kyc/name-render.ts` makes — review CR7, recorded by `-449`, its premise un-attested). The cost `-449` accepts: a
 *     SYSTEMIC code 3 (a mis-set key reference) reads the same for every row, so the log keeps it apart from tampering;
 *   · the KMS `decryptDek` fails any other way — the key service, or the way to it ⇒ `FieldWorkerDecryptUnavailableError`
 *     (retry helps);
 *   · the key UNWRAPPED but local AES-GCM authentication fails — tampered or corrupt ciphertext ⇒
 *     `FieldWorkerIdentityUnreadableError('authentication')` (retry never helps — review R8: the moderation helper's split
 *     would have called this a KMS outage).
 * Whether `decryptDek` resolved is observed through a wrapper on the provider (a Proxy: the provider may be a class whose
 * methods use `this`). The shared primitive is not changed. ⛔ The plaintext in any log or error.
 */
export async function decryptFieldWorkerField(serialized: string, pariwarId: string, enc: FieldWorkerDecryptDeps): Promise<string> {
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
    // gRPC INVALID_ARGUMENT — the fake provider throws it for a malformed ciphertext or an AAD mismatch; Cloud KMS is expected to,
    // un-attested (`GRPC_INVALID_ARGUMENT`).
    if (typeof err === 'object' && err !== null && (err as { code?: unknown }).code === GRPC_INVALID_ARGUMENT) {
      throw new FieldWorkerIdentityUnreadableError('key_rejected');
    }
    throw new FieldWorkerDecryptUnavailableError();
  }
}
