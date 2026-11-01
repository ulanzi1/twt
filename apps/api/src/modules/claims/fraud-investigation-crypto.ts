// Story 6.22 (DL1 / DL15) — the fraud investigation's Tier-1 notes (the helpline operator's flag note and the District
// Admin's finding note), under `CLAIM_FRAUD_INVESTIGATION_FIELD_CLASS` (declared once in `@twt/domain`; the erasure scrub
// binds the same value). ⛔ Never in an event, a log line or an audit context.

import { encryption } from '@twt/domain';

import { CLAIM_FRAUD_INVESTIGATION_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

export async function encryptFraudInvestigationNote(value: string, pariwarId: string, deps: EncryptionDeps): Promise<string> {
  const ct = await encryption.encryptTier1(
    Buffer.from(value, 'utf-8'),
    { pariwarId, fieldClass: CLAIM_FRAUD_INVESTIGATION_FIELD_CLASS },
    deps.kms,
    deps.kekRef,
  );
  return encryption.serializeEnvelope(ct);
}

export async function decryptFraudInvestigationNote(serialized: string, pariwarId: string, deps: EncryptionDeps): Promise<string> {
  const bytes = await encryption.decryptTier1(
    encryption.parseEnvelope(serialized),
    { pariwarId, fieldClass: CLAIM_FRAUD_INVESTIGATION_FIELD_CLASS },
    deps.kms,
    deps.kekRef,
  );
  return Buffer.from(bytes).toString('utf-8');
}
