// Story 11b.5a (AC7; `-431` KL2 / KL10) — `<KinshipLattice>` is the family list on the public page: a DUMB component that takes a
// heading and labelled rows, asks the matrix ⛔ nothing, and draws a semantic `<dl>` labelled by its own `<h3>` (UX §11: a two-column
// label/value list — ⛔ a family tree, ⛔ lines, ⛔ avatars). `.astro` cannot be rendered by this Vitest (Vitest 2 vs Astro 6), so the
// markup is pinned by SOURCE (comments stripped) and the rendered page by the built-server spec
// (`integration/public-pages/family-memorial-render.spec.ts`). The `portrait-frame-source.test.ts` pattern.

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

const src = code(readFileSync(join(appRoot, 'src/components/KinshipLattice.astro'), 'utf-8'));
/** The template — everything after the closing frontmatter fence. */
const template = src.slice(src.indexOf('---', 3) + 3);

/** A `class` attribute in any form — `class="…"` and Astro's `class:list={…}`. */
const CLASS_ATTR = /(?<![\w-])class(?::list)?\s*=/i;

describe('<KinshipLattice> — a labelled <dl>, ⛔ a diagram (AC7, KL2 / KL10)', () => {
  it('its props are exactly `{ heading: string; rows: readonly KinshipLatticeRow[] }`', () => {
    expect(src).toMatch(/interface Props \{\s*heading: string;\s*rows: readonly KinshipLatticeRow\[\];\s*\}/);
    expect(src).toContain('const { heading, rows } = Astro.props;');
  });

  it('renders <h3 id> → <dl data-field aria-labelledby> → one <dt>/<dd dir="auto"> pair per row, in that order', () => {
    expect(template).toMatch(
      /^\s*<h3 id="sv-family-kinship-heading"[^>]*>\{heading\}<\/h3>\s*<dl data-field="family_memorial_kinship" aria-labelledby="sv-family-kinship-heading"[^>]*>\s*\{rows\.map\(\(row\) => \(\s*<div[^>]*>\s*<dt>\{row\.label\}<\/dt>\s*<dd dir="auto"[^>]*>\{row\.names\}<\/dd>\s*<\/div>\s*\)\)\}\s*<\/dl>\s*$/,
    );
  });

  it('carries the matrix field id on the <dl> (every matrix field carries `data-field`)', () => {
    expect(template.match(/data-field="([^"]+)"/g)).toEqual(['data-field="family_memorial_kinship"']);
  });

  it('carries ⛔ no class, ⛔ no <style>, ⛔ no set:html / innerHTML, ⛔ no matrix call, ⛔ no lang, ⛔ no svg / img / line (⛔ a diagram)', () => {
    expect(src).not.toMatch(CLASS_ATTR);
    expect(src).not.toMatch(/<style(?=[\s>/])/i);
    expect(src).not.toMatch(/\bset:html\b|\binnerHTML\b/);
    expect(src).not.toContain('visibilityOf');
    expect(src).not.toMatch(/\slang=/);
    expect(template).not.toMatch(/<(svg|img|canvas|line|hr)\b/i);
  });

  it('uses static style STRINGS only, spacing tokens only (⛔ the object form)', () => {
    expect(src).not.toMatch(/style\s*=\s*\{/i);
    const styles = [...template.matchAll(/\sstyle="([^"]*)"/g)].map((m) => m[1]);
    expect(styles).toEqual(['margin: var(--space-row) 0 0;', 'margin: var(--space-row) 0 0;', 'margin: var(--space-row) 0 0;', 'margin: 0;']);
  });

  it('imports only the row TYPE (it decides nothing)', () => {
    expect([...src.matchAll(/^\s*import\s.*$/gm)].map((m) => m[0].trim())).toEqual([
      "import type { KinshipLatticeRow } from '../lib/family-memorial.js';",
    ]);
  });
});

describe('<KinshipLattice> — the guards have teeth (positive controls)', () => {
  it('the class guard catches `class=` / `class:list=` and ignores `data-class=`', () => {
    expect(CLASS_ATTR.test('<dl class="mt-3">')).toBe(true);
    expect(CLASS_ATTR.test('<dl class:list={["mt-3"]}>')).toBe(true);
    expect(CLASS_ATTR.test('<dl data-class="x">')).toBe(false);
  });

  it('the markup pattern refuses a <dd> without dir="auto" and a missing data-field', () => {
    const pattern = /<dd dir="auto"[^>]*>\{row\.names\}<\/dd>/;
    expect(pattern.test('<dd>{row.names}</dd>')).toBe(false);
    expect(template.replace('data-field="family_memorial_kinship" ', '').match(/data-field=/g)).toBeNull();
  });
});
