// The correction reminders' Tier-1 decrypt and NUMBER HASH — Story 6.19b (Task 4; AC3; `2026-09-29-271` §1).
//
// A domain helper over `decryptTier1` / `blindIndex`, ⛔ not a copy of the apps/api one: `apps/jobs` (which sends the
// family SMS) cannot import `apps/api`, and the context a field is read under must be byte-identical to the one it
// was written under — the two field classes live in `encryption/field-classes.ts` for exactly that reason.
//   · the CLAIMANT block's mobile → `claim_contacts.claimant_mobile_ciphertext`, class `claim_contact`;
//   · a NOMINEE's mobile → `member_nominee_versions.mobile_ciphertext`, class `member_nominee`;
// both keyed on the claim's REAL `pariwarId`.
// ⭐ The number HASH (`recipient_number_hash`) is a keyed `blindIndex` of the NORMALISED E.164 number under the NEW
// class `claim_contact_mobile`, bound to the claim's REAL `pariwarId` — ⛔ never `mobileBlindIndex` (the login key).
// ⛔ NEVER log a decrypted value; ⛔ never put one in an event, audit line, error body or job payload.

import { blindIndex } from '../encryption/blind-index.js';
import { decryptTier1, parseEnvelope } from '../encryption/envelope.js';
import {
  CLAIM_CONTACT_FIELD_CLASS,
  CLAIM_CONTACT_MOBILE_FIELD_CLASS,
  MEMBER_NOMINEE_FIELD_CLASS,
  type FieldCryptoDeps,
} from '../encryption/field-classes.js';
import { normalizeMobile } from '../encryption/member-fields.js';

/** Where a recipient's mobile ciphertext came from — decides its decrypt context. */
export type CorrectionMobileSource = 'claim_contact' | 'member_nominee';

function fieldClassOf(source: CorrectionMobileSource): string {
  return source === 'claim_contact' ? CLAIM_CONTACT_FIELD_CLASS : MEMBER_NOMINEE_FIELD_CLASS;
}

/** Decrypt a stored mobile envelope to its plaintext. Throws on a bad envelope (a data fault, ⛔ never swallowed). */
export async function decryptCorrectionMobile(
  serialized: string,
  source: CorrectionMobileSource,
  pariwarId: string,
  enc: FieldCryptoDeps,
): Promise<string> {
  const ct = parseEnvelope(serialized);
  const bytes = await decryptTier1(ct, { pariwarId, fieldClass: fieldClassOf(source) }, enc.kms, enc.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}

/**
 * The SENDABLE number of a stored mobile — E.164, or `null` when there is none (a vacated version's null ciphertext,
 * an erasure sentinel, a number that is ⛔ not a valid Indian mobile) ⇒ the attempt is `no_target` (D20, D30).
 */
export async function resolveCorrectionMobile(
  serialized: string | null,
  source: CorrectionMobileSource,
  pariwarId: string,
  enc: FieldCryptoDeps,
): Promise<string | null> {
  if (serialized === null || serialized.trim() === '') return null;
  const plaintext = await decryptCorrectionMobile(serialized, source, pariwarId, enc);
  return normalizeMobile(plaintext);
}

/** ⭐ `-271` §1 — the keyed hash of a NORMALISED E.164 number, bound to the claim's REAL Pariwar. */
export function correctionNumberHash(e164: string, pariwarId: string, enc: FieldCryptoDeps): Promise<string> {
  return blindIndex(CLAIM_CONTACT_MOBILE_FIELD_CLASS, e164, { pariwarId }, enc.kms, enc.hmacKeyRef);
}

/**
 * The CURRENT number hash of a stored mobile — `null` when there is no sendable number. The two helpers above in one
 * call, for the resolver (`-271` §1) and the sweep's reset check.
 */
export async function currentCorrectionNumberHash(
  serialized: string | null,
  source: CorrectionMobileSource,
  pariwarId: string,
  enc: FieldCryptoDeps,
): Promise<string | null> {
  const e164 = await resolveCorrectionMobile(serialized, source, pariwarId, enc);
  return e164 === null ? null : correctionNumberHash(e164, pariwarId, enc);
}
