// The `@twt/ui` package boundary, mechanized — Story 11b.2 (Task 2; AC1). C-1's property as a test.
//
// `@twt/ui` is HEADLESS BY CONSTRUCTION: it holds presenters, never components. That is what lets one
// presenter serve `apps/mobile` RN, a PDF note template, and a future `apps/public` Astro render layer
// without any of them disagreeing about what a row contains. `apps/public` ADDING `@twt/ui` is an ORDINARY
// DEPENDENCY ADDITION (`2026-08-23-154` cl.6) — what must never happen is the reverse: a framework, a
// renderer or a palette arriving INSIDE the package.
//
// ⚠⛔ THIS TEST DOES ⛔ NOT CLOSE THE `@twt/tokens` HOLE, AND ⛔ DO NOT BELIEVE IT DOES.
// "`dependencies` is exactly `{@twt/contracts}`" ALREADY ENTAILS "`@twt/tokens` ∉ `dependencies`", so an
// extra assertion to that effect would add ZERO coverage. The real risk is a VALUE IMPORT of the
// devDependency, which typechecks, ships, and becomes a real bundle edge for `apps/mobile` while
// `dependencies` stays untouched. ⭐ The only thing that catches THAT is the parsed-import scan in
// `contribution-list/forbidden-imports.test.ts`. ⛔ Neither test is optional; neither substitutes for the other.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// tests/ → the package root is TWO levels up (tests → ui).
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

interface PackageJson {
  readonly name: string;
  readonly dependencies?: Record<string, string>;
}

const pkg = JSON.parse(
  readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
) as PackageJson;

describe('@twt/ui stays headless — runtime dependencies (AC1)', () => {
  it('is the package under test', () => {
    expect(pkg.name).toBe('@twt/ui');
  });

  it('⛔ `dependencies` is EXACTLY `{ "@twt/contracts": "workspace:*" }`', () => {
    expect(pkg.dependencies).toEqual({ '@twt/contracts': 'workspace:*' });
  });
});
