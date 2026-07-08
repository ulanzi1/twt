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

// ---------------------------------------------------------------------------
// AI-5-1 — channel-surface constant-time secret-compare invariant (the second
// mechanized slice; extends the gate to the Epic-5 access surface).
//
// The invariant is CONDITIONAL on the presence of verification: within a
// VERIFICATION CONTEXT, any comparison of two RUNTIME values must go through an
// approved constant-time comparator — never `===`/`!==`/`==`/`!=` or
// `.includes`/`.startsWith`/`.localeCompare`. Where no verification exists there
// is nothing to get wrong and the invariant is satisfied by construction — so
// there is no synthetic "≥1 compare" canary; the finding is PRODUCED BY the
// verification context, not asserted against a global minimum.
//
// This catches the exact Story 5.4 defect (`hub.verify_token` compared with a
// plain `!==` — a webhook-auth timing side-channel). Anchoring on the
// verification *context* (not on a secret-name lexicon) also catches a secret
// compared under an innocuously-named variable.
// ---------------------------------------------------------------------------

/** Approved constant-time comparators — a compare routed through one is conformant. */
const APPROVED_COMPARATORS = new Set(['timingSafeEqual', 'timingSafeEqualString', 'timingSafeHashCompare']);
/** String methods that leak a byte-wise / early-exit compare when used on two runtime values. */
const UNSAFE_STRING_METHODS = new Set(['includes', 'startsWith', 'localeCompare']);
/**
 * Signature / verify-token header keys whose read marks a verification context —
 * matched by shape (`x-*-signature[-256]` / `x-*-secret-token` / `hub.verify_token`)
 * rather than a fixed lexicon, so a future channel's differently-named header
 * (e.g. `x-line-signature`) still registers without a code change.
 */
function isVerifyHeaderKey(text: string): boolean {
  const t = text.toLowerCase();
  if (t === 'hub.verify_token') return true;
  return t.startsWith('x-') && (t.endsWith('-signature') || t.endsWith('-signature-256') || t.endsWith('-secret-token'));
}
const HMAC_FN = 'createHmac';
/** A `resolve*Secret*` call resolves a channel secret for comparison (e.g. `resolveChannelSecret`). */
const SECRET_RESOLVER_RE = /^resolve.*Secret/i;
const VERIFY_SIGNATURE_RE = /^verify.*Signature$/;

type FunctionLike =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration
  | ts.GetAccessorDeclaration
  | ts.SetAccessorDeclaration
  | ts.ConstructorDeclaration;

function isFunctionLike(node: ts.Node): node is FunctionLike {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node)
  );
}

/** The `name` of a call's callee, receiver-insensitive (`f()` and `x.f()` both → 'f'). */
function calleeName(call: ts.CallExpression): string | null {
  const e = call.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.name.text;
  return null;
}

/**
 * Collect a function's OWN body nodes, NOT descending into nested function-like
 * scopes — so a verification signal (or a compare) inside a nested method is
 * attributed to that method, never leaked up to its enclosing factory.
 */
function collectOwnNodes(fn: FunctionLike): ts.Node[] {
  const acc: ts.Node[] = [];
  const body = fn.body;
  if (!body) return acc;
  const visit = (node: ts.Node): void => {
    acc.push(node);
    node.forEachChild((child) => {
      if (isFunctionLike(child)) return; // stop at a nested scope
      visit(child);
    });
  };
  body.forEachChild(visit);
  return acc;
}

/**
 * A function body is a VERIFICATION CONTEXT iff it (in its own nodes) computes an
 * HMAC, reads a signature/verify-token header, resolves a channel secret, or
 * calls an approved constant-time comparator / `verify*Signature` helper. Any of
 * these establishes that the function checks an incoming credential.
 */
function isVerificationContext(ownNodes: ts.Node[]): boolean {
  for (const node of ownNodes) {
    if (ts.isCallExpression(node)) {
      const name = calleeName(node);
      if (name === HMAC_FN || (name && SECRET_RESOLVER_RE.test(name))) return true;
      if (name && APPROVED_COMPARATORS.has(name)) return true;
      if (name && VERIFY_SIGNATURE_RE.test(name)) return true;
    }
    if (ts.isStringLiteral(node) && isVerifyHeaderKey(node.text)) return true;
  }
  return false;
}

/** A compile-time-constant operand — never a runtime secret value. */
function isLiteralNode(n: ts.Node): boolean {
  return (
    ts.isStringLiteral(n) ||
    ts.isNumericLiteral(n) ||
    ts.isBigIntLiteral(n) ||
    ts.isRegularExpressionLiteral(n) ||
    ts.isNoSubstitutionTemplateLiteral(n) ||
    ts.isVoidExpression(n) || // `void 0`
    n.kind === ts.SyntaxKind.TrueKeyword ||
    n.kind === ts.SyntaxKind.FalseKeyword ||
    n.kind === ts.SyntaxKind.NullKeyword ||
    (ts.isIdentifier(n) && n.text === 'undefined')
  );
}

