// The nominee RELATIONSHIP vocabulary — the domain's copy (Story 6.20, AC12; `2026-09-21-237` cl.1–2).
//
// ⭐ FIFTEEN values, Trustee-ratified, replacing the shipped five. They are WIRE CODES (snake_case — a
// `niece/nephew` code would make an i18n key with a slash); the ratified wording lives in the en/hi
// label values. ⛔ The DB constrains nothing (`member_nominees.relationship` and the versions table are
// plain text — the value set lives in the contracts enum), so this tuple exists for the ONE domain rule
// that reads a relationship: `other` FORECLOSES a correction (`-237` cl.2 — *"if `other` is selected,
// we cannot really establish relationship and therefore no correction will be allowed"*).
// ⭐ In lockstep with `packages/contracts/src/nominee/declaration.ts` `NOMINEE_RELATIONSHIP_CODES`,
// pinned in order by `packages/contracts/tests/nominee-relationship-lockstep.test.ts`.

export const NOMINEE_RELATIONSHIPS = [
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
  'other',
] as const;
export type NomineeRelationshipCode = (typeof NOMINEE_RELATIONSHIPS)[number];

/** The one relationship that is ⛔ not KNOWN — it forecloses a correction (`-237` cl.2). */
export const UNKNOWN_NOMINEE_RELATIONSHIP = 'other' satisfies NomineeRelationshipCode;

/** Is `relationship` a KNOWN relationship — one of the fifteen, and ⛔ not `other`? */
export function isKnownNomineeRelationship(relationship: string | null): boolean {
  return (
    relationship !== null &&
    relationship !== UNKNOWN_NOMINEE_RELATIONSHIP &&
    (NOMINEE_RELATIONSHIPS as readonly string[]).includes(relationship)
  );
}
