// packages/contracts/src/memorial/kinship.ts
//
// The family list (Story 11b.5a — `#decision-2026-10-31-428` PQ1 A, Trustee-ratified: relation + name, the fourteen relations,
// children on the guardian's declaration (`-426`), used for NOTHING else; build decisions `-431` KL3–KL6, KL10, KL15).
// Pure and browser-safe (⛔ no `@twt/domain`, ⛔ no `@twt/ui`): the API, the mobile preview and the admin all import it, and
// `apps/public` receives the rows it produces already grouped (11b.5 MV3).
//
// ⭐ ONE schema — {@link MemorialKinshipListSchema} — parses the list at Send AND on every read (public, member view, review,
// take-down). A stricter read schema would drop a whole memorial under KL10's one decrypt rule (a schema failure ⇒ the WHOLE
// memorial is `null`), so the read schema is ⛔ never tighter than any Send-time schema ever was: a later narrowing (a lower cap,
// a relation removed) FILTERS entries at render, ⛔ never by failing the parse.
//
// ⭐ Names are kept EXACTLY as typed — ⛔ no trim, ⛔ no normalisation, ⛔ no initials ([[feedback_never_mangle_member_names]]).
// Each caller that renders a name isolates its direction controls itself (`isolateMemorialBidi`, per name — KL10).

import { z } from 'zod';

import {
  MEMORIAL_KINSHIP_MAX_ENTRIES,
  MEMORIAL_KINSHIP_NAME_MAX_CODE_POINTS,
  isMemorialTextBlank,
  memorialCodePointLength,
} from './text-classes.js';
import { MEMORIAL_KINSHIP_RELATIONS, MEMORIAL_REVIEW_REASONS, type MemorialKinshipRelation } from './vocab.js';

export const MemorialKinshipRelationSchema = z.enum(MEMORIAL_KINSHIP_RELATIONS);

/**
 * One entry (KL4 + KL15): a relation, ONE person's name (1–200 code points on the raw string, ⛔ blank by
 * {@link isMemorialTextBlank}), and — only when the family ticked it — `inPhoto: true` (`false` is refused: absent ≡ not ticked).
 * `.strict()`: any other key is refused.
 */
export const MemorialKinshipEntrySchema = z
  .object({
    relation: MemorialKinshipRelationSchema,
    name: z
      .string()
      .refine((n) => !isMemorialTextBlank(n), { message: 'blank' })
      .refine((n) => memorialCodePointLength(n) <= MEMORIAL_KINSHIP_NAME_MAX_CODE_POINTS, { message: 'too_long' }),
    inPhoto: z.literal(true).optional(),
  })
  .strict();
export type MemorialKinshipEntry = z.output<typeof MemorialKinshipEntrySchema>;

/**
 * The whole list — 1 to 20 entries. ⛔ An empty array is refused: "no list" is the ABSENCE of the Send part (stored `NULL`),
 * so a `[]` is a malformed client, ⛔ never coerced to `NULL` (KL8).
 */
export const MemorialKinshipListSchema = z.array(MemorialKinshipEntrySchema).min(1).max(MEMORIAL_KINSHIP_MAX_ENTRIES);

/**
 * An entry as a RESPONSE carries it (the member view, the review detail). ⛔ No `.refine` / `.max()` on an output (the response
 * is PARSED by `serializerCompiler` — a stored value past a cap would turn a read into a 500; `dto.ts`'s discipline). The API
 * has already parsed the decrypted list with {@link MemorialKinshipListSchema}.
 */
export const MemorialKinshipEntryOutput = z
  .object({
    relation: MemorialKinshipRelationSchema,
    name: z.string(),
    inPhoto: z.literal(true).optional(),
  })
  .strict();

/** One entry the Trust left out (KL6): the entry's index in the decrypted list + one of the four reasons. ⛔ No name. */
export const MemorialKinshipOmissionOutput = z
  .object({ index: z.number().int(), reason: z.enum(MEMORIAL_REVIEW_REASONS) })
  .strict();

