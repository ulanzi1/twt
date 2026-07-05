// scripts/access-wrapper-invariants/lib.ts
//
// Pure scanner for the Epic-4 retrospective **AI-4-3** access-wrapper invariant
// (the I-3 "access wrapper is the new TOCTOU" family): every validity ACCESS
// ENTRYPOINT must declare an explicit `caller` XOR `internal` marker and fail
// CLOSED when neither is supplied — so no entrypoint can DEFAULT to returning a
// full, unredacted, unaudited payload (the exact 4.6 omitted-caller defect).
//
// An ACCESS ENTRYPOINT is an exported `async` function whose declared return type
// is `Promise<…MemberValidityPayload>` — i.e. it hands a validity payload across
// the service boundary. (The pure sync assemblers/redactors — `assemblePayload`,
// `redactForCaller` — return a BARE, non-Promise payload and are NOT boundaries;
// keying on `Promise<…MemberValidityPayload>` excludes them by construction.)
//
// CONFORMANT iff EITHER:
//   (G) it contains the fail-closed guard — an `if (!x.caller && !x.internal) throw`
//       (operand order-insensitive; the `getValidityAt` / `getValidityCached` step 0), OR
//   (D) it is a pure DELEGATOR — its sole `return` forwards its own options
//       parameter, unchanged, to another call (the `getValidity` → `getValidityAt`
//       shape, which inherits the delegate's guard). Forwarding a *literal*
//       `{ internal: true }` does NOT qualify — that is an auto-internal bypass and
//       is flagged.
//
// AST-based (TypeScript compiler) for precision — a `caller`/`internal` mention in
// a comment or string never matches.

import * as ts from 'typescript';

export interface AccessWrapperFinding {
  file: string;
  line: number;
  fn: string;
}

const PAYLOAD_TYPE = 'MemberValidityPayload';

/** Does this function's declared return type hand a validity payload across an async boundary? */
function returnsPromisedPayload(node: ts.FunctionDeclaration): boolean {
  if (!node.type) return false;
  const t = node.type.getText();
  return t.includes('Promise<') && t.includes(PAYLOAD_TYPE);
}

function hasAsyncModifier(node: ts.FunctionDeclaration): boolean {
  return (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
}

function hasExportModifier(node: ts.FunctionDeclaration): boolean {
  return (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

/** `!<expr>.caller` / `!<expr>.internal` → returns 'caller' | 'internal' | null. */
function negatedMarkerName(expr: ts.Expression): 'caller' | 'internal' | null {
  if (!ts.isPrefixUnaryExpression(expr) || expr.operator !== ts.SyntaxKind.ExclamationToken) {
    return null;
  }
  const operand = expr.operand;
  if (!ts.isPropertyAccessExpression(operand)) return null;
  const name = operand.name.text;
  return name === 'caller' || name === 'internal' ? name : null;
}

/** (G) A `!x.caller && !x.internal` (either order) condition whose `then` throws. */
function hasFailClosedGuard(fn: ts.FunctionDeclaration): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.isIfStatement(node) && ts.isBinaryExpression(node.expression)) {
      const bin = node.expression;
      if (bin.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        const left = negatedMarkerName(bin.left);
        const right = negatedMarkerName(bin.right);
        const guardsBoth =
          (left === 'caller' && right === 'internal') ||
          (left === 'internal' && right === 'caller');
        if (guardsBoth && statementThrows(node.thenStatement)) found = true;
      }
    }
    ts.forEachChild(node, visit);
  };
  if (fn.body) visit(fn.body);
  return found;
}

/** Does this statement (block or single) contain a `throw`? */
function statementThrows(stmt: ts.Statement): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.isThrowStatement(node)) found = true;
    ts.forEachChild(node, visit);
  };
  visit(stmt);
  return found;
}

/**
 * (D) A pure delegator: the function has exactly ONE `return`, it returns a call
 * expression, and that call forwards the function's own options parameter (the
 * LAST parameter) unchanged, as a bare identifier argument. This exempts
 * `getValidity` (which forwards `opts` to `getValidityAt`) while still flagging a
 * function that hands a literal `{ internal: true }` to the delegate.
 */
function isPureDelegator(fn: ts.FunctionDeclaration): boolean {
  const params = fn.parameters;
  if (params.length === 0) return false;
  const lastParam = params[params.length - 1].name;
  if (!ts.isIdentifier(lastParam)) return false;
  const optsName = lastParam.text;

  const returns: ts.ReturnStatement[] = [];
  const collect = (node: ts.Node): void => {
    // Do not descend into nested function bodies — inner returns aren't this fn's.
    if (
      node !== fn &&
      (ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node))
    ) {
      return;
    }
    if (ts.isReturnStatement(node)) returns.push(node);
    ts.forEachChild(node, collect);
  };
  if (fn.body) collect(fn.body);

  if (returns.length !== 1) return false;
  const expr = returns[0].expression;
  if (!expr || !ts.isCallExpression(expr)) return false;
  // The options param must appear, verbatim, as one of the forwarded arguments.
  return expr.arguments.some((a) => ts.isIdentifier(a) && a.text === optsName);
}

/** Scan one TypeScript source for non-conformant validity access entrypoints. */
export function scanAccessWrapperInvariant(file: string, source: string): AccessWrapperFinding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, /* setParentNodes */ true);
  const findings: AccessWrapperFinding[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      hasExportModifier(node) &&
      hasAsyncModifier(node) &&
      returnsPromisedPayload(node)
    ) {
      if (!hasFailClosedGuard(node) && !isPureDelegator(node)) {
        const { line } = sf.getLineAndCharacterOfPosition(node.name.getStart(sf));
        findings.push({ file, line: line + 1, fn: node.name.text });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return findings;
}

export function formatFinding(f: AccessWrapperFinding): string {
  return (
    `${f.file}:${f.line} — validity access entrypoint \`${f.fn}\` can default to returning a ` +
    `full unredacted payload. It must fail CLOSED on an omitted caller: add ` +
    `\`if (!opts.caller && !opts.internal) throw new Error(...)\` as step 0 ` +
    `(pass \`{ internal: true }\` for a genuine trusted system call), or delegate to a ` +
    `guarded entrypoint forwarding \`opts\`. See docs/access-wrapper-invariants.md (AI-4-3).`
  );
}
