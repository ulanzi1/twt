// Story 11b.4a (AC3; review R12 / R22) — what `FamilyMemorial.astro` DRAWS is decided by the pure `planFamilyMemorial`, and every
// matrix verdict is honoured there: the section only while `family_memorial_words` is visible at `public`, the figure only while
// `family_memorial_photo` is, the description only while `family_memorial_photo_alt_text` is — and a section with NOTHING in it is
// ⛔ not drawn (Trap 9: no heading over an empty body).
//
// ⚠ PLANTED, and it HAS to be: all three ids are tier `public` in the committed matrix, so asking the real matrix for a hidden
// verdict is VACUOUS (the built-server spec cannot reach the negative leg either). The TIER is planted on a copy of the matrix and
// the verdicts come from the SAME `getVisibility` engine `visibilityOf` delegates to — ⛔ the rule is not restated here. That the
// component asks for exactly these three is pinned by source in `family-memorial-source.test.ts`.

import { getVisibility, type PublicVsPrivateMatrix } from '@twt/contracts';
import { describe, expect, it } from 'vitest';

import { t } from '@twt/i18n';

import { kinshipLatticeRows, planFamilyMemorial, type FamilyMemorialVisibility } from '../src/lib/family-memorial.js';
import { RUNTIME_MATRIX, visibilityOf } from '../src/lib/matrix.server.js';
import type { SahyogVivranFamilyMemorialView } from '../src/lib/surface-fields.js';

const WORDS = 'family_memorial_words';
const PHOTO = 'family_memorial_photo';
const ALT = 'family_memorial_photo_alt_text';
const KINSHIP = 'family_memorial_kinship';

/** The three verdicts a page would get from a matrix where `hiddenId` (if any) is raised above the public ceiling. */
function verdicts(hiddenId: string | null): FamilyMemorialVisibility {
  const matrix: PublicVsPrivateMatrix = {
    ...RUNTIME_MATRIX,
    surfaces: RUNTIME_MATRIX.surfaces.map((s) =>
      s.id !== 'sahyog-vivran'
        ? s
        : { ...s, fields: s.fields.map((f) => (f.id === hiddenId ? { ...f, tier: 'authenticated_member' as const } : f)) },
    ),
  };
  const ask = (id: string) => getVisibility(matrix, 'sahyog-vivran', id, 'public');
  expect(ask(hiddenId ?? WORDS).visible, 'the planted verdict is ABOVE the ceiling (else the leg proves nothing)').toBe(hiddenId === null);
  if (hiddenId !== null) expect(ask(hiddenId).reason).toBe('above_viewer_ceiling');
  return { words: ask(WORDS).visible, photo: ask(PHOTO).visible, altText: ask(ALT).visible, kinship: ask(KINSHIP).visible };
}

const view = (over: Partial<SahyogVivranFamilyMemorialView> = {}): SahyogVivranFamilyMemorialView => ({
  familyMemorialWords: ['He was kind.', 'We miss him.'],
  familyMemorialPhoto: true,
  familyMemorialPhotoAltText: 'Papa in the garden',
  familyMemorialKinship: [{ relation: 'son', names: ['Amit'] }],
  ...over,
});

describe('planFamilyMemorial — every matrix verdict is honoured (AC3, R12)', () => {
  it('non-vacuity — the committed matrix shows all three ids at `public`, and then the whole memorial is drawn', () => {
    for (const id of [WORDS, PHOTO, ALT, KINSHIP]) expect(visibilityOf('sahyog-vivran', id, 'public').visible, id).toBe(true);
    expect(planFamilyMemorial(view(), verdicts(null))).toEqual({ section: true, photo: true, alt: 'Papa in the garden', kinship: true });
  });

  it('`family_memorial_words` above the ceiling ⇒ NOTHING is drawn — the figure lives INSIDE the section, which is withheld', () => {
    expect(planFamilyMemorial(view(), verdicts(WORDS)).section).toBe(false);
  });

  it('`family_memorial_photo` above the ceiling ⇒ the words are drawn, ⛔ the figure is not', () => {
    expect(planFamilyMemorial(view(), verdicts(PHOTO))).toMatchObject({ section: true, photo: false });
  });

  it('`family_memorial_photo_alt_text` above the ceiling ⇒ the figure is drawn with an EMPTY `alt` — ⛔ never a synthesised one', () => {
    expect(planFamilyMemorial(view(), verdicts(ALT))).toEqual({ section: true, photo: true, alt: '', kinship: true });
  });

  it('no photo in the memorial ⇒ no figure, whatever the matrix says', () => {
    const plan = planFamilyMemorial(view({ familyMemorialPhoto: false, familyMemorialPhotoAltText: null }), verdicts(null));
    expect(plan).toEqual({ section: true, photo: false, alt: '', kinship: true });
  });
});