/** As the reviewer posts it. ⛔ No text — an index only (the `.strict()` is the no-edit proof — AC5). */
export const MemorialKinshipOmissionInput = z
  .object({ index: z.number().int().min(0), reason: z.enum(MEMORIAL_REVIEW_REASONS) })
  .strict();

/**
 * A grouped row as an ADMIN response carries it (the take-down's `shown.kinship` — KL11): the same finished rows the public page
 * gets, names already bidi-isolated by the API. ⛔ No index, ⛔ no reason, ⛔ no `inPhoto`.
 */
export const MemorialKinshipRowOutput = z
  .object({ relation: MemorialKinshipRelationSchema, names: z.array(z.string()) })
  .strict();

/** One row as the public page draws it: a relation and the names under it, in the family's order. */
export interface MemorialKinshipRow {
  readonly relation: MemorialKinshipRelation;
  readonly names: readonly string[];
}

/**
 * ⭐ THE grouping helper (KL9 / KL10 / KL11 — ONE implementation for the public wire, the take-down's `shown` block and the
 * mobile preview): the entries NOT left out, grouped by relation in the fourteen's DISPLAY order, names in the family's own
 * order within a relation. A relation with ⛔ no surviving name yields ⛔ no row (⛔ no empty row, ⛔ no count — a left-out
 * entry leaves no trace: `-411` item 3's rule, PC1 A). `inPhoto` is DROPPED (KL15 — ⛔ never public). Pure; total.
 */
export function groupMemorialKinship(
  entries: readonly { readonly relation: MemorialKinshipRelation; readonly name: string }[],
  leftOutIndexes: readonly number[] = [],
): MemorialKinshipRow[] {
  const leftOut = new Set(leftOutIndexes);
  const byRelation = new Map<MemorialKinshipRelation, string[]>();
  entries.forEach((e, i) => {
    if (leftOut.has(i)) return;
    const names = byRelation.get(e.relation) ?? [];
    names.push(e.name);
    byRelation.set(e.relation, names);
  });
  const rows: MemorialKinshipRow[] = [];
  for (const relation of MEMORIAL_KINSHIP_RELATIONS) {
    const names = byRelation.get(relation);
    if (names !== undefined && names.length > 0) rows.push({ relation, names });
  }
  return rows;
}

/** The relations whose English label has a plural (copy 5.2) — Wife / Husband / Father / Mother need none. */
const KINSHIP_PLURAL_RELATIONS: ReadonlySet<MemorialKinshipRelation> = new Set<MemorialKinshipRelation>([
  'son',
  'daughter',
  'brother',
  'sister',
  'sons_son',
  'daughters_son',
  'sons_daughter',
  'daughters_daughter',
  'daughter_in_law',
  'son_in_law',
]);

/**
 * The `memorial` namespace key of a row's relation label (KL9 — the ONE home): `kinship.<code>`, or `kinship.<code>_plural`
 * when the row holds two or more names and the relation has a plural (copy 5.2 — a masculine Hindi plural key carries the same
 * word as the singular: *पुत्र · अमित, राहुल*; the five feminine ones their plural form: *पुत्रियाँ · सुनीता, मीरा* — round 3, DN1).
 */
export function memorialKinshipLabelKey(relation: MemorialKinshipRelation, nameCount: number): string {
  return nameCount >= 2 && KINSHIP_PLURAL_RELATIONS.has(relation) ? `kinship.${relation}_plural` : `kinship.${relation}`;
}

/**
 * Every `kinship.*` key the namespace must hold (the parity / copy tests walk it): the lattice's heading, the fourteen relation
 * labels and the ten plurals. `packages/contracts/tests/memorial-kinship.test.ts` walks it against the en and hi `memorial.json`.
 */
export const MEMORIAL_KINSHIP_LABEL_KEYS: readonly string[] = [
  'kinship.heading',
  ...MEMORIAL_KINSHIP_RELATIONS.map((r) => `kinship.${r}`),
  ...MEMORIAL_KINSHIP_RELATIONS.filter((r) => KINSHIP_PLURAL_RELATIONS.has(r)).map((r) => `kinship.${r}_plural`),
];
