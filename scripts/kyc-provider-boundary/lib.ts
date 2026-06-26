// scripts/kyc-provider-boundary/lib.ts
//
// Pure scanner for the Story 3.3a AC3 invariant: the DigiLocker SDK / transport
// (`xml-crypto` + its `@xmldom/xmldom` / `xpath` / `@xmldom/is-dom-node` deps — there is
// NO first-party DigiLocker Node SDK, so this is the direct-XMLDSig transport) may be
// imported ONLY from inside the sole provider directory
// (`apps/api/src/modules/kyc/providers/digilocker/`). Any OTHER source file importing the
// transport is an architectural-freeze-row-13 / AR-43 violation — it would couple a
// consumer to DigiLocker-specifics, breaking the "provider swap = single-module change"
// property.
//
// AST-detected (mirror member-state-invariant / domain-accessor-invariants), so a banned
// module name appearing in a comment or string literal never matches. FLAGGED forms:
//   · `import … from 'xml-crypto'`         — static import (named / default / side-effect)
//   · `export … from 'xml-crypto'`         — re-export
//   · `import('xml-crypto')`               — dynamic import
//   · `require('xml-crypto')`              — CJS require
//
// This is the STATIC authoring-time gate (AC3). It is self-green by construction: the
// ONLY files that import the transport live under the allowlisted provider directory.

import * as ts from 'typescript';

export interface ForbiddenImportFinding {
  file: string;
  line: number;
  module: string;
}

/**
 * The DigiLocker transport module family. Banned outside the provider directory. A
 * bare specifier OR any subpath (`xml-crypto/lib/...`) of a banned root matches.
 */
export const DIGILOCKER_TRANSPORT_MODULES: readonly string[] = [
  'xml-crypto',
  '@xmldom/xmldom',
  '@xmldom/is-dom-node',
  'xpath',
];

/** True iff `specifier` is one of the banned roots (or a subpath of one). */
export function isForbiddenModule(specifier: string, banned = DIGILOCKER_TRANSPORT_MODULES): boolean {
  return banned.some((m) => specifier === m || specifier.startsWith(`${m}/`));
}

/** Read the literal module specifier from an `import('x')` / `require('x')` call, if any. */
function dynamicImportOrRequireSpecifier(node: ts.CallExpression): string | undefined {
  const isImportCall = node.expression.kind === ts.SyntaxKind.ImportKeyword;
  const isRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require';
  if (!isImportCall && !isRequire) return undefined;
  const arg = node.arguments[0];
  return arg && ts.isStringLiteral(arg) ? arg.text : undefined;
}

/** Scan one TypeScript source for imports of the banned DigiLocker transport modules. */
export function scanForbiddenTransportImports(
  file: string,
  source: string,
  banned = DIGILOCKER_TRANSPORT_MODULES,
): ForbiddenImportFinding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, /* setParentNodes */ true);
  const findings: ForbiddenImportFinding[] = [];

  const push = (node: ts.Node, module: string): void => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    findings.push({ file, line: line + 1, module });
  };

  const visit = (node: ts.Node): void => {
    // `import … from 'x'` / `export … from 'x'` (the moduleSpecifier is a string literal).
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      isForbiddenModule(node.moduleSpecifier.text, banned)
    ) {
      push(node, node.moduleSpecifier.text);
    }

    // `import('x')` / `require('x')`.
    if (ts.isCallExpression(node)) {
      const spec = dynamicImportOrRequireSpecifier(node);
      if (spec && isForbiddenModule(spec, banned)) {
        push(node, spec);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return findings;
}

export function formatFinding(f: ForbiddenImportFinding): string {
  return (
    `${f.file}:${f.line} — imports the DigiLocker transport '${f.module}' outside the provider ` +
    `directory. The DigiLocker SDK/transport may be imported ONLY from ` +
    `apps/api/src/modules/kyc/providers/digilocker/** (Story 3.3a AC3 / AR-43). Consume the ` +
    `'@twt/contracts' KycProvider port instead — that is the single-module-swap seam.`
  );
}
