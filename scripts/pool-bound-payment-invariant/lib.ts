// scripts/pool-bound-payment-invariant/lib.ts
//
// Pure scanner for the Story 7.6 AC3 facilitated-recovery INVARIANT: no code path may silently remap /
// auto-reassign / move funds for a wrong-pool payment. The unsafe surface is a function/handler that
// takes a `(wrong-pool-payment, target-pool)` shaped pair AND writes records — i.e. a CROSS-POOL REMAP
// surface. AC3 is a NEGATIVE commitment (D4): the unsafe operation must be structurally impossible, and
// this gate fails if one ever appears. Twin of scripts/pool-state-invariant/lib.ts (TS-AST, not a
// substring scan, so a `targetPool` in a comment/string never matches).
//
// ── What is FLAGGED (all three must hold on one function-like node) ────────────
//   (1) hasPaymentParam   — a parameter, destructured field, body-level destructured name, OR body-level
//                           property-access read (see below) named like a wrong-pool payment (wrong_pool /
//                           payment / contribution / deposit), AND
//   (2) hasTargetPoolParam — likewise named like a DESTINATION/other pool to move it into (target /
//                           destination / dest / correct / remap / reassign / move / assigned / new / to /
//                           into / other + "pool", either order), AND
//   (3) writesRecords     — the body performs a DB mutation (.update/.insert/.delete/.execute).
// A function that pairs a payment with a target pool AND writes is, by construction, the remap surface
// the invariant forbids — the three forbidden ops (auto-move / auto-reassign / auto-phantom) all have
// exactly this shape. The ONLY allowed modification is to the wrong-pool record ITSELF (its validity
// flag + helpdesk-case linkage) — that has NO target-pool parameter, so it never trips (1)+(2)+(3).
//
// ── Body-level reads, not just the parameter list (Story 7.6 code-review findings) ────────────────────
// A Fastify handler in this codebase takes a single `request` param and reads `request.body` INSIDE the
// function body — in EITHER of two idioms: object-destructuring (`const { contributionId, targetPoolId } =
// request.body`) OR property access (`const targetPoolId = request.body.targetPoolId`; or a whole-object
// alias `const b = request.body; … b.targetPool`). A parameter-list-only scan misses both — the realistic
// shapes a remap endpoint would actually take. So (1)/(2) also match names bound by object-destructuring
// VARIABLE DECLARATIONS *and* the property names of PROPERTY-ACCESS reads in the function's OWN body (not a
// nested function's body — each function-like node owns only its own; names are outer-scope by design,
// whereas the write scan (3) is body-wide so a write wrapped in `db.transaction(tx => tx.update(…))` still
// counts). The earlier revision covered only the destructuring idiom and over-claimed it was "the idiom
// every real handler uses" — this repo in fact reads `request.body` mostly by property access, so both
// forms are now scanned.
//
// ── Why this is precise, not fuzzy (heed [[feedback_gate_scope_semantic_coverage]]) ──
// The pure classifier `classifyContributionDestination(input: { assignedPoolId, depositedToPoolId })` is
// the obvious near-miss: it names two pool ids, and its body reads `input.depositedToPoolId` /
// `input.assignedPoolId` — so the property-access scan now DOES surface both a payment-shaped
// (`deposited…`) and a target-pool-shaped (`assigned…Pool`) name. It stays green for the ONE robust
// reason that a classifier can never violate: it is PURE — no DB write (3) — so (1)+(2)+(3) never all
// hold. (Requirement (3) — the write — is what separates a remap from a read/classify; a pure predicate
// is structurally incapable of tripping it.) The teeth are proven by known-bad fixtures in lib.test.ts,
// including the AC3.9(a)/(c) wording itself (`assignedPoolId`), the request.body destructuring AND
// property-access handler idioms, and the ordinary `newPoolId`-style target names — a green scan over
// new files alone proves nothing.
//
// ── Known residual limitation (documented, not silently claimed away) ──────────────────────────────────
// This remains a syntactic, single-function-scope AST scan — it does NOT do cross-function call-graph
// analysis. Splitting resolve-target-pool and write-the-record across two separately-named functions
// (neither pairing payment + target-pool + write in ONE function-like node) is a real gap this gate
// cannot close without semantic analysis. Treat this gate as a tripwire against the common-case mistake,
// not a formal proof of AC3 — code review remains the backstop for a deliberately split remap.

