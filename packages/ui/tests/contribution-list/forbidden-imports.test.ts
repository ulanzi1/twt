// AC5 (a) — THE FORBIDDEN-IMPORT SCAN, over PARSED IMPORT SPECIFIERS.
//
// ⛔⛔ THIS IS ONE OF TWO SCANS WITH TWO MECHANISMS, AND THEY MUST NOT BE MERGED. Its sibling
// (`death-term.test.ts`) scans RAW TEXT. An earlier draft of this AC asserted both on parsed import
// specifiers — and a lifecycle term is NEVER an import specifier, so that half was true for every possible
// source file, forever. That is exactly the vacuous-fence class commit `38a2d8b` closed en masse
// ([[feedback_gate_scope_semantic_coverage]]).
//
// ⭐ THIS SCAN IS WHAT CLOSES THE `@twt/tokens` HOLE, and `package-boundary.test.ts` cannot.
// `@twt/tokens` is a devDependency of `@twt/ui`, so a VALUE IMPORT of it typechecks, ships, and becomes a
// real bundle edge for `apps/mobile` while `dependencies` stays untouched. A `dependencies`-shape assertion
// is blind to it by construction. ⛔ Neither test is optional and neither substitutes for the other.

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const MODULE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/contribution-list',
);

// Comments stripped — the Trap 3 doc-blocks must NAME the forbidden symbols in order to forbid them, and an
// un-stripped scan false-positives on its own documentation.
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

// ⭐ readdirSync, ⛔ never a hardcoded file list — a fifth module file is covered automatically.
const moduleFiles = readdirSync(MODULE_DIR).filter((f) => f.endsWith('.ts'));

interface ParsedImport {
  readonly file: string;
  readonly specifier: string;
  readonly clause: string;
}

// ⚠ Matches BOTH `import ... from '...'` AND `export ... from '...'` — a barrel file composed entirely
// of `export { x } from '...'` re-exports (e.g. this module's own `index.ts`) is otherwise invisible to
// this scan. Also matches a dynamic `import('...')` call.
const IMPORT_RE =
  /(?:import|export)\s+(?:type\s+)?([\s\S]*?)\s*from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

function parseImports(file: string): ParsedImport[] {
  const src = stripComments(readFileSync(path.join(MODULE_DIR, file), 'utf8'));
  const found: ParsedImport[] = [];
  let m: RegExpExecArray | null = IMPORT_RE.exec(src);
  while (m !== null) {
    found.push({ file, specifier: m[2] ?? m[3] ?? m[4] ?? '', clause: m[1] ?? '' });
    m = IMPORT_RE.exec(src);
  }
  return found;
}

const imports = moduleFiles.flatMap(parseImports);

// ⛔ Every one of these is a package the presenter must never reach for:
//   `@twt/domain` — Trap 3: it typechecks, lints and passes local tests while breaking CONSUMING packages at
//      runtime, and it leaks `pg` into the RN Metro bundle.
//   react / react-native / astro — AC1's purity clause; a presenter has no render layer.
//   `@twt/tokens` — the devDependency hole above. The presenter emits role NAMES as strings.
const FORBIDDEN_PACKAGES = ['@twt/domain', 'react', 'react-native', 'astro', '@twt/tokens'] as const;

// ⛔ Symbols that, if BOUND here, would mean this module had taken over a decision that is not its own:
// the name FORM (`splitFirstNameLastInitial`, `resolvePublicMemberName`), the pool identity shielding
// (`resolvePoolIdentity`), or the status pill D2(a) rejected (`deriveStatusPillViewModel`).
const FORBIDDEN_BINDINGS = [
  'splitFirstNameLastInitial',
  'resolvePublicMemberName',
  'resolvePoolIdentity',
  'deriveStatusPillViewModel',
] as const;

describe('AC5 (a) — the module imports nothing it is forbidden to import', () => {
  it('the parse found imports (the scan is not vacuous)', () => {
    expect(moduleFiles.length).toBeGreaterThanOrEqual(4);
    expect(imports.length).toBeGreaterThan(0);
    // Sanity: the intra-module relative imports ARE seen, so the regex is really parsing this module.
    expect(imports.some((i) => i.specifier.startsWith('./'))).toBe(true);
  });

  it('the parse sees `index.ts`\'s `export { … } from` re-exports too, not just `import` statements', () => {
    expect(imports.some((i) => i.file === 'index.ts')).toBe(true);
  });

  for (const pkg of FORBIDDEN_PACKAGES) {
    it(`⛔ no import resolves to '${pkg}'`, () => {
      const offenders = imports.filter(
        (i) => i.specifier === pkg || i.specifier.startsWith(`${pkg}/`),
      );
      expect(
        offenders.map((o) => `${o.file} → ${o.specifier}`),
        `'${pkg}' must never be imported by a headless presenter (AC1 purity / Trap 3)`,
      ).toEqual([]);
    });
  }

  for (const symbol of FORBIDDEN_BINDINGS) {
    it(`⛔ no import binds '${symbol}'`, () => {
      const offenders = imports.filter((i) => new RegExp(`\\b${symbol}\\b`).test(i.clause));
      expect(
        offenders.map((o) => `${o.file} → ${o.clause}`),
        `'${symbol}' decides something this presenter must not decide`,
      ).toEqual([]);
    });
  }

  it('⛔ the module imports ONLY relative intra-module paths — it has no external dependency at all', () => {
    const external = imports.filter((i) => !i.specifier.startsWith('.'));
    expect(
      external.map((e) => `${e.file} → ${e.specifier}`),
      'a headless presenter needs nothing outside itself; a new external import is a governance question',
    ).toEqual([]);
  });
});

describe("AC4 / Trap 2 — ⛔ no constant status tone is emitted", () => {
  it('the module contains no hard-coded confirmed-tone literal', () => {
    // D2(a) rejected option (c) — a constant "confirmed" chrome element — BY NAME: it asserts a fact nothing
    // checked. Scanned over RAW text (including comments) so the idea cannot land as a doc-block first.
    for (const file of moduleFiles) {
      const raw = readFileSync(path.join(MODULE_DIR, file), 'utf8');
      for (const literal of ["'green'", '"green"', '`green`']) {
        expect(raw.includes(literal), `${file} emits ${literal} — a decoration asserting an unchecked fact`).toBe(
          false,
        );
      }
    }
  });
});