/**
 * An operand is EXEMPT (not a runtime secret) if it is a literal, a `.length`
 * read (public shape metadata, never the secret bytes), or a local `const`
 * initialized to a literal (`SIGNATURE_PREFIX = 'sha256='`). A compare where
 * EITHER operand is exempt is a control-flow / shape check, not a secret compare.
 */
function isExemptOperand(n: ts.Node, constLiterals: Set<string>): boolean {
  if (isLiteralNode(n)) return true;
  if (ts.isPropertyAccessExpression(n) && n.name.text === 'length') return true;
  if (ts.isIdentifier(n) && constLiterals.has(n.text)) return true;
  return false;
}

/**
 * `const`-with-literal-initializer names among a flat list of nodes (no recursion —
 * callers pass either a source file's top-level statements or a function's own
 * nodes, both already the right shape to scan directly).
 */
function collectConstLiteralsFromNodes(nodes: readonly ts.Node[]): Set<string> {
  const names = new Set<string>();
  for (const node of nodes) {
    if (ts.isVariableStatement(node) && (node.declarationList.flags & ts.NodeFlags.Const) !== 0) {
      for (const d of node.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.initializer && isLiteralNode(d.initializer)) {
          names.add(d.name.text);
        }
      }
    }
  }
  return names;
}

/**
 * const-literals declared at MODULE scope (the source file's top-level statements,
 * outside any function) — genuinely visible from every function in the file.
 * Deliberately NOT a whole-file recursive walk: a `const` local to one function
 * must never exempt an unrelated compare in a different function (that was the
 * bug — a same-named local literal anywhere in the file silently exempted a real
 * secret compare elsewhere). Per-function locals are scoped separately in
 * `scanSecretCompareInvariant` via `collectOwnNodes` + this same helper.
 */
function collectTopLevelConstLiterals(sf: ts.SourceFile): Set<string> {
  return collectConstLiteralsFromNodes(sf.statements);
}

const EQUALITY_OPS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
]);

/**
 * If `node` is a runtime-vs-runtime unsafe compare, return the node to report;
 * else null. Covers `===`/`!==`/`==`/`!=` and `.includes`/`.startsWith`/
 * `.localeCompare`. Exempt if EITHER operand is a literal / `.length` /
 * const-literal (§ isExemptOperand).
 */
function unsafeCompareNode(node: ts.Node, constLiterals: Set<string>): ts.Node | null {
  if (ts.isBinaryExpression(node) && EQUALITY_OPS.has(node.operatorToken.kind)) {
    if (!isExemptOperand(node.left, constLiterals) && !isExemptOperand(node.right, constLiterals)) {
      return node;
    }
    return null;
  }
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    UNSAFE_STRING_METHODS.has(node.expression.name.text)
  ) {
    const receiver = node.expression.expression;
    const arg = node.arguments[0];
    if (arg && !isExemptOperand(receiver, constLiterals) && !isExemptOperand(arg, constLiterals)) {
      return node;
    }
  }
  return null;
}

/** The display name of a function-like node (declared name, or the var/property it's bound to). */
function functionDisplayName(fn: FunctionLike, sf: ts.SourceFile): string {
  if (ts.isConstructorDeclaration(fn)) return 'constructor';
  if (!ts.isArrowFunction(fn) && fn.name) return fn.name.getText(sf);
  const p = fn.parent;
  if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.getText(sf);
  if (p && ts.isPropertyAssignment(p)) return p.name.getText(sf);
  return '<anonymous>';
}

/**
 * Scan one TypeScript source for runtime-vs-runtime compares inside verification
 * contexts that bypass an approved constant-time comparator. Pure TS-AST, DB-free.
 */
export function scanSecretCompareInvariant(file: string, source: string): AccessWrapperFinding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, /* setParentNodes */ true);
  const topLevelConstLiterals = collectTopLevelConstLiterals(sf);
  const findings: AccessWrapperFinding[] = [];

  const walk = (node: ts.Node): void => {
    if (isFunctionLike(node)) {
      const own = collectOwnNodes(node);
      if (isVerificationContext(own)) {
        const fn = functionDisplayName(node, sf);
        const constLiterals = new Set([...topLevelConstLiterals, ...collectConstLiteralsFromNodes(own)]);
        for (const n of own) {
          const bad = unsafeCompareNode(n, constLiterals);
          if (bad) {
            const { line } = sf.getLineAndCharacterOfPosition(bad.getStart(sf));
            findings.push({ file, line: line + 1, fn });
          }
        }
      }
    }
    ts.forEachChild(node, walk);
  };

  walk(sf);
  return findings;
}

