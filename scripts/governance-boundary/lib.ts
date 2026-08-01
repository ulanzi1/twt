// scripts/governance-boundary/lib.ts
//
// Pure scanners for the Story 10.8 governance-boundary invariant (AC5). Two legs:
//
//   (a) CONFORMANCE — every key in the domain flag registry resolves to exactly one `allow` entry
//       in governance_boundary.yaml, and vice-versa, and `count` agrees with the entry total.
//
//   (b) SOURCE SCAN — no feature-flag EVALUATION reaches inside a governance module.
//
// ⚠ LEG (b) IS THE LOAD-BEARING ONE, AND IT IS WORTH BEING BLUNT ABOUT WHY. Leg (a) is bookkeeping:
// it is green the moment it lands and it stays green while somebody adds a flag read inside the RBAC
// module. It proves that the list of flags matches the list of flags. Leg (b) is the actual
// invariant — it is what mechanically CLOSES the seven prohibitions at epics.md:3516-3522 against
// direct and single-hop NAMED reads, rather than leaving them merely documented. If a future change
// makes leg (b) inconvenient, the correct response is to stop putting flag reads in governance
// modules, not to narrow the scan.
//
// ⚠ SAY WHAT THIS DOES AND DOES NOT GUARANTEE. This comment read "STRUCTURALLY IMPOSSIBLE" until
// Review Pass 5. That overstates a PER-FILE scanner: it resolves no module specifiers and follows no
// import edges, so a governance module importing an innocent helper that itself imports the
// evaluator is NOT detected. What is closed is every syntactic route by which a file can NAME the
// evaluation surface — so a violation cannot be committed by accident or by a casual edit, and CI
// fails loudly when one is. See scripts/governance-boundary/README.md's "What leg (b) guarantees".
//
// AST-detected (mirror kyc-provider-boundary / member-state-invariant), so a symbol name appearing
// in a comment or a string literal never matches. FIVE detection routes, because a single one is
// trivially side-stepped — and routes 4 and 5 exist because routes 1-3 were each independently
// defeated in review (see the negative controls in lib.test.ts):
//   1. MODULE SPECIFIER — any import whose specifier names the feature-flags module
//      (`../feature-flags/evaluate.js`, `@twt/domain/feature-flags`, …).
//   2. NAMED SYMBOL — a named import of the evaluation surface (`import { evaluateFlag } from …`)
//      or of the `featureFlags` namespace, from ANY module. This is what catches
//      `import { featureFlags } from '@twt/domain'`, where the specifier is entirely innocent.
//   3. PROPERTY ACCESS — any `featureFlags.<member>` expression, which catches
//      `import * as domain from '@twt/domain'; domain.featureFlags.evaluateFlag(...)` — a route
//      that names neither a banned specifier nor a banned import binding anywhere in the file.
//   4. NAMESPACE RE-EXPORT — `export * as featureFlags from '…'`, a `NamespaceExport` clause that
//      route 2's named-exports arm does not match, under a fully innocent specifier.
//   5. DESTRUCTURING — a banned symbol pulled out of ANY expression by an object binding pattern,
//      including the aliased form. `const { evaluateFlag } = await import('@twt/domain')` defeated
//      routes 1, 2 AND 3 simultaneously: literal innocent specifier, a VariableStatement rather than
//      an import declaration, and a bare call rather than a property access.
// Routes 2-5 are the reason this gate has semantic coverage rather than being a specifier
// blacklist that any `import * as` defeats.

import * as ts from 'typescript';

// ─────────────────────────────────────────────────────────────────────────────
// Leg (b) — the source scan
// ─────────────────────────────────────────────────────────────────────────────

/** The `@twt/domain` namespace the feature-flags module is exported as. */
export const FEATURE_FLAGS_NAMESPACE = 'featureFlags';

/**
 * The evaluation / lookup / write surface. A governance module importing ANY of these is reaching
 * for flag-conditioned behaviour, whatever it names the binding.
 *
 * Note `parseCapabilityBar` / `loadCapabilityBar` are deliberately NOT here: reading the capability
 * bar is reading a static governance YAML, not evaluating a flag. The distinction matters — this
 * gate itself must be able to read the bar (see the allowlist in check.ts).
 */
export const FEATURE_FLAG_EVALUATION_SYMBOLS: readonly string[] = [
  'evaluateFlag',
  'resolveFlagAudited',
  'flagVersionInForce',
  'flagVersionInForceCached',
  'flagVersionForVersion',
  'createFlagVersion',
  'listEffectiveFlags',
  'listFlagVersions',
  'defaultFlagDocument',
  'noVersionInForceDecision',
];

