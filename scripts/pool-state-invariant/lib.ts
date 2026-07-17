// scripts/pool-state-invariant/lib.ts
//
// Pure scanner for the Story 7.1 AC5 invariant: `pools.current_state` +
// `pools.state_event_version` are a replay-derived cache PAIR and may be written ONLY
// by the event-replay projector (packages/domain/src/pool/project.ts). Any OTHER code
// path that writes either column of the `pools` table is an architectural violation
// (it would let the cache diverge from the event-sourced source of truth — the
// ₹50L/decision flow, or decouple the version anchor from the state it describes).
// Twin of scripts/claim-state-invariant/lib.ts.
//
// FLAGGED write forms (AST-detected → a `.set({ currentState })` substring in a
// comment/string never matches, mirror claim-state-invariant):
//   · `db.update(pools).set({ currentState: ... })`                     — canonical UPDATE
//   · `db.insert(pools).values({ currentState: … })`                    — bare INSERT (create-time)
//   · `db.insert(pools).values([{ currentState: … }, ...])`             — bulk/array INSERT
//   · `db.insert(pools)…onConflictDoUpdate({ set: { currentState: … } })` — upsert UPDATE
//   · `pools.currentState = …`                                          — direct assignment
// Each form is flagged identically for `stateEventVersion` (the pair travels together
// — see migration 0071's trigger, which now guards both columns for the same reason).
//
// The table target (`pools`) is matched whether referenced as a bare identifier
// (`pools`) or via a namespaced/property access (`schema.pools`) — the codebase's own
// `import * as schema from '.../schema/index.js'` convention would otherwise silently
// evade a bare-identifier-only check (the Story 6.1 review finding). `objectHasStateKey`
// also recognizes a computed property key (`{ [col]: value }`) whose key is a literal
// guarded-column string, and an array literal of object literals (the bulk-insert form).
//
// NOTE the Drizzle FIELD names are `currentState` / `stateEventVersion` (camelCase of
// the `current_state` / `state_event_version` columns) — the scanner matches the TS
// property, not the SQL column.
//
// This is the STATIC authoring-time guard (AC5). The DB trigger (migration 0071, AC5)
// is the independent RUNTIME guard that also catches raw SQL — it fires on BOTH INSERT
// and UPDATE. Both guards are required — they are different layers.
//
// Each finding also records the name of its innermost enclosing named function (if
// any) — `check.ts` uses this to allowlist the SPECIFIC guarded write site
// (`projectPoolState`) inside the projector file, rather than the whole file, so a
// future addition to project.ts that writes the cache from a DIFFERENT function is
// still caught.

import * as ts from 'typescript';

export interface PoolStateWriteFinding {
  file: string;
  line: number;
  detail: string;
  /** Name of the innermost enclosing named function/method, if any. */
  enclosingFunction: string | undefined;
}

const POOLS_TABLE = 'pools';
/** The two cache columns that travel together — see migration 0071's trigger comment. */
const GUARDED_COLUMNS = new Set(['currentState', 'stateEventVersion']);

/** The table name a `.update(X)`/`.insert(X)` argument refers to — whether `X` is a
 * bare identifier (`pools`) or a namespaced/property access (`schema.pools`). */
function tableNameOf(expr: ts.Expression): string | undefined {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return undefined;
}

/** Does a single object literal carry a guarded-column property (assignment,
 * shorthand, or a computed key that is literally one of the guarded column names)? */
function singleObjectHasStateKey(obj: ts.ObjectLiteralExpression): boolean {
  return obj.properties.some((p) => {
    if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) {
      const name = p.name;
      if (ts.isIdentifier(name)) return GUARDED_COLUMNS.has(name.text);
      if (ts.isStringLiteral(name)) return GUARDED_COLUMNS.has(name.text);
      if (ts.isComputedPropertyName(name) && ts.isStringLiteral(name.expression)) {
        return GUARDED_COLUMNS.has(name.expression.text);
      }
    }
    return false;
  });
}

/** Does an object literal — OR an array literal of object literals (the bulk-insert
 * `.values([{...}, {...}])` form) — carry a guarded-column property anywhere? */
function objectHasStateKey(arg: ts.Expression): boolean {
  if (ts.isObjectLiteralExpression(arg)) return singleObjectHasStateKey(arg);
  if (ts.isArrayLiteralExpression(arg)) {
    return arg.elements.some((el) => ts.isObjectLiteralExpression(el) && singleObjectHasStateKey(el));
  }
  return false;
}

/** The name of the innermost enclosing named function/method declaration, arrow
 * function assigned to a named `const`, or method, walking up from `node`. */
