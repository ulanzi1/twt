// Canonical-JSON of EncryptionContext for AES-256-GCM AAD binding.
//
// Story 1.5 deviation note: the architecture commits to canonical-JSON-serialized
// AAD per Story 1.3 substrate's canonicalJsonStringify. However, @twt/events
// (which exports canonicalJsonStringify) already depends on @twt/domain
// (events-log.ts imports schema). Adding @twt/events as a dep of @twt/domain
// would create a circular workspace dependency.
//
// Resolution: a scoped helper for the EncryptionContext shape only — three
// string fields (pariwarId, fieldClass, rowKey?). For this shape, RFC 8785
// §3.2.3 canonical-JSON reduces to lexicographically-sorted-key JSON.stringify
// — which produces byte-identical output to the @twt/events canonicalJsonStringify
// for the same input. Documented in Story 1.5 Completion Notes as a substrate
// resolution; future consolidation captured in deferred-work D13-1.5.

import type { EncryptionContext } from './kms-provider.js';

export function encryptionContextAad(ctx: EncryptionContext): Buffer {
  const keys: Array<keyof EncryptionContext> = ['fieldClass', 'pariwarId'];
  if (ctx.rowKey !== undefined) keys.push('rowKey');
  keys.sort();
  const body = keys
    .map((k) => JSON.stringify(k) + ':' + JSON.stringify(ctx[k]))
    .join(',');
  return Buffer.from('{' + body + '}', 'utf-8');
}
