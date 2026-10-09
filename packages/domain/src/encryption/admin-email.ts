// The ADMIN EMAIL's encryption context + its decrypt — RELOCATED here by Story 6.25 (Task 2; `2026-10-09-299` RE8 (i),
// ADR-0040).
//
// `ADMIN_EMAIL_FIELD_CLASS` and the admin email's Tier-1 envelope context were declared in `apps/api` (`context.ts`,
// `modules/auth/shared/email-index.ts`). Story 6.25's staff-email child runs in `apps/jobs`, which CANNOT import `apps/api` (a
// turbo cycle), and the context a field is READ under must be byte-identical to the one it was WRITTEN under — so a by-value
// copy in `apps/jobs` would be a silent-drift hazard on Tier-1 PII (the 8.8 / 6.19b relocation precedent, `field-classes.ts`).
// `apps/api` re-exports the class and delegates `decryptEmail` here — no apps/api call site changed.
//
// ⚠ ADR-0040 / ADR-0009 §5: the barrel makes `decryptAdminEmail` importable ANYWHERE — its callers are allowlisted by a source
// fence (`apps/jobs/tests/staff-email-identity-read-fence.test.ts`). ⛔ Never log, store or return the plaintext beyond the one
// caller that hands it to the email provider.

import { decryptTier1, parseEnvelope } from './envelope.js';
import { ADMIN_GLOBAL_NAMESPACE, type FieldCryptoDeps } from './field-classes.js';

/** Field-class namespace for the admin email blind index (HMAC input prefix) and its Tier-1 envelope context. */
export const ADMIN_EMAIL_FIELD_CLASS = 'admin_email';

/**
 * The admin email's Tier-1 envelope context. Admin identity is GLOBAL (Reconciliation R2) ⇒ it keys on the nil-UUID
 * `ADMIN_GLOBAL_NAMESPACE`, never a real tenant (ADR-0009).
 */
export const ADMIN_EMAIL_ENCRYPTION_CONTEXT = {
  pariwarId: ADMIN_GLOBAL_NAMESPACE,
  fieldClass: ADMIN_EMAIL_FIELD_CLASS,
} as const;

/** Decrypt a stored admin email envelope (`admin_credentials.email_ciphertext`) back to its normalized plaintext. */
export async function decryptAdminEmail(serialized: string, enc: Pick<FieldCryptoDeps, 'kms' | 'kekRef'>): Promise<string> {
  const ct = parseEnvelope(serialized);
  const bytes = await decryptTier1(ct, ADMIN_EMAIL_ENCRYPTION_CONTEXT, enc.kms, enc.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}
