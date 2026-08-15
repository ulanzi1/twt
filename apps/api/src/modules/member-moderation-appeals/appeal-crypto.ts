// Moderation-appeal Tier-1 encryption helpers — Story 10.22 (Niyamavali §8.8).
//
// Encryption is an APP-LAYER concern: the routes encrypt the member's grounds and the adjudicator's
// reasoned outcome BEFORE handing ciphertext to the domain writer, and decrypt on the authorized
// single-item read. `packages/domain/src/member/moderation/appeal-persist.ts` takes already-serialized
// envelopes — `withdrawal.ts:8-13` states the rule and the appeal follows it.
//
// PLACEMENT: encrypt BEFORE `openScopeTx` (the `claims.verification-decision.handlers.ts` placement,
// which `member-moderation/moderation-crypto.ts` already clones). ⛔ Never hold a KMS round-trip
// inside an open tenant transaction — it pins a pooled connection for the duration of a network call.
//
// ⛔ NEVER log a decrypted value. NEVER put either field in an event payload, an audit line, an index,
// or a list DTO (R1 — `events_log.payload` is plaintext JSONB). The bounded `filed_via` / `outcome`
// tokens may ride those surfaces; the prose may not.

import { encryption } from '@twt/domain';

import { MODERATION_APPEAL_FIELD_CLASS, type EncryptionDeps } from '../../context.js';

function encContext(pariwarId: string): { pariwarId: string; fieldClass: string } {
  return { pariwarId, fieldClass: MODERATION_APPEAL_FIELD_CLASS };
}

/**
 * Tier-1 envelope ciphertext of a moderation-appeal free-text field.
 *
 * ⚠ ONE function for both the member's grounds and the adjudicator's reasoned outcome. There is
 * deliberately no `encryptOptional…` sibling: §8.8 requires grounds on every filing and a reasoned
 * outcome on every determination, and migration 0107's decision-coherence CHECK enforces the second
 * at the DB. An absent value must reach a typed 422 — never quietly become a NULL column.
 */
export async function encryptAppealText(
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

/**
 * The two genuinely different failure modes, kept apart — the `decryptModerationRationaleSafe`
 * discipline, cloned for the same reason it exists there.
 *
 * The DTO documents `grounds: null` / `reasoned_outcome: null` as the fail-soft outcome of a
 * corrupt or rotated envelope — a per-ROW fact. A blanket `catch` would collapse that together with a
 * KMS outage, so an unreachable key service would answer `200 {grounds: null}` for every appeal in
 * the tenant, and a trustee reviewing a disputed sanction would conclude the member never stated
 * grounds when they are intact and merely undecryptable right now. ⚠ On THIS surface that
 * misreading is particularly costly: the record would appear to show a member who appealed and said
 * nothing.
 *
 * The split is at the envelope boundary, which is where the modes actually separate:
 *   · `parseEnvelope` is LOCAL and synchronous — it fails only on a structurally bad stored value
 *     → `{ kind: 'corrupt' }` → `null`;
 *   · `decryptTier1` reaches the KMS — an operational, tenant-wide failure, so it PROPAGATES to a
 *     typed 503 rather than masquerading as absent text.
 */
export type AppealTextDecryptOutcome =
  | { kind: 'ok'; value: string }
  | { kind: 'corrupt'; error: unknown };

export async function decryptAppealTextSafe(
  serialized: string,
  pariwarId: string,
  enc: EncryptionDeps,
): Promise<AppealTextDecryptOutcome> {
  let ct: ReturnType<typeof encryption.parseEnvelope>;
  try {
    ct = encryption.parseEnvelope(serialized);
  } catch (error) {
    return { kind: 'corrupt', error };
  }
  // Deliberately NOT wrapped: a KMS/transport failure must reach the caller, which maps it to 503.
  const bytes = await encryption.decryptTier1(ct, encContext(pariwarId), enc.kms, enc.kekRef);
  return { kind: 'ok', value: Buffer.from(bytes).toString('utf-8') };
}
