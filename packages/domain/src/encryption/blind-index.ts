// Tier-2 blind index primitive per architecture §2.7 line 1509-1514 + 1526-1529.
//
// HMAC-SHA-256 with field-class namespacing: HMAC(key, "<field-class>:" || value).
// Per-Pariwar context-binding is enforced by the KmsProvider implementation
// (fake-kms-provider prepends "pariwar:<id>|" to the input; cloud-kms-provider
// does the same before MacSign). Substantive per-Pariwar separate KMS HMAC
// keys vs context-binding-on-single-key is Story 1.6 territory (D9-1.5);
// Story 1.5 substrate defaults to context-binding (Option B).

import type { KmsKeyRef, KmsProvider } from './kms-provider.js';

export async function blindIndex(
  fieldClass: string,
  plaintext: string,
  context: { pariwarId: string },
  kms: KmsProvider,
  hmacKeyRef: KmsKeyRef,
): Promise<string> {
  if (fieldClass.length === 0) {
    throw new Error('blindIndex: fieldClass must be non-empty');
  }
  if (fieldClass.includes(':')) {
    throw new Error('blindIndex: fieldClass must not contain ":" (used as namespace separator)');
  }
  const input = Buffer.from(`${fieldClass}:${plaintext}`, 'utf-8');
  const mac = await kms.computeHmac(hmacKeyRef, input, context);
  kms.auditHook?.('computeHmac', hmacKeyRef, {
    pariwarId: context.pariwarId,
    fieldClass,
  });
  return Buffer.from(mac).toString('hex');
}
