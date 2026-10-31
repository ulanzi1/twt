// scripts/marketplace-module-state-invariant/lib.ts
//
// Pure scanner for the Story 12.1 I1 invariant: `marketplace_modules`' six PROJECTED columns —
// `current_state`, `state_event_version`, `slots_remaining`, `archive_reason`, `audit_id`, `updated_at` —
// are a replay-derived cache and may be written ONLY by the event-replay projector
// (packages/domain/src/marketplace/project.ts: `projectModuleGenesis` / `projectModuleTransition`). Any
// OTHER code path that writes one lets the cache diverge from the event-sourced source of truth. Twin of
// scripts/helpdesk-state-invariant/lib.ts (copied, renamed, and widened from the state pair to all six).
//
// FLAGGED write forms (AST-detected — a `.set({ slotsRemaining })` substring in a comment/string never
// matches): `.update(marketplaceModules).set({ … })`, bare/bulk `.insert(marketplaceModules).values({ … })`,
// `…onConflictDoUpdate({ set: { … } })`, and `marketplaceModules.<column> = …`, for EACH of the six columns.
// The Drizzle FIELD names are camelCase; the table matches bare (`marketplaceModules`) or namespaced
// (`schema.marketplaceModules`).
//
// This is the STATIC authoring-time guard. The DB trigger (migration 0193) is the independent RUNTIME
// guard that also catches raw SQL — and the only guard on the immutable CONTENT columns (I2). Both are
// required — different layers.

import * as ts from 'typescript';

export interface MarketplaceModuleStateWriteFinding {
  file: string;
  line: number;
  detail: string;
  /** Name of the innermost enclosing named function/method, if any. */
  enclosingFunction: string | undefined;
}

const MARKETPLACE_MODULES_TABLE = 'marketplaceModules';
/** The six PROJECTED columns (I1) — see migration 0193's trigger. A new projected column joins this set AND
 *  the trigger's exclusion chain in the same change (C12). */
const GUARDED_COLUMNS = new Set([
  'currentState',
  'stateEventVersion',
  'slotsRemaining',
  'archiveReason',
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

/** Walk a chain LEFTWARD, returning true if it contains `.update(marketplaceModules)` /
 * `.insert(marketplaceModules)` (table arg bare or namespaced). */
function chainTargetsTable(node: ts.Node): boolean {
  let cur: ts.Node | undefined = node;
  while (cur) {
    if (ts.isCallExpression(cur)) {
      const callee = cur.expression;
      if (ts.isPropertyAccessExpression(callee)) {
        const method = callee.name.text;
        if ((method === 'update' || method === 'insert') && cur.arguments.length >= 1) {
          const a = cur.arguments[0];
          if (a && tableNameOf(a) === MARKETPLACE_MODULES_TABLE) return true;
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

/** Scan one TypeScript source for writes to `marketplace_modules`' projected columns. */
export function scanMarketplaceModuleStateWrites(file: string, source: string): MarketplaceModuleStateWriteFinding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, /* setParentNodes */ true);
  const findings: MarketplaceModuleStateWriteFinding[] = [];

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
        push(node, '.update(marketplaceModules).set({ <projected column> }) — UPDATE to a projected column');
      }

      if (method === 'onConflictDoUpdate' && node.arguments.length === 1) {
        const setObj = onConflictSetObject(node.arguments[0]!);
        if (setObj && objectHasStateKey(setObj) && chainTargetsTable(chainRoot)) {
          push(node, '.insert(marketplaceModules)…onConflictDoUpdate({ set: { <projected column> } }) — upsert of a projected column');
        }
      }

      if (
        method === 'values' &&
        node.arguments.length >= 1 &&
        objectHasStateKey(node.arguments[0]!) &&
        chainTargetsTable(chainRoot)
      ) {
        push(node, '.insert(marketplaceModules).values({ <projected column> }) — INSERT (create-time) write to a projected column');
      }
    }

    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      GUARDED_COLUMNS.has(node.left.name.text) &&
      tableNameOf(node.left.expression) === MARKETPLACE_MODULES_TABLE
    ) {
      push(node, `marketplaceModules.${node.left.name.text} = … — direct assignment to a projected column`);
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return findings;
}

export function formatFinding(f: MarketplaceModuleStateWriteFinding): string {
  return (
    `${f.file}:${f.line} — ${f.detail}. ` +
    `marketplace_modules' projected columns are a replay-derived cache; only the event-replay projector ` +
    `(packages/domain/src/marketplace/project.ts) may write them (Story 12.1 I1). Route the change ` +
    `through a marketplace.* command (authorModule / scheduleModule / activateModule / submitModuleLead / ` +
    `archiveModule) instead.`
  );
}

/** An allowlisted writer: a specific FUNCTION within a specific file — not the whole file. */
export interface AllowlistEntry {
  file: string;
  functions: Set<string>;
}

/** Is this finding's write site inside one of the allowlisted functions of its file? */
export function isAllowlistedWrite(
  finding: Pick<MarketplaceModuleStateWriteFinding, 'file' | 'enclosingFunction'>,
  allowlist: readonly AllowlistEntry[],
): boolean {
  return allowlist.some(
    (entry) =>
      entry.file === finding.file &&
      finding.enclosingFunction !== undefined &&
      entry.functions.has(finding.enclosingFunction),
  );
}