function enclosingFunctionName(node: ts.Node): string | undefined {
  let cur: ts.Node | undefined = node.parent;
  while (cur) {
    if (
      (ts.isFunctionDeclaration(cur) || ts.isMethodDeclaration(cur) || ts.isFunctionExpression(cur)) &&
      cur.name
    ) {
      return cur.name.text;
    }
    if (ts.isArrowFunction(cur) && ts.isVariableDeclaration(cur.parent) && ts.isIdentifier(cur.parent.name)) {
      return cur.parent.name.text;
    }
    cur = cur.parent;
  }
  return undefined;
}

/**
 * Walk a method/property chain LEFTWARD from `node`, returning true if it contains a
 * `.update(pools)` or `.insert(pools)` call. Matches the table argument whether it's a
 * bare identifier or a namespaced property access.
 */
function chainTargetsPools(node: ts.Node): boolean {
  let cur: ts.Node | undefined = node;
  while (cur) {
    if (ts.isCallExpression(cur)) {
      const callee = cur.expression;
      if (ts.isPropertyAccessExpression(callee)) {
        const method = callee.name.text;
        if ((method === 'update' || method === 'insert') && cur.arguments.length >= 1) {
          const a = cur.arguments[0];
          if (a && tableNameOf(a) === POOLS_TABLE) return true;
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

/** Scan one TypeScript source for `pools.current_state` writes. */
export function scanPoolStateWrites(file: string, source: string): PoolStateWriteFinding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, /* setParentNodes */ true);
  const findings: PoolStateWriteFinding[] = [];

  const push = (node: ts.Node, detail: string): void => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    findings.push({ file, line: line + 1, detail, enclosingFunction: enclosingFunctionName(node) });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      const chainRoot = node.expression.expression;

      // `.update(pools).set({ currentState })`
      if (
        method === 'set' &&
        node.arguments.length === 1 &&
        objectHasStateKey(node.arguments[0]!) &&
        chainTargetsPools(chainRoot)
      ) {
        push(node, '.update(pools).set({ currentState }) — UPDATE to the pools.current_state cache');
      }

      // `.insert(pools)…onConflictDoUpdate({ set: { currentState } })`
      if (method === 'onConflictDoUpdate' && node.arguments.length === 1) {
        const setObj = onConflictSetObject(node.arguments[0]!);
        if (setObj && objectHasStateKey(setObj) && chainTargetsPools(chainRoot)) {
          push(node, '.insert(pools)…onConflictDoUpdate({ set: { currentState } }) — upsert of pools.current_state');
        }
      }

      // `.insert(pools).values({ currentState })` or the bulk/array form
      // `.insert(pools).values([{ currentState }, ...])` — this is the create-time
      // write path the DB trigger's BEFORE-INSERT arm also guards. Fires unconditionally
      // on the `.values(...)` call itself (independent of whether `.onConflictDoUpdate`
      // is chained afterward) because the INSERT and the upsert-UPDATE are two distinct
      // write sites in the same statement — a legitimate upsert (like the projector's
      // own code) is expected to trip BOTH this rule and the onConflictDoUpdate rule
      // above, each pointing at its own line.
      if (
        method === 'values' &&
        node.arguments.length >= 1 &&
        objectHasStateKey(node.arguments[0]!) &&
        chainTargetsPools(chainRoot)
      ) {
        push(node, '.insert(pools).values({ currentState }) — INSERT (create-time) write to pools.current_state');
      }
    }

    // `pools.currentState = …` (bare identifier OR namespaced `schema.pools.currentState = …`)
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      GUARDED_COLUMNS.has(node.left.name.text) &&
      tableNameOf(node.left.expression) === POOLS_TABLE
    ) {
      push(node, `pools.${node.left.name.text} = … — direct assignment to the pools cache`);
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return findings;
}

export function formatFinding(f: PoolStateWriteFinding): string {
  return (
    `${f.file}:${f.line} — ${f.detail}. ` +
    `pools.current_state is a replay-derived cache; only the event-replay projector ` +
    `(packages/domain/src/pool/project.ts) may write it (Story 7.1 AC5). Route the ` +
    `state change through pool.projectPoolState(...) instead.`
  );
}

/** An allowlisted writer: a specific FUNCTION within a specific file — not the whole
 * file. A future addition to `entry.file` outside `entry.functions` is still flagged. */
export interface AllowlistEntry {
  file: string;
  functions: Set<string>;
}

/** Is this finding's write site inside one of the allowlisted functions of its file? */
export function isAllowlistedWrite(
  finding: Pick<PoolStateWriteFinding, 'file' | 'enclosingFunction'>,
  allowlist: readonly AllowlistEntry[],
): boolean {
  return allowlist.some(
    (entry) =>
      entry.file === finding.file &&
      finding.enclosingFunction !== undefined &&
      entry.functions.has(finding.enclosingFunction),
  );
}
