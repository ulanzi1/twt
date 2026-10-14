// `<WithheldNote>` — ONE rendering of a staff note WITHHELD from this reader (Story 6.27b code review round 2, X2;
// `@twt/contracts` `withheld-note.ts`). Every surface that shows a staff note — a `state` union's `withheld` variant or a
// plain field's `<field>_withheld` / `<field>Withheld` sibling — renders THIS, so the words can ⛔ never drift and a
// withheld note ⛔ never collapses into an empty note, a blank or a dash (which would read as "they wrote nothing").
//   · `own_visit`    — the reader's own ground visit on the claim is pending: ONE neutral line (⛔ a word about the
//                      neighbours or the note);
//   · `check_failed` — the hide check failed: the existing could-not-be-shown words.
// Plain text (family 13): ⛔ no role, ⛔ no live region — it is part of the record it sits in. English only (F22).

import type { NoteWithheldReason } from '@twt/contracts';
import type { ReactElement } from 'react';

import { verifierConsoleEn as t } from './i18n-en.js';

/**
 * Which claim the note belongs to (review Y4): `this_claim` — the claim on screen (the default); `that_claim` — a
 * CROSS-CLAIM list's row (the console's recent precedents, the R9 votes-by-trustee transcript), where "this claim" would
 * name the wrong one.
 */
export type WithheldNoteScope = 'this_claim' | 'that_claim';

/** The words for a withheld note — for a surface that needs a STRING (an `alt`, a prefilled field it must skip). */
export function withheldNoteWords(reason: NoteWithheldReason, scope: WithheldNoteScope = 'this_claim'): string {
  if (reason === 'own_visit' && scope === 'that_claim') return t.noteWithheld.own_visit_other_claim;
  return t.noteWithheld[reason];
}

export function WithheldNote({
  reason,
  scope = 'this_claim',
  testId = 'note-withheld',
}: {
  reason: NoteWithheldReason;
  scope?: WithheldNoteScope;
  testId?: string;
}): ReactElement {
  return (
    <span className="italic" data-testid={testId}>
      {withheldNoteWords(reason, scope)}
    </span>
  );
}
