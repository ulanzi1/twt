// scripts/governance-boundary/lib.test.ts
//
// Story 10.8 AC5 — both gate legs, WITH revert-sanity negative controls.
//
// ⚠ THE NEGATIVE CONTROLS ARE THE POINT. A gate that cannot be made to fail has no teeth, and a
// governance gate that silently stopped detecting anything would be worse than no gate: the green
// check would actively certify an invariant nobody is enforcing. So for every leg there is a
// planted violation that MUST be caught, and — for leg (b) — a planted violation for each of the
// three detection routes independently, because a fix that removes one route while leaving the
// others would otherwise look identical to a real pass.

import { describe, expect, it } from 'vitest';

import {
  FEATURE_FLAG_EVALUATION_SYMBOLS,
  checkRegistryConformance,
  conformanceIsClean,
  isFeatureFlagModuleSpecifier,
  scanGovernanceBoundaryViolations,
} from './lib.js';

// ─────────────────────────────────────────────────────────────────────────────
// Leg (b) — the LOAD-BEARING source scan
// ─────────────────────────────────────────────────────────────────────────────

describe('leg (b) — clean governance-module sources produce NO findings', () => {
  it('a normal RBAC-shaped module is clean', () => {
    const src = `
      import { and, eq } from 'drizzle-orm';
      import type { Db } from '../db.js';
      import { roleGrants } from '../schema/role_grants.js';
      export async function checkPermission(db: Db, key: string): Promise<boolean> {
        const rows = await db.select().from(roleGrants).where(eq(roleGrants.key, key));
        return rows.length > 0;
      }
    `;
    expect(scanGovernanceBoundaryViolations('packages/domain/src/rbac/check.ts', src)).toEqual([]);
  });

  it('does NOT false-positive on the words in comments or string literals', () => {
    // AST-based, not grep-based. A gate that fired on prose would be turned off within a week.
    const src = `
      // A flag must never reach into this module — see featureFlags.evaluateFlag and
      // '../feature-flags/evaluate.js' in governance_boundary.yaml.
      const doc = "featureFlags.evaluateFlag";
      const path = '../feature-flags/index.js';
      export const note = doc + path;
    `;
    expect(scanGovernanceBoundaryViolations('packages/domain/src/audit/write.ts', src)).toEqual([]);
  });

  it('does not fire on an unrelated identifier that merely contains the word flag', () => {
    const src = `
      const flagged = true;
      export function isFlagged(): boolean { return flagged; }
      export const featureFlagsEnabled = false;
    `;
    expect(scanGovernanceBoundaryViolations('packages/domain/src/consent/read.ts', src)).toEqual([]);
  });
});

