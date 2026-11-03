// scripts/field-worker-state-invariant/lib.ts
//
// Pure scanner for the Story 13.1 I1 invariant: `field_workers`' eight PROJECTED columns —
// `current_state`, `state_event_version`, `kyc_status`, `state_reason_code`, `district`, `ended_on`, `audit_id`,
// `updated_at` — are a replay-derived cache and may be written ONLY by the event-replay projector
// (packages/domain/src/field-worker/project.ts: `projectFieldWorkerGenesis` / `projectFieldWorkerTransition`). Any
// OTHER code path that writes one lets the cache diverge from the event-sourced source of truth. Twin of
// scripts/marketplace-module-state-invariant/lib.ts (copied, renamed, and its column set replaced by the eight I1 columns
// — the set is table-specific).
//
// FLAGGED write forms (AST-detected — a `.set({ district })` substring in a comment/string never
// matches): `.update(fieldWorkers).set({ … })`, bare/bulk `.insert(fieldWorkers).values({ … })`,
// `…onConflictDoUpdate({ set: { … } })`, and `fieldWorkers.<column> = …`, for EACH of the eight columns.
// The Drizzle FIELD names are camelCase; the table matches bare (`fieldWorkers`) or namespaced
// (`schema.fieldWorkers`).
//
// This is the STATIC authoring-time guard. The DB trigger (migration 0200) is the independent RUNTIME
// guard that also catches raw SQL — and the only guard on the immutable CONTENT columns (I2). Both are
// required — different layers.

import * as ts from 'typescript';

export interface FieldWorkerStateWriteFinding {
  file: string;
  line: number;
  detail: string;
  /** Name of the innermost enclosing named function/method, if any. */
  enclosingFunction: string | undefined;
}

const FIELD_WORKERS_TABLE = 'fieldWorkers';
/** The eight PROJECTED columns (I1) — see migration 0200's trigger exclusion chain. A new projected column joins this
 *  set AND the trigger's chain in the same change (C8 (c) — `CREATE OR REPLACE` of the guard function). */
const GUARDED_COLUMNS = new Set([
  'currentState',
  'stateEventVersion',
  'kycStatus',
  'stateReasonCode',
  'district',
  'endedOn',
  'auditId',
  'updatedAt',
]);

/** The table name a `.update(X)`/`.insert(X)` argument refers to — bare or namespaced. */
function tableNameOf(expr: ts.Expression): string | undefined {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return undefined;
}

/** Does a single object literal carry a guarded-column property (assignment, shorthand, or a
 * computed key that is literally one of the guarded column names)? */
function singleObjectHasStateKey(obj: ts.ObjectLiteralExpression): boolean {
  return obj.properties.some((p) => {
    if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) {
      const name = p.name;
      if (ts.isIdentifier(name)) return GUARDED_COLUMNS.has(name.text);
      if (ts.isStringLiteral(name)) return GUARDED_COLUMNS.has(name.text);
      if (ts.isComputedPropertyName(name)) {
        // A computed key literal: a plain string ({ ['currentState']: ... }) or a no-substitution
        // template literal ({ [`currentState`]: ... }) — both are statically-known column names.
        if (ts.isStringLiteral(name.expression)) return GUARDED_COLUMNS.has(name.expression.text);
        if (ts.isNoSubstitutionTemplateLiteral(name.expression)) return GUARDED_COLUMNS.has(name.expression.text);
      }
    }
    return false;
  });
}

/** An object literal OR an array of object literals (the bulk-insert form) carrying a guarded key. */
function objectHasStateKey(arg: ts.Expression): boolean {
  if (ts.isObjectLiteralExpression(arg)) return singleObjectHasStateKey(arg);
  if (ts.isArrayLiteralExpression(arg)) {
    return arg.elements.some((el) => ts.isObjectLiteralExpression(el) && singleObjectHasStateKey(el));
  }
  return false;
}

/** The innermost enclosing named function/method (or arrow assigned to a named const). */
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

/** Walk a chain LEFTWARD, returning true if it contains `.update(fieldWorkers)` /
 * `.insert(fieldWorkers)` (table arg bare or namespaced). */
function chainTargetsTable(node: ts.Node): boolean {
  let cur: ts.Node | undefined = node;
  while (cur) {
    if (ts.isCallExpression(cur)) {
      const callee = cur.expression;
      if (ts.isPropertyAccessExpression(callee)) {
        const method = callee.name.text;
        if ((method === 'update' || method === 'insert') && cur.arguments.length >= 1) {
          const a = cur.arguments[0];
          if (a && tableNameOf(a) === FIELD_WORKERS_TABLE) return true;
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

/** Scan one TypeScript source for writes to `field_workers`' projected columns. */
export function scanFieldWorkerStateWrites(file: string, source: string): FieldWorkerStateWriteFinding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, /* setParentNodes */ true);
  const findings: FieldWorkerStateWriteFinding[] = [];

  const push = (node: ts.Node, detail: string): void => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    findings.push({ file, line: line + 1, detail, enclosingFunction: enclosingFunctionName(node) });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      const chainRoot = node.expression.expression;

      if (
        method === 'set' &&
        node.arguments.length === 1 &&
        objectHasStateKey(node.arguments[0]!) &&
        chainTargetsTable(chainRoot)
      ) {
        push(node, '.update(fieldWorkers).set({ <projected column> }) — UPDATE to a projected column');
      }

      if (method === 'onConflictDoUpdate' && node.arguments.length === 1) {
        const setObj = onConflictSetObject(node.arguments[0]!);
        if (setObj && objectHasStateKey(setObj) && chainTargetsTable(chainRoot)) {
          push(node, '.insert(fieldWorkers)…onConflictDoUpdate({ set: { <projected column> } }) — upsert of a projected column');
        }
      }

      if (
        method === 'values' &&
        node.arguments.length >= 1 &&
        objectHasStateKey(node.arguments[0]!) &&
        chainTargetsTable(chainRoot)
      ) {
        push(node, '.insert(fieldWorkers).values({ <projected column> }) — INSERT (create-time) write to a projected column');
      }
    }

    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      GUARDED_COLUMNS.has(node.left.name.text) &&
      tableNameOf(node.left.expression) === FIELD_WORKERS_TABLE
    ) {
      push(node, `fieldWorkers.${node.left.name.text} = … — direct assignment to a projected column`);
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return findings;
}

export function formatFinding(f: FieldWorkerStateWriteFinding): string {
  return (
    `${f.file}:${f.line} — ${f.detail}. ` +
    `field_workers' projected columns are a replay-derived cache; only the event-replay projector ` +
    `(packages/domain/src/field-worker/project.ts) may write them (Story 13.1 I1). Route the change ` +
    `through a fieldWorker.* command (registerFieldWorker / recordFieldWorkerKycCompleted / activateFieldWorker / ` +
    `suspendFieldWorker / reactivateFieldWorker / terminateFieldWorker / postFieldWorker) instead.`
  );
}

/** An allowlisted writer: a specific FUNCTION within a specific file — not the whole file. */
export interface AllowlistEntry {
  file: string;
  functions: Set<string>;
}

/** Is this finding's write site inside one of the allowlisted functions of its file? */
export function isAllowlistedWrite(
  finding: Pick<FieldWorkerStateWriteFinding, 'file' | 'enclosingFunction'>,
  allowlist: readonly AllowlistEntry[],
): boolean {
  return allowlist.some(
    (entry) =>
      entry.file === finding.file &&
      finding.enclosingFunction !== undefined &&
      entry.functions.has(finding.enclosingFunction),
  );
}