describe('planFamilyMemorial — a section with NOTHING in it is not drawn (R22, Trap 9)', () => {
  const noWords = { familyMemorialWords: [] as string[] };

  it('no words and the photo HIDDEN by the matrix ⇒ NOTHING at all (⛔ no heading over an empty body)', () => {
    expect(planFamilyMemorial(view(noWords), verdicts(PHOTO))).toMatchObject({ section: false, photo: false });
  });

  it('no words and no photo ⇒ NOTHING at all', () => {
    expect(planFamilyMemorial(view({ ...noWords, familyMemorialPhoto: false, familyMemorialPhotoAltText: null }), verdicts(null)).section).toBe(false);
  });

  it('non-vacuity — no words but a photo the matrix shows ⇒ the section IS drawn, with the figure alone', () => {
    expect(planFamilyMemorial(view(noWords), verdicts(null))).toEqual({ section: true, photo: true, alt: 'Papa in the garden', kinship: true });
  });

  it('non-vacuity — words and the photo hidden ⇒ the section is drawn with the words alone', () => {
    expect(planFamilyMemorial(view(), verdicts(PHOTO)).section).toBe(true);
  });
});

// Story 11b.5a (KL10) — `<KinshipLattice>` is drawn iff the section is drawn AND `family_memorial_kinship` is visible AND ≥ 1 row.
describe('planFamilyMemorial — the family list\'s verdict (Story 11b.5a)', () => {
  it('`family_memorial_kinship` above the ceiling ⇒ the words and photo are drawn, ⛔ the lattice is not', () => {
    expect(planFamilyMemorial(view(), verdicts(KINSHIP))).toMatchObject({ section: true, photo: true, kinship: false });
  });

  it('⛔ rows (no list, or every entry left out) ⇒ ⛔ lattice — ⛔ heading, ⛔ empty <dl>', () => {
    expect(planFamilyMemorial(view({ familyMemorialKinship: [] }), verdicts(null)).kinship).toBe(false);
  });

  it('the section withheld ⇒ ⛔ lattice either (it lives INSIDE the section)', () => {
    expect(planFamilyMemorial(view(), verdicts(WORDS)).kinship).toBe(false);
    expect(planFamilyMemorial(view({ familyMemorialWords: [], familyMemorialPhoto: false, familyMemorialPhotoAltText: null }), verdicts(null)).kinship).toBe(false);
  });

  it('kinshipLatticeRows: labels through the ONE home (English plural for two or more), names joined by ", " AS GIVEN', () => {
    const tm = (key: string) => t(key, undefined, { locale: 'en', namespace: 'memorial' });
    expect(
      kinshipLatticeRows(
        [
          { relation: 'wife', names: ['Sunita Devi'] },
          { relation: 'son', names: ['Amit', ' Rahul '] },
        ],
        tm,
      ),
    ).toEqual([
      { label: 'Wife', names: 'Sunita Devi' },
      { label: 'Sons', names: 'Amit,  Rahul ' },
    ]);
    const hi = (key: string) => t(key, undefined, { locale: 'hi', namespace: 'memorial' });
    expect(kinshipLatticeRows([{ relation: 'son', names: ['अमित', 'राहुल'] }], hi)).toEqual([{ label: 'पुत्र', names: 'अमित, राहुल' }]);
  });
});
