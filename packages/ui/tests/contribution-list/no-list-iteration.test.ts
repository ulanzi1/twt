// AC1 — the row presenter is PER-ROW, mechanically. ⛔ TWO HALVES, and the source half alone is a proxy.
//
// Virtualization is a render-layer property (Trap 1): a windowing layer calls the row presenter once per
// visible row on every scroll frame, so a `deriveContributionListViewModel(rows[])` here would be both wrong
// and slow. This asserts the property in the two places it can actually be broken.

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { deriveContributionRowViewModel } from '../../src/contribution-list/presenter.js';

const MODULE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/contribution-list',
);

// Comments stripped: the doc-blocks must NAME the forbidden constructs in order to forbid them, and an
// un-stripped scan false-positives on its own documentation — after which the next dev weakens the scan.
// (The `apps/mobile/tests/unit/status-pill-render.test.ts:31-32` implementation, copied.)
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

// ⭐ ENUMERATED, never a hardcoded file list — a fifth file added to this module is then covered
// automatically. The `@twt/ui` module shape is `index · view-model · presenter · i18n-keys` PLUS whatever
// that module needed; the fifth slot is deliberately not a closed set.
const moduleFiles = readdirSync(MODULE_DIR).filter((f) => f.endsWith('.ts'));

// ⚠⛔ WORD BOUNDARIES ARE LOAD-BEARING IN BOTH DIRECTIONS. Bare-substring matching makes this scan
// UNSATISFIABLE — `rea⟨do⟩nly` contains `do`, and this module's types declare `readonly` on every field —
// and the cheapest repair is deleting the tokens with real teeth. `/\bfor\s*\(/` catches `for(` AND `for (`
// while never firing on `before`, `format` or `readonly`.
const ITERATION_CONSTRUCTS: readonly RegExp[] = [
  /\.map\(/,
  /\.flatMap\(/,
  /\.forEach\(/,
  /\.filter\(/,
  /\.reduce\(/,
  /\.some\(/,
  /\.every\(/,
  /\.find\(/,
  /\.findIndex\(/,
  /\.sort\(/,
  /\.entries\(/,
  /\bArray\.from\(/,
  /\bfor\s*\(/,
  /\bwhile\s*\(/,
  /\bdo\s*\{/,
];

describe('AC1 (a) THE SOURCE HALF — no module file iterates a row set', () => {
  it('the module is non-empty and every file is scanned (the scan is not vacuous)', () => {
    expect(moduleFiles.length).toBeGreaterThanOrEqual(4);
    expect(moduleFiles).toContain('presenter.ts');
  });

  // ⛔ Over ALL module files, not `presenter.ts` alone — a mapping helper parked in `view-model.ts` would
  // defeat a single-file scan.
  for (const file of moduleFiles) {
    it(`${file} contains no list-iteration construct`, () => {
      const src = stripComments(readFileSync(path.join(MODULE_DIR, file), 'utf8'));
      for (const construct of ITERATION_CONSTRUCTS) {
        expect(
          construct.test(src),
          `${file} matches ${String(construct)} — this module owns ONE ROW, never a row set (Trap 1)`,
        ).toBe(false);
      }
    });
  }
});

describe('AC1 (b) THE COMPILE HALF — the parameter is a ROW, not an array', () => {
  // ⭐ This is the half with real teeth: a runtime test cannot see a TypeScript parameter type. An array
  // parameter makes `_NotArray` resolve to `never`, and `const _assertNotArray: never = true` fails
  // `pnpm turbo run typecheck` with TS2322 — the assertion lives inside the typecheck program because
  // `packages/ui/tsconfig.json` includes `tests/**/*`.
  // ⚠ The `[_P] extends [...]` TUPLE WRAPPING is deliberate: it suppresses distribution, so a `Row | Row[]`
  // signature cannot slip through.
  type _P = Parameters<typeof deriveContributionRowViewModel>[0];
  type _NotArray = [_P] extends [readonly unknown[]] ? never : true;
  const _assertNotArray: _NotArray = true;
  void _assertNotArray; // ⚠ REQUIRED — `@twt/eslint-config-twt` sets no `varsIgnorePattern`, so the `_`
  // prefix exempts nothing and `eslint .` fails one CI step BEFORE typecheck.

  it('the presenter takes one row (the assertion above is enforced by typecheck, not by this body)', () => {
    expect(_assertNotArray).toBe(true);
  });

  it('⛔ the module exports NO list-level presenter — naming-independent: exactly ONE function, ever', async () => {
    // ⚠ A name-pattern check (e.g. `/list.*viewmodel/i`) only catches a list-level export that happens to
    // be named that way — `deriveAllContributionRows` would pass it silently. This checks the property
    // Trap 1 actually cares about: there is exactly one function in this module, full stop.
    const mod = (await import('../../src/contribution-list/index.js')) as Record<string, unknown>;
    const functionExports = Object.entries(mod)
      .filter(([, value]) => typeof value === 'function')
      .map(([name]) => name);
    expect(
      functionExports,
      'a second function export is a second presenter — this module owns ONE ROW, ONE function (Trap 1)',
    ).toEqual(['deriveContributionRowViewModel']);
  });
});
