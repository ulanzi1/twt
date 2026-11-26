// Story 6.39a (DL1) — the bank-date record's Tier-1 note: encrypt before the writer. ⛔ No read-back: the note has ⛔ staff
// reader in this story, so there is ⛔ decrypt helper here (the 6.39a fence forbids `decrypt` on the finance path — TR3).
// The field class is the ONE shared constant (`@twt/domain` `encryption`, re-exported by `context.ts`) — the erasure scrub
// binds the same value.

import { encryption } from '@twt/domain';

import { CLAIM_FEE_BANK_DATE_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

export async function encryptFeeBankDateNote(value: string, pariwarId: string, deps: EncryptionDeps): Promise<string> {
  const ct = await encryption.encryptTier1(
    Buffer.from(value, 'utf-8'),
    { pariwarId, fieldClass: CLAIM_FEE_BANK_DATE_FIELD_CLASS },
    deps.kms,
    deps.kekRef,
  );
  return encryption.serializeEnvelope(ct);
}
