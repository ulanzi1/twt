// Story 6.39 (DL1, DL14) — the membership check's Tier-1 note: encrypt before the writer. ⛔ No read-back: the note has
// ⛔ staff reader in this story (the preview returns `has_note`, never the note), so there is ⛔ decrypt helper here.
// The field class is the ONE shared constant (`@twt/domain` `encryption`, re-exported by `context.ts`) — the erasure
// scrub binds the same value.

import { encryption } from '@twt/domain';

import { CLAIM_MEMBERSHIP_CHECK_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

export async function encryptMembershipCheckNote(value: string, pariwarId: string, deps: EncryptionDeps): Promise<string> {
  const ct = await encryption.encryptTier1(
    Buffer.from(value, 'utf-8'),
    { pariwarId, fieldClass: CLAIM_MEMBERSHIP_CHECK_FIELD_CLASS },
    deps.kms,
    deps.kekRef,
  );
  return encryption.serializeEnvelope(ct);
}
