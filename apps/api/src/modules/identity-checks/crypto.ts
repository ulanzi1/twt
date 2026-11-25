// Story 3.13 (DL1, DL8, DL14) — the identity check's Tier-1 staff note: encrypt before the writer; decrypt the LIVE act's
// note for the detail (one audited view). The field class is the ONE shared constant (`@twt/domain` `encryption`,
// re-exported by `context.ts`) — the erasure scrub binds the same value. ⛔ The note in a log line, an event or an audit.

import { encryption } from '@twt/domain';

import { type EncryptionDeps, MEMBER_IDENTITY_VALIDATION_FIELD_CLASS } from '../../context.js';

export async function encryptIdentityCheckNote(value: string, pariwarId: string, deps: EncryptionDeps): Promise<string> {
  const ct = await encryption.encryptTier1(
    Buffer.from(value, 'utf-8'),
    { pariwarId, fieldClass: MEMBER_IDENTITY_VALIDATION_FIELD_CLASS },
    deps.kms,
    deps.kekRef,
  );
  return encryption.serializeEnvelope(ct);
}

export async function decryptIdentityCheckNote(serialized: string, pariwarId: string, deps: EncryptionDeps): Promise<string> {
  const bytes = await encryption.decryptTier1(
    encryption.parseEnvelope(serialized),
    { pariwarId, fieldClass: MEMBER_IDENTITY_VALIDATION_FIELD_CLASS },
    deps.kms,
    deps.kekRef,
  );
  return Buffer.from(bytes).toString('utf-8');
}
