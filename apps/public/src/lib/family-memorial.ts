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
// ⭐ Story 11b.5a (KL10) — the family list (`<KinshipLattice>`) is drawn iff the section is drawn AND `family_memorial_kinship` is
// visible at `public` AND ≥ 1 row survives; otherwise ⛔ nothing (⛔ heading, ⛔ empty `<dl>`). (A list with ⛔ words is unreachable —
// `nothing_left` refuses leaving out every word.) Its labels come from the ONE home, `memorial.kinship.<code>` (English plurals for
// two or more names — `memorialKinshipLabelKey`); the names are joined by `, ` and rendered AS GIVEN (the API isolated each one).

import { memorialKinshipLabelKey } from '@twt/contracts';

import type { SahyogVivranFamilyMemorialView, SahyogVivranKinshipRow } from './surface-fields.js';

/** `visibilityOf('sahyog-vivran', <id>, 'public').visible` for the memorial's three classified fields. */
export interface FamilyMemorialVisibility {
  readonly words: boolean;
  readonly photo: boolean;
  readonly altText: boolean;
  /** Story 11b.5a — `family_memorial_kinship`. */
  readonly kinship: boolean;
}

export interface FamilyMemorialPlan {
  /** Draw the section (its heading, figure and paragraphs) at all. */
  readonly section: boolean;
  /** Draw the figure inside it. */
  readonly photo: boolean;
  /** The `alt` of the photo: the family's description as approved, or `''` (withheld, or all of it left out). */
  readonly alt: string;
  /** Story 11b.5a — draw `<KinshipLattice>` (after the words). */
  readonly kinship: boolean;
}

export function planFamilyMemorial(
  memorial: SahyogVivranFamilyMemorialView,
  visible: FamilyMemorialVisibility,
): FamilyMemorialPlan {
  const photo = memorial.familyMemorialPhoto && visible.photo;
  const hasContent = memorial.familyMemorialWords.length > 0 || photo;
  const section = visible.words && hasContent;
  return {
    section,
    photo,
    alt: visible.altText ? (memorial.familyMemorialPhotoAltText ?? '') : '',
    kinship: section && visible.kinship && memorial.familyMemorialKinship.length > 0,
  };
}

/** One `<dt>`/`<dd>` pair of `<KinshipLattice>`: the relation's label and the names, joined. */
export interface KinshipLatticeRow {
  readonly label: string;
  readonly names: string;
}

/**
 * The lattice's rows from the wire's grouped rows: each relation labelled through `translate` (the `memorial` namespace), names
 * joined by `, ` in the family's order. ⛔ Re-sorted, ⛔ trimmed, ⛔ abbreviated. A row with ⛔ name is dropped (defensive — the
 * wire's schema already refuses one).
 */
export function kinshipLatticeRows(
  rows: readonly SahyogVivranKinshipRow[],
  translate: (key: string) => string,
): KinshipLatticeRow[] {
  return rows
    .filter((r) => r.names.length > 0)
    .map((r) => ({ label: translate(memorialKinshipLabelKey(r.relation, r.names.length)), names: r.names.join(', ') }));
}
