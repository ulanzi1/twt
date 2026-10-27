// The family memorial's RENDER DECISION — Story 11b.4a (AC3; review R12 / R22). `.astro` files are not unit-testable in this repo, so
// what `FamilyMemorial.astro` shows is decided HERE, as a pure value, and the component is a thin wrapper over it (the
// `sahyog-vivran-message-block.ts` precedent).
//
// ⭐ GATED ON THE MATRIX: the component passes in `visibilityOf('sahyog-vivran', <id>, 'public').visible` for each of the three
// ids, and every verdict is HONOURED here — ⛔ never markup that bypasses the matrix (it would make the ids decorative). The
// section renders only while `family_memorial_words` is visible, the figure only while `family_memorial_photo` is, and the
// description only while `family_memorial_photo_alt_text` is (`''` otherwise).
// ⭐ NO TRACE (Trap 9): a section with NOTHING in it is ⛔ not drawn — a heading over an empty body would be a visible gap where
// the matrix withheld the only content (words left out whole, photo hidden). `section: false` renders NOTHING at all.

import type { SahyogVivranFamilyMemorialView } from './surface-fields.js';

/** `visibilityOf('sahyog-vivran', <id>, 'public').visible` for the memorial's three classified fields. */
export interface FamilyMemorialVisibility {
  readonly words: boolean;
  readonly photo: boolean;
  readonly altText: boolean;
}

export interface FamilyMemorialPlan {
  /** Draw the section (its heading, figure and paragraphs) at all. */
  readonly section: boolean;
  /** Draw the figure inside it. */
  readonly photo: boolean;
  /** The `alt` of the photo: the family's description as approved, or `''` (withheld, or all of it left out). */
  readonly alt: string;
}

export function planFamilyMemorial(
  memorial: SahyogVivranFamilyMemorialView,
  visible: FamilyMemorialVisibility,
): FamilyMemorialPlan {
  const photo = memorial.familyMemorialPhoto && visible.photo;
  const hasContent = memorial.familyMemorialWords.length > 0 || photo;
  return {
    section: visible.words && hasContent,
    photo,
    alt: visible.altText ? (memorial.familyMemorialPhotoAltText ?? '') : '',
  };
}
