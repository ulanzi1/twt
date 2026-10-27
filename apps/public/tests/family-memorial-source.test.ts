// Story 11b.4a (AC3, Trap 8) — ⛔ no `set:html` in any `apps/public` file this story touches: the family's words reach the DOM
// ONLY through Astro's escaping `{}` interpolation. A SOURCE scan (comments stripped — the files DESCRIBE the rule they keep),
// whose file list is asserted NON-EMPTY and to include the component, so it can ⛔ never pass over nothing. And (review R12) the
// component ASKS THE MATRIX about each of the memorial's three ids — `.astro` files cannot be rendered by this Vitest, so
// the call sites are pinned by source and the decision behind them by `family-memorial-gating.test.ts`.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { SAHYOG_VIVRAN_FAMILY_MEMORIAL_FIELD_IDS } from '../src/lib/surface-fields.js';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Every `apps/public` file Story 11b.4a touches on the render path. */
const TOUCHED = [
  'src/components/FamilyMemorial.astro',
  'src/pages/sahyog-vivran/[driveToken].astro',
  'src/pages/sahyog-vivran/[driveToken]/memorial-photo.ts',
  'src/lib/sahyog-vivran.server.ts',
  'src/lib/sahyog-vivran-render.ts',
  'src/lib/surface-fields.ts',
  'src/lib/family-memorial.ts',
];

/** Strip `//` and block comments, and Astro's `{/* … *\/}` / HTML comments — prose is ⛔ not code. */
function code(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

describe('⛔ no `set:html` on the family memorial\'s render path (AC3, Trap 8)', () => {
  it('the scanned list is NON-EMPTY and includes `FamilyMemorial.astro` (⛔ never a vacuous pass)', () => {
    expect(TOUCHED.length).toBeGreaterThan(0);
    expect(TOUCHED).toContain('src/components/FamilyMemorial.astro');
  });

  it('the list is COMPLETE — every file under `src/` that names the memorial is on it (⛔ a hand-kept list that went stale)', () => {
    const naming = (readdirSync(join(appRoot, 'src'), { recursive: true }) as string[])
      .filter((rel) => /\.(astro|ts)$/.test(rel))
      .map((rel) => `src/${rel.split('\\').join('/')}`)
      .filter((rel) => /familyMemorial|FamilyMemorial|family_memorial|memorial-photo/.test(code(readFileSync(join(appRoot, rel), 'utf-8'))));
    expect(naming.length).toBeGreaterThan(0);
    expect(naming.filter((rel) => !TOUCHED.includes(rel))).toEqual([]);
  });

  it.each(TOUCHED)('%s carries ⛔ no `set:html` directive and ⛔ no `innerHTML`', (rel) => {
    const src = code(readFileSync(join(appRoot, rel), 'utf-8'));
    expect(src.length).toBeGreaterThan(0);
    expect(src).not.toMatch(/\bset:html\b/);
    expect(src).not.toMatch(/\binnerHTML\b/);
  });

  it('the component renders each paragraph through `{}` interpolation inside `<p dir="auto">` with `white-space: pre-wrap`, ⛔ no `lang` attribute', () => {
    const src = code(readFileSync(join(appRoot, 'src/components/FamilyMemorial.astro'), 'utf-8'));
    expect(src).toMatch(/<p dir="auto"[^>]*style="white-space: pre-wrap;"[^>]*>\{paragraph\}<\/p>/);
    expect(src).not.toMatch(/<p[^>]*\blang=/);
  });

  // ── R12 — the matrix gating (AC3: ⛔ never markup that bypasses the matrix, which would make the three ids decorative) ──────────
  it('the component asks `visibilityOf` for ALL THREE ids at `public`, and renders only what `planFamilyMemorial` allows', () => {
    const src = code(readFileSync(join(appRoot, 'src/components/FamilyMemorial.astro'), 'utf-8'));
    // ⭐ The ids are the SURFACE'S declared ones — a decoy id (or a deleted call) fails here, not on a live page.
    const ids = ['family_memorial_photo', 'family_memorial_photo_alt_text', 'family_memorial_words'];
    expect(Object.values(SAHYOG_VIVRAN_FAMILY_MEMORIAL_FIELD_IDS).sort()).toEqual(ids);
    for (const id of ids) {
      expect(src, id).toContain(`visibilityOf('sahyog-vivran', '${id}', 'public').visible`);
    }
    expect(src).toContain('planFamilyMemorial(memorial,');
    // ⭐ …and EACH verdict feeds ITS OWN part of the plan (review RR6): the words' verdict is `words:`, the photo's is `photo:`, the
    // description's is `altText:`. Pinning only that the three calls exist let a swap — or a decoy call whose result is dropped —
    // pass here AND in the pure gating test, so neither could fail on the one mistake the gating exists to prevent.
    const feeds = { words: 'family_memorial_words', photo: 'family_memorial_photo', altText: 'family_memorial_photo_alt_text' } as const;
    // …and ONLY inside the object handed to `planFamilyMemorial(...)` — a decoy literal elsewhere in the file would satisfy a file-wide match.
    const planArgs = /planFamilyMemorial\(memorial,\s*\{([\s\S]*?)\}\s*\)/.exec(src)?.[1];
    expect(planArgs, 'the object passed to planFamilyMemorial').toBeTruthy();
    for (const [key, id] of Object.entries(feeds)) {
      expect(planArgs, `${key} ← ${id}`).toMatch(new RegExp(`\\b${key}:\\s*visibilityOf\\('sahyog-vivran',\\s*'${id}',\\s*'public'\\)\\.visible`));
    }
    // …and the section, the figure and the `alt` are drawn from the plan — ⛔ not from a constant or a raw prop.
    expect(src).toMatch(/\{plan\.section && \(\s*<section/);
    expect(src).toMatch(/\{plan\.photo && \(\s*<figure/);
    expect(src).toContain('alt={plan.alt}');
  });

  it('the scanner itself catches a planted `set:html` (positive control)', () => {
    expect(code('<p set:html={x} />')).toMatch(/\bset:html\b/);
    expect(code('{/* set:html is forbidden */}<p>{x}</p>')).not.toMatch(/\bset:html\b/);
  });
});