import * as ts from 'typescript';

export interface CrossPoolRemapFinding {
  file: string;
  line: number;
  detail: string;
  /** The offending function's name (if any) — for the report. */
  functionName: string | undefined;
}

/** A parameter/destructured-name matching a wrong-pool PAYMENT (the thing being moved). */
const PAYMENT_PARAM = /(wrong.?pool|payment|contribution|deposit)/i;
/** A parameter/destructured-name matching a DESTINATION/other pool to move the payment INTO. Both
 *  orderings share the SAME synonym list — an earlier asymmetric version let `poolCorrect`/`poolMove`
 *  evade the reverse-order alternative; `assigned` covers AC3.9(a)/(c)'s own wording ("move to the
 *  member's assigned pool" / "phantom … in the assigned pool"). The `new|to|dest|into|other` tokens
 *  (Story 7.6 code-review finding) cover the most natural remap-target names a developer would reach for
 *  — `newPool(Id)` / `toPool(Id)` / `destPool` / `intoPool` / `otherPool` — which the earlier list missed. */
const TARGET_POOL_SYNONYMS =
  'target|destination|dest|correct|remap|reassign|move|assigned|new|into|other|to';
const TARGET_POOL_PARAM = new RegExp(
  `(${TARGET_POOL_SYNONYMS}).*pool|pool.*(${TARGET_POOL_SYNONYMS})`,
  'i',
);
/** DB-mutation method names — a write, never a read (`.select` is deliberately absent). `set`/`values`
 *  are deliberately ABSENT too: every Drizzle write already routes through `.update`/`.insert` (so they
 *  add no detection), while `.set`/`.values` alone also match `Map.prototype.set` / `Object.values` and
 *  would false-positive a pure function using a Map (Story 7.6 code-review finding). */
const WRITE_METHODS = new Set(['update', 'insert', 'delete', 'execute']);

/** Flatten an object/array-destructuring BindingName into its bound + property names (`{ payment,
 *  targetPool }` and `{ target: targetPool }` are both seen). Shared by the parameter-list walk and the
 *  body-level destructuring walk below. */
function pushBindingNames(name: ts.BindingName, names: string[]): void {
  if (ts.isIdentifier(name)) {
    names.push(name.text);
  } else if (ts.isObjectBindingPattern(name)) {
    for (const el of name.elements) {
      // The binding property name (destructured field), and any local alias.
      if (el.propertyName && ts.isIdentifier(el.propertyName)) names.push(el.propertyName.text);
      pushBindingNames(el.name, names);
    }
  } else if (ts.isArrayBindingPattern(name)) {
    for (const el of name.elements) if (ts.isBindingElement(el)) pushBindingNames(el.name, names);
  }
}

/** Collect the parameter NAMES of a function-like node, flattening object-destructuring bindings so a
 *  `({ payment, targetPool })` signature is seen the same as `(payment, targetPool)`. */
function parameterNames(fn: ts.FunctionLikeDeclarationBase): string[] {
  const names: string[] = [];
  for (const p of fn.parameters) pushBindingNames(p.name, names);
  return names;
}

/** Collect names bound by object/array-destructuring VARIABLE DECLARATIONS inside the function's own
 *  body — e.g. `const { contributionId, targetPoolId } = request.body` — the Fastify handler idiom every
 *  real handler in this codebase uses (body destructured, not signature-destructured). Does NOT descend
 *  into a nested function-like node's body; that node's own scan call owns its own destructuring. */