/** True iff a module specifier names the feature-flags module by path or package subpath. */
export function isFeatureFlagModuleSpecifier(specifier: string): boolean {
  return /(^|[/@])feature-flags(\/|$|\.)/.test(specifier);
}

export interface BoundaryFinding {
  file: string;
  line: number;
  /** How it was detected — useful when a fix removes one route but leaves another. */
  route: 'module_specifier' | 'named_symbol' | 'property_access';
  detail: string;
}

/** True iff an imported/re-exported NAME is part of the banned evaluation surface. */
function isBannedSymbol(name: string): boolean {
  return name === FEATURE_FLAGS_NAMESPACE || FEATURE_FLAG_EVALUATION_SYMBOLS.includes(name);
}

/**
 * Scan one TypeScript source for a feature-flag evaluation reaching into a governance module.
 * Returns every finding (not just the first) so one fix pass can address them all.
 */
export function scanGovernanceBoundaryViolations(file: string, source: string): BoundaryFinding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, /* setParentNodes */ true);
  const findings: BoundaryFinding[] = [];

  const push = (node: ts.Node, route: BoundaryFinding['route'], detail: string): void => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    findings.push({ file, line: line + 1, route, detail });
  };

  const visit = (node: ts.Node): void => {
    // ── Route 1: the module specifier names the feature-flags module ──────────────────────────
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      isFeatureFlagModuleSpecifier(node.moduleSpecifier.text)
    ) {
      push(node, 'module_specifier', `imports '${node.moduleSpecifier.text}'`);
    }
    if (ts.isCallExpression(node)) {
      const isImportCall = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require';
      if (isImportCall || isRequire) {
        const arg = node.arguments[0];
        if (arg && ts.isStringLiteral(arg)) {
          if (isFeatureFlagModuleSpecifier(arg.text)) {
            push(node, 'module_specifier', `dynamically imports '${arg.text}'`);
          }
        } else {
          // A non-literal specifier can't be statically resolved, so it also can't be statically
          // CLEARED — a dynamic `import(someVar)` inside a governance module is exactly the route
          // route 1's literal-specifier check cannot see. Flag it rather than pass it silently.
          push(
            node,
            'module_specifier',
            'dynamic import/require with a non-literal specifier — cannot statically verify it does not name the feature-flags module',
          );
        }
      }
    }

    // ── Route 2: a named import/re-export of the evaluation surface, from ANY module ───────────
    // This is the leg that catches `import { featureFlags } from '@twt/domain'`, whose specifier
    // is entirely innocent-looking.
    if (ts.isImportDeclaration(node) && node.importClause) {
      const { namedBindings, name } = node.importClause;
      // `import featureFlags from '…'` (default import bound to a banned name).
      if (name && isBannedSymbol(name.text)) {
        push(node, 'named_symbol', `imports '${name.text}'`);
      }
      if (namedBindings) {
        if (ts.isNamespaceImport(namedBindings) && isBannedSymbol(namedBindings.name.text)) {
          // `import * as featureFlags from '…'`
          push(node, 'named_symbol', `namespace-imports as '${namedBindings.name.text}'`);
        } else if (ts.isNamedImports(namedBindings)) {
          for (const el of namedBindings.elements) {
            // The ORIGINAL exported name when aliased (`{ evaluateFlag as ok }`), else the binding.
            const original = el.propertyName?.text ?? el.name.text;
            if (isBannedSymbol(original)) {
              push(el, 'named_symbol', `imports '${original}'`);
            }
          }
        }
      }
    }
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const el of node.exportClause.elements) {
        const original = el.propertyName?.text ?? el.name.text;
        if (isBannedSymbol(original)) {
          push(el, 'named_symbol', `re-exports '${original}'`);
        }
      }
    }
    // `export * as featureFlags from '…'` — a NamespaceExport, which `isNamedExports` above does not
    // match. Placed in a prohibited root this re-publishes the entire banned namespace from INSIDE
    // the governance module, and the specifier can be entirely innocent ('@twt/domain'). (Review
    // Pass 2 — route 1 cleared it on the specifier and route 2 never looked at this clause shape.)
    if (
      ts.isExportDeclaration(node) &&
      node.exportClause &&
      ts.isNamespaceExport(node.exportClause) &&
      isBannedSymbol(node.exportClause.name.text)
    ) {
      push(node, 'named_symbol', `namespace re-exports as '${node.exportClause.name.text}'`);
    }

    // ── Route 2b: a banned symbol destructured out of ANY expression ───────────────────────────────
    // The hole this closes (Review Pass 2): routes 1–3 inspect import/export DECLARATIONS and
    // property ACCESSES, so a binding pattern slipped past all three at once —
    //
    //   const { evaluateFlag } = await import('@twt/domain');   // literal, innocent specifier
    //   const { featureFlags: ff } = domainNamespace;            // rename defeats the name checks
    //
    // Route 1 cleared the specifier, route 2 never visited a VariableStatement, and route 3 saw a
    // bare CallExpression rather than a PropertyAccessExpression. One line, fully green. Checking the
    // BINDING PATTERN itself catches every variant regardless of what is on the right-hand side,
    // including the aliased form, because `propertyName` preserves the original name.
    if (ts.isObjectBindingPattern(node)) {
      for (const el of node.elements) {
        const original =
          el.propertyName && ts.isIdentifier(el.propertyName)
            ? el.propertyName.text
            : ts.isIdentifier(el.name)
              ? el.name.text
              : undefined;
        if (original !== undefined && isBannedSymbol(original)) {
          push(el, 'named_symbol', `destructures '${original}'`);
        }
      }
    }

    // ── Route 3: a `featureFlags.<member>` property access ─────────────────────────────────────
    // Catches `import * as domain from '@twt/domain'; domain.featureFlags.evaluateFlag(...)`,
    // which names neither a banned specifier nor a banned import binding.
    if (ts.isPropertyAccessExpression(node) && node.name.text === FEATURE_FLAGS_NAMESPACE) {
      push(node, 'property_access', `accesses '.${FEATURE_FLAGS_NAMESPACE}'`);
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === FEATURE_FLAGS_NAMESPACE
    ) {
      push(node, 'property_access', `accesses '${FEATURE_FLAGS_NAMESPACE}.${node.name.text}'`);
    }
    // Bracket/computed access on the namespace itself (`obj['featureFlags']`) or on an identifier
    // named for it (`featureFlags['evaluateFlag']`) — a plain dot-notation scan misses both.
    if (
      ts.isElementAccessExpression(node) &&
      ts.isStringLiteralLike(node.argumentExpression) &&
      node.argumentExpression.text === FEATURE_FLAGS_NAMESPACE
    ) {
      push(node, 'property_access', `computed-accesses '["${FEATURE_FLAGS_NAMESPACE}"]'`);
    }
    if (
      ts.isElementAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === FEATURE_FLAGS_NAMESPACE &&
      ts.isStringLiteralLike(node.argumentExpression)
    ) {
      push(
        node,
        'property_access',
        `computed-accesses '${FEATURE_FLAGS_NAMESPACE}["${node.argumentExpression.text}"]'`,
      );
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return findings;
}

