// A WITHHELD staff note — Story 6.27b code review round 2 (X2), for AC7's D1 B + V1 A + X1 A rule: a reader whose OWN
// ground visit on a claim is pending (or whose hide check could not run) is ⛔ shown that claim's staff notes.
//
// ⭐ ONE explicit representation, so a withheld note ⛔ never collapses into "no note" (6.18: *"⛔ never a silent empty
// string, which would read as 'they gave no reason'"*; 6.13: the R9 rationale is *"never blank-collapsed"*):
//   · a note field that is ALREADY a `state` union (`StaffNoteDto`, `ReadableNote`, `ReadableErasableNote`) gains the
//     variant `{ state: 'withheld', reason }`;
//   · a note field that is a plain string / nullable string keeps its text EMPTY (`''`, or `null` where the field is
//     nullable) and carries a REQUIRED sibling `<field>_withheld` (snake_case contracts) / `<field>Withheld` (camelCase
//     contracts) — `null` ⇔ the note is ⛔ withheld (the text field then means what it always meant), else the reason.
// The reason lets the UI word it without lying:
//   · `own_visit`    — the reader's own ground visit on this claim is pending (UNIFORM for that reader on that claim — ⛔
//                      a per-note signal: every staff note there is withheld, whatever it says);
//   · `check_failed` — the hide check itself FAILED (UNIFORM across the surface, for EVERY reader — render the existing
//                      "could not be shown just now" words, ⛔ "hidden").
// ⛔ Never a placeholder that names the neighbours, and ⛔ never the note.

import { z } from 'zod';

export const NOTE_WITHHELD_REASONS = ['own_visit', 'check_failed'] as const;
export const NoteWithheldReason = z.enum(NOTE_WITHHELD_REASONS);
export type NoteWithheldReason = z.output<typeof NoteWithheldReason>;

/** The `state` union variant (see the header). */
export const WithheldNote = z.object({ state: z.literal('withheld'), reason: NoteWithheldReason }).strict();
export type WithheldNote = z.output<typeof WithheldNote>;

/** The plain-string sibling `<field>_withheld` / `<field>Withheld` — REQUIRED, `null` ⇔ ⛔ withheld (see the header). */
export const NoteWithheldFlag = NoteWithheldReason.nullable();
export type NoteWithheldFlag = z.output<typeof NoteWithheldFlag>;

/**
 * ⭐ Story 6.27b code review round 2 (Y5 (a)) — a Pattern-B DTO's text field and its sibling are PAIRED: a set flag ⇒ the
 * text is EMPTY — `''` on a non-nullable field, `null` on a nullable one — so a withheld note can ⛔ ride beside its words.
 * Use as `.superRefine(refineWithheldPair('rationale', 'rationale_withheld', ''))` (after `.strict()`).
 */
export function refineWithheldPair<K extends string, F extends string>(text: K, flag: F, empty: '' | null) {
  return (v: Record<K, unknown> & Record<F, unknown>, ctx: z.RefinementCtx): void => {
    if (v[flag] !== null && v[text] !== empty) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [text],
        message: `${text} must be ${empty === null ? 'null' : "''"} when ${flag} is set`,
      });
    }
  };
}