function bodyDestructuredNames(fn: ts.FunctionLikeDeclarationBase): string[] {
  const names: string[] = [];
  if (!fn.body) return names;
  const visit = (node: ts.Node): void => {
    if (node !== fn.body && ts.isFunctionLike(node)) return;
    if (ts.isVariableDeclaration(node) && !ts.isIdentifier(node.name)) {
      pushBindingNames(node.name, names);
    }
    ts.forEachChild(node, visit);
  };
  visit(fn.body);
  return names;
}

/** Collect the property NAMES read by property-access in the function's own body — e.g.
 *  `request.body.targetPoolId` (name `targetPoolId`) or a whole-object alias `const b = request.body;
 *  … b.targetPool` (name `targetPool`) — the OTHER `request.body` handler idiom this repo uses (property
 *  access, not destructuring). Like {@link bodyDestructuredNames} it does NOT descend into a nested
 *  function-like node's body (names are outer-scope by design). Only the accessed member name is
 *  collected, so it slots into the same PAYMENT/TARGET regex test as a param/destructured name. */
function bodyPropertyAccessNames(fn: ts.FunctionLikeDeclarationBase): string[] {
  const names: string[] = [];
  if (!fn.body) return names;
  const visit = (node: ts.Node): void => {
    if (node !== fn.body && ts.isFunctionLike(node)) return;
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.name)) {
      names.push(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(fn.body);
  return names;
}

/** Does the function body contain a DB-mutation call (`x.update(...)`, `x.insert(...)`, `.delete(...)`, …)? */
function bodyWritesRecords(fn: ts.FunctionLikeDeclarationBase): boolean {
  if (!fn.body) return false;
  let writes = false;
  const visit = (node: ts.Node): void => {
    if (writes) return;
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      if (WRITE_METHODS.has(node.expression.name.text)) {
        writes = true;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(fn.body);
  return writes;
}

/** The declared name of a function-like node (declaration, method, or arrow/function assigned to a const). */
function functionNameOf(fn: ts.FunctionLikeDeclarationBase): string | undefined {
  if ((ts.isFunctionDeclaration(fn) || ts.isMethodDeclaration(fn) || ts.isFunctionExpression(fn)) && fn.name) {
    if (ts.isIdentifier(fn.name)) return fn.name.text;
  }
  if (
    (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) &&
    fn.parent &&
    ts.isVariableDeclaration(fn.parent) &&
    ts.isIdentifier(fn.parent.name)
  ) {
    return fn.parent.name.text;
  }
  return undefined;
}

/** Scan one TypeScript source for a cross-pool remap surface. */
export function scanCrossPoolRemap(file: string, source: string): CrossPoolRemapFinding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, /* setParentNodes */ true);
  const findings: CrossPoolRemapFinding[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isFunctionLike(node)) {
      const fn = node as ts.FunctionLikeDeclarationBase;
      const names = [
        ...parameterNames(fn),
        ...bodyDestructuredNames(fn),
        ...bodyPropertyAccessNames(fn),
      ];
      const hasPayment = names.some((n) => PAYMENT_PARAM.test(n));
      const hasTargetPool = names.some((n) => TARGET_POOL_PARAM.test(n));
      if (hasPayment && hasTargetPool && bodyWritesRecords(fn)) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        findings.push({
          file,
          line: line + 1,
          functionName: functionNameOf(fn),
          detail:
            'a function pairs a wrong-pool payment with a TARGET pool AND writes records — a cross-pool ' +
            'remap surface the facilitated-recovery invariant forbids (auto-move / auto-reassign / auto-phantom)',
        });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return findings;
}

export function formatFinding(f: CrossPoolRemapFinding): string {
  const named = f.functionName ? ` in \`${f.functionName}\`` : '';
  return (
    `${f.file}:${f.line}${named} — ${f.detail}. ` +
    `A wrong-pool payment MUST NOT be silently remapped/auto-reassigned/moved (Story 7.6 AC3): it breaks ` +
    `deterministic assignment + audit lineage. The only sanctioned alteration is the ≥2-trustee ` +
    `attestable-correction seam; the only allowed write is to the wrong-pool record itself (validity flag ` +
    `+ helpdesk-case linkage), never cross-pool. See scripts/pool-bound-payment-invariant/README.md.`
  );
}
