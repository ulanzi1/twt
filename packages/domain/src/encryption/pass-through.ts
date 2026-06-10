// Tier-3 pass-through helper per architecture §2.7 line 1515-1517 + 1522-1524.
//
// Tier 3 PII is plaintext; the classification authority is the FR-74
// Public-vs-Private matrix (enforced by the Story 1.16b PII shielding CI gate).
// The runtime marker (TIER_3_MARKER) is a structural signal the CI gate
// consumes when reading tier annotations from piiColumn declarations.

export const TIER_3_MARKER = Symbol.for('@twt/domain.encryption.tier3');

export function passThroughTier3<T>(value: T): T {
  return value;
}
