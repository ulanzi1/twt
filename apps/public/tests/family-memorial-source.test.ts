// Story 11b.4a (AC3, Trap 8) — ⛔ no `set:html` in any `apps/public` file this story touches: the family's words reach the DOM
// ONLY through Astro's escaping `{}` interpolation. A SOURCE scan (comments stripped — the files DESCRIBE the rule they keep),
// whose file list is asserted NON-EMPTY and to include the component, so it can ⛔ never pass over nothing.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Every `apps/public` file Story 11b.4a touches on the render path. */
const TOUCHED = [
  'src/components/FamilyMemorial.astro',
  'src/pages/sahyog-vivran/[driveToken].astro',
  'src/pages/sahyog-vivran/[driveToken]/memorial-photo.ts',
  'src/lib/sahyog-vivran.server.ts',
  'src/lib/sahyog-vivran-render.ts',
  'src/lib/surface-fields.ts',
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

  it.each(TOUCHED)('%s carries ⛔ no `set:html` / `set:text` directive and ⛔ no `innerHTML`', (rel) => {
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

  it('the scanner itself catches a planted `set:html` (positive control)', () => {
    expect(code('<p set:html={x} />')).toMatch(/\bset:html\b/);
    expect(code('{/* set:html is forbidden */}<p>{x}</p>')).not.toMatch(/\bset:html\b/);
  });
});