export function formatBoundaryFinding(f: BoundaryFinding, prohibition?: string): string {
  return (
    `${f.file}:${String(f.line)} — ${f.detail} [${f.route}]` +
    (prohibition ? `\n      ↳ ${prohibition.trim()}` : '')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Leg (a) — registry ≡ allowlist conformance
// ─────────────────────────────────────────────────────────────────────────────

export interface ConformanceResult {
  /** Registered in code but NOT admitted to the capability bar — an unattested flag. */
  unlisted: string[];
  /** Admitted to the bar but NOT registered in code — a stale or speculative entry. */
  orphaned: string[];
  /** `count` disagrees with the entry total (the revert-sanity cross-check). */
  countMismatch: { declared: number; actual: number } | null;
}

/**
 * Assert the flag registry and the capability bar agree, IN BOTH DIRECTIONS.
 *
 * Both directions matter, for different reasons. `unlisted` catches the dangerous case: a flag
 * created in code that nobody attested — the silent bar expansion AC6 prohibits. `orphaned` catches
 * the corrosive one: an entry left behind after its flag was removed, which makes the bar drift from
 * describing reality and, entry by entry, into a document nobody trusts enough to read.
 */
export function checkRegistryConformance(
  registryKeys: readonly string[],
  allowlistedKeys: readonly string[],
  declaredCount: number,
): ConformanceResult {
  const allowSet = new Set(allowlistedKeys);
  const registrySet = new Set(registryKeys);
  return {
    unlisted: registryKeys.filter((k) => !allowSet.has(k)).sort(),
    orphaned: allowlistedKeys.filter((k) => !registrySet.has(k)).sort(),
    countMismatch:
      declaredCount === allowlistedKeys.length
        ? null
        : { declared: declaredCount, actual: allowlistedKeys.length },
  };
}

export function conformanceIsClean(r: ConformanceResult): boolean {
  return r.unlisted.length === 0 && r.orphaned.length === 0 && r.countMismatch === null;
}