export function formatSecretCompareFinding(f: AccessWrapperFinding): string {
  return (
    `${f.file}:${f.line} — verification context \`${f.fn}\` compares two runtime values with a ` +
    `non-constant-time operator (\`===\`/\`!==\`/\`==\`/\`!=\`/\`.includes\`/\`.startsWith\`/\`.localeCompare\`). A ` +
    `credential compare must be timing-safe: route it through \`timingSafeEqual\` / ` +
    `\`timingSafeEqualString\` / \`timingSafeHashCompare\` (the Story 5.4 \`hub.verify_token\` defect). ` +
    `See docs/access-wrapper-invariants.md (AI-5-1).`
  );
}

// ---------------------------------------------------------------------------
// AI-5-3 — compensating-audit invariant (the third mechanized slice; ADR-0030 /
// Epic 5 retrospective AI-5-3).
//
// POSITIVE invariant (not a mutation-name heuristic): within the declared scan
// roots, a direct call to `audit.writeAuditEntry` is non-conformant UNLESS the
// enclosing FILE is on the named exemption list below. This deliberately does NOT
// try to detect "does this function hold a rollback-capable transaction handle" —
// that would require either fragile per-project naming assumptions (`scopeTx`) that
// miss real call sites (e.g. channel-config/degraded-mode's `scopeCtx(request)`
// indirection, which never mentions `scopeTx` in the handler body at all) or full
// cross-function dataflow tracing, which is out of scope for a cheap AST heuristic
// (mirrors the AI-4-3/AI-5-1 invariants' own precision-scoping discipline).
//
// Instead: `packages/domain/src/audit/compensating.ts` (`withCompensatingAudit` +
// `writeRolledBackAudit`) is the SOLE sanctioned caller of `audit.writeAuditEntry`
// for a compensatable write. A handful of pre-existing, reviewed AI-4-3(d)
// isolated-best-effort writes (no rollback-capable tx in scope at all — see
// ADR-0030 Context/Non-goals) are exempt BY FILE, not by function name (an
// anonymous-arrow return shape, e.g. `channels/audit.ts`'s `createAuditPort`, has no
// stable function-name to key on). Adding a file to the exemption list is a
// deliberate, reviewed scope-widening edit — the gate never infers an exemption.
// ---------------------------------------------------------------------------

/**
 * Files exempt from the compensating-audit invariant — each holds exactly one
 * direct `audit.writeAuditEntry` call, already documented inline as an isolated
 * best-effort write (AI-4-3(d)): no rollback-capable transaction handle is ever in
 * scope in these functions, so there is nothing for a subsequent audit failure to
 * diverge from (a missing audit line for an event that did happen, never a
 * persisted line for an event that didn't — see ADR-0030 Context).
 */
const COMPENSATING_AUDIT_EXEMPT_FILES = new Set<string>([
  'packages/channels/src/audit.ts',
  'apps/api/src/modules/device-token/push-invalidation.ts',
  'apps/api/src/modules/device-token/device-token.handlers.ts',
]);

/** Is `call` a call to `audit.writeAuditEntry(...)` (the `import { audit } from '@twt/domain'` shape)? */
function isAuditWriteAuditEntryCall(call: ts.CallExpression): boolean {
  const e = call.expression;
  return (
    ts.isPropertyAccessExpression(e) &&
    e.name.text === 'writeAuditEntry' &&
    ts.isIdentifier(e.expression) &&
    e.expression.text === 'audit'
  );
}

/**
 * Scan one TypeScript source for direct `audit.writeAuditEntry` calls outside the
 * canonical `withCompensatingAudit`/`writeRolledBackAudit` helper and the named
 * file exemptions. Pure TS-AST, DB-free.
 */
export function scanCompensatingAuditInvariant(file: string, source: string): AccessWrapperFinding[] {
  if (COMPENSATING_AUDIT_EXEMPT_FILES.has(file)) return [];

  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, /* setParentNodes */ true);
  const findings: AccessWrapperFinding[] = [];

  const walk = (node: ts.Node): void => {
    if (isFunctionLike(node)) {
      const fn = functionDisplayName(node, sf);
      for (const n of collectOwnNodes(node)) {
        if (ts.isCallExpression(n) && isAuditWriteAuditEntryCall(n)) {
          const { line } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
          findings.push({ file, line: line + 1, fn });
        }
      }
    }
    ts.forEachChild(node, walk);
  };

  walk(sf);
  return findings;
}

export function formatCompensatingAuditFinding(f: AccessWrapperFinding): string {
  return (
    `${f.file}:${f.line} — \`${f.fn}\` calls \`audit.writeAuditEntry\` directly. Route mutation+audit ` +
    `pairs through \`audit.withCompensatingAudit\` (or \`audit.writeRolledBackAudit\` for a recoverable ` +
    `compensation branch) — packages/domain/src/audit/compensating.ts is the sole sanctioned caller ` +
    `outside a named file exemption (ADR-0030). See docs/adr/ADR-0030-compensating-audit-mechanization.md (AI-5-3).`
  );
}
