// Cloud KMS-backed KmsProvider per architecture §2.7 line 1504 + §5.2 line 2952.
//
// HSM-protection assertion at first-call time defends against substrate-drift.
// `encryptDek`/`decryptDek` use Cloud KMS encrypt/decrypt with AAD; `computeHmac`
// uses MacSign. Per-Pariwar context-binding is enforced at the HMAC input by
// prefixing `pariwar:<id>|` (Option B per D9-1.5).

import { KeyManagementServiceClient } from '@google-cloud/kms';

import type { KmsKeyRef, KmsProvider } from './kms-provider.js';

const HSM_PROTECTION_LEVEL = 'HSM';

export interface CloudKmsProviderOpts {
  readonly kekRef: KmsKeyRef;
  readonly hmacKeyRef: KmsKeyRef;
  readonly projectId: string;
  readonly location: string;
}

// Numeric proto enum value for HSM protection level (gRPC clients may return int instead of string).
const HSM_PROTECTION_LEVEL_INT = 2;

export function createCloudKmsProvider(opts: CloudKmsProviderOpts): KmsProvider {
  const client = new KeyManagementServiceClient();
  // Cached Promise — all concurrent callers share the same in-flight assertion.
  // Cleared on rejection so transient network errors are retried on the next call.
  let hsmAssertionPromise: Promise<void> | null = null;

  function assertHsmProtection(): Promise<void> {
    if (hsmAssertionPromise) return hsmAssertionPromise;
    hsmAssertionPromise = (async () => {
      const checks: Array<[string, KmsKeyRef]> = [
        ['kek', opts.kekRef],
        ['hmacKey', opts.hmacKeyRef],
      ];
      for (const [label, ref] of checks) {
        const [key] = await client.getCryptoKey({ name: ref.resourceName });
        const level = key.versionTemplate?.protectionLevel;
        // proto-plus types protectionLevel as a string union; cast through unknown to
        // also handle raw gRPC numeric enum value 2 (HSM) from older client versions.
        const isHsm =
          level === HSM_PROTECTION_LEVEL ||
          (level as unknown) === HSM_PROTECTION_LEVEL_INT;
        if (!isHsm) {
          throw new Error(
            `cloudKmsProvider: ${label} protectionLevel must be HSM, got ${String(level)} (resource: ${ref.resourceName})`,
          );
        }
      }
    })().catch((err: unknown) => {
      hsmAssertionPromise = null; // clear on failure so next call retries
      throw err;
    });
    return hsmAssertionPromise;
  }

  return {
    async encryptDek(dek, kekRef, aad) {
      await assertHsmProtection();
      const name = kekRef.keyVersion
        ? `${kekRef.resourceName}/cryptoKeyVersions/${kekRef.keyVersion}`
        : kekRef.resourceName;
      const [resp] = await client.encrypt({
        name,
        plaintext: Buffer.from(dek),
        additionalAuthenticatedData: Buffer.from(aad),
      });
      if (!resp.ciphertext) throw new Error('cloudKmsProvider.encryptDek: empty ciphertext');
      return new Uint8Array(Buffer.from(resp.ciphertext as Uint8Array));
    },
    async decryptDek(encryptedDek, kekRef, aad) {
      await assertHsmProtection();
      const name = kekRef.keyVersion
        ? `${kekRef.resourceName}/cryptoKeyVersions/${kekRef.keyVersion}`
        : kekRef.resourceName;
      const [resp] = await client.decrypt({
        name,
        ciphertext: Buffer.from(encryptedDek),
        additionalAuthenticatedData: Buffer.from(aad),
      });
      if (!resp.plaintext) throw new Error('cloudKmsProvider.decryptDek: empty plaintext');
      return new Uint8Array(Buffer.from(resp.plaintext as Uint8Array));
    },
    async computeHmac(hmacKeyRef, input, context) {
      await assertHsmProtection();
      const data = Buffer.concat([
        Buffer.from(`pariwar:${context.pariwarId}|`, 'utf-8'),
        Buffer.from(input),
      ]);
      const name = hmacKeyRef.keyVersion
        ? `${hmacKeyRef.resourceName}/cryptoKeyVersions/${hmacKeyRef.keyVersion}`
        : hmacKeyRef.resourceName;
      const [resp] = await client.macSign({ name, data });
      if (!resp.mac) throw new Error('cloudKmsProvider.computeHmac: empty mac');
      return Buffer.from(resp.mac as Uint8Array);
    },
  };
}
