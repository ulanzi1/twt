// Story 11b.5 (AC1; `2026-10-29-420` MV3 / MV4) — `<PortraitFrame>` is the Trust's one funeral frame: a DUMB primitive that takes
// `src` and `alt`, asks the matrix ⛔ nothing, and draws the UX FuneralFrame as nested wrappers (div → div → img), ⛔ never a
// `box-shadow` / `outline` ring (UX §FuneralFrame: "the pattern, not a typed atom"). `.astro` cannot be rendered by this Vitest
// (Vitest 2 vs Astro 6), so the markup is pinned by SOURCE (comments stripped) and the rendered page by the built-server spec
// (`integration/public-pages/family-memorial-render.spec.ts`).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Strip `//` and block comments, and Astro's `{/* … *\/}` / HTML comments — prose is ⛔ not code (copied from `family-memorial-source.test.ts`). */
function code(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

const raw = readFileSync(join(appRoot, 'src/components/PortraitFrame.astro'), 'utf-8');
const src = code(raw);
/** The template — everything after the closing frontmatter fence. */
const template = src.slice(src.indexOf('---', 3) + 3);

/** A `class` attribute in any form — `class="…"` and Astro's `class:list={…}` (Story 11b.5 code review, 2026-10-29: the guard used to name `classList`, which is ⛔ no Astro form, so `class:list` passed). */
const CLASS_ATTR = /(?<![\w-])class(?::list)?\s*=/i;

const OUTER = 'border: var(--border-funeral-frame) solid var(--color-ink-primary); padding: 6pt; max-width: 20rem;';
const INNER = 'aspect-ratio: 4 / 5; width: 100%;';
const IMAGE = 'width: 100%; height: 100%; object-fit: contain;';

describe('<PortraitFrame> — the funeral frame as nested wrappers (AC1)', () => {
  it('its props are exactly `{ src: string; alt: string }`', () => {
    expect(src).toMatch(/interface Props \{\s*src: string;\s*alt: string;\s*\}/);
    expect(src).toContain('const { src, alt } = Astro.props;');
  });

  it('renders div → div → img, in that order, with the exact static style strings (MV4: a refactor, ⛔ never a redesign)', () => {
    const order = new RegExp(
      `^\\s*<div style="${esc(OUTER)}">\\s*<div style="${esc(INNER)}">\\s*<img[^>]*\\sstyle="${esc(IMAGE)}"[^>]*/>\\s*</div>\\s*</div>\\s*$`,
    );
    expect(template).toMatch(order);
  });

  it('the image carries `src={src}`, `alt={alt}` ALWAYS (⛔ never `alt || undefined` — Astro drops an undefined attribute), lazy + async', () => {
    const img = /<img[\s\S]*?\/>/.exec(template)?.[0] ?? '';
    expect(img).toContain('src={src}');
    expect(img).toMatch(/\salt=\{alt\}[\s/]/);
    expect(img).toContain('loading="lazy"');
    expect(img).toContain('decoding="async"');
  });

  it('carries ⛔ no class, ⛔ no <style>, ⛔ no shadow / outline / radius, ⛔ no set:html / innerHTML, ⛔ no matrix call, ⛔ no lang, ⛔ no import', () => {
    expect(src).not.toMatch(CLASS_ATTR);
    expect(src).not.toMatch(/<style(?=[\s>/])/i);
    expect(src).not.toMatch(/box-shadow|outline|border-radius/);
    expect(src).not.toMatch(/\bset:html\b|\binnerHTML\b/);
    expect(src).not.toContain('visibilityOf');
    expect(src).not.toMatch(/\slang=/);
    expect(src).not.toMatch(/^\s*import\s/m);
  });

  it('uses static style STRINGS only (⛔ never the object form `style={{…}}`, which renders `border:var(…)` without spaces)', () => {
    expect(src).not.toMatch(/style\s*=\s*\{/i);
    expect([...template.matchAll(/\sstyle="/g)]).toHaveLength(3);
  });
});

describe('<PortraitFrame> — the class guard names every form (positive control)', () => {
  it('catches `class=` and `class:list=` in any letter case, and ignores `data-class=`', () => {
    expect(CLASS_ATTR.test('<div class="mt-3">')).toBe(true);
    expect(CLASS_ATTR.test('<div CLASS="mt-3">')).toBe(true);
    expect(CLASS_ATTR.test('<div class:list={["mt-3"]}>')).toBe(true);
    expect(CLASS_ATTR.test('<div data-class="x" style="padding: 6pt;">')).toBe(false);
  });
});

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}
