// Story 6.25 (Task 2.1; AC7; `2026-10-09-299` RE8 (i), ADR-0040) — the RELOCATED admin-email decrypt is byte-identical to the
// API's write path. ⛔ No production code decrypted an admin email before 6.25 (F16), so "byte-identical" would otherwise rest on
// `auth-primitives.test.ts`'s one round-trip (which passes UNEDITED). This cross-check proves the production-shaped path: the
// API's `encryptEmail` (its OWN KMS deps) ⇒ `@twt/domain`'s `decryptAdminEmail` under the JOBS KMS deps (`buildJobsEncryptionDeps`,
// the by-value parallel the staff-email child decrypts with), same pepper. A context drift (field class or namespace) or a KEK
// derivation drift between the two apps turns it red.
// ⭐ Round 3 — the constants are pinned to their LITERALS (the API now DEFINES them as the domain's values, so comparing the two
// was a value against itself), a ciphertext FROZEN at 6.25 must keep decrypting (a later namespace / field-class drift would strand
// every stored address while a fresh round trip stays green), and the wrong-context leg runs through the RELOCATED helper.

import { encryption } from '@twt/domain';
import { buildJobsEncryptionDeps } from '@twt/jobs';
import { describe, expect, it } from 'vitest';

import { ADMIN_EMAIL_FIELD_CLASS, ADMIN_GLOBAL_NAMESPACE } from '../../src/context.js';
import { buildEncryptionDeps } from '../../src/deps.js';
import { decryptEmail, encryptEmail } from '../../src/modules/auth/shared/email-index.js';

const PEPPER = 'admin-email-crosscheck-pepper';
/** `encryptEmail('frozen.admin@example.org')` under PEPPER, generated 2026-10-09 (code review round 3) — ⛔ regenerate it. */
const FROZEN =
  'enc:v1:eyJrZWtSZWYiOiJmYWtlOmFkbWluLWtlayIsImVuY3J5cHRlZERlayI6IlJEdzQrQlFpVGFTOEZ2RkdNUlhPMk1tcTRDS2dlc0I0K1lITTJ5RDFIbzFYZGtrZUEzYXNyRmJCNDlzYlFnMytpTTZRZDMyUlZyY1JPbFlZIiwiaXYiOiJ4aGJsUExYdGw4R2Q4WmFXIiwiY2lwaGVydGV4dCI6Im1wTFpQRVZ6ZjEyLzB3V0xYYUlCdjZiWUtLdlhlS1p0IiwiYXV0aFRhZyI6Im15K1UwUUxCOC9ScmFJdmVjcWF6TFE9PSIsImFhZFNoYXBlIjoidjEifQ==';

describe('Story 6.25 — the admin email decrypt, relocated to @twt/domain (ADR-0040)', () => {
  it('⭐ the API encrypts ⇒ the domain decrypts under the JOBS KMS deps (same pepper) — the normalized plaintext', async () => {
    const stored = await encryptEmail('  Pariwar.Admin@Example.com ', buildEncryptionDeps(PEPPER));
    expect(await encryption.decryptAdminEmail(stored, buildJobsEncryptionDeps(PEPPER))).toBe('pariwar.admin@example.com');
    // …and the API's own decrypt (now a delegation) agrees.
    expect(await decryptEmail(stored, buildEncryptionDeps(PEPPER))).toBe('pariwar.admin@example.com');
  });

  it('⭐ the context is pinned to its LITERALS — the nil-UUID namespace and `admin_email` (what every stored address was written under)', () => {
    expect(ADMIN_EMAIL_FIELD_CLASS).toBe('admin_email');
    expect(ADMIN_GLOBAL_NAMESPACE).toBe('00000000-0000-0000-0000-000000000000');
    expect(encryption.ADMIN_EMAIL_ENCRYPTION_CONTEXT).toEqual({ pariwarId: '00000000-0000-0000-0000-000000000000', fieldClass: 'admin_email' });
  });

  it('⭐ a ciphertext FROZEN at 6.25 (the API write path, this pepper) still decrypts — through the domain AND the API', async () => {
    expect(await encryption.decryptAdminEmail(FROZEN, buildJobsEncryptionDeps(PEPPER))).toBe('frozen.admin@example.org');
    expect(await decryptEmail(FROZEN, buildEncryptionDeps(PEPPER))).toBe('frozen.admin@example.org');
  });

  it('⛔ a different pepper (another environment\'s KEK) does NOT decrypt — the check is not vacuous', async () => {
    const stored = await encryptEmail('admin@example.com', buildEncryptionDeps(PEPPER));
    await expect(encryption.decryptAdminEmail(stored, buildJobsEncryptionDeps('another-pepper'))).rejects.toThrow();
  });

  it('⛔ the RELOCATED helper refuses a ciphertext written under ANOTHER context (a member field class, a real tenant)', async () => {
    const enc = buildEncryptionDeps(PEPPER);
    for (const context of [
      { pariwarId: '00000000-0000-0000-0000-000000000000', fieldClass: 'member_mobile' },
      { pariwarId: '2b7c0a4e-5d1f-4e8a-9c3b-1f2e3d4c5b6a', fieldClass: 'admin_email' },
    ]) {
      const ct = await encryption.encryptTier1(Buffer.from('admin@example.com', 'utf-8'), context, enc.kms, enc.kekRef);
      await expect(encryption.decryptAdminEmail(encryption.serializeEnvelope(ct), buildJobsEncryptionDeps(PEPPER)), JSON.stringify(context)).rejects.toThrow();
    }
  });
});
