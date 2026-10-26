// packages/contracts/src/nominee/relationship.ts
//
// The nominee relationship wire enum — MOVED here from `declaration.ts` (Story 6.36f, Task 1) so `member-link.ts` can use it
// (the links read's `ranks`) without an import cycle (`declaration.ts` imports `member-link.ts`). `declaration.ts` re-exports
// both names, so every existing import is unchanged.

import { z } from 'zod';

// ── Wire enum (re-declared; value-aligned with member_nominees.relationship) ───────────

/**
 * Nominee relationship-to-member. Constrained HERE (data quality) rather than at the DB,
 * where `relationship` is plain Tier-3 text (the kyc_transactions.status "text for the swap
 * seam" posture). The server stores the validated label verbatim.
 *
 * ⭐ STORY 6.19a (AC13) — TWENTY values (`2026-09-27-257`, Trustee-ratified, SUPERSEDES `-237` cl.1):
 * spouse, mother, father, son, daughter, brother, sister, uncle, aunt, cousin, niece/nephew,
 * grandchild, sister-in-law, daughter-in-law, brother-in-law, son-in-law, mother-in-law,
 * father-in-law, grandparent, other. (Story 6.20 (AC12) had moved the shipped five to the fifteen
 * of `-237` cl.1.)
 * ⚠ THESE ARE WIRE CODES, ⛔ NOT THE RATIFIED LABELS: `NomineeForm.tsx` builds its copy key as
 * `nominees.relationship_${code}`, so a code of `niece/nephew` would produce an i18n key with a slash.
 * The codes are snake_case identifiers; the ratified wording lives in the en/hi label values.
 * ⚠ `other` FORECLOSES a later correction (`-237` cl.2 — *"we cannot really establish relationship and
 * therefore no correction will be allowed"*) — the member is told so at the picker.
 * ⛔ No migration and ⛔ no backfill: the DB column is plain text and nothing is in production (`-232`).
 * ⛔ `ClaimantRelationship` (claims/filing.ts) is a DIFFERENT list — the claimant's relationship to the
 * deceased — and stays five values.
 * ⚠ Still OPEN, recorded in `-237`: ⛔ no brother-in-law / son-in-law / mother-in-law / father-in-law /
 * grandparent — a member naming one falls to `other`. Kept as ratified (BigDev, 2026-09-21).
 *   ⭐ DISCHARGED by `2026-09-27-257` (Story 6.19a, AC13): all five are now in the list.
 */
export const NOMINEE_RELATIONSHIP_CODES = [
  'spouse',
  'mother',
  'father',
  'son',
  'daughter',
  'brother',
  'sister',
  'uncle',
  'aunt',
  'cousin',
  'niece_nephew',
  'grandchild',
  'sister_in_law',
  'daughter_in_law',
  'brother_in_law',
  'son_in_law',
  'mother_in_law',
  'father_in_law',
  'grandparent',
  'other',
] as const;
export const NomineeRelationship = z.enum(NOMINEE_RELATIONSHIP_CODES);
export type NomineeRelationship = z.output<typeof NomineeRelationship>;
