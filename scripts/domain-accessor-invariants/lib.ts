// scripts/domain-accessor-invariants/lib.ts
//
// Pure scanner for the family-(a) domain-accessor invariant: every DYNAMIC
// `.limit(x)` in packages/domain MUST route its page size through `clampLimit(...)`
// (which clamps to [1, cap] — both bounds load-bearing; see
// packages/domain/src/pagination.ts).
//
// ACCEPTED:
//   · `.limit(<integer literal>)`   — a fixed bound, e.g. `.limit(1)` (single-row reads)
//   · `.limit(clampLimit(...))`     — the canonical clamped page size
// FLAGGED (the recurring review-finding family — 2.3 / 2.6 P6 / 2.7 P2):
//   · `.limit(opts.limit)` · `.limit(opts.limit ?? 50)` · `.limit(Math.min(x, 200))` · …
//     any dynamic expression that is not a `clampLimit(...)` call.
//
// AST-based (TypeScript compiler) for precision — a `.limit(` substring in a comment
// or string is not a CallExpression and never matches.

import * as ts from 'typescript';

export interface LimitFinding {
  file: string;
  line: number;
  expr: string;
}

const CLAMP_FN = 'clampLimit';

/** A `.limit(arg)` argument is acceptable iff it is an integer literal or a `clampLimit(...)` call. */
function isAcceptableLimitArg(arg: ts.Expression): boolean {
  // `.limit(50)` — a fixed numeric bound (e.g. single-row `.limit(1)`).
  if (ts.isNumericLiteral(arg)) return true;
  // `.limit(clampLimit(...))` — the canonical clamped page size.
  if (
    ts.isCallExpression(arg) &&
    ts.isIdentifier(arg.expression) &&
    arg.expression.text === CLAMP_FN
  ) {
    return true;
  }
  return false;
}

/** Scan one TypeScript source for non-conformant `.limit(...)` calls. */
export function scanLimitInvariant(file: string, source: string): LimitFinding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, /* setParentNodes */ true);
  const findings: LimitFinding[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'limit' &&
      node.arguments.length === 1
    ) {
      const arg = node.arguments[0];
      if (!isAcceptableLimitArg(arg)) {
        const { line } = sf.getLineAndCharacterOfPosition(arg.getStart(sf));
        findings.push({ file, line: line + 1, expr: arg.getText(sf) });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return findings;
}

export function formatFinding(f: LimitFinding): string {
  return (
    `${f.file}:${f.line} — dynamic \`.limit(${f.expr})\` is not clamped. ` +
    `Route the page size through \`clampLimit(opts.limit, { default: N, cap: 200 })\` ` +
    `(import { clampLimit } from '../pagination.js'), or use an integer literal for a fixed bound.`
  );
}
