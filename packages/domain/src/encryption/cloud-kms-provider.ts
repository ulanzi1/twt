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

export function createCloudKmsProvider(opts: CloudKmsProviderOpts): KmsProvider {
  const client = new KeyManagementServiceClient();
  let hsmAssertionDone = false;

  async function assertHsmProtection(): Promise<void> {
    if (hsmAssertionDone) return;
    const checks: Array<[string, KmsKeyRef]> = [
      ['kek', opts.kekRef],
      ['hmacKey', opts.hmacKeyRef],
    ];
    for (const [label, ref] of checks) {
      const [key] = await client.getCryptoKey({ name: ref.resourceName });
      const level = key.versionTemplate?.protectionLevel;
      const levelStr = typeof level === 'string' ? level : String(level);
      if (levelStr !== HSM_PROTECTION_LEVEL) {
        throw new Error(
          `cloudKmsProvider: ${label} protectionLevel must be HSM, got ${levelStr} (resource: ${ref.resourceName})`,
        );
      }
    }
    hsmAssertionDone = true;
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
      const [resp] = await client.decrypt({
        name: kekRef.resourceName,
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
