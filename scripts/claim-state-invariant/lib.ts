// scripts/claim-state-invariant/lib.ts
//
// Pure scanner for the Story 6.1 AC3 invariant: `claims.current_state` is a
// replay-derived cache and may be written ONLY by the event-replay projector
// (packages/domain/src/claim/project.ts). Any OTHER code path that writes the
// `current_state` column of the `claims` table is an architectural violation (it
// would let the cache diverge from the event-sourced source of truth — the ₹50L/
// decision flow). Twin of scripts/member-state-invariant/lib.ts.
//
// FLAGGED write forms (AST-detected → a `.set({ currentState })` substring in a
// comment/string never matches, mirror member-state-invariant):
//   · `db.update(claims).set({ currentState: ... })`                     — canonical UPDATE
//   · `db.insert(claims).values({ currentState: … })`                    — bare INSERT (create-time)
//   · `db.insert(claims)…onConflictDoUpdate({ set: { currentState: … } })` — upsert UPDATE
//   · `claims.currentState = …`                                          — direct assignment
//
// The table target (`claims`) is matched whether referenced as a bare identifier
// (`claims`) or via a namespaced/property access (`schema.claims`) — the codebase's
// own `import * as schema from '.../schema/index.js'` convention (used throughout
// packages/domain/tests) would otherwise silently evade a bare-identifier-only check
// (Story 6.1 review finding). Likewise `objectHasStateKey` recognizes a computed
// property key (`{ [col]: value }`) whose key is a literal `'currentState'` string,
// not just a plain/shorthand identifier.
//
// NOTE the Drizzle FIELD name is `currentState` (camelCase of the `current_state`
// column) — the scanner matches the TS property, not the SQL column.
//
// This is the STATIC authoring-time guard (AC3). The DB trigger (migration 0051, AC3)
// is the independent RUNTIME guard that also catches raw SQL — it fires on BOTH
// INSERT and UPDATE (Story 6.1 review finding: a BEFORE UPDATE-only trigger would
// never guard a claim row's first-INSERT state write). Both guards are required —
// they are different layers (Story 6.1 Dev Notes "The load-bearing invariant").

import * as ts from 'typescript';

export interface ClaimStateWriteFinding {
  file: string;
  line: number;
  detail: string;
}

const CLAIMS_TABLE = 'claims';
const STATE_COLUMN = 'currentState';

/** The table name a `.update(X)`/`.insert(X)` argument refers to — whether `X` is a
 * bare identifier (`claims`) or a namespaced/property access (`schema.claims`). */
function tableNameOf(expr: ts.Expression): string | undefined {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return undefined;
}

/** Does an object literal carry a `currentState` property (assignment, shorthand, or
 * a computed key that is literally the string `'currentState'`)? */
function objectHasStateKey(arg: ts.Expression): boolean {
  if (!ts.isObjectLiteralExpression(arg)) return false;
  return arg.properties.some((p) => {
    if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) {
      const name = p.name;
      if (ts.isIdentifier(name)) return name.text === STATE_COLUMN;
      if (ts.isStringLiteral(name)) return name.text === STATE_COLUMN;
      if (ts.isComputedPropertyName(name) && ts.isStringLiteral(name.expression)) {
        return name.expression.text === STATE_COLUMN;
      }
    }
    return false;
  });
}

/**
 * Walk a method/property chain LEFTWARD from `node`, returning true if it contains a
 * `.update(claims)` or `.insert(claims)` call (the table operation that, combined with
 * a `currentState` write below it, targets the claims.current_state cache). Matches
 * the table argument whether it's a bare identifier or a namespaced property access.
 */
function chainTargetsClaims(node: ts.Node): boolean {
  let cur: ts.Node | undefined = node;
  while (cur) {
    if (ts.isCallExpression(cur)) {
      const callee = cur.expression;
      if (ts.isPropertyAccessExpression(callee)) {
        const method = callee.name.text;
        if ((method === 'update' || method === 'insert') && cur.arguments.length >= 1) {
          const a = cur.arguments[0];
          if (a && tableNameOf(a) === CLAIMS_TABLE) return true;
        }
        cur = callee.expression;
        continue;
      }
      cur = cur.expression;
      continue;
    }
    if (ts.isPropertyAccessExpression(cur)) {
      cur = cur.expression;
      continue;
    }
    break;
  }
  return false;
}

/** The `set` property of an `onConflictDoUpdate({ set: {...} })` argument, if any. */
function onConflictSetObject(arg: ts.Expression): ts.Expression | undefined {
  if (!ts.isObjectLiteralExpression(arg)) return undefined;
  for (const p of arg.properties) {
    if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'set') {
      return p.initializer;
    }
  }
  return undefined;
}

/** Scan one TypeScript source for `claims.current_state` writes. */
export function scanClaimStateWrites(file: string, source: string): ClaimStateWriteFinding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, /* setParentNodes */ true);
  const findings: ClaimStateWriteFinding[] = [];

  const push = (node: ts.Node, detail: string): void => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    findings.push({ file, line: line + 1, detail });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      const chainRoot = node.expression.expression;

      // `.update(claims).set({ currentState })`
      if (
        method === 'set' &&
        node.arguments.length === 1 &&
        objectHasStateKey(node.arguments[0]!) &&
        chainTargetsClaims(chainRoot)
      ) {
        push(node, '.update(claims).set({ currentState }) — UPDATE to the claims.current_state cache');
      }

      // `.insert(claims)…onConflictDoUpdate({ set: { currentState } })`
      if (method === 'onConflictDoUpdate' && node.arguments.length === 1) {
        const setObj = onConflictSetObject(node.arguments[0]!);
        if (setObj && objectHasStateKey(setObj) && chainTargetsClaims(chainRoot)) {
          push(node, '.insert(claims)…onConflictDoUpdate({ set: { currentState } }) — upsert of claims.current_state');
        }
      }

      // `.insert(claims).values({ currentState })` — a BARE insert (no further
      // chaining) is invisible to the two checks above; this is the create-time
      // write path the DB trigger's BEFORE-INSERT arm also guards (Story 6.1
      // review finding).
      if (
        method === 'values' &&
        node.arguments.length >= 1 &&
        objectHasStateKey(node.arguments[0]!) &&
        chainTargetsClaims(chainRoot)
      ) {
        push(node, '.insert(claims).values({ currentState }) — INSERT (create-time) write to claims.current_state');
      }
    }

    // `claims.currentState = …` (bare identifier OR namespaced `schema.claims.currentState = …`)
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      node.left.name.text === STATE_COLUMN &&
      tableNameOf(node.left.expression) === CLAIMS_TABLE
    ) {
      push(node, 'claims.currentState = … — direct assignment to the claims.current_state cache');
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return findings;
}

export function formatFinding(f: ClaimStateWriteFinding): string {
  return (
    `${f.file}:${f.line} — ${f.detail}. ` +
    `claims.current_state is a replay-derived cache; only the event-replay projector ` +
    `(packages/domain/src/claim/project.ts) may write it (Story 6.1 AC3). Route the ` +
    `state change through projectClaimState(...) instead.`
  );
}
