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
  // Story 11b.5 (Trap 3): added BY HAND — it names no memorial, so the completeness scan below cannot find it, but it renders the
  // family's approved description into `alt`, so the no-`set:html` / no-`innerHTML` property must cover it.
  'src/components/PortraitFrame.astro',
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
    // Story 11b.5 (Trap 3): the frame names no memorial, so the completeness scan cannot find it — pinned here instead.
    expect(TOUCHED).toContain('src/components/PortraitFrame.astro');
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
    // Story 11b.5 (Trap 2): re-pinned — MV5's paragraph spacing joins the same `style`, AFTER `white-space: pre-wrap;`.
    expect(src).toMatch(/<p dir="auto"[^>]*style="white-space: pre-wrap;[^"]*"[^>]*>\{paragraph\}<\/p>/);
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

// ── Story 11b.5 (AC4; `2026-10-29-420` MV5 (a)) — the memorial section is STYLED, with spacing only ─────────────────────────────────
// `apps/public` has ⛔ no Tailwind pipeline (Trap 4: the build emits ⛔ no rule for `.mt-6`, `.rounded`, `.text-sm`), so a utility
// class there renders NOTHING. The section's spacing is a static inline `style` holding token variables; ⛔ no card (⛔ no border,
// radius or padding — UX "ruled rhythm over cards"), ⛔ no type size, ⛔ no `style` on the `<h2>`. The microcopy FM-14 colour gate does
// ⛔ not scan `apps/public` `.astro`, so the literal allow-list below is the only guard against a hex or a named colour.
const STYLED = ['src/components/FamilyMemorial.astro', 'src/components/PortraitFrame.astro'] as const;

/** The only literals a memorial `style` may hold; every colour, border width and spacing other than these is a `var(--…)`. */
const ALLOWED_LITERALS = ['4 / 5', 'pre-wrap', 'contain', 'solid', '20rem', '100%', '6pt', '0'];

function styles(rel: string): string[] {
  const src = code(readFileSync(join(appRoot, rel), 'utf-8'));
  return [...src.matchAll(/\sstyle="([^"]*)"/g)].map((m) => m[1] as string);
}

/** What is left of a declaration's value once its token references and the allowed literals are removed — `''` when clean. */
function residue(value: string): string {
  let rest = value.replace(/var\(--[a-z0-9-]+\)/g, ' ');
  for (const lit of ALLOWED_LITERALS) {
    rest = rest.replace(new RegExp(`(^|\\s)${lit.replace(/[.*+?^${}()|[\]\\/%]/g, '\\$&')}(?=\\s|$)`, 'g'), ' ');
  }
  return rest.trim();
}

describe('the memorial section is styled with tokens, spacing only (AC4, MV5 (a))', () => {
  it.each(STYLED)('%s carries ⛔ no `class=` attribute (a utility class renders nothing on this surface)', (rel) => {
    const src = code(readFileSync(join(appRoot, rel), 'utf-8'));
    expect(src).not.toMatch(/\sclass=/);
  });

  it('FamilyMemorial.astro holds EXACTLY the three spacing strings, and its `<h2>` carries ⛔ no style', () => {
    const src = code(readFileSync(join(appRoot, 'src/components/FamilyMemorial.astro'), 'utf-8'));
    expect(src).toMatch(/<section aria-labelledby="sv-family-memorial-heading" style="margin: var\(--space-block\) 0 0;" data-field="family_memorial_words">/);
    expect(src).toMatch(/<figure style="margin: var\(--space-row\) 0 0;" data-field="family_memorial_photo">/);
    expect(src).toContain('<p dir="auto" style="white-space: pre-wrap; margin: var(--space-row) 0 0;">{paragraph}</p>');
    expect(src).toContain('<h2 id="sv-family-memorial-heading">{heading}</h2>');
    expect(styles('src/components/FamilyMemorial.astro')).toEqual([
      'margin: var(--space-block) 0 0;',
      'margin: var(--space-row) 0 0;',
      'white-space: pre-wrap; margin: var(--space-row) 0 0;',
    ]);
  });

  it('FamilyMemorial.astro composes `<PortraitFrame>` inside its own `<figure>` (the figure keeps the matrix id; the frame asks nothing)', () => {
    const src = code(readFileSync(join(appRoot, 'src/components/FamilyMemorial.astro'), 'utf-8'));
    expect(src).toContain("import PortraitFrame from './PortraitFrame.astro';");
    expect(src).toMatch(/<figure [^>]*data-field="family_memorial_photo">\s*<PortraitFrame src=\{photoSrc\} alt=\{plan\.alt\} \/>\s*<\/figure>/);
  });

  it.each(STYLED)('%s — every style value is a token or an allowed literal (⛔ no hex, ⛔ no rgb(, ⛔ no named colour), ⛔ no radius / font', (rel) => {
    const all = styles(rel);
    expect(all.length).toBeGreaterThan(0);
    for (const style of all) {
      for (const decl of style.split(';').map((d) => d.trim()).filter(Boolean)) {
        const [prop, ...value] = decl.split(':');
        expect(prop?.trim(), decl).not.toMatch(/^(border-radius|font-size|font-weight)$/);
        expect(residue(value.join(':')), decl).toBe('');
      }
    }
  });

  it('the allow-list check itself catches a planted literal colour, width and named colour (positive control)', () => {
    expect(residue(' 2px solid var(--color-ink-primary)')).toBe('2px');
    expect(residue(' var(--border-funeral-frame) solid #1a1a1a')).toBe('#1a1a1a');
    expect(residue(' black')).toBe('black');
    expect(residue(' var(--space-row) 0 0')).toBe('');
  });
});
