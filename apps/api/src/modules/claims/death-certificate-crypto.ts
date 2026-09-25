// Tier-1 crypto for the Story 6.21a death-certificate REVIEW (D1, D8, D9). Mirrors
// `nominee-declaration-crypto.ts`: encrypt before the domain writer, decrypt only on the authorized, audited
// on-demand reads — the history, 6.20's timeline (`accepted_certificate`) and 6.20's determination handler
// (the date comparison, D8). ⛔ NEVER in an event, an audit line, a log or the console packet (T10).

import { encryption } from '@twt/domain';

import { DEATH_CERTIFICATE_REVIEW_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

/** A review's accepted date of death (`YYYY-MM-DD`) or its note. */
export async function encryptDeathCertificateReviewField(value: string, pariwarId: string, deps: EncryptionDeps): Promise<string> {
  const ct = await encryption.encryptTier1(
    Buffer.from(value, 'utf-8'),
    { pariwarId, fieldClass: DEATH_CERTIFICATE_REVIEW_FIELD_CLASS },
    deps.kms,
    deps.kekRef,
  );
  return encryption.serializeEnvelope(ct);
}

export async function decryptDeathCertificateReviewField(serialized: string, pariwarId: string, deps: EncryptionDeps): Promise<string> {
  const bytes = await encryption.decryptTier1(
    encryption.parseEnvelope(serialized),
    { pariwarId, fieldClass: DEATH_CERTIFICATE_REVIEW_FIELD_CLASS },
    deps.kms,
    deps.kekRef,
  );
  return Buffer.from(bytes).toString('utf-8');
}
