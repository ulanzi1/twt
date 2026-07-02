// apps/jobs KMS dependency construction — Story 3.11 (Task 4).
//
// The FIRST encryption wiring in `apps/jobs` (this app had ZERO crypto code before this story). The
// data-export build worker DECRYPTS the member's Tier-1 profile fields (member is the legitimate
// audience) and RE-encrypts the whole ZIP for at-rest storage.
//
// ── Why this mirrors apps/api/src/deps.ts:buildEncryptionDeps EXACTLY (by value) ────────────────────
// The build worker (apps/jobs) ENCRYPTS the artifact; the download handler (apps/api) DECRYPTS it. Both
// must resolve the IDENTICAL KEK, or the round-trip fails. `apps/jobs` cannot import from `apps/api`
// (apps cannot depend on apps), so this is a deliberate BY-VALUE parallel: same `KMS_TEST_MODE`
// convention, same env var names (ADMIN_KEK_RESOURCE_NAME / ADMIN_HMAC_RESOURCE_NAME /
// GOOGLE_CLOUD_PROJECT / ADMIN_KMS_LOCATION), same fake-key derivation labels + kekRef resourceNames.
// In fake mode the KEK is derived deterministically from the SAME pepper + SAME label ('twt-admin-kek')
// the api uses, so an artifact/profile field encrypted under one is decryptable under the other.

import { createHash } from 'node:crypto';

import { encryption } from '@twt/domain';

/** Derive a deterministic 32-byte fake key from a label + the pepper (local/CI only). Mirrors apps/api. */
function deriveFakeKey(label: string, pepper: string): Uint8Array {
  return new Uint8Array(createHash('sha256').update(`${label}|${pepper}`).digest());
}

/** The subset of encryption material the data-export build worker needs (envelope encrypt/decrypt). */
export interface JobsEncryptionDeps {
  readonly kms: encryption.KmsProvider;
  readonly kekRef: encryption.KmsKeyRef;
  readonly hmacKeyRef: encryption.KmsKeyRef;
}

/**
 * Build the jobs-side encryption deps. BY-VALUE parallel of apps/api/src/deps.ts:buildEncryptionDeps —
 * same env vars, same fake-key derivation, same resourceNames — so the api↔jobs encrypt/decrypt
 * round-trip works (apps cannot import apps). Default `fake` (local/CI); `live` wires Cloud KMS.
 */
export function buildJobsEncryptionDeps(pepper: string): JobsEncryptionDeps {
  const mode = process.env['KMS_TEST_MODE'] ?? 'fake';
  if (mode === 'live') {
    const kekResource = process.env['ADMIN_KEK_RESOURCE_NAME'];
    const hmacResource = process.env['ADMIN_HMAC_RESOURCE_NAME'];
    const projectId = process.env['GOOGLE_CLOUD_PROJECT'];
    const location = process.env['ADMIN_KMS_LOCATION'];
    if (!kekResource || !hmacResource || !projectId || !location) {
      throw new Error(
        '[jobs:deps] KMS_TEST_MODE=live requires ADMIN_KEK_RESOURCE_NAME, ADMIN_HMAC_RESOURCE_NAME, ' +
          'GOOGLE_CLOUD_PROJECT, ADMIN_KMS_LOCATION',
      );
    }
    const kekRef = { resourceName: kekResource };
    const hmacKeyRef = { resourceName: hmacResource };
    return {
      kms: encryption.createCloudKmsProvider({ kekRef, hmacKeyRef, projectId, location }),
      kekRef,
      hmacKeyRef,
    };
  }
  if (mode !== 'fake') {
    throw new Error(`[jobs:deps] KMS_TEST_MODE must be 'fake' or 'live', got ${JSON.stringify(mode)}`);
  }
  return {
    kms: encryption.createFakeKmsProvider({
      kekBytes: deriveFakeKey('twt-admin-kek', pepper),
      hmacKeyBytes: deriveFakeKey('twt-admin-hmac', pepper),
    }),
    kekRef: { resourceName: 'fake:admin-kek' },
    hmacKeyRef: { resourceName: 'fake:admin-hmac' },
  };
}
