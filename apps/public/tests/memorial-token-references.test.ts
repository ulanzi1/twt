// Story 11b.5 (AC2, AC4; `2026-10-29-420` MV4 / MV5) — every design token the memorial's two components reference EXISTS in the
// `:root` block the shell emits. A typo'd `var(--…)` is silent in a browser (the declaration is simply dropped — a frame with ⛔ no
// border, a section with ⛔ no spacing), and `.astro` cannot be rendered by this Vitest, so the references are read from SOURCE
// (comments stripped — the files DESCRIBE their tokens) and resolved against `rootTokenCss()`'s real output.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { rootTokenCss } from '../src/lib/theme.server.js';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const COMPONENTS = ['src/components/PortraitFrame.astro', 'src/components/FamilyMemorial.astro'] as const;

/** Strip `//` and block comments, and Astro's `{/* … *\/}` / HTML comments — prose is ⛔ not code (copied from `family-memorial-source.test.ts`). */
function code(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

/** The custom-property names `rootTokenCss()` actually declares. */
function declared(): Set<string> {
  return new Set([...rootTokenCss().matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => m[1] as string));
}

describe('the memorial components reference only tokens the shell declares (AC4)', () => {
  it('`rootTokenCss()` emits the funeral frame at the UX\'s 2px (AC2 — `border-funeral-frame` corrected from its 4px placeholder)', () => {
    expect(rootTokenCss()).toContain('--border-funeral-frame: 2px;');
  });

  it.each(COMPONENTS)('%s — every `var(--…)` resolves (⛔ never a vacuous pass: each file references at least one)', (rel) => {
    const src = code(readFileSync(join(appRoot, rel), 'utf-8'));
    const used = [...src.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1] as string);
    expect(used.length).toBeGreaterThan(0);
    const known = declared();
    expect(used.filter((name) => !known.has(name))).toEqual([]);
  });

  it('the frame draws its border from the token (⛔ never a literal width)', () => {
    const src = code(readFileSync(join(appRoot, 'src/components/PortraitFrame.astro'), 'utf-8'));
    expect(src).toContain('var(--border-funeral-frame)');
  });
});
