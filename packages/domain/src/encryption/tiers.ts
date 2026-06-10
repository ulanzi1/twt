// PII tier model per architecture §2.7 line 1498-1534 + AR-12 (epics line 270).
//
// The FR-74 Public-vs-Private matrix is the canonical classification authority
// (architecture line 1522-1524); the matrix is enforced by the Story 1.16b
// PII shielding CI gate consuming the tier annotations attached via piiColumn().

/** PII tier per architecture §2.7. */
export type PiiTier = 1 | 2 | 3;

export const PII_TIER_1 = 1 as const;
export const PII_TIER_2 = 2 as const;
export const PII_TIER_3 = 3 as const;