describe('⚠ leg (b) REVERT-SANITY: a planted violation MUST be caught — all three routes', () => {
  it('ROUTE 1 — a relative import of the feature-flags module', () => {
    const src = `
      import { evaluateFlag } from '../feature-flags/evaluate.js';
      export const x = evaluateFlag;
    `;
    const findings = scanGovernanceBoundaryViolations('packages/domain/src/audit/write.ts', src);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some((f) => f.route === 'module_specifier')).toBe(true);
  });

  it('ROUTE 2 — `import { featureFlags } from "@twt/domain"` (an INNOCENT-looking specifier)', () => {
    // The case a specifier blacklist alone would miss entirely: nothing about '@twt/domain' is
    // suspicious. This is why the scan also reads the imported NAMES.
    const src = `
      import { featureFlags } from '@twt/domain';
      export async function auditIfEnabled(): Promise<void> {
        if (featureFlags) return;
      }
    `;
    const findings = scanGovernanceBoundaryViolations('packages/domain/src/audit/write.ts', src);
    expect(findings.some((f) => f.route === 'named_symbol')).toBe(true);
  });

  it('ROUTE 2 — an ALIASED named import cannot launder the symbol', () => {
    const src = `import { evaluateFlag as decide } from '@twt/domain';\nexport const d = decide;`;
    const findings = scanGovernanceBoundaryViolations('packages/validity-service/src/service.ts', src);
    expect(findings.some((f) => f.route === 'named_symbol')).toBe(true);
  });

  it('ROUTE 3 — `import * as domain` then `domain.featureFlags.evaluateFlag(...)`', () => {
    // Names neither a banned specifier nor a banned import binding anywhere in the file. Without
    // the property-access route this would sail straight through — the AI-5-1 vacuous-gate trap.
    const src = `
      import * as domain from '@twt/domain';
      export function decide(doc: unknown, ctx: unknown): unknown {
        return domain.featureFlags.evaluateFlag(doc as never, ctx as never);
      }
    `;
    const findings = scanGovernanceBoundaryViolations('packages/domain/src/rbac/permissions.ts', src);
    expect(findings.some((f) => f.route === 'property_access')).toBe(true);
  });

  it('a dynamic import() of the module is caught', () => {
    const src = `export async function f() { const m = await import('../feature-flags/index.js'); return m; }`;
    const findings = scanGovernanceBoundaryViolations('packages/domain/src/contribution/read.ts', src);
    expect(findings.some((f) => f.route === 'module_specifier')).toBe(true);
  });

  it('a `require()` of the module is caught', () => {
    const src = `const ff = require('../feature-flags/evaluate.js'); module.exports = ff;`;
    const findings = scanGovernanceBoundaryViolations('scripts/some-gate/check.ts', src);
    expect(findings.some((f) => f.route === 'module_specifier')).toBe(true);
  });

  it('a RE-EXPORT of the evaluation surface is caught (laundering it through a governance module)', () => {
    const src = `export { evaluateFlag } from '@twt/domain';`;
    const findings = scanGovernanceBoundaryViolations('packages/domain/src/consent/index.ts', src);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('EVERY declared evaluation symbol is actually detected (no symbol is dead weight in the list)', () => {
    // Guards against the list drifting into decoration: if a symbol is named in the ban list but the
    // scanner cannot see it, the ban is a comment.
    for (const symbol of FEATURE_FLAG_EVALUATION_SYMBOLS) {
      const src = `import { ${symbol} } from '@twt/domain';\nexport const x = ${symbol};`;
      const findings = scanGovernanceBoundaryViolations('packages/domain/src/audit/write.ts', src);
      expect(findings.length, `symbol '${symbol}' was NOT detected`).toBeGreaterThan(0);
    }
  });

  it('a dynamic import() with a NON-LITERAL specifier is flagged (cannot be statically cleared)', () => {
    const src = `export async function f(mod: string) { const m = await import(mod); return m; }`;
    const findings = scanGovernanceBoundaryViolations('packages/domain/src/audit/write.ts', src);
    expect(findings.some((f) => f.route === 'module_specifier')).toBe(true);
  });

  it('a `require()` with a NON-LITERAL specifier is flagged (cannot be statically cleared)', () => {
    const src = `export function f(mod: string) { return require(mod); }`;
    const findings = scanGovernanceBoundaryViolations('scripts/some-gate/check.ts', src);
    expect(findings.some((f) => f.route === 'module_specifier')).toBe(true);
  });

  it('a dynamic import() with a LITERAL, unrelated specifier is still clean (no false positive)', () => {
    const src = `export async function f() { const m = await import('drizzle-orm'); return m; }`;
    expect(scanGovernanceBoundaryViolations('packages/domain/src/audit/write.ts', src)).toEqual([]);
  });

  it('BRACKET access on the namespace itself is caught (`obj["featureFlags"]`)', () => {
    const src = `
      import * as domain from '@twt/domain';
      export const x = domain['featureFlags'];
    `;
    const findings = scanGovernanceBoundaryViolations('packages/domain/src/rbac/permissions.ts', src);
    expect(findings.some((f) => f.route === 'property_access')).toBe(true);
  });

  it('BRACKET access on a `featureFlags`-named binding is caught (`featureFlags["evaluateFlag"]`)', () => {
    const src = `
      import { featureFlags } from '@twt/domain';
      export const x = featureFlags['evaluateFlag'];
    `;
    const findings = scanGovernanceBoundaryViolations('packages/domain/src/consent/read.ts', src);
    expect(findings.filter((f) => f.route === 'property_access').length).toBeGreaterThan(0);
  });

  it('reports the LINE so a failure is actionable', () => {
    const src = `const a = 1;\nconst b = 2;\nimport { evaluateFlag } from '@twt/domain';\n`;
    const findings = scanGovernanceBoundaryViolations('packages/domain/src/rbac/roles.ts', src);
    expect(findings[0]?.line).toBe(3);
  });

  // ── Review Pass 2: routes 4 and 5, each a confirmed bypass of ALL THREE original routes ──────────
  //
  // These are not hypothetical hardening. Each source below was verified to produce ZERO findings
  // before the fix, i.e. it was a one-line, fully-green route to a flag read inside a governance
  // module — the exact thing the gate exists to prevent. Keep a negative control per route: a fix
  // that silently drops one while leaving the others would otherwise look identical to a real pass.

  it('DESTRUCTURING out of a dynamic import with an INNOCENT literal specifier is caught', () => {
    // The full bypass: route 1 clears '@twt/domain' (not a feature-flags specifier, and the
    // non-literal branch is not reached); route 2 only visits import/export DECLARATIONS, and this
    // is a VariableStatement; route 3 sees a bare CallExpression, not a property access.
    const src = `
      export async function decide(doc: unknown, ctx: unknown) {
        const { evaluateFlag } = await import('@twt/domain');
        return evaluateFlag(doc as never, ctx as never);
      }
    `;
    const findings = scanGovernanceBoundaryViolations('packages/domain/src/rbac/permissions.ts', src);
    expect(findings.some((f) => f.route === 'named_symbol')).toBe(true);
  });

  it('DESTRUCTURING with a rename is caught (the original name is what matters)', () => {
    const src = `
      import * as domain from '@twt/domain';
      const { featureFlags: ff } = domain;
      export const x = ff;
    `;
    const findings = scanGovernanceBoundaryViolations('packages/domain/src/consent/read.ts', src);
    expect(findings.some((f) => f.route === 'named_symbol')).toBe(true);
  });

  it('DESTRUCTURING out of a `require()` with an innocent specifier is caught', () => {
    const src = `const { resolveFlagAudited } = require('@twt/domain'); module.exports = resolveFlagAudited;`;
    const findings = scanGovernanceBoundaryViolations('scripts/some-gate/check.ts', src);
    expect(findings.some((f) => f.route === 'named_symbol')).toBe(true);
  });

  it('NAMESPACE RE-EXPORT is caught (`export * as featureFlags from`)', () => {
    // `NamespaceExport` is not a `NamedExports`, so route 2's re-export arm never saw this clause
    // shape — and the specifier is innocent, so route 1 cleared it too.
    const src = `export * as featureFlags from '@twt/domain';`;
    const findings = scanGovernanceBoundaryViolations('packages/domain/src/consent/index.ts', src);
    expect(findings.some((f) => f.route === 'named_symbol')).toBe(true);
  });

  it('a bare namespace re-export of an UNRELATED namespace is still clean (no false positive)', () => {
    const src = `export * as audit from './write.js';`;
    expect(scanGovernanceBoundaryViolations('packages/domain/src/audit/index.ts', src)).toEqual([]);
  });

  it('ordinary destructuring of unrelated names is still clean (no false positive)', () => {
    // The route 5 check must key on the BANNED symbol list, not on destructuring per se — otherwise
    // it would fire on essentially every file in the repo and get switched off.
    const src = `
      import { and, eq } from 'drizzle-orm';
      export function f(row: { id: string; name: string }) {
        const { id, name } = row;
        return [and, eq, id, name];
      }
    `;
    expect(scanGovernanceBoundaryViolations('packages/domain/src/rbac/roles.ts', src)).toEqual([]);
  });
});

describe('isFeatureFlagModuleSpecifier', () => {
  it('matches the module by relative path, subpath, and package subpath', () => {
    for (const s of [
      '../feature-flags/index.js',
      './feature-flags/evaluate.js',
      '../../feature-flags/registry.js',
      '@twt/domain/feature-flags',
    ]) {
      expect(isFeatureFlagModuleSpecifier(s), s).toBe(true);
    }
  });

  it('does not match unrelated specifiers', () => {
    for (const s of ['@twt/domain', 'drizzle-orm', '../feature-flagsomething/x.js', './flags.js']) {
      expect(isFeatureFlagModuleSpecifier(s), s).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Leg (a) — conformance
// ─────────────────────────────────────────────────────────────────────────────

describe('leg (a) — registry ≡ allowlist conformance', () => {
  it('is clean when the registry and the bar agree and count matches', () => {
    const r = checkRegistryConformance(['a', 'b'], ['a', 'b'], 2);
    expect(conformanceIsClean(r)).toBe(true);
  });

  it('⚠ REVERT-SANITY: a flag registered in code but ABSENT from the bar fails (an unattested flag)', () => {
    const r = checkRegistryConformance(['a', 'b', 'sneaky'], ['a', 'b'], 2);
    expect(r.unlisted).toEqual(['sneaky']);
    expect(conformanceIsClean(r)).toBe(false);
  });

  it('⚠ REVERT-SANITY: a bar entry with no registered flag fails (a stale/speculative entry)', () => {
    // The corrosive direction: entry by entry, the bar drifts into a document nobody trusts.
    const r = checkRegistryConformance(['a'], ['a', 'ghost'], 2);
    expect(r.orphaned).toEqual(['ghost']);
    expect(conformanceIsClean(r)).toBe(false);
  });

  it('⚠ REVERT-SANITY: a `count` that disagrees with the entry total fails', () => {
    // Silently dropping an entry (or adding one without bumping count) is exactly what the
    // bank-allowlist count trick exists to catch.
    const r = checkRegistryConformance(['a', 'b'], ['a', 'b'], 3);
    expect(r.countMismatch).toEqual({ declared: 3, actual: 2 });
    expect(conformanceIsClean(r)).toBe(false);
  });

  it('reports both directions at once', () => {
    const r = checkRegistryConformance(['a', 'new'], ['a', 'ghost'], 2);
    expect(r.unlisted).toEqual(['new']);
    expect(r.orphaned).toEqual(['ghost']);
  });
});
