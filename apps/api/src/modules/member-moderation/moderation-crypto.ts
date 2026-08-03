// Moderation-rationale Tier-1 encryption helpers — Story 10.10 (Task 5; AC3).
//
// Encryption is an APP-LAYER concern: the moderation route encrypts the MANDATORY free-text
// rationale (arbitrary text — PII-capable, since it names what a member did) BEFORE handing
// ciphertext to the domain writer, and decrypts on the authorized console read path. The
// `member_moderation_actions` table is a TENANT table — the encryption context keys on the member's
// REAL `pariwarId` under a DEDICATED field class (`MEMBER_MODERATION_FIELD_CLASS`), matching the
// `piiColumn(1, 'member_moderation')` annotation on the column.
//
// ── ⚠ This is NOT the Story 10.4 crypto boundary. Two opposite mistakes are available ────────────
// (a) DO NOT encrypt in the domain. `packages/domain/src/member/withdrawal.ts:8-13` states the rule:
//     accessors take already-serialized ciphertext; the route encrypts.
// (b) DO NOT skip encryption out of 10.4 caution. The 10.4 boundary is about MEMBER-IDENTITY field
//     crypto (which the admin request path lacks). An ADMIN-written rationale is encrypted under a
//     PER-PARIWAR field class via `deps.encryption` — which admin routes already do today
//     (`claims.verification-decision.handlers.ts:190-194`). The 10.4 constraint binds the member
//     FAN-OUT (apps/jobs), not this rationale.
//
// For PLACEMENT (encrypt BEFORE `openScopeTx`) follow `claims.verification-decision.handlers.ts`
// verbatim — NOT `claims.appeal.handlers.ts:314`, which encrypts inside an already-open scope tx as
// a deliberate 6.16-review KMS-cost deviation. A KMS round-trip inside an open tenant transaction
// holds a pooled connection for the duration of a network call.
//
// NEVER log a decrypted value; NEVER put the rationale in an event payload, an audit line, an index,
// or a response DTO (AC3/AC4). The reason CODE (bounded non-PII enum) may ride those surfaces; the
// rationale may not.

import { encryption } from '@twt/domain';

import { MEMBER_MODERATION_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

function encContext(pariwarId: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass: MEMBER_MODERATION_FIELD_CLASS };
}

/**
 * Tier-1 envelope ciphertext (serialized `enc:v1:…`) of the moderation rationale.
 *
 * There is deliberately NO `encryptOptional…` sibling here (contrast the verifier-decision helper,
 * whose rationale is optional): the rationale is REQUIRED on every moderation action (AC3), so an
 * absent one must reach a typed 422 — never quietly become a NULL column.
 */
export async function encryptModerationRationale(
  value: string,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<string> {
  const ct = await encryption.encryptTier1(
    Buffer.from(value, 'utf-8'),
    encContext(pariwarId),
    enc.kms,
    enc.kekRef,
  );
  return encryption.serializeEnvelope(ct);
}

/** Decrypt a stored rationale envelope back to plaintext (the authorized admin console read path). */
export async function decryptModerationRationale(
  serialized: string,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<string> {
  const ct = encryption.parseEnvelope(serialized);
  const bytes = await encryption.decryptTier1(ct, encContext(pariwarId), enc.kms, enc.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}

/**
 * The rationale read's two genuinely different failure modes, kept apart (review follow-up).
 *
 * The DTO documents `rationale: null` as "the fail-soft outcome of a corrupt/rotated envelope" — a
 * per-ROW fact. A blanket `catch` collapsed that together with a KMS outage, so an unreachable key
 * service answered `200 {rationale: null}` for every action in the tenant, and an auditor reviewing
 * a disputed termination would conclude the rationale was never written when it is intact and
 * merely undecryptable right now.
 *
 * The split is at the envelope boundary, which is where the two modes actually separate:
 *   · `parseEnvelope` is LOCAL and synchronous — it fails only on a structurally bad stored value,
 *     which is exactly the documented per-row case → `{ kind: 'corrupt' }` → `null`.
 *   · `decryptTier1` reaches the KMS — a failure there is operational and tenant-wide, so it
 *     PROPAGATES to a typed 503 rather than masquerading as an absent rationale.
 */
export type RationaleDecryptOutcome =
  | { kind: 'ok'; rationale: string }
  | { kind: 'corrupt'; error: unknown };

export async function decryptModerationRationaleSafe(
  serialized: string,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<RationaleDecryptOutcome> {
  let ct: ReturnType<typeof encryption.parseEnvelope>;
  try {
    ct = encryption.parseEnvelope(serialized);
  } catch (error) {
    return { kind: 'corrupt', error };
  }
  // Deliberately NOT wrapped: a KMS/transport failure must reach the caller, which maps it to 503.
  const bytes = await encryption.decryptTier1(ct, encContext(pariwarId), enc.kms, enc.kekRef);
  return { kind: 'ok', rationale: Buffer.from(bytes).toString('utf-8') };
}
