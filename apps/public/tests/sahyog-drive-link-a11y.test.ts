// The `/sahyog` DRIVE LINK — its markup and its accessible name (Story 11b.10, Task 5; AC3).
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ⭐⭐ WHY THIS FILE EXISTS, AND WHAT IT NARROWS
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Story 11b.3a's review DEFERRED family-13 Astro `role` / `aria-label` test coverage to **11b.8**
// (sprint-status ledger, 2026-09-03). ⭐ THIS FILE **NARROWS** THAT DEFERRAL — it does ⛔ not close
// it: it covers exactly ONE affordance, the drive link 11b.10 introduces, and ⛔ nothing else on any
// Astro surface. ⚠ 11b.8 still owes the general family-13 Astro sweep, and ⛔ this file must not be
// cited as having discharged it ([[feedback_closure_language_precision]]).
//
// ⭐ The reason to narrow rather than defer is specific: 11b.10 is the story that ADDS the
// affordance. A deferred a11y test on an affordance that does not exist yet costs nothing; a
// deferred a11y test on one shipping in the same commit means the link's accessible name is
// UNCHECKED at the moment it goes live.
//
// ⚠ `.astro` components are not unit-testable in this repo, so this is the house SOURCE-SCAN
// pattern (`authenticated-fragment.test.ts`) — ⛔ not a render test. Its limitation is stated rather
// than glossed: it proves the markup and the wiring are PRESENT in real template code, ⛔ not that a
// screen reader announces a particular string. The STRING itself is behaviourally asserted in
// `sahyog-render.test.ts` (the presenter builds it and the drive code is interpolated into it), so
// the two halves together cover the claim the AC makes.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
/** apps/public/tests → the app root is one level up; the repo root is three. */
const appRoot = join(here, '..');
const repoRoot = join(here, '../../..');
const read = (rel: string): string => readFileSync(join(appRoot, rel), 'utf8');

/**
 * Strip Astro/JS comments so a commented-out call site cannot satisfy a presence assertion.
 *
 * ⚠ THE HOUSE FINDING (2026-07-25), inherited rather than rediscovered: a raw `includes()` happily
 * matched a literal inside a comment — the exact false negative these scans exist to rule out. This
 * page is densely commented, so stripping is load-bearing here.
 */
const template = (src: string): string =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '') // {/* astro template comments */}
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const PAGE = template(read('src/pages/sahyog.astro'));

describe('⭐ the drive link is a REAL anchor with an accessible name (AC3, family 13)', () => {
  it('renders an `<a href>` — ⛔ never a JS-dependent button', () => {
    // ⛔ This page is server-rendered and its links must work with no client script, exactly like
    // the pagination controls. A `<button onclick>` would be a link that fails for the visitors
    // most likely to be on a constrained device.
    expect(PAGE).toMatch(/<a href=\{col\.hrefOf\(row\)\}/);
    expect(PAGE).not.toMatch(/<button[^>]*hrefOf/);
  });

  it('⛔ carries an `aria-label` from the row — ⛔ never a bare "click here"', () => {
    expect(PAGE).toContain('aria-label={col.a11yOf?.(row)}');
  });

  it('⭐ the accessible name is built from the DRIVE CODE — ⛔ never a person’s name', () => {
    // ⛔⛔ THE DEFECT THIS FORBIDS: `deceasedMemberName` is Tier-1, consent-gated and `null` for any
    // unconsented family ⇒ an accessible name built from it would VANISH on exactly the rows that
    // still need one, and a screen-reader user would hear N identical destinations.
    expect(PAGE).toContain("driveLinkA11y: (poolCanonicalIdentifier: string) =>");
    expect(PAGE).toContain("tr('link.view_drive_a11y', { code: poolCanonicalIdentifier })");
    expect(PAGE).not.toMatch(/driveLinkA11y[\s\S]{0,200}deceasedMemberName/);
  });

  it('⛔ the value STILL goes through <MatrixField> inside the anchor — in ⭐ BOTH tables', () => {
    // ⭐ `getVisibility()` must remain the ONLY thing deciding what appears. Wrapping the cell in an
    // anchor must ⛔ not become an excuse to interpolate the value directly — the house rule this
    // page's own header states in terms.
    //
    // ⚠⛔ **EVERY OCCURRENCE, ⛔ NOT THE FIRST** (review 2026-09-04). The anchor block is duplicated
    // VERBATIM in the ACTIVE table and the ARCHIVE table, and this assertion previously sliced from
    // `indexOf(...)` ⇒ it inspected only the first. A regression stripping `aria-label` or the
    // `<MatrixField>` wrapper from the ARCHIVE table — the LARGER of the two, and the one carrying
    // the permanent record — would have been caught by ⛔ nothing in this file.
    const ANCHOR = '<a href={col.hrefOf(row)}';
    const blocks: string[] = [];
    for (let i = PAGE.indexOf(ANCHOR); i !== -1; i = PAGE.indexOf(ANCHOR, i + 1)) {
      blocks.push(PAGE.slice(i, i + 400));
    }
    // ⛔ Pinned: the page has TWO drive tables. If a third is added, this fails and its author must
    // decide deliberately whether the new one carries the same accessible anchor.
    expect(blocks).toHaveLength(2);
    for (const block of blocks) {
      expect(block).toContain('<MatrixField');
      expect(block).toContain('surface="sahyog-drive"');
      expect(block).toContain('aria-label={col.a11yOf?.(row)}');
    }
  });

  it('⭐ the copy keys exist in BOTH locales — ⛔ `t()` THROWS on a miss', () => {
    // ⚠ `t()` defaults to the `common` namespace and THROWS on a missing key
    // ([[project_missed_cycle_visibility_substrate]]) — the `{{max}}` vs `{max}` defect that made
    // `/members` throw on EVERY request at 11a.2 was exactly this shape, and no test caught it
    // because every test bypassed `t()`. ⇒ a missing Hindi key here is a 500 on the index, ⛔ not a
    // cosmetic fallback.
    for (const locale of ['en', 'hi'] as const) {
      const copy = JSON.parse(
        readFileSync(join(repoRoot, `packages/i18n/locales/${locale}/sahyog-drive.json`), 'utf8'),
      ) as Record<string, string>;
      expect(copy['table.col.open']).toBeTruthy();
      expect(copy['link.view_drive']).toBeTruthy();
      // ⛔ The a11y string must actually INTERPOLATE the code — a translation that dropped `{code}`
      // would announce N identical destinations while every other check stayed green.
      expect(copy['link.view_drive_a11y']).toContain('{code}');
      // ⭐⭐ WCAG 2.5.3 **LABEL IN NAME** (review 2026-09-04, family 13). An `aria-label` OVERRIDES
      // the visible text, so the accessible name must CONTAIN that visible text — otherwise a
      // speech-input user who says what they can SEE ("View drive" / "अभियान देखें") cannot
      // activate the link, because the name the AT matches against does not contain those words.
      // ⚠⛔ THIS FAILED ON BOTH LOCALES WHEN WRITTEN: en was *"View the full details of drive
      // {code}"* and hi *"अभियान {code} का पूरा विवरण देखें"* — each contains the visible words but
      // ⛔ not CONTIGUOUSLY, which is what 2.5.3 requires. ⇒ the a11y string is now a SUPERSET that
      // starts with the visible label. ⛔ Do not "improve" it back into a fluent sentence that
      // reorders those words.
      expect(copy['link.view_drive_a11y']).toContain(copy['link.view_drive'] as string);
    }
  });
});
