// Story 6.25 (Task 2.1; AC7; `2026-10-09-299` RE8 (i), ADR-0040) — the RELOCATED admin-email decrypt is byte-identical to the
// API's write path. ⛔ No production code decrypted an admin email before 6.25 (F16), so "byte-identical" would otherwise rest on
// `auth-primitives.test.ts`'s one round-trip (which passes UNEDITED). This cross-check proves the production-shaped path: the
// API's `encryptEmail` (its OWN KMS deps) ⇒ `@twt/domain`'s `decryptAdminEmail` under the JOBS KMS deps (`buildJobsEncryptionDeps`,
// the by-value parallel the staff-email child decrypts with), same pepper. A context drift (field class or namespace) or a KEK
// derivation drift between the two apps turns it red.

import { encryption } from '@twt/domain';
import { buildJobsEncryptionDeps } from '@twt/jobs/src/deps.js';
import { describe, expect, it } from 'vitest';

import { ADMIN_EMAIL_FIELD_CLASS, ADMIN_GLOBAL_NAMESPACE } from '../../src/context.js';
import { buildEncryptionDeps } from '../../src/deps.js';
import { decryptEmail, encryptEmail } from '../../src/modules/auth/shared/email-index.js';

const PEPPER = 'admin-email-crosscheck-pepper';

describe('Story 6.25 — the admin email decrypt, relocated to @twt/domain (ADR-0040)', () => {
  it('⭐ the API encrypts ⇒ the domain decrypts under the JOBS KMS deps (same pepper) — the normalized plaintext', async () => {
    const stored = await encryptEmail('  Pariwar.Admin@Example.com ', buildEncryptionDeps(PEPPER));
    expect(await encryption.decryptAdminEmail(stored, buildJobsEncryptionDeps(PEPPER))).toBe('pariwar.admin@example.com');
    // …and the API's own decrypt (now a delegation) agrees.
    expect(await decryptEmail(stored, buildEncryptionDeps(PEPPER))).toBe('pariwar.admin@example.com');
  });

  it('the API re-exports the domain constant — ONE value, ⛔ a by-value copy', () => {
    expect(ADMIN_EMAIL_FIELD_CLASS).toBe(encryption.ADMIN_EMAIL_FIELD_CLASS);
    expect(encryption.ADMIN_EMAIL_ENCRYPTION_CONTEXT).toEqual({ pariwarId: ADMIN_GLOBAL_NAMESPACE, fieldClass: 'admin_email' });
  });

  it('⛔ a different pepper (another environment\'s KEK) does NOT decrypt — the check is not vacuous', async () => {
    const stored = await encryptEmail('admin@example.com', buildEncryptionDeps(PEPPER));
    await expect(encryption.decryptAdminEmail(stored, buildJobsEncryptionDeps('another-pepper'))).rejects.toThrow();
  });

  it('⛔ a different envelope context (a member field class) does NOT decrypt an admin email', async () => {
    const enc = buildEncryptionDeps(PEPPER);
    const stored = await encryptEmail('admin@example.com', enc);
    const ct = encryption.parseEnvelope(stored);
    await expect(
      encryption.decryptTier1(ct, { pariwarId: ADMIN_GLOBAL_NAMESPACE, fieldClass: 'member_mobile' }, enc.kms, enc.kekRef),
    ).rejects.toThrow();
  });
});
